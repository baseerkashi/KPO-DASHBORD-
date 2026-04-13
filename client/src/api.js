import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  timeout: 120000,
});

export async function uploadCsv(file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload", form);
  return data;
}

export async function analyzeData(rows) {
  const { data } = await api.post("/analyze", { data: rows });
  return data;
}

export async function fetchInsights(insightContext) {
  const { data } = await api.post("/insights", { insightContext });
  return data;
}

export async function fetchSimulationInsights(context, question) {
  const { data } = await api.post("/insights/simulate", { context, question });
  return data;
}
