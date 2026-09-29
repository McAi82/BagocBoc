import { api } from "../api/apiClient";
import axios from "axios";

export const handleApiError = (error: any) => {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message || error.message || "An error occurred",
      errors: error.response?.data?.errors || {},
      status: error.response?.status || 500,
    };
  }
  return { message: "Unexpected error", errors: {}, status: 500 };
};

export const apiHelper = {
  get: (url: string, config = {}) => api.get(url, config),
  post: (url: string, data?: any, config = {}) => api.post(url, data, config),
  put: (url: string, data?: any, config = {}) => api.put(url, data, config),
  patch: (url: string, data?: any, config = {}) => api.patch(url, data, config),
  delete: (url: string, config = {}) => api.delete(url, config),
  upload: (url: string, formData: FormData, config = {}) =>
    api.post(url, formData, {
      ...config,
      headers: { ...config.headers, "Content-Type": "multipart/form-data" },
    }),
};