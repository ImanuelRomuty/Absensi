import { apiList, apiRequest, clearTokens, setTokens } from "./api";
import type {
  Approval,
  Attendance,
  Employee,
  LeaveRequest,
  Location,
  LoginResponse,
  MeResponse,
} from "../types/api";

export const authApi = {
  login(email: string, password: string) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }).then((data) => {
      setTokens(data.accessToken, data.refreshToken);
      return data;
    });
  },
  logout() {
    const refreshToken = localStorage.getItem("masarif_refresh_token");
    return apiRequest<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
    }).finally(() => clearTokens());
  },
  me() {
    return apiRequest<MeResponse>("/me");
  },
};

export const employeesApi = {
  list(page = 1, limit = 50) {
    return apiList<Employee>(`/employees?page=${page}&limit=${limit}`);
  },
  update(
    id: string,
    body: {
      name?: string;
      department?: string | null;
      managerId?: string | null;
      isActive?: boolean;
      locationIds?: string[];
    },
  ) {
    return apiRequest<Employee>(`/employees/${id}`, {
      method: "PATCH",
      body,
    });
  },
};

export type CreateLocationBody = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
};

export type UpdateLocationBody = {
  name?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  isActive?: boolean;
};

export const locationsApi = {
  list(page = 1, limit = 50) {
    return apiList<Location>(`/locations?page=${page}&limit=${limit}`);
  },
  create(body: CreateLocationBody) {
    return apiRequest<Location>("/locations", { method: "POST", body });
  },
  update(id: string, body: UpdateLocationBody) {
    return apiRequest<Location>(`/locations/${id}`, { method: "PATCH", body });
  },
};

export const attendanceApi = {
  list(params?: { from?: string; to?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    q.set("page", String(params?.page ?? 1));
    q.set("limit", String(params?.limit ?? 50));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    return apiList<Attendance>(`/attendance?${q.toString()}`);
  },
};

export const approvalsApi = {
  list(params?: {
    status?: "PENDING" | "APPROVED" | "REJECTED";
    type?: "ATTENDANCE_CORRECTION" | "LEAVE";
  }) {
    const q = new URLSearchParams({ page: "1", limit: "50" });
    if (params?.status) q.set("status", params.status);
    if (params?.type) q.set("type", params.type);
    return apiList<Approval>(`/approvals?${q.toString()}`);
  },
  decide(id: string, decision: "APPROVED" | "REJECTED", decisionNote?: string) {
    return apiRequest<Approval>(`/approvals/${id}/decide`, {
      method: "POST",
      body: { decision, decisionNote },
    });
  },
};

export const leaveApi = {
  list(params?: {
    status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    page?: number;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    q.set("page", String(params?.page ?? 1));
    q.set("limit", String(params?.limit ?? 50));
    if (params?.status) q.set("status", params.status);
    return apiList<LeaveRequest>(`/leave?${q.toString()}`);
  },
};
