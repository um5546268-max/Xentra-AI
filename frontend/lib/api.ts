import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("xentra_token");
    if (token) {
      if (config.headers && typeof (config.headers as any).set === "function") {
        (config.headers as any).set("Authorization", `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
    if (config.headers && typeof (config.headers as any).set === "function") {
      (config.headers as any).set("ngrok-skip-browser-warning", "true");
    } else {
      config.headers = config.headers || {};
      (config.headers as any)["ngrok-skip-browser-warning"] = "true";
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 402) {
      const detail = error.response.data?.detail;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("limit:reached", { detail }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;