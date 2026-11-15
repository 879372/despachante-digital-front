import { AlertCircle, CheckCircle2, Clock, Info, Loader2, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [itens, setItens] = useState([]);
  const toast = useCallback((texto, tipo = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItens((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => setItens((l) => l.filter((t) => t.id !== id)), 4000);
  }, []);
  const Icone = { ok: CheckCircle2, erro: AlertCircle, info: Info };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {itens.map((t) => {
          const I = Icone[t.tipo] || Info;
          return <div key={t.id} className={`toast ${t.tipo}`}><I size={18} /><span>{t.texto}</span></div>;
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Modal ---------- */
export function Modal({ aberto, titulo, onFechar, children, rodape, largura = 440 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === "Escape" && onFechar?.();
    document.addEventListener("keydown", esc);
    ref.current?.querySelector("input, button.btn-primario")?.focus();
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar?.()}>
      <div className="modal" style={{ maxWidth: largura }} ref={ref} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo">
          <h3>{titulo}</h3>
          <button className="btn-icone" onClick={onFechar} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  );
}

/* ---------- Botão ---------- */
export function Botao({ variante = "secundario", carregando, icone: Icone, children, className = "", ...props }) {
  return (
    <button className={`btn btn-${variante} ${className}`} disabled={carregando || props.disabled} {...props}>
      {carregando ? <Loader2 size={18} className="girar" /> : Icone && <Icone size={18} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/* ---------- Status ---------- */
const STATUS = {
  PENDENTE: ["amarelo", Clock], PROCESSANDO: ["azul", Loader2], SUCESSO: ["verde", CheckCircle2],
  SEM_RESULTADO: ["cinza", Info], FALHA: ["vermelho", XCircle],
  AGUARDANDO: ["amarelo", Clock], APROVADA: ["verde", CheckCircle2], RECUSADA: ["vermelho", XCircle],
};
export function Status({ valor, texto }) {
  const [cor, I] = STATUS[valor] || ["cinza", Info];
  return <span className={`selo ${cor}`}><I size={13} className={valor === "PROCESSANDO" ? "girar" : ""} />{texto || valor}</span>;
}

/* ---------- Placa Mercosul ---------- */
export function PlacaInput({ valor, onChange, ...props }) {
  return (
    <div className="placa-mercosul">
      <div className="placa-faixa"><span>BRASIL</span><span className="placa-bandeira" aria-hidden /></div>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))}
        placeholder="ABC1D23"
        autoComplete="off"
        spellCheck={false}
        aria-label="Placa do veículo"
        {...props}
      />
    </div>
  );
}

export function PlacaMini({ placa }) {
  return <span className="placa-mini">{placa}</span>;
}

/* ---------- Diversos ---------- */
export function Vazio({ icone: I, titulo, texto, children }) {
  return (
    <div className="vazio">
      {I && <div className="vazio-icone"><I size={26} /></div>}
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

export function Esqueleto({ linhas = 3 }) {
  return <div className="esqueleto">{Array.from({ length: linhas }, (_, i) => <div key={i} />)}</div>;
}

export function Campo({ rotulo, dica, erro, children }) {
  return (
    <label className={`campo ${erro ? "com-erro" : ""}`}>
      <span className="campo-rotulo">{rotulo}</span>
      {children}
      {erro ? <span className="campo-erro">{erro}</span> : dica && <span className="campo-dica">{dica}</span>}
    </label>
  );
}
