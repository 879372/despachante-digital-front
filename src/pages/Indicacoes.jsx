import { Copy, Gift, Link2, MessageCircle, Share2, UserPlus, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { api, brl, dataHora } from "../api";
import { Botao, Esqueleto, Status, useToast, Vazio } from "../components/ui";

export default function Indicacoes() {
  const toast = useToast();
  const [d, setD] = useState(null);
  useEffect(() => { api("/indicacoes/").then(setD); }, []);

  if (!d) return <section className="cartao"><Esqueleto linhas={4} /></section>;

  const bonus = brl(d.bonus_centavos);
  const link = `${window.location.origin}/convite/${d.codigo}`;
  const quando = d.gatilho === "cadastro" ? "assim que a pessoa criar a conta" : "quando a pessoa fizer a primeira recarga";
  const mensagem = `Uso esse sistema para tirar CRLV-e e código de segurança do CRV. Cadastre-se com meu código ${d.codigo} e ganhe ${bonus} de saldo: ${link}`;

  const copiar = async (texto, aviso) => {
    try { await navigator.clipboard.writeText(texto); toast(aviso); } catch { toast("Não foi possível copiar.", "erro"); }
  };
  const compartilhar = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Ganhe saldo", text: mensagem, url: link }); } catch { /* cancelado */ }
    } else copiar(mensagem, "Mensagem copiada!");
  };

  return (
    <>
      <div className="pagina-topo"><div><h1>Indique e ganhe</h1><p>Convide outros despachantes e clientes e ganhe saldo para usar no sistema.</p></div></div>

      <div className="indique-hero">
        <Gift className="presente" size={160} />
        <h2>Ganhe {bonus} para cada amigo indicado</h2>
        <p>Seu amigo também ganha {bonus} de saldo ao se cadastrar com o seu código. O bônus é liberado para os dois {quando}.</p>
        <div className="codigo-caixa">
          <div><small style={{ opacity: .8, display: "block", fontSize: ".72rem" }}>SEU CÓDIGO</small><strong>{d.codigo}</strong></div>
          <Botao icone={Copy} onClick={() => copiar(d.codigo, "Código copiado!")}>Copiar</Botao>
        </div>
      </div>

      <div className="grade-2">
        <section className="cartao">
          <h2 style={{ marginBottom: 6 }}>Compartilhe seu link</h2>
          <p className="suave" style={{ marginBottom: 16 }}>Quem abrir o link já cai no cadastro com o seu código preenchido.</p>
          <div className="link-caixa">
            <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link de convite" />
            <Botao icone={Link2} onClick={() => copiar(link, "Link copiado!")}>Copiar</Botao>
          </div>
          <div className="compartilhar">
            <a href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer">
              <Botao variante="whatsapp" icone={MessageCircle} className="btn-grande">WhatsApp</Botao>
            </a>
            <Botao icone={Share2} className="btn-grande" onClick={compartilhar}>Outras opções</Botao>
          </div>

          <h3 style={{ margin: "28px 0 14px" }}>Como funciona</h3>
          <div className="como-funciona">
            <div><div className="item-icone roxo"><Share2 size={18} /></div><strong>1. Compartilhe</strong><p>Envie seu link ou código para quem precisa de documentos veiculares.</p></div>
            <div><div className="item-icone roxo"><UserPlus size={18} /></div><strong>2. A pessoa se cadastra</strong><p>Ela informa seu código no cadastro (com o link, já vem preenchido).</p></div>
            <div><div className="item-icone verde"><Wallet size={18} /></div><strong>3. Vocês ganham</strong><p>{bonus} para cada um, direto na carteira, {quando}.</p></div>
          </div>
        </section>

        <section className="cartao">
          <div className="indicadores" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}>
            <div className="indicador"><div className="indicador-topo">Indicados<div className="item-icone roxo"><Users size={16} /></div></div><strong>{d.total_indicados}</strong></div>
            <div className="indicador"><div className="indicador-topo">Você ganhou<div className="item-icone verde"><Wallet size={16} /></div></div><strong>{brl(d.total_recebido_centavos)}</strong></div>
          </div>
          <h3 style={{ marginBottom: 8 }}>Suas indicações</h3>
          {d.indicados.length === 0 ? (
            <Vazio icone={Users} titulo="Nenhuma indicação ainda" texto="Compartilhe seu link. As pessoas indicadas aparecem aqui." />
          ) : (
            <div className="itens">
              {d.indicados.map((i, n) => (
                <div className="item" key={n}>
                  <div className="avatar">{i.nome.slice(0, 2).toUpperCase()}</div>
                  <div className="item-corpo"><strong>{i.nome}</strong><span>Cadastro em {dataHora(i.desde)}</span></div>
                  <Status valor={i.bonus_pago ? "APROVADA" : "AGUARDANDO"} texto={i.bonus_pago ? `+${bonus}` : "Aguardando recarga"} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
