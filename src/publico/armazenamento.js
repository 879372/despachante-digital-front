// Pedidos comprados neste aparelho (token de acesso ao resultado). Só no navegador do comprador.
const CHAVE = "desp_meus_pedidos";

export function meusPedidos() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch { return []; }
}

export function guardarPedido({ token, ref, placa, servico }) {
  if (!token) return;
  try {
    const lista = meusPedidos().filter((p) => p.token !== token);
    lista.unshift({ token, ref, placa, servico, salvo_em: new Date().toISOString() });
    localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, 50)));
  } catch { /* navegador sem storage: segue sem lembrar */ }
}

export function tokenPorRef(ref) {
  return meusPedidos().find((p) => p.ref === ref)?.token;
}
