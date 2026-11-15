import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

/** Contador de mensagens não lidas (consulta a cada `intervalo` ms). */
export function useNaoLidas(intervalo = 15000) {
  const [total, setTotal] = useState(0);
  const atualizar = useCallback(() => api("/chat/nao-lidas/").then((r) => setTotal(r.total)).catch(() => {}), []);
  useEffect(() => {
    atualizar();
    const t = setInterval(() => { if (!document.hidden) atualizar(); }, intervalo);
    return () => clearInterval(t);
  }, [atualizar, intervalo]);
  return [total, atualizar];
}

/** Mensagens de uma conversa, buscando só as novas a cada `intervalo` ms. */
export function useConversa(id, intervalo = 4000) {
  const [conversa, setConversa] = useState(null);
  const [mensagens, setMensagens] = useState(null);
  const ultimo = useRef(0);

  const buscar = useCallback(async (inicial = false) => {
    if (!id) return;
    const q = !inicial && ultimo.current ? `?depois=${ultimo.current}` : "";
    const r = await api(`/chat/conversas/${id}/mensagens/${q}`);
    setConversa(r.conversa);
    if (inicial) setMensagens(r.mensagens);
    else if (r.mensagens.length) setMensagens((m) => [...(m || []), ...r.mensagens.filter((n) => !(m || []).some((x) => x.id === n.id))]);
    if (r.mensagens.length) ultimo.current = r.mensagens[r.mensagens.length - 1].id;
  }, [id]);

  useEffect(() => {
    ultimo.current = 0;
    setMensagens(null); setConversa(null);
    if (!id) return;
    buscar(true).catch(() => setMensagens([]));
    const t = setInterval(() => { if (!document.hidden) buscar().catch(() => {}); }, intervalo);
    return () => clearInterval(t);
  }, [id, buscar, intervalo]);

  const enviar = async ({ texto, anexo }) => {
    const fd = new FormData();
    if (texto) fd.append("texto", texto);
    if (anexo) fd.append("anexo", anexo);
    const m = await api(`/chat/conversas/${id}/mensagens/`, { metodo: "POST", corpo: fd });
    setMensagens((lista) => [...(lista || []), m]);
    ultimo.current = Math.max(ultimo.current, m.id);
    return m;
  };

  return { conversa, setConversa, mensagens, enviar, recarregar: () => buscar(true) };
}
