import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { UserBadges } from "@/components/admin/user-badges";
import { Avatar } from "@/components/shell/avatar";
import { Page as PageShell } from "@/components/shell/page";
import { inputClass, secondaryButtonClass } from "@/components/ui/styles";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin" };

const pageSize = 25;

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function pageHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin?${search}` : "/admin";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const { q, page } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const pageNumber = Math.max(1, Math.floor(Number(page)) || 1);

  const { users, total } = await auth.api.listUsers({
    headers: await headers(),
    query: {
      searchValue: query || undefined,
      searchField: "email",
      searchOperator: "contains",
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell
      title="Users"
      description="Everyone with an SD Wise account. Open a user to impersonate, ban or reset them."
    >
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            <span className="font-medium text-ink tabular-nums">{total}</span>{" "}
            {total === 1 ? "user" : "users"}
            {query ? ` matching "${query}"` : ""}
          </p>
          <form className="flex gap-2 sm:w-80">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by email"
              aria-label="Search by email"
              className={inputClass}
            />
            <button type="submit" className={secondaryButtonClass}>
              Search
            </button>
          </form>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium max-sm:hidden">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              // The link stretches over the row, so the whole row is a target.
              <tr
                key={user.id}
                className="relative transition-colors hover:bg-canvas"
              >
                <td className="px-4 py-3 wrap-anywhere">
                  <div className="flex items-center gap-3">
                    <Avatar id={user.id} name={user.name || user.email} />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-medium text-ink after:absolute after:inset-0"
                      >
                        {user.name || user.email}
                      </Link>
                      <p className="text-muted">{user.email}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted sm:hidden">
                    Joined {dateFormat.format(new Date(user.createdAt))}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <UserBadges user={user} />
                </td>
                <td className="px-4 py-3 text-right text-muted tabular-nums max-sm:hidden">
                  {dateFormat.format(new Date(user.createdAt))}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-4 text-sm text-muted">
          <span>
            Page {pageNumber} of {pageCount}
          </span>
          <div className="flex gap-2">
            {pageNumber > 1 && (
              <Link
                href={pageHref(query, pageNumber - 1)}
                className={secondaryButtonClass}
              >
                Previous
              </Link>
            )}
            {pageNumber < pageCount && (
              <Link
                href={pageHref(query, pageNumber + 1)}
                className={secondaryButtonClass}
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </PageShell>
  );
}
