import { ArrowLeft, CheckCircle2, ExternalLink, Headphones, MessageCircle, RotateCcw, Search, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, brl } from "../api";
import { Botao, Esqueleto, PlacaMini, useToast, Vazio } from "../components/ui";
import { useConversa } from "../chat/hooks";
import { Compositor, Mensagens, tempoRelativo } from "../chat/Thread";
import { mascaraDocumento, mascaraTelefone } from "../mascaras";

const RESPOSTAS = [
  "Olá! Já estou verificando para você.",
  "O CRLV-e é emitido pelo órgão em até 3 dias úteis. Avisaremos assim que ficar pronto.",
  "Pagamento confirmado e saldo liberado! ✅",
  "Para adicionar saldo, vá em Carteira > Adicionar saldo e pague por Pix ou cartão.",
];

export default function Atendimento({ aoLer }) {
  const [status, setStatus] = useState("ABERTA");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState(null);
  const [selecionada, setSelecionada] = useState(null);

  useEffect(() => {
    const carregar = () => api(`/chat/conversas/?status=${status}&busca=${encodeURIComponent(busca)}`).then(setLista).catch(() => {});
    const t0 = setTimeout(carregar, busca ? 250 : 0);
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 8000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [status, busca, selecionada]);

  return (
    <>
      <div className="pagina-topo"><div><h1>Atendimento</h1><p>Converse com os clientes pelo chat interno.</p></div></div>
      <div className={`atendimento ${selecionada ? "com-conversa" : ""}`}>
        <aside className="atendimento-lista cartao">
          <div className="busca"><Search size={17} /><input placeholder="Cliente, CPF, placa ou assunto" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <div className="pilulas" style={{ margin: "12px 0" }}>
            {[["ABERTA", "Abertas"], ["RESOLVIDA", "Resolvidas"], ["", "Todas"]].map(([v, n]) => (
              <button key={v} className={`pilula ${status === v ? "ativa" : ""}`} onClick={() => setStatus(v)}>{n}</button>
            ))}
          </div>
          {!lista ? <Esqueleto linhas={5} /> : lista.length === 0 ? (
            <Vazio icone={Headphones} titulo="Nenhuma conversa" texto={status === "ABERTA" ? "Tudo respondido por aqui. 🎉" : "Nada encontrado."} />
          ) : (
            <div className="chat-lista">
              {lista.map((c) => (
                <button key={c.id} className={`chat-item ${selecionada === c.id ? "ativo" : ""}`} onClick={() => setSelecionada(c.id)}>
                  <div className="chat-item-topo">
                    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                      <div className="avatar">{c.cliente.nome.slice(0, 2).toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}><strong>{c.cliente.nome}{c.cliente.visitante && <span className="selo azul" style={{ marginLeft: 6, padding: "1px 6px" }}>site</span>}</strong><span className="chat-assunto">{c.assunto}</span></div>
                    </div>
                    <time>{tempoRelativo(c.ultima_mensagem_em)}</time>
                  </div>
                  <div className="chat-item-baixo">
                    <span>{c.ultima ? `${c.ultima.da_equipe ? "Você: " : ""}${c.ultima.texto}` : ""}</span>
                    {c.nao_lidas > 0 && <span className="chat-contador">{c.nao_lidas}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="atendimento-conversa cartao">
          {selecionada ? <Painel id={selecionada} onVoltar={() => setSelecionada(null)} aoLer={aoLer} /> : (
            <Vazio icone={MessageCircle} titulo="Selecione uma conversa" texto="As mensagens dos clientes aparecem à esquerda." />
          )}
        </section>
      </div>
    </>
  );
}

function Painel({ id, onVoltar, aoLer }) {
  const toast = useToast();
  const { conversa, setConversa, mensagens, enviar } = useConversa(id);
  const [rascunho, setRascunho] = useState(0);
  useEffect(() => { if (conversa) aoLer?.(); }, [conversa?.id]); // eslint-disable-line

  const mudarStatus = async (novo) => {
    await api(`/chat/conversas/${id}/status/`, { metodo: "POST", corpo: { status: novo } });
    setConversa({ ...conversa, status: novo });
    toast(novo === "RESOLVIDA" ? "Conversa marcada como resolvida." : "Conversa reaberta.");
  };

  if (!conversa) return <div style={{ padding: 24 }}><Esqueleto linhas={4} /></div>;
  const c = conversa.cliente;
  return (
    <div className="painel-conversa">
      <div className="chat-topo">
        <button className="btn-icone so-movel" onClick={onVoltar} aria-label="Voltar"><ArrowLeft size={18} /></button>
        <div className="avatar">{c.nome.slice(0, 2).toUpperCase()}</div>
        <div className="chat-topo-texto">
          <strong>{c.nome}</strong>
          <span>{c.visitante ? `Visitante do site · ${c.telefone}` : [c.documento && mascaraDocumento(c.documento), c.telefone && mascaraTelefone(c.telefone)].filter(Boolean).join(" · ") || c.usuario}</span>
        </div>
        {c.visitante ? <span className="selo azul esconde-movel">Site</span> : <span className="selo cinza esconde-movel"><Wallet size={13} />{brl(c.saldo_centavos)}</span>}
        {conversa.status === "ABERTA"
          ? <Botao variante="sucesso" icone={CheckCircle2} onClick={() => mudarStatus("RESOLVIDA")}><span className="esconde-movel">Resolver</span></Botao>
          : <Botao icone={RotateCcw} onClick={() => mudarStatus("ABERTA")}><span className="esconde-movel">Reabrir</span></Botao>}
      </div>
      <div className="chat-contexto">
        <strong>{conversa.assunto}</strong>
        {conversa.pedido && (
          <Link to={`/pedidos/${conversa.pedido.id}`} className="chat-pedido faixa">
            <PlacaMini placa={conversa.pedido.placa} /><span>{conversa.pedido.servico}</span><ExternalLink size={14} />
          </Link>
        )}
      </div>
      <Mensagens mensagens={mensagens} />
      <div className="respostas-rapidas">
        {RESPOSTAS.map((r) => (
          <button key={r} onClick={async () => { try { await enviar({ texto: r }); setRascunho(rascunho + 1); } catch (e) { toast(e.message, "erro"); } }}>{r}</button>
        ))}
      </div>
      <Compositor onEnviar={enviar} placeholder="Responder ao cliente…" />
    </div>
  );
}
