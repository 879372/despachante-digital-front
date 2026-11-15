import { Clock, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Botao } from "../components/ui";
import { guardarPedido } from "./armazenamento";
import LayoutPublico from "./LayoutPublico";

const TENTATIVAS = 8;

export default function RetornoPublico() {
  const [p] = useSearchParams();
  const navegar = useNavigate();
  const [estado, setEstado] = useState("confirmando");
  const [c, setC] = useState(null);
  const id = p.get("cobranca"), t = p.get("t");

  const confirmar = async () => {
    const r = await api(`/publico/cobranca/${id}/`, {
      metodo: "POST", corpo: { t, slug: p.get("slug") || "", transaction_nsu: p.get("transaction_nsu") || "" },
    });
    setC(r);
    if (r.pedido) {
      guardarPedido({ token: r.pedido });
      navegar(`/c/${r.pedido}`, { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!id || !t) { setEstado("invalido"); return; }
    let vivo = true;
    (async () => {
      for (let i = 0; i < TENTATIVAS && vivo; i++) {
        try { if (await confirmar()) return; } catch { /* tenta de novo */ }
        await new Promise((ok) => setTimeout(ok, 2500));
      }
      if (vivo) setEstado("aguardando");
    })();
    return () => { vivo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LayoutPublico>
      <section className="cartao retorno-pagamento">
        {estado === "confirmando" && (<>
          <div className="icone-grande"><Loader2 size={28} className="girar" /></div>
          <h1>Confirmando seu pagamento…</h1>
          <p className="suave">Isso leva só alguns segundos. Não feche esta página.</p>
        </>)}
        {estado === "aguardando" && (<>
          <div className="icone-grande"><Clock size={28} /></div>
          <h1>Ainda não recebemos a confirmação</h1>
          <p className="suave">Se você já pagou, fique tranquilo: assim que o pagamento for confirmado, a consulta é feita e enviamos o link de acesso para o seu e-mail.</p>
          <div className="acoes" style={{ justifyContent: "center", marginTop: 20 }}>
            <Botao icone={RefreshCw} onClick={() => confirmar().catch(() => {})}>Verificar de novo</Botao>
            {c?.url && <a href={c.url}><Botao variante="primario">Voltar ao pagamento</Botao></a>}
          </div>
          <p className="suave" style={{ marginTop: 16 }}>Dúvidas? Fale com a gente pelo chat.</p>
        </>)}
        {estado === "invalido" && (<>
          <h1>Link inválido</h1>
          <p className="suave">Não encontramos este pagamento.</p>
          <Link to="/"><Botao variante="primario">Voltar ao início</Botao></Link>
        </>)}
      </section>
    </LayoutPublico>
  );
}
