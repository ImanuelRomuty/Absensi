import { apiList, apiRequest, clearTokens, setTokens } from "./api";
import type { Employee, Location, LoginResponse, MeResponse } from "../types/api";

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
