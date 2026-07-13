export type Role = "EMPLOYEE" | "MANAGER" | "HR_ADMIN" | "SUPER_ADMIN";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: {
    id: string;
    email: string;
    role: Role;
    employeeId: string | null;
    employee: {
      id: string;
      name: string;
      employeeCode: string;
      department: string | null;
    } | null;
  };
};

export type MeResponse = {
  id: string;
  email: string;
  role: Role;
  employeeId: string | null;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    department: string | null;
    managerId: string | null;
    locations: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
    }>;
  } | null;
};

export type Employee = {
  id: string;
  name: string;
  employeeCode: string;
  department: string | null;
  managerId: string | null;
  isActive: boolean;
  locations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    isActive: boolean;
  }>;
  user: { id: string; email: string; role: Role; isActive: boolean } | null;
};

export type Location = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
};
