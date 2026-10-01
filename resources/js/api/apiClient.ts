// api/apiClient.ts
import axios from "axios";
import { useAuthStore } from "../stores/authStore";

// ✅ Relative URL — Laravel serves both SPA and API from the same origin
const API_BASE_URL = "https://ivory-narwhal-758437.hostingersite.com/api";

if (API_BASE_URL) {
  console.log("🔌 API Base URL:", API_BASE_URL);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true, // include cookies if you use Sanctum
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Request interceptor — attach bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (import.meta.env.DEV) {
      console.log(
        `🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      );
    }
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor — handle 401s and network errors
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error" ||
      error.code === "ERR_NETWORK_CHANGED"
    ) {
      console.error("❌ CANNOT CONNECT TO BACKEND SERVER");
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export const apiClient = api;
export default api;