// src/utils/api.js
import axios from 'axios';

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8000";

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

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
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const api = {
  login: (email, password) => apiClient.post("/auth/login", { email, password }),
  register: (name, email, password) => apiClient.post("/auth/register", { name, email, password }),

  // contest
  getRoundWindow: (roundId) => apiClient.get("/timer/window", { params: { roundId } }),
  startRoundTimer: (roundId, durationSeconds) => apiClient.post("/timer/start", { roundId, durationSeconds }),
  configureRoundWindow: (roundId, { start, end, locked, durationSeconds } = {}) =>
    apiClient.post("/timer/configure", { roundId, start, end, locked, durationSeconds }),
  endRound: (roundId) => apiClient.post("/timer/end", { roundId }),
  getProblems: () => apiClient.get("/problems"),
  getProblem: (id) => apiClient.get(`/problems/${id}`),

  // rebuilt run/submit using contest app API
  runCode: (data) => apiClient.post("/api/contest/run", data),
  submitCode: (data) => apiClient.post("/api/contest/submit", data),
  testCode: (data) => apiClient.post("/api/contest/test", data),

  getUserSubmissions: (userId) => apiClient.get(`/submissions/${userId}`),

  // admin
  getParticipants: () => apiClient.get("/admin/participants"),
  addProblem: (data) => apiClient.post("/admin/problem", data),
  updateProblem: (id, data) => apiClient.put(`/admin/problem/${id}`, data),
  deleteProblem: (id) => apiClient.delete(`/admin/problem/${id}`),
  // timer controls
  pauseRound: (roundId) => apiClient.post("/timer/pause", { roundId }),
  resumeRound: (roundId) => apiClient.post("/timer/resume", { roundId }),
  restartRound: (roundId, durationSeconds) => apiClient.post("/timer/restart", { roundId, durationSeconds }),
};

export default apiClient;
