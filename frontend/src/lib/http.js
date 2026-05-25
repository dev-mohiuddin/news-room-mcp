import axios from "axios";
import { handleLogout } from "./utils.js";
import { startProgress, setProgress, doneProgress } from "./progress.js";

const baseUrl = import.meta.env.VITE_API_URL;

let isLoggingOut = false;

const API = axios.create({
  baseURL: baseUrl,
  headers: { "Content-Type": "application/json" },
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
      isLoggingOut = true;
      handleLogout();
      return;
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

const handleRequest = async (requestFn) => {
  try {
    const response = await requestFn();
    return response?.data;
  } catch (error) {
    if (error && error?.response?.status === 401)
      return {
        status: "failure",
        message: "",
      };

    if (error?.response?.data?.message) {
      return {
        status: "failure",
        message: error?.response?.data?.message,
      };
    }
    return {
      status: "failure",
      message: "Something went wrong.",
    };
  }
};

export { API, baseUrl, handleRequest };
