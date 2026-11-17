import { ArrowLeft, Check, Copy, Download, FileText, Loader2, MessageCircle, RefreshCw, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, baixar, brl, dataHora } from "../api";
import { useAuth } from "../auth";
import { useChat } from "../chat/ChatWidget";
import { Botao, Esqueleto, PlacaMini, Status, useToast } from "../components/ui";

const rotulo = (k) => String(k).replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

function Dados({ valor }) {
  if (valor === null || valor === undefined || valor === "") return <span className="suave">—</span>;
  if (Array.isArray(valor)) return <div>{valor.map((v, i) => <Dados key={i} valor={v} />)}</div>;
  if (typeof valor === "object") {
    return <dl className="dados">{Object.entries(valor).map(([k, v]) => <div key={k}><dt>{rotulo(k)}</dt><dd><Dados valor={v} /></dd></div>)}</dl>;
  }
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
}

function LinhaTempo({ pedido }) {
  const falhou = ["FALHA", "SEM_RESULTADO"].includes(pedido.status);
  const ok = pedido.status === "SUCESSO";
  const etapas = [{ nome: "Solicitado", icone: Send, feita: true }];
  if (pedido.servico_codigo.startsWith("crlv") || pedido.servico_codigo === "comunicado-venda") {
    etapas.push({ nome: pedido.servico_codigo === "comunicado-venda" ? "Comunicando ao órgão" : "Emitindo no órgão", icone: Loader2, feita: ok || falhou, atual: !ok && !falhou });
  }
  etapas.push(falhou
    ? { nome: pedido.status_display, icone: X, erro: true }
    : { nome: "Concluído", icone: Check, feita: ok, atual: !ok && etapas.length === 1 });
  return (
    <div className="linha-tempo">
      {etapas.map((e) => (
        <div key={e.nome} className={`etapa ${e.feita ? "feita" : ""} ${e.atual ? "atual" : ""} ${e.erro ? "erro" : ""}`}>
          <div className="etapa-bola"><e.icone size={15} className={e.atual && e.icone === Loader2 ? "girar" : ""} /></div>
          {e.nome}
        </div>
      ))}
    </div>
  );
}

export default function PedidoDetalhe() {
  const { id } = useParams();
  const { usuario, recarregar } = useAuth();
  const { abrir: abrirChat } = useChat();
  const toast = useToast();
  const [pedido, setPedido] = useState(null);
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const carregar = useCallback(() => api(`/pedidos/${id}/`).then(setPedido).catch((e) => setErro(e.message)), [id]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (!pedido || !["PENDENTE", "PROCESSANDO"].includes(pedido.status)) return;
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [pedido, carregar]);
  useEffect(() => { if (pedido?.estornado) recarregar(); }, [pedido?.estornado, recarregar]);

  const verificar = async () => {
    setVerificando(true);
    try {
      const p = await api(`/pedidos/${id}/atualizar/`, { metodo: "POST" });
      setPedido(p);
      toast(p.status === "SUCESSO" ? "Documento pronto!" : "Ainda em andamento. Avisaremos aqui quando ficar pronto.", "info");
    } catch (e) { toast(e.message, "erro"); }
    setVerificando(false);
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(pedido.codigo_seguranca);
    toast("Código copiado!");
  };

  const baixarDoc = async () => {
    setBaixando(true);
    try { await baixar(`/pedidos/${id}/documento/`, `${pedido.servico_codigo}-${pedido.placa}.pdf`); } catch (e) { toast(e.message, "erro"); }
    setBaixando(false);
  };

  if (erro && !pedido) return <div className="aviso erro">{erro}</div>;
  if (!pedido) return <section className="cartao"><Esqueleto linhas={4} /></section>;
  const aberto = ["PENDENTE", "PROCESSANDO"].includes(pedido.status);
  const dados = pedido.resultado?.dados ?? pedido.resultado;
  const temDados = pedido.status === "SUCESSO" && dados && typeof dados === "object" && Object.keys(dados).length > 0;

  return (
    <>
      <Link to="/pedidos" className="voltar"><ArrowLeft size={16} />Voltar para pedidos</Link>
      <div className="grade-2">
        <section className="cartao">
          <div className="cartao-topo">
            <div>
              <h2>{pedido.servico}</h2>
              <p className="suave">Pedido feito em {dataHora(pedido.criado_em)}</p>
            </div>
            <Status valor={pedido.status} texto={pedido.status_display} />
          </div>

          <LinhaTempo pedido={pedido} />

          {pedido.codigo_seguranca && (
            <div className="resultado-destaque">
              <span className="suave">Código de segurança do CRV</span>
              <div className="codigo">{pedido.codigo_seguranca}</div>
              <Botao variante="primario" icone={Copy} onClick={copiar}>Copiar código</Botao>
            </div>
          )}

          {pedido.tem_documento && (
            <div className="documento-pronto">
              <div className="item-icone verde"><FileText size={22} /></div>
              <div><strong>{pedido.servico_codigo === "comunicado-venda" ? "Comprovante de venda disponível" : "CRLV-e disponível"}</strong><p className="suave">Documento em PDF pronto para baixar e imprimir.</p></div>
              <Botao variante="primario" icone={Download} carregando={baixando} onClick={baixarDoc}>Baixar PDF</Botao>
            </div>
          )}

          {pedido.mensagem && !pedido.codigo_seguranca && !pedido.tem_documento && (
            <div className={`aviso ${aberto ? "info" : pedido.status === "SUCESSO" ? "ok" : "erro"}`}>{pedido.mensagem}</div>
          )}

          {aberto && (
            <Botao icone={RefreshCw} carregando={verificando} onClick={verificar}>Verificar andamento agora</Botao>
          )}

          {temDados && (
            <details className="mais" open={!pedido.tem_documento && !pedido.codigo_seguranca}>
              <summary>Ver todos os dados retornados</summary>
              <Dados valor={dados} />
            </details>
          )}
        </section>

        <section className="cartao">
          <h2 style={{ marginBottom: 18 }}>Resumo</h2>
          <div className="resumo-linhas">
            <div><span>Placa</span><strong><PlacaMini placa={pedido.placa} /></strong></div>
            <div><span>Serviço</span><strong>{pedido.servico}</strong></div>
            <div><span>Atualizado</span><strong>{dataHora(pedido.atualizado_em)}</strong></div>
            <div><span>Protocolo</span><strong className="mono" style={{ fontSize: ".8rem" }}>{pedido.id.slice(0, 8).toUpperCase()}</strong></div>
            <div className="total"><span>Valor</span><strong>{brl(pedido.valor_centavos)}</strong></div>
          </div>
          {pedido.estornado && <div className="aviso ok" style={{ marginTop: 18, marginBottom: 0 }}><Check size={18} />Valor devolvido ao seu saldo.</div>}
          {!usuario.is_staff && (
            <Botao icone={MessageCircle} className="btn-grande" style={{ marginTop: 18 }}
              onClick={() => abrirChat({ pedido: { id: pedido.id, placa: pedido.placa, servico: pedido.servico } })}>
              Falar sobre este pedido
            </Botao>
          )}
        </section>
      </div>
    </>
  );
}
