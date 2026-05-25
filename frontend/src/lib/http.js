import axios from "axios";
import { handleLogout } from "./utils.js";
import { startProgress, setProgress, doneProgress } from "./progress.js";

const baseUrl = import.meta.env.VITE_API_URL;

let isLoggingOut = false;

const API = axios.create({
  baseURL: baseUrl,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send cookies (refresh_token, access_token)
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    startProgress();
    return config;
  },
  (error) => {
    doneProgress();
    return Promise.reject(error);
  }
);

API.interceptors.response.use(
  (response) => {
    doneProgress();
    return response;
  },
  (error) => {
    doneProgress();

    if (error?.response?.status === 401 && !isLoggingOut) {
      // Don't auto-logout on auth endpoints (login/register can legitimately 401)
      const url = error?.config?.url || "";
      const isAuthRoute = url.includes("/auth/");
      if (!isAuthRoute) {
        isLoggingOut = true;
        handleLogout();
        return;
      }
    }

    return Promise.reject(error);
  }
);

API.defaults.onDownloadProgress = function (progressEvent) {
  if (progressEvent.total) {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    setProgress(percent);
  }
};

API.defaults.onUploadProgress = function (progressEvent) {
  if (progressEvent.total) {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    setProgress(percent);
  }
};

/**
 * Wraps an axios call so the caller always gets a plain JSON object
 * with a uniform `success` flag — matching the backend response handler.
 *
 * Success: { success: true, data, message, pagination?, ... }
 * Error  : { success: false, message, statusCode, data, trace?, ... }
 */
const handleRequest = async (requestFn) => {
  try {
    const response = await requestFn();
    return response?.data;
  } catch (error) {
    if (error?.response?.data) {
      // Backend already shaped the error
      return error.response.data;
    }
    return {
      success: false,
      statusCode: 500,
      message: error?.message || "Network error. Please try again.",
      data: null,
    };
  }
};

export { API, baseUrl, handleRequest };
