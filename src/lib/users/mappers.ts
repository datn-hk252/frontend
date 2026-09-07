import { User } from "@/types";
import { v4 as uuidv4 } from "uuid";

/** Convert server user object to frontend User */
export function mapServerUserToClient(s: any): User {
  return {
    id: String(s.id ?? uuidv4()),
    name: s.name ?? s.fullName ?? "Unnamed",
    code: (s.code ?? s.email ?? `user-${s.id}`) as string,
    email: s.email ?? "",
    role: s.role || "ROLE_USER",
    roles: Array.isArray(s.roles) ? s.roles : (s.role ? [s.role] : ["ROLE_USER"]),
    lmsRoles: Array.isArray(s.lmsRoles) ? s.lmsRoles : [],
    dateAdded: s.createdAt ?? s.updatedAt ?? new Date().toISOString(),
    status: typeof s.active === "boolean" ? s.active : Boolean(s.status ?? true),
  };
}
