export interface RoleLike {
  name: string;
  displayName: string;
}

export function mapFrontendRoleToBackend(role: string, availableRoles?: RoleLike[]): string {
  if (!role) {
    if (availableRoles) {
      const defaultRole = availableRoles.find(
        r => r.name.toUpperCase() === "ROLE_STUDENT" || r.name.toUpperCase() === "ROLE_USER"
      );
      if (defaultRole) return defaultRole.name;
    }
    return "ROLE_STUDENT";
  }

  const cleanRole = role.trim();
  const lowerRole = cleanRole.toLowerCase();

  if (availableRoles && availableRoles.length > 0) {
    // 1. Match exact name case-insensitively
    const matchByName = availableRoles.find(
      r => r.name.toLowerCase() === lowerRole || r.name.toLowerCase() === `role_${lowerRole}`
    );
    if (matchByName) return matchByName.name;

    // 2. Match display name case-insensitively
    const matchByDisplayName = availableRoles.find(
      r => r.displayName.toLowerCase() === lowerRole || 
           r.displayName.toLowerCase().includes(lowerRole) || 
           lowerRole.includes(r.displayName.toLowerCase())
    );
    if (matchByDisplayName) return matchByDisplayName.name;
  }

  const r = cleanRole.toUpperCase();
  if (r.startsWith("ROLE_")) return r;
  
  // Legacy text mapping for bulk upload CSV
  const lower = cleanRole.toLowerCase();
  if (lower.includes("admin")) return "ROLE_ADMIN";
  if (lower.includes("teacher") || lower.includes("manager")) return "ROLE_TEACHER";
  if (lower.includes("student") || lower.includes("user") || lower.includes("member")) return "ROLE_STUDENT";
  
  return "ROLE_" + r;
}
