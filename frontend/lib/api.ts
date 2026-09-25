import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("xentra_token");
    if (token) {
      // Use .set() — this works reliably with all Axios versions
      if (config.headers && typeof (config.headers as any).set === "function") {
        (config.headers as any).set("Authorization", `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
    // Bypass ngrok's free-tier browser warning page
    if (config.headers && typeof (config.headers as any).set === "function") {
      (config.headers as any).set("ngrok-skip-browser-warning", "true");
    } else {
      config.headers = config.headers || {};
      (config.headers as any)["ngrok-skip-browser-warning"] = "true";
    }
  }
  return config;
});

export default api;