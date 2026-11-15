import { ArrowDownLeft, ArrowUpRight, CreditCard, ExternalLink, Gift, Lock, Plus, QrCode, RotateCcw, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { api, brl, dataHora } from "../api";
import { useAuth } from "../auth";
import { Botao, Campo, Esqueleto, Modal, Status, useToast, Vazio } from "../components/ui";
import { useConfig } from "../config";
import { Paginacao } from "./Pedidos";

const RAPIDOS = [50, 100, 200, 500];
const ICONE_MOV = {
  RECARGA: [ArrowDownLeft, "verde"], PAGAMENTO: [CreditCard, "verde"], ESTORNO: [RotateCcw, "verde"],
  DEBITO: [ArrowUpRight, ""], AJUSTE: [Wallet, "roxo"], BONUS: [Gift, "roxo"],
};
const STATUS_PG = { PENDENTE: "AGUARDANDO", PAGA: "APROVADA", CANCELADA: "RECUSADA" };
const FORMA = { pix: "Pix", credit_card: "Cartão" };

export default function Carteira() {
  const { usuario, recarregar } = useAuth();
  const toast = useToast();
  const cfg = useConfig();
  const [extrato, setExtrato] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [pagamentos, setPagamentos] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { api("/pagamentos/").then(setPagamentos).catch(() => setPagamentos([])); recarregar(); }, [recarregar]);
  useEffect(() => { api(`/carteira/extrato/?page=${pagina}`).then(setExtrato); }, [pagina]);

  const centavos = Math.round(parseFloat(String(valor).replace(/\./g, "").replace(",", ".")) * 100) || 0;

  const pagar = async () => {
    if (centavos < 1000) { toast("Informe um valor a partir de R$ 10,00.", "erro"); return; }
    setEnviando(true);
    try {
      const c = await api("/pagamentos/recarga/", { metodo: "POST", corpo: { valor_centavos: centavos } });
      window.location.href = c.url;
    } catch (err) { toast(err.message, "erro"); setEnviando(false); }
  };

  const recentes = (pagamentos || []).filter((p) => p.status !== "CANCELADA");

  return (
    <>
      <div className="pagina-topo"><div><h1>Carteira</h1><p>Seu saldo, pagamentos e histórico de movimentações.</p></div></div>
      <div className="grade-2">
        <div>
          <div className="saldo-hero">
            <span>Saldo disponível</span>
            <strong>{brl(usuario.saldo_centavos)}</strong>
            <Botao icone={Plus} onClick={() => setAberto(true)}>Adicionar saldo</Botao>
          </div>

          <section className="cartao">
            <div className="cartao-topo"><h2>Extrato</h2></div>
            {!extrato ? <Esqueleto /> : extrato.results.length === 0 ? (
              <Vazio icone={Wallet} titulo="Sem movimentações" texto="Pagamentos, consultas e estornos aparecem aqui." />
            ) : (
              <div className="itens">
                {extrato.results.map((m) => {
                  const [I, cor] = ICONE_MOV[m.tipo] || [Wallet, ""];
                  return (
                    <div className="item" key={m.id}>
                      <div className={`item-icone ${cor}`}><I size={18} /></div>
                      <div className="item-corpo"><strong>{m.descricao}</strong><span>{m.tipo_display} · {dataHora(m.criado_em)}</span></div>
                      <div className="item-fim">
                        <span className={m.valor_centavos >= 0 ? "positivo" : "negativo"}>{m.valor_centavos >= 0 ? "+" : ""}{brl(m.valor_centavos)}</span>
                        <small>Saldo {brl(m.saldo_apos_centavos)}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {extrato && <Paginacao total={extrato.count} pagina={pagina} setPagina={setPagina} />}
          </section>
        </div>

        <section className="cartao">
          <div className="cartao-topo"><h2>Pagamentos</h2></div>
          {!pagamentos ? <Esqueleto /> : recentes.length === 0 ? (
            <Vazio icone={CreditCard} titulo="Nenhum pagamento ainda" texto="Adicione saldo com Pix ou cartão para fazer suas consultas.">
              <Botao variante="primario" icone={Plus} onClick={() => setAberto(true)}>Adicionar saldo</Botao>
            </Vazio>
          ) : (
            <div className="itens">
              {recentes.map((p) => (
                <div className="item" key={p.id}>
                  <div className="item-icone roxo">{p.forma === "pix" ? <QrCode size={18} /> : <CreditCard size={18} />}</div>
                  <div className="item-corpo">
                    <strong>{brl(p.valor_centavos)}</strong>
                    <span>{p.tipo === "PEDIDO" ? `${p.servico} · ${p.placa}` : "Saldo"} · {dataHora(p.pago_em || p.criado_em)}{p.forma && ` · ${FORMA[p.forma] || p.forma}`}</span>
                  </div>
                  {p.status === "PENDENTE" && p.url
                    ? <a href={p.url}><Botao icone={ExternalLink}>Pagar</Botao></a>
                    : <Status valor={STATUS_PG[p.status]} texto={p.status_display} />}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        aberto={aberto}
        titulo="Adicionar saldo"
        onFechar={() => !enviando && setAberto(false)}
        largura={460}
        rodape={cfg.checkout_ativo ? <>
          <Botao onClick={() => setAberto(false)} disabled={enviando}>Cancelar</Botao>
          <Botao variante="primario" icone={Lock} carregando={enviando} disabled={centavos < 1000} onClick={pagar}>
            Pagar {centavos >= 1000 ? brl(centavos) : ""}
          </Botao>
        </> : <Botao onClick={() => setAberto(false)}>Fechar</Botao>}
      >
        {cfg.checkout_ativo ? (
          <form onSubmit={(e) => { e.preventDefault(); pagar(); }}>
            <Campo rotulo="Quanto você quer adicionar?">
              <div className="valores-rapidos">
                {RAPIDOS.map((v) => (
                  <button type="button" key={v} className={centavos === v * 100 ? "ativo" : ""} onClick={() => setValor(String(v))}>R$ {v}</button>
                ))}
              </div>
              <input inputMode="decimal" placeholder="Outro valor, ex.: 150,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            </Campo>
            <div className="formas" style={{ borderTop: 0, marginTop: 4, paddingTop: 0 }}>
              <span><QrCode size={14} />Pix</span><span><CreditCard size={14} />Cartão em até 12x</span>
            </div>
            <div className="aviso info" style={{ marginTop: 16, marginBottom: 0 }}>
              <Lock size={18} /><span>Você vai para a página de pagamento seguro. O saldo entra automaticamente assim que o pagamento for confirmado.</span>
            </div>
          </form>
        ) : (
          <div className="aviso alerta" style={{ marginBottom: 0 }}>
            <CreditCard size={18} /><span>O pagamento online está temporariamente indisponível. Tente novamente mais tarde ou fale com a gente pelo chat.</span>
          </div>
        )}
      </Modal>
    </>
  );
}
