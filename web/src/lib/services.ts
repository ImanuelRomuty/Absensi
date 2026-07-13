import { apiList, apiRequest, clearTokens, setTokens } from "./api";
import type {
  Approval,
  Attendance,
  Employee,
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
};

export const locationsApi = {
  list(page = 1, limit = 50) {
    return apiList<Location>(`/locations?page=${page}&limit=${limit}`);
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
  list(status?: "PENDING" | "APPROVED" | "REJECTED") {
    const q = new URLSearchParams({ page: "1", limit: "50" });
    if (status) q.set("status", status);
    return apiList<Approval>(`/approvals?${q.toString()}`);
  },
  decide(id: string, decision: "APPROVED" | "REJECTED", decisionNote?: string) {
    return apiRequest<Approval>(`/approvals/${id}/decide`, {
      method: "POST",
      body: { decision, decisionNote },
    });
  },
};
