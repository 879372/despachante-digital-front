import { MessageCircle, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Botao, Campo, useToast } from "../components/ui";
import { Mensagens } from "../chat/Thread";

const CHAVE = "desp_chat_visitante";
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch { return null; } };

export default function ChatVisitante() {
  const [aberto, setAberto] = useState(false);
  const [sessao, setSessao] = useState(ler);
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    if (!sessao || aberto) return;
    const verificar = () => api(`/publico/chat/${sessao.token}/nao-lidas/`).then((r) => setNaoLidas(r.total)).catch(() => {});
    verificar();
    const t = setInterval(() => { if (!document.hidden) verificar(); }, 20000);
    return () => clearInterval(t);
  }, [sessao, aberto]);

  return (
    <>
      {aberto && (
        <div className="chat-painel" role="dialog" aria-label="Fale com a gente">
          <div className="chat-topo">
            <div className="chat-topo-texto"><strong>Fale com a gente</strong><span><span className="ponto-online" />Respondemos por aqui</span></div>
            <button className="btn-icone" onClick={() => setAberto(false)} aria-label="Fechar"><X size={18} /></button>
          </div>
          {sessao ? <Conversa sessao={sessao} onInvalida={() => { localStorage.removeItem(CHAVE); setSessao(null); }} />
            : <Inicio onCriada={(s) => { try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch { /* sem storage */ } setSessao(s); }} />}
        </div>
      )}
      <button className={`chat-bolha ${aberto ? "aberta" : ""}`} onClick={() => { setAberto(!aberto); setNaoLidas(0); }} aria-label={aberto ? "Fechar chat" : "Abrir chat"}>
        {aberto ? <X size={24} /> : <MessageCircle size={24} />}
        {!aberto && naoLidas > 0 && <span className="chat-bolha-contador">{naoLidas}</span>}
      </button>
    </>
  );
}

function Inicio({ onCriada }) {
  const toast = useToast();
  const [f, setF] = useState({ nome: "", contato: "", texto: "" });
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault();
    if (f.nome.trim().length < 2 || f.contato.trim().length < 5 || !f.texto.trim()) { toast("Preencha nome, contato e mensagem.", "erro"); return; }
    setEnviando(true);
    try { onCriada(await api("/publico/chat/", { metodo: "POST", corpo: f })); }
    catch (err) { toast(err.status === 429 ? "Muitas tentativas. Aguarde um minuto." : err.message, "erro"); }
    setEnviando(false);
  };
  return (
    <form className="chat-corpo chat-nova" onSubmit={enviar}>
      <div className="balao outro equipe" style={{ marginBottom: 16 }}>
        <span className="balao-autor">Equipe</span>
        <p>Olá! 👋 Deixe seu nome e um contato, e escreva sua dúvida. Respondemos por aqui mesmo.</p>
      </div>
      <Campo rotulo="Seu nome"><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus /></Campo>
      <Campo rotulo="WhatsApp ou e-mail"><input value={f.contato} onChange={(e) => setF({ ...f, contato: e.target.value })} /></Campo>
      <Campo rotulo="Mensagem"><textarea rows={3} value={f.texto} maxLength={2000} onChange={(e) => setF({ ...f, texto: e.target.value })} /></Campo>
      <Botao variante="primario" className="btn-grande" icone={Send} carregando={enviando}>Enviar</Botao>
    </form>
  );
}

function Conversa({ sessao, onInvalida }) {
  const toast = useToast();
  const [mensagens, setMensagens] = useState(null);
  const [texto, setTexto] = useState("");
  const ultimo = useRef(0);

  const buscar = useCallback(async (inicial) => {
    try {
      const r = await api(`/publico/chat/${sessao.token}/mensagens/${!inicial && ultimo.current ? `?depois=${ultimo.current}` : ""}`);
      if (inicial) setMensagens(r.mensagens);
      else if (r.mensagens.length) setMensagens((m) => [...(m || []), ...r.mensagens.filter((n) => !(m || []).some((x) => x.id === n.id))]);
      if (r.mensagens.length) ultimo.current = r.mensagens[r.mensagens.length - 1].id;
    } catch (e) { if (e.status === 404) onInvalida(); }
  }, [sessao.token, onInvalida]);

  useEffect(() => {
    buscar(true);
    const t = setInterval(() => { if (!document.hidden) buscar(false); }, 4000);
    return () => clearInterval(t);
  }, [buscar]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t) return;
    try {
      const m = await api(`/publico/chat/${sessao.token}/mensagens/`, { metodo: "POST", corpo: { texto: t } });
      setMensagens((l) => [...(l || []), m]); ultimo.current = Math.max(ultimo.current, m.id); setTexto("");
    } catch (e) { toast(e.status === 429 ? "Muitas mensagens seguidas. Aguarde um pouco." : e.message, "erro"); }
  };

  return (
    <>
      <Mensagens mensagens={mensagens} />
      <div className="chat-compositor">
        <div className="chat-linha">
          <textarea rows={1} value={texto} maxLength={2000} placeholder="Escreva sua mensagem…" autoFocus
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
          <button className="chat-enviar" onClick={enviar} disabled={!texto.trim()} aria-label="Enviar"><Send size={18} /></button>
        </div>
      </div>
    </>
  );
}
