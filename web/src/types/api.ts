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

export type Attendance = {
  id: string;
  employeeId: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  locationId: string | null;
  idempotencyKey: string;
  isLate: boolean;
  isEarly: boolean;
  recordedAt: string;
  employee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string | null;
  };
  location?: { id: string; name: string } | null;
};

export type Approval = {
  id: string;
  type: "ATTENDANCE_CORRECTION" | "LEAVE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  requesterId: string;
  reviewerId: string | null;
  note: string | null;
  decisionNote: string | null;
  payload: unknown;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  decidedAt: string | null;
  requester?: {
    id: string;
    email: string;
    role: Role;
    employee: { id: string; name: string; employeeCode: string } | null;
  };
  reviewer?: { id: string; email: string } | null;
};

export type LeaveType = {
  id: string;
  code: string;
  name: string;
  paid: boolean;
  defaultDaysYear: number;
  isActive: boolean;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvalId: string | null;
  createdAt: string;
  leaveType?: { id: string; code: string; name: string; paid: boolean };
  employee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string | null;
  };
};
