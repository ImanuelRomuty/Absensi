import type { Role } from "@prisma/client";

export type JwtAccessPayload = {
  sub: string;
  email: string;
  role: Role;
  employeeId: string | null;
};

export const ROLE_RANK: Record<Role, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  HR_ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function hasMinRole(userRole: Role, required: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

export function hasAnyRole(userRole: Role, allowed: Role[]): boolean {
  return allowed.includes(userRole);
}
