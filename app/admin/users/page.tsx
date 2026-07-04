import { getSession } from "@/lib/auth";
import { UserRole } from "@/types";
import UsersClient from "./UsersClient";

// Server component so the client UI can know the viewer's own role up front
// (needed to hide/disable actions on Admin/Super Admin rows for a plain Admin
// — see UsersClient) without an extra client-side "who am I" fetch.
export default async function AdminUsersPage() {
  const session = await getSession();
  return <UsersClient currentRole={(session?.role as UserRole) ?? "admin"} currentUserId={session?.id ?? ""} />;
}
