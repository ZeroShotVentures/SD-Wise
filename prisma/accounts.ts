import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../src/generated/prisma/client";
import { accounts, PASSWORD } from "../src/lib/graph/accounts";

// Makes the database match the graph: one Person row per fixture person, and
// one account per person, all with the same password. People that aren't in
// the graph go, and with them their accounts and questions. Safe to re-run:
// existing accounts keep their id and sessions and get the password back.
export async function seedAccounts(prisma: PrismaClient) {
  // One query per changed row, not per person: a transaction of ~300 upserts
  // outlasts Prisma's 5s limit against a remote database.
  const existing = new Map(
    (await prisma.person.findMany()).map((p) => [p.id, p]),
  );
  await prisma.person.createMany({
    data: accounts
      .filter(({ person }) => !existing.has(person.id))
      .map(({ person: { id, role, department } }) => ({
        id,
        role,
        department,
      })),
  });
  await prisma.$transaction(
    accounts
      .filter(({ person }) => {
        const row = existing.get(person.id);
        return (
          row &&
          (row.role !== person.role || row.department !== person.department)
        );
      })
      .map(({ person: { id, role, department } }) =>
        prisma.person.update({ where: { id }, data: { role, department } }),
      ),
  );
  const { count: gone } = await prisma.person.deleteMany({
    where: { id: { notIn: accounts.map(({ person }) => person.id) } },
  });
  console.log(`${accounts.length} people (removed ${gone} not in the graph)`);

  // An account whose email no longer matches its person is recreated.
  const emailOf = new Map(accounts.map((a) => [a.person.id, a.email]));
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, personId: true },
  });
  const stale = users.filter((u) => emailOf.get(u.personId) !== u.email);
  await prisma.user.deleteMany({
    where: { id: { in: stale.map((u) => u.id) } },
  });
  const kept = new Map(
    users.filter((u) => !stale.includes(u)).map((u) => [u.personId, u]),
  );

  const now = new Date();
  await prisma.user.createMany({
    data: accounts
      .filter(({ person }) => !kept.has(person.id))
      .map(({ email, person }) => ({
        id: crypto.randomUUID(),
        email,
        name: person.name,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        personId: person.id,
      })),
  });
  await prisma.$transaction(
    accounts
      .filter(({ person }) => {
        const user = kept.get(person.id);
        return user && user.name !== person.name;
      })
      .map(({ person }) =>
        prisma.user.update({
          where: { personId: person.id },
          data: { name: person.name, updatedAt: now },
        }),
      ),
  );

  // Sign-in reads the password from the credential account.
  const password = await hashPassword(PASSWORD);
  const userIds = (await prisma.user.findMany({ select: { id: true } })).map(
    ({ id }) => id,
  );
  await prisma.$transaction([
    prisma.account.deleteMany({ where: { providerId: "credential" } }),
    prisma.account.createMany({
      data: userIds.map((userId) => ({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password,
        createdAt: now,
        updatedAt: now,
      })),
    }),
  ]);
  console.log(
    `${userIds.length} accounts (${accounts.length - kept.size} new), password: ${PASSWORD}`,
  );
}
