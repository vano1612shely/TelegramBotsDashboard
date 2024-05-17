import { apiClassic } from "@/services/api";
import { LoginType } from "@/types/login.type";
import {
  removeTokenFromStorage,
  saveTokenToStorage,
} from "@/services/auth-token.service";

class AuthService {
  async login(data: LoginType) {
    const res = await apiClassic.post(`/auth/login`, data);
    if (res.data.access_token) saveTokenToStorage(res.data.access_token);
    return res.data;
  }
  async getNewToken() {
    const res = await apiClassic.post(`/auth/token`);
    if (res.data.access_token) saveTokenToStorage(res.data.access_token);
  }

  async logout() {
    const res = await apiClassic.post<boolean>("/auth/logout");
    if (res.data) removeTokenFromStorage();
    return res.data;
  }
}

const authService = new AuthService();
export default authService;
