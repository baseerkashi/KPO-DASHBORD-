import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  timeout: 120000,
  withCredentials: true, // Required for httpOnly cookie auth
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("vertex_jwt");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthMe = error.config?.url?.includes("/auth/me");
    const isPublicPath =
      typeof window !== "undefined" &&
      (window.location.pathname === "/" ||
        window.location.pathname === "/login" ||
        window.location.pathname === "/signup");

    if (error.response?.status === 401 && !isAuthMe && !isPublicPath) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  return data;
}

export async function signup(email, password, name) {
  const { data } = await api.post("/auth/signup", { email, password, name });
  return data;
}

export async function loginDemo() {
  const { data } = await api.post("/auth/demo");
  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  sessionStorage.removeItem("vertex_jwt");
  sessionStorage.removeItem("vertex_authenticated");
  return data;
}

export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function fetchClients() {
  const { data } = await api.get("/clients");
  return data;
}

export async function createClient(company_name, industry) {
  const { data } = await api.post("/clients", { company_name, industry });
  return data;
}

export async function deleteClient(clientId) {
  const { data } = await api.delete(`/clients/${clientId}`);
  return data;
}

export async function fetchClientAnalyses(clientId) {
  const { data } = await api.get(`/clients/${clientId}/analyses`);
  return data;
}

export async function compareClientAnalyses(clientId, ids = []) {
  const query = ids && ids.length ? `?ids=${ids.join(",")}` : "";
  const { data } = await api.get(`/clients/${clientId}/compare${query}`);
  return data;
}

export async function uploadAndAnalyzeCsv(file, clientId, periodTitle) {
  const form = new FormData();
  form.append("file", file);
  form.append("client_id", clientId);
  form.append("period_title", periodTitle);
  const { data } = await api.post("/analyses", form);
  return data; // Returns { id: <analysis_id> }
}

export async function fetchAnalysis(analysisId) {
  const { data } = await api.get(`/analyses/${analysisId}`);
  return data;
}

export async function deleteAnalysis(analysisId) {
  const { data } = await api.delete(`/analyses/${analysisId}`);
  return data;
}

export async function fetchInsights(analysisId) {
  const { data } = await api.post(`/analyses/${analysisId}/insights`);
  return data;
}

export async function fetchSimulationInsights(context, question) {
  const { data } = await api.post("/insights/simulate", { context, question });
  return data;
}

export async function updateInterviewContext(analysisId, interviewContext) {
  const { data } = await api.patch(`/analyses/${analysisId}/interview`, interviewContext);
  return data;
}

export async function saveSelectedLevers(analysisId, selectedLeverIds) {
  const { data } = await api.patch(`/analyses/${analysisId}/interview`, { selectedLeverIds });
  return data;
}
