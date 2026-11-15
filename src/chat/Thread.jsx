import { FileText, Paperclip, SendHorizontal, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { baixar } from "../api";
import { Esqueleto, useToast } from "../components/ui";

const hora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
function dia(iso) {
  const d = new Date(iso), hoje = new Date(), ontem = new Date(Date.now() - 864e5);
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

export function Mensagens({ mensagens, vazio }) {
  const fim = useRef(null);
  const caixa = useRef(null);
  const qtd = mensagens?.length || 0;
  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const pertoDoFim = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (pertoDoFim || qtd <= 1 || mensagens?.[qtd - 1]?.minha) fim.current?.scrollIntoView({ block: "end" });
  }, [qtd]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [mensagens === null]); // eslint-disable-line

  if (!mensagens) return <div className="chat-mensagens"><Esqueleto linhas={4} /></div>;
  let diaAnterior = "";
  return (
    <div className="chat-mensagens" ref={caixa}>
      {mensagens.length === 0 && vazio}
      {mensagens.map((m) => {
        const d = dia(m.criado_em);
        const separador = d !== diaAnterior;
        diaAnterior = d;
        return (
          <div key={m.id}>
            {separador && <div className="chat-dia"><span>{d}</span></div>}
            <div className={`balao ${m.minha ? "meu" : "outro"} ${m.da_equipe ? "equipe" : ""}`}>
              {!m.minha && <span className="balao-autor">{m.autor}</span>}
              {m.texto && <p>{m.texto}</p>}
              {m.anexo && (
                <button type="button" className="balao-anexo" onClick={() => baixar(m.anexo.url, m.anexo.nome)}>
                  <FileText size={16} /><span>{m.anexo.nome}</span>
                </button>
              )}
              <time>{hora(m.criado_em)}</time>
            </div>
          </div>
        );
      })}
      <div ref={fim} />
    </div>
  );
}

export function Compositor({ onEnviar, desabilitado, placeholder = "Escreva sua mensagem…", autoFocus }) {
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const area = useRef(null);
  const arquivo = useRef(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [texto]);

  const escolher = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast("Arquivo muito grande (máx. 5 MB).", "erro"); return; }
    if (!/\.(pdf|png|jpe?g|webp)$/i.test(f.name)) { toast("Envie PDF ou imagem.", "erro"); return; }
    setAnexo(f);
  };

  const enviar = async () => {
    const t = texto.trim();
    if ((!t && !anexo) || enviando) return;
    setEnviando(true);
    try {
      await onEnviar({ texto: t, anexo });
      setTexto(""); setAnexo(null);
      if (arquivo.current) arquivo.current.value = "";
    } catch (e) { toast(e.status === 429 ? "Muitas mensagens seguidas. Aguarde um pouco." : e.message, "erro"); }
    setEnviando(false);
    area.current?.focus();
  };

  return (
    <div className="chat-compositor">
      {anexo && (
        <div className="chat-anexo-previa">
          <Paperclip size={14} /><span>{anexo.name}</span>
          <button type="button" onClick={() => { setAnexo(null); arquivo.current.value = ""; }} aria-label="Remover anexo"><X size={14} /></button>
        </div>
      )}
      <div className="chat-linha">
        <button type="button" className="btn-icone" onClick={() => arquivo.current.click()} disabled={desabilitado} aria-label="Anexar arquivo" title="Anexar PDF ou imagem">
          <Paperclip size={19} />
        </button>
        <input ref={arquivo} type="file" accept=".pdf,image/*" hidden onChange={(e) => escolher(e.target.files[0])} />
        <textarea
          ref={area}
          rows={1}
          value={texto}
          autoFocus={autoFocus}
          maxLength={2000}
          placeholder={placeholder}
          disabled={desabilitado}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          onPaste={(e) => { const f = e.clipboardData.files?.[0]; if (f) { e.preventDefault(); escolher(f); } }}
        />
        <button type="button" className="chat-enviar" onClick={enviar} disabled={desabilitado || enviando || (!texto.trim() && !anexo)} aria-label="Enviar">
          <SendHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}

export const tempoRelativo = (iso) => {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return hora(iso);
  if (s < 172800) return "ontem";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};
