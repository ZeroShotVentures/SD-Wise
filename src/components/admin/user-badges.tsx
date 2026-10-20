import { Badge } from "@/components/ui/badge";

type UserBadgesProps = {
  user: {
    role?: string | null;
    banned?: boolean | null;
    emailVerified: boolean;
  };
};

export function UserBadges({ user }: UserBadgesProps) {
  const roles = (user.role ?? "user").split(",").filter((r) => r !== "user");

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role} tone="brand" className="capitalize">
          {role}
        </Badge>
      ))}
      {user.banned && (
        <Badge tone="danger" dot>
          Banned
        </Badge>
      )}
      {!user.emailVerified && <Badge>Unverified</Badge>}
    </div>
  );
}
