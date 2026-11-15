import { ArrowLeft, CheckCircle2, ChevronRight, MessageCircle, MessageSquarePlus, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Botao, Esqueleto, PlacaMini, Vazio } from "../components/ui";
import { useNaoLidas, useConversa } from "./hooks";
import { Compositor, Mensagens, tempoRelativo } from "./Thread";

const Ctx = createContext({ abrir: () => {} });
export const useChat = () => useContext(Ctx);

export function ChatProvider({ children, ativo }) {
  const [aberto, setAberto] = useState(false);
  const [tela, setTela] = useState({ tipo: "lista" }); // lista | nova | conversa
  const abrir = useCallback((opcoes = {}) => {
    setTela(opcoes.pedido ? { tipo: "nova", pedido: opcoes.pedido } : { tipo: "lista" });
    setAberto(true);
  }, []);
  return (
    <Ctx.Provider value={{ abrir }}>
      {children}
      {ativo && <ChatWidget aberto={aberto} setAberto={setAberto} tela={tela} setTela={setTela} />}
    </Ctx.Provider>
  );
}

function ChatWidget({ aberto, setAberto, tela, setTela }) {
  const [naoLidas, atualizarNaoLidas] = useNaoLidas(aberto ? 8000 : 15000);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setAberto(false);
    if (aberto) document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, setAberto]);

  return (
    <>
      {aberto && (
        <div className="chat-painel" role="dialog" aria-label="Chat de suporte">
          {tela.tipo === "lista" && <Lista onAbrir={(id) => setTela({ tipo: "conversa", id })} onNova={() => setTela({ tipo: "nova" })} onFechar={() => setAberto(false)} />}
          {tela.tipo === "nova" && <Nova pedido={tela.pedido} onVoltar={() => setTela({ tipo: "lista" })} onCriada={(id) => setTela({ tipo: "conversa", id })} onFechar={() => setAberto(false)} />}
          {tela.tipo === "conversa" && <Conversa id={tela.id} onVoltar={() => { setTela({ tipo: "lista" }); atualizarNaoLidas(); }} onFechar={() => setAberto(false)} />}
        </div>
      )}
      <button className={`chat-bolha ${aberto ? "aberta" : ""}`} onClick={() => { setAberto(!aberto); if (!aberto) atualizarNaoLidas(); }} aria-label={aberto ? "Fechar chat" : "Abrir chat de suporte"}>
        {aberto ? <X size={24} /> : <MessageCircle size={24} />}
        {!aberto && naoLidas > 0 && <span className="chat-bolha-contador">{naoLidas > 9 ? "9+" : naoLidas}</span>}
      </button>
    </>
  );
}

function Topo({ titulo, subtitulo, onVoltar, onFechar, extra }) {
  return (
    <div className="chat-topo">
      {onVoltar && <button className="btn-icone" onClick={onVoltar} aria-label="Voltar"><ArrowLeft size={18} /></button>}
      <div className="chat-topo-texto"><strong>{titulo}</strong>{subtitulo && <span>{subtitulo}</span>}</div>
      {extra}
      <button className="btn-icone" onClick={onFechar} aria-label="Fechar"><X size={18} /></button>
    </div>
  );
}

function Lista({ onAbrir, onNova, onFechar }) {
  const [lista, setLista] = useState(null);
  useEffect(() => {
    const carregar = () => api("/chat/conversas/").then(setLista).catch(() => setLista([]));
    carregar();
    const t = setInterval(carregar, 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <Topo titulo="Suporte" subtitulo={<><span className="ponto-online" />Respondemos por aqui mesmo</>} onFechar={onFechar} />
      <div className="chat-corpo">
        {!lista ? <div style={{ padding: 16 }}><Esqueleto /></div> : lista.length === 0 ? (
          <Vazio icone={MessageCircle} titulo="Como podemos ajudar?" texto="Tire dúvidas sobre pedidos, recargas ou o uso do sistema.">
            <Botao variante="primario" icone={MessageSquarePlus} onClick={onNova}>Iniciar conversa</Botao>
          </Vazio>
        ) : (
          <div className="chat-lista">
            {lista.map((c) => (
              <button key={c.id} className="chat-item" onClick={() => onAbrir(c.id)}>
                <div className="chat-item-topo">
                  <strong>{c.assunto}</strong>
                  <time>{tempoRelativo(c.ultima_mensagem_em)}</time>
                </div>
                <div className="chat-item-baixo">
                  <span>{c.ultima ? `${c.ultima.da_equipe ? "Equipe: " : "Você: "}${c.ultima.texto}` : ""}</span>
                  {c.nao_lidas > 0 ? <span className="chat-contador">{c.nao_lidas}</span> : c.status === "RESOLVIDA" && <CheckCircle2 size={15} className="resolvida" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {lista?.length > 0 && <div className="chat-rodape"><Botao variante="primario" className="btn-grande" icone={MessageSquarePlus} onClick={onNova}>Nova conversa</Botao></div>}
    </>
  );
}

function Nova({ pedido, onVoltar, onCriada, onFechar }) {
  const criar = async ({ texto, anexo }) => {
    const fd = new FormData();
    if (texto) fd.append("texto", texto);
    if (anexo) fd.append("anexo", anexo);
    if (pedido) fd.append("pedido", pedido.id);
    const c = await api("/chat/conversas/", { metodo: "POST", corpo: fd });
    onCriada(c.id);
  };
  return (
    <>
      <Topo titulo="Nova conversa" subtitulo="Conte o que você precisa" onVoltar={onVoltar} onFechar={onFechar} />
      <div className="chat-corpo chat-nova">
        {pedido && (
          <div className="chat-pedido"><span>Sobre o pedido</span><div><PlacaMini placa={pedido.placa} /> {pedido.servico}</div></div>
        )}
        <div className="balao outro equipe" style={{ marginTop: 8 }}>
          <span className="balao-autor">Equipe</span>
          <p>Olá! 👋 Escreva sua dúvida que nossa equipe responde por aqui. Se for sobre um pagamento, pode anexar o comprovante.</p>
        </div>
      </div>
      <Compositor onEnviar={criar} autoFocus placeholder="Descreva sua dúvida…" />
    </>
  );
}

function Conversa({ id, onVoltar, onFechar }) {
  const { conversa, mensagens, enviar } = useConversa(id);
  return (
    <>
      <Topo
        titulo={conversa?.assunto || "Conversa"}
        subtitulo={conversa?.status === "RESOLVIDA" ? "Resolvida · escreva para reabrir" : "Equipe de suporte"}
        onVoltar={onVoltar}
        onFechar={onFechar}
      />
      {conversa?.pedido && (
        <Link className="chat-pedido faixa" to={`/pedidos/${conversa.pedido.id}`} onClick={onFechar}>
          <PlacaMini placa={conversa.pedido.placa} /><span>{conversa.pedido.servico}</span><ChevronRight size={16} />
        </Link>
      )}
      <Mensagens mensagens={mensagens} />
      <Compositor onEnviar={enviar} autoFocus />
    </>
  );
}
