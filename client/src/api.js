import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("vertex_jwt");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  return data;
}

export async function signup(email, password, name) {
  const { data } = await api.post("/auth/signup", { email, password, name });
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
