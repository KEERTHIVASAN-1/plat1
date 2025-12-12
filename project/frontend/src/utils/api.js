// src/utils/api.js
import axios from 'axios';

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:3001";

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

let __authRedirectInFlight = false;

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 automatically
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register");
    const onLogin = typeof window !== "undefined" && window.location && window.location.pathname === "/login";
    if (status === 401 && !isAuthEndpoint && !onLogin && !__authRedirectInFlight) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      __authRedirectInFlight = true;
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export const api = {
  login: async (email, password) => {
    const body = { email, password };
    try { return await apiClient.post("/auth/login", body); } catch (e) {
      if (e?.response?.status === 404) return apiClient.post("/api/auth/login", body);
      throw e;
    }
  },
  register: async (name, email, password) => {
    const body = { name, email, password };
    try { return await apiClient.post("/auth/register", body); } catch (e) {
      if (e?.response?.status === 404) return apiClient.post("/api/auth/register", body);
      throw e;
    }
  },

  // contest
  getRoundWindow: async (roundId) => {
    try { return await apiClient.get("/timer/window", { params: { roundId } }); } catch (e) {
      if (e?.response?.status === 404) return apiClient.get("/api/timer/window", { params: { roundId } });
      throw e;
    }
  },
  timerStart: async (roundId, durationSeconds) => {
    const body = { roundId, durationSeconds };
    try { return await apiClient.post("/timer/start", body); } catch (e) {
      if (e?.response?.status === 422) return apiClient.post("/timer/start", null, { params: body });
      throw e;
    }
  },
  timerPause: async (roundId) => {
    const body = { roundId };
    try { return await apiClient.post("/timer/pause", body); } catch (e) {
      if (e?.response?.status === 422) return apiClient.post("/timer/pause", null, { params: body });
      throw e;
    }
  },
  timerResume: async (roundId) => {
    const body = { roundId };
    try { return await apiClient.post("/timer/resume", body); } catch (e) {
      if (e?.response?.status === 422) return apiClient.post("/timer/resume", null, { params: body });
      throw e;
    }
  },
  timerRestart: async (roundId, durationSeconds) => {
    const body = { roundId, durationSeconds };
    try { return await apiClient.post("/timer/restart", body); } catch (e) {
      if (e?.response?.status === 422) return apiClient.post("/timer/restart", null, { params: body });
      throw e;
    }
  },
  timerSchedule: async (roundId, startAt, durationSeconds) => {
    const body = { roundId, startAt, durationSeconds };
    try { return await apiClient.post("/timer/schedule", body); } catch (e) {
      if (e?.response?.status === 422) return apiClient.post("/timer/schedule", null, { params: body });
      throw e;
    }
  },
  timerEnd: async (roundId) => {
    const body = { roundId };
    try { return await apiClient.post("/timer/end", body); } catch (e) {
      if (e?.response?.status === 422) return apiClient.post("/timer/end", null, { params: body });
      throw e;
    }
  },
  getProblems: async () => {
    try { return await apiClient.get("/problems"); } catch (e) {
      if (e?.response?.status === 404) {
        try { return await apiClient.get("/api/problems"); } catch (e2) {
          if (e2?.response?.status === 404) return apiClient.get("/api/contest/problems");
          throw e2;
        }
      }
      throw e;
    }
  },
  getProblem: async (id) => {
    try { return await apiClient.get(`/problems/${id}`); } catch (e) {
      if (e?.response?.status === 404) return apiClient.get(`/api/problems/${id}`);
      throw e;
    }
  },

  runCode: (data) => apiClient.post("/run", data),
  submitCode: async (data) => {
    try { return await apiClient.post("/submit", data); } catch (e) {
      if (e?.response?.status === 404) return apiClient.post("/api/contest/submit", data);
      throw e;
    }
  },

  getUserSubmissions: async (userId) => {
    try { return await apiClient.get(`/submissions/${userId}`); } catch (e) {
      if (e?.response?.status === 404) return apiClient.get(`/api/contest/submissions/${userId}`);
      throw e;
    }
  },

  // admin
  getParticipants: async () => {
    try { return await apiClient.get("/admin/participants"); } catch (e) {
      if (e?.response?.status === 404) return apiClient.get("/api/admin/participants");
      throw e;
    }
  },
  addParticipant: async (name, email, password) => {
    const params = { name, email };
    if (password) params.password = password;
    try { return await apiClient.post("/api/admin/participant", null, { params }); } catch (e) {
      throw e;
    }
  },
  getParticipant: async (id) => {
    try { return await apiClient.get(`/admin/participant/${id}`); } catch (e) {
      if (e?.response?.status === 404) return apiClient.get(`/api/admin/participant/${id}`);
      throw e;
    }
  },
  toggleEligibility: async (id) => {
    try { return await apiClient.patch(`/admin/participant/${id}/eligibility`); } catch (e) {
      if (e?.response?.status === 404) return apiClient.patch(`/api/admin/participant/${id}/eligibility`);
      throw e;
    }
  },
  setParticipantPassword: async (id, password) => {
    try { return await apiClient.patch(`/admin/participant/${id}/password`, null, { params: { password } }); } catch (e) {
      if (e?.response?.status === 404) return apiClient.patch(`/api/admin/participant/${id}/password`, null, { params: { password } });
      throw e;
    }
  },
  addProblem: (data) => apiClient.post("/problems", data),
  updateProblem: (id, data) => apiClient.put(`/problems/${id}`, data),
  deleteProblem: (id) => apiClient.delete(`/problems/${id}`),
};

export default apiClient;
