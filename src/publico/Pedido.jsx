import { Check, Copy, Download, FileText, Loader2, MessageCircle, RefreshCw, RotateCcw, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, brl, dataHora } from "../api";
import { apiUrl } from "../api-url";
import { Botao, Esqueleto, PlacaMini, Status, useToast } from "../components/ui";
import { guardarPedido } from "./armazenamento";
import LayoutPublico from "./LayoutPublico";

const rotulo = (k) => String(k).replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
function Dados({ valor }) {
  if (valor === null || valor === undefined || valor === "") return <span className="suave">—</span>;
  if (Array.isArray(valor)) return <div>{valor.map((v, i) => <Dados key={i} valor={v} />)}</div>;
  if (typeof valor === "object") return <dl className="dados">{Object.entries(valor).map(([k, v]) => <div key={k}><dt>{rotulo(k)}</dt><dd><Dados valor={v} /></dd></div>)}</dl>;
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
}

export default function PedidoPublico() {
  const { token } = useParams();
  const toast = useToast();
  const [p, setP] = useState(null);
  const [erro, setErro] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const carregar = useCallback(() => api(`/publico/pedido/${token}/`).then((r) => {
    setP(r); guardarPedido({ token, ref: r.ref, placa: r.placa, servico: r.servico });
  }).catch(() => setErro(true)), [token]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (!p || !["PENDENTE", "PROCESSANDO"].includes(p.status)) return;
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [p, carregar]);

  const verificar = async () => {
    setVerificando(true);
    try { setP(await api(`/publico/pedido/${token}/atualizar/`, { metodo: "POST" })); } catch (e) { toast(e.message, "erro"); }
    setVerificando(false);
  };

  if (erro) return <LayoutPublico><section className="cartao retorno-pagamento"><h1>Link inválido ou expirado</h1><p className="suave">Confira o link recebido por e-mail.</p><Link to="/"><Botao variante="primario">Ir para o início</Botao></Link></section></LayoutPublico>;
  if (!p) return <LayoutPublico><section className="cartao" style={{ maxWidth: 720, margin: "24px auto" }}><Esqueleto linhas={4} /></section></LayoutPublico>;

  const aberto = ["PENDENTE", "PROCESSANDO"].includes(p.status);
  const falhou = ["FALHA", "SEM_RESULTADO"].includes(p.status);
  const dados = p.resultado?.dados ?? p.resultado;
  const etapas = [{ n: "Pago", I: Send, feita: true }];
  if (p.assincrono) etapas.push({ n: "Emitindo no órgão", I: Loader2, feita: !aberto, atual: aberto });
  etapas.push(falhou ? { n: p.status_display, I: X, erro: true } : { n: "Concluído", I: Check, feita: p.status === "SUCESSO", atual: aberto && !p.assincrono });

  return (
    <LayoutPublico>
      <section className="cartao" style={{ maxWidth: 760, margin: "24px auto" }}>
        <div className="cartao-topo">
          <div><h2>{p.servico}</h2><p className="suave">Pedido {p.ref} · {dataHora(p.criado_em)} · {brl(p.valor_centavos)}</p></div>
          <PlacaMini placa={p.placa} />
        </div>
        <div className="linha-tempo">
          {etapas.map((e) => (
            <div key={e.n} className={`etapa ${e.feita ? "feita" : ""} ${e.atual ? "atual" : ""} ${e.erro ? "erro" : ""}`}>
              <div className="etapa-bola"><e.I size={15} className={e.atual && e.I === Loader2 ? "girar" : ""} /></div>{e.n}
            </div>
          ))}
        </div>

        {p.codigo_seguranca && (
          <div className="resultado-destaque">
            <span className="suave">Código de segurança do CRV</span>
            <div className="codigo">{p.codigo_seguranca}</div>
            <Botao variante="primario" icone={Copy} onClick={async () => { await navigator.clipboard.writeText(p.codigo_seguranca); toast("Código copiado!"); }}>Copiar código</Botao>
          </div>
        )}
        {p.tem_documento && (
          <div className="documento-pronto">
            <div className="item-icone verde"><FileText size={22} /></div>
            <div><strong>Documento disponível</strong><p className="suave">PDF pronto para baixar e imprimir.</p></div>
            <a href={apiUrl(`/publico/pedido/${token}/documento/`)}><Botao variante="primario" icone={Download}>Baixar PDF</Botao></a>
          </div>
        )}
        {!p.codigo_seguranca && !p.tem_documento && p.mensagem && (
          <div className={`aviso ${aberto ? "info" : p.status === "SUCESSO" ? "ok" : "erro"}`}>
            {p.reembolsado ? <RotateCcw size={18} /> : null}<span>{p.mensagem}</span>
          </div>
        )}
        {aberto && <Botao icone={RefreshCw} carregando={verificando} onClick={verificar}>Verificar andamento</Botao>}
        {p.status === "SUCESSO" && dados && typeof dados === "object" && Object.keys(dados).length > 0 && (
          <details className="mais" open={!p.tem_documento && !p.codigo_seguranca}>
            <summary>Ver todos os dados retornados</summary><Dados valor={dados} />
          </details>
        )}
        <div className="aviso info" style={{ marginTop: 20, marginBottom: 0 }}>
          <MessageCircle size={18} /><span>Este link também foi enviado para o seu e-mail. Não compartilhe: ele dá acesso ao resultado. Dúvidas? Use o chat no canto da tela.</span>
        </div>
      </section>
    </LayoutPublico>
  );
}
