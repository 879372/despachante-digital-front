import { CheckCircle2, Clock, Loader2, RefreshCw, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, brl } from "../api";
import { useAuth } from "../auth";
import { Botao, useToast } from "../components/ui";

const TENTATIVAS = 8;

export default function PagamentoRetorno() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const toast = useToast();
  const { recarregar } = useAuth();
  const [c, setC] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [erro, setErro] = useState("");
  const terminou = useRef(false);

  const id = params.get("cobranca");
  const confirmar = useCallback(async () => {
    try {
      const r = await api(`/pagamentos/${id}/`, {
        metodo: "POST",
        corpo: { slug: params.get("slug") || "", transaction_nsu: params.get("transaction_nsu") || "" },
      });
      setC(r);
      return r;
    } catch (e) { setErro(e.message); return null; }
  }, [id, params]);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    (async () => {
      for (let i = 0; i < TENTATIVAS && vivo; i++) {
        setTentativa(i + 1);
        const r = await confirmar();
        if (r?.status === "PAGA") {
          terminou.current = true;
          await recarregar();
          if (r.pedido_id) {
            toast("Pagamento confirmado! Consulta solicitada.");
            navegar(`/pedidos/${r.pedido_id}`, { replace: true });
          }
          return;
        }
        await new Promise((ok) => setTimeout(ok, 2500));
      }
    })();
    return () => { vivo = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!id) return <section className="cartao"><p>Pagamento não encontrado.</p><Link to="/">Voltar ao início</Link></section>;

  const pago = c?.status === "PAGA";
  const esperando = !pago && tentativa < TENTATIVAS && !erro;

  return (
    <section className="cartao retorno-pagamento">
      {esperando && (
        <>
          <div className="icone-grande"><Loader2 size={28} className="girar" /></div>
          <h1>Confirmando seu pagamento…</h1>
          <p className="suave">Isso leva só alguns segundos. Não feche esta página.</p>
        </>
      )}

      {pago && (
        <>
          <div className="icone-grande verde"><CheckCircle2 size={28} /></div>
          <h1>Pagamento confirmado!</h1>
          <p className="suave">{c.mensagem}</p>
          <div className="acoes" style={{ justifyContent: "center", marginTop: 20 }}>
            {c.pedido_id
              ? <Botao variante="primario" onClick={() => navegar(`/pedidos/${c.pedido_id}`)}>Ver minha consulta</Botao>
              : <Botao variante="primario" icone={Wallet} onClick={() => navegar("/carteira")}>Ver carteira</Botao>}
            <Botao onClick={() => navegar("/")}>Início</Botao>
          </div>
        </>
      )}

      {!pago && !esperando && (
        <>
          <div className="icone-grande"><Clock size={28} /></div>
          <h1>Ainda não recebemos a confirmação</h1>
          <p className="suave">
            {erro || "Se você já pagou, fique tranquilo: assim que o pagamento for confirmado, "}
            {!erro && (c?.tipo === "PEDIDO" ? "a consulta é feita automaticamente e aparece em Meus pedidos." : `o valor de ${brl(c?.valor_centavos)} entra na sua carteira.`)}
          </p>
          <div className="acoes" style={{ justifyContent: "center", marginTop: 20 }}>
            <Botao icone={RefreshCw} onClick={async () => { setErro(""); const r = await confirmar(); if (r?.status === "PAGA") { await recarregar(); if (r.pedido_id) navegar(`/pedidos/${r.pedido_id}`); } }}>Verificar de novo</Botao>
            {c?.url && <a href={c.url}><Botao variante="primario">Voltar ao pagamento</Botao></a>}
          </div>
          <p className="suave" style={{ marginTop: 16 }}>Alguma dúvida? Fale com a gente pelo chat.</p>
        </>
      )}
    </section>
  );
}
