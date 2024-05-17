import axios, { CreateAxiosDefaults } from "axios";
import {
  getAccessToken,
  removeTokenFromStorage,
} from "@/services/auth-token.service";
import authService from "@/services/auth.service";
import { errorCatch } from "@/services/error";
export const SERVER_URL = "http://localhost:3001";
export const getContentType = () => ({
  "Content-Type": "application/json",
});
const options: CreateAxiosDefaults = {
  baseURL: SERVER_URL,
  headers: getContentType(),
  withCredentials: true,
};

const api = axios.create(options);
const apiClassic = axios.create(options);
api.interceptors.request.use(async (config) => {
  const accessToken = getAccessToken();
  if (config.headers && accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (config) => config,
  async (error) => {
    const originalRequest = error.config;
    if (
      error?.response?.status === 401 ||
      errorCatch(error) === "jwt expired" ||
      (errorCatch(error) === "jwt must be provided" &&
        error.config &&
        !error.config._isRetry)
    ) {
      originalRequest._isRetry = true;
      try {
        await authService.getNewToken();
        return api.request(originalRequest);
      } catch (e) {
        if (errorCatch(e) === "jwt expired") removeTokenFromStorage();
      }
    }

    throw error;
  },
);

export { api, apiClassic };
