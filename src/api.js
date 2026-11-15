// Toda chamada vai para o NOSSO backend (/api). Nenhuma URL de terceiros aqui.
const TOKEN = "desp_token";
const REFRESH = "desp_refresh";

export const sessao = {
  get token() { return localStorage.getItem(TOKEN); },
  salvar({ access, refresh }) {
    if (access) localStorage.setItem(TOKEN, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  sair() { localStorage.removeItem(TOKEN); localStorage.removeItem(REFRESH); },
};

async function renovar() {
  const refresh = localStorage.getItem(REFRESH);
  if (!refresh) return false;
  const r = await fetch("/api/auth/refresh/", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }),
  });
  if (!r.ok) return false;
  sessao.salvar(await r.json());
  return true;
}

function mensagemErro(dados, status) {
  if (!dados) return `Erro ${status}`;
  if (typeof dados.detail === "string") return dados.detail;
  const primeiro = Object.values(dados)[0];
  if (Array.isArray(primeiro)) return primeiro[0];
  if (typeof primeiro === "string") return primeiro;
  return `Erro ${status}`;
}

export async function api(caminho, { metodo = "GET", corpo, arquivo = false, tentou = false } = {}) {
  const headers = {};
  if (sessao.token) headers.Authorization = `Bearer ${sessao.token}`;
  let body;
  if (corpo instanceof FormData) body = corpo;
  else if (corpo !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(corpo); }

  const r = await fetch(`/api${caminho}`, { method: metodo, headers, body });
  if (r.status === 401 && !tentou && (await renovar())) {
    return api(caminho, { metodo, corpo, arquivo, tentou: true });
  }
  if (r.status === 401) { sessao.sair(); window.dispatchEvent(new Event("sessao-expirada")); }
  if (arquivo && r.ok) return r;
  const dados = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) { const e = new Error(mensagemErro(dados, r.status)); e.status = r.status; e.dados = dados || {}; throw e; }
  return dados;
}

export async function baixar(caminho, nomePadrao) {
  const r = await api(caminho, { arquivo: true });
  const blob = await r.blob();
  const cd = r.headers.get("Content-Disposition") || "";
  const nome = (cd.match(/filename="?([^"]+)"?/) || [])[1] || nomePadrao;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const brl = (centavos) =>
  ((centavos ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataHora = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—");

export const formatarPlaca = (p) => (p && p.length === 7 ? `${p.slice(0, 3)}-${p.slice(3)}` : p);
