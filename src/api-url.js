// Origem pública do nosso backend, sem credenciais.
const origem = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const base = origem.endsWith("/api") ? origem : `${origem}/api`;

export const apiUrl = (caminho) => `${base}/${caminho.replace(/^\/+/, "")}`;
