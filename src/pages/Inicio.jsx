import { ArrowRight, CheckCircle2, Clock, CreditCard, FileText, Gift, Lock, QrCode, Wallet, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, brl, dataHora } from "../api";
import { useAuth } from "../auth";
import { Botao, Esqueleto, Modal, PlacaInput, PlacaMini, Status, useToast, Vazio } from "../components/ui";
import { useConfig } from "../config";
import { iconeServico } from "../servicos";

import ComunicadoVenda, { novoComunicado, validarComunicado } from "../components/ComunicadoVenda";

const PLACA_OK = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export default function Inicio() {
  const { usuario, recarregar } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();
  const [dados, setDados] = useState(novoComunicado);
  const formularioRef = useRef(null);
  const [servicos, setServicos] = useState(null);
  const [servico, setServico] = useState("");
  const [placa, setPlaca] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [recentes, setRecentes] = useState(null);

  useEffect(() => {
    api("/servicos/").then((s) => { setServicos(s); if (s[0]) setServico(s[0].codigo); });
    api("/pedidos/").then((r) => setRecentes(r.results.slice(0, 6)));
  }, []);

  const escolhido = servicos?.find((s) => s.codigo === servico);
  const comunicado = escolhido?.formulario === "COMUNICADO_VENDA";
  const continuar = () => { if (!comunicado || validarComunicado(formularioRef)) setConfirmar(true); };
  const placaValida = PLACA_OK.test(placa);
  const semSaldo = escolhido && usuario.saldo_centavos < escolhido.preco_centavos;
  const nome = (usuario.first_name || usuario.username).split(" ")[0];
  const cfg = useConfig();
  const preco = escolhido?.preco_centavos || 0;
  const falta = semSaldo ? Math.max(preco - usuario.saldo_centavos, 100) : 0;
  const pagarOnline = semSaldo && cfg.checkout_ativo;
  const temSaldoParcial = usuario.saldo_centavos > 0;

  const irParaPagamento = async () => {
    setEnviando(true);
    try {
      const c = await api("/pagamentos/pedido/", { metodo: "POST", corpo: { servico, placa, ...(comunicado ? { dados } : {}) } });
      window.location.href = c.url;
    } catch (err) {
      toast(err.message, "erro");
      setEnviando(false);
    }
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const pedido = await api("/pedidos/", { metodo: "POST", corpo: { servico, placa, ...(comunicado ? { dados } : {}) } });
      await recarregar();
      toast(pedido.status === "SUCESSO" ? "Pronto! Resultado disponível." : "Solicitação enviada com sucesso.");
      navegar(`/pedidos/${pedido.id}`);
    } catch (err) {
      toast(err.message, "erro");
      setConfirmar(false);
      await recarregar();
    }
    setEnviando(false);
  };

  return (
    <>
      <div className="pagina-topo">
        <div>
          <h1>Olá, {nome} 👋</h1>
          <p>O que você precisa emitir hoje?</p>
        </div>
      </div>

      <Link to="/indique" className="banner-indique">
        <div className="item-icone"><Gift size={18} /></div>
        <div><strong>Indique e ganhe {brl(cfg.bonus_indicacao_centavos)}</strong><br /><span>Seu código: <b className="mono">{usuario.codigo_indicacao}</b>. Quem se cadastrar com ele também ganha.</span></div>
        <ArrowRight size={18} />
      </Link>

      <div className="grade-2">
        <section className="cartao">
          <div className="passo"><span className="passo-num">1</span>Escolha o serviço</div>
          {!servicos ? <Esqueleto linhas={2} /> : (
            <div className="servicos">
              {servicos.map((s) => {
                const Icone = iconeServico(s.codigo);
                const ativo = servico === s.codigo;
                return (
                  <button type="button" key={s.codigo} className={`servico ${ativo ? "ativo" : ""}`} onClick={() => setServico(s.codigo)}>
                    {ativo && <CheckCircle2 className="servico-check" size={20} />}
                    <div className="servico-icone"><Icone size={22} /></div>
                    <div><strong>{s.nome}</strong><p>{s.descricao}</p></div>
                    <div className="servico-rodape">
                      <span className="servico-preco">{brl(s.preco_centavos)}</span>
                      <span className="servico-prazo">{s.formulario === "COMUNICADO_VENDA" ? <><Clock size={13} />Processamento pelo órgão</> : s.assincrono ? <><Clock size={13} />1 a 3 dias úteis</> : <><Zap size={13} />Na hora</>}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="passo"><span className="passo-num">2</span>Digite a placa do veículo</div>
          <PlacaInput valor={placa} onChange={setPlaca} onKeyDown={(e) => e.key === "Enter" && placaValida && escolhido && (!semSaldo || pagarOnline) && continuar()} />
          <p className="suave" style={{ textAlign: "center", margin: "10px 0 22px" }}>
            {placa.length === 7 && !placaValida ? <span style={{ color: "var(--vermelho)" }}>Placa inválida</span> : "Padrão antigo (ABC1234) ou Mercosul (ABC1D23)"}
          </p>

          {comunicado && <ComunicadoVenda ref={formularioRef} dados={dados} onChange={setDados} />}

          {pagarOnline ? (
            <div className="caixa-pagar">
              <div className="resumo-linhas">
                <div><span>Valor do serviço</span><strong>{brl(preco)}</strong></div>
                {temSaldoParcial && <div><span>Seu saldo</span><strong className="positivo">− {brl(usuario.saldo_centavos)}</strong></div>}
                <div className="total"><span>{temSaldoParcial ? "Falta pagar" : "A pagar"}</span><strong>{brl(falta)}</strong></div>
              </div>
              <div className="formas"><span><QrCode size={14} />Pix</span><span><CreditCard size={14} />Cartão em até 12x</span><span><Lock size={14} />Pagamento seguro</span></div>
            </div>
          ) : semSaldo && (
            <div className="aviso alerta"><Wallet size={18} /><span>Seu saldo não cobre este serviço. <Link to="/carteira">Adicionar saldo</Link></span></div>
          )}
          <Botao variante="primario" className="btn-grande" icone={pagarOnline ? Lock : ArrowRight}
            disabled={!placaValida || !escolhido || (semSaldo && !pagarOnline)} onClick={continuar}>
            {pagarOnline ? `Pagar ${brl(falta)} e solicitar` : "Continuar"}
          </Botao>
          {pagarOnline && <p className="suave" style={{ textAlign: "center", marginTop: 10 }}>ou <Link to="/carteira">adicione saldo</Link> para pagar várias consultas</p>}
        </section>

        <section className="cartao">
          <div className="cartao-topo"><h2>Pedidos recentes</h2><Link to="/pedidos">Ver todos <ArrowRight size={15} /></Link></div>
          {!recentes ? <Esqueleto /> : recentes.length === 0 ? (
            <Vazio icone={FileText} titulo="Nenhum pedido ainda" texto="Seus pedidos aparecem aqui assim que você fizer o primeiro." />
          ) : (
            <div className="itens">
              {recentes.map((p) => {
                const Icone = iconeServico(p.servico_codigo);
                return (
                  <Link to={`/pedidos/${p.id}`} className="item" key={p.id}>
                    <div className="item-icone roxo"><Icone size={18} /></div>
                    <div className="item-corpo"><strong><PlacaMini placa={p.placa} /></strong><span>{p.servico} · {dataHora(p.criado_em)}</span></div>
                    <Status valor={p.status} texto={p.status_display} />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Modal
        aberto={confirmar && pagarOnline}
        titulo="Ir para o pagamento"
        onFechar={() => !enviando && setConfirmar(false)}
        rodape={<>
          <Botao onClick={() => setConfirmar(false)} disabled={enviando}>Voltar</Botao>
          <Botao variante="primario" icone={Lock} carregando={enviando} onClick={irParaPagamento}>Pagar {brl(falta)}</Botao>
        </>}
      >
        {escolhido && (
          <div className="resumo-linhas">
            <div><span>Serviço</span><strong>{escolhido.nome}</strong></div>
            <div><span>Placa</span><strong><PlacaMini placa={placa} /></strong></div>
            {comunicado && <><div><span>Vendedor</span><strong>{dados.vendedor.nome}</strong></div><div><span>Comprador</span><strong>{dados.comprador.nome}</strong></div><div><span>Data da venda</span><strong>{dados.venda_data.split("-").reverse().join("/")}</strong></div></>}
            {temSaldoParcial && <div><span>Usando seu saldo</span><strong>{brl(usuario.saldo_centavos)}</strong></div>}
            <div className="total"><span>A pagar agora</span><strong>{brl(falta)}</strong></div>
          </div>
        )}
        <div className="aviso info" style={{ marginTop: 16, marginBottom: 0 }}>
          <Lock size={18} /><span>Você vai para a página de pagamento seguro (Pix ou cartão). Assim que o pagamento for confirmado, <strong>o serviço é solicitado automaticamente</strong>.</span>
        </div>
      </Modal>

      <Modal
        aberto={confirmar && !pagarOnline}
        titulo="Confirmar solicitação"
        onFechar={() => !enviando && setConfirmar(false)}
        rodape={<>
          <Botao onClick={() => setConfirmar(false)} disabled={enviando}>Voltar</Botao>
          <Botao variante="primario" carregando={enviando} onClick={enviar}>Confirmar e pagar</Botao>
        </>}
      >
        {escolhido && (
          <div className="resumo-linhas">
            <div><span>Serviço</span><strong>{escolhido.nome}</strong></div>
            <div><span>Placa</span><strong><PlacaMini placa={placa} /></strong></div>
            {comunicado && <><div><span>Vendedor</span><strong>{dados.vendedor.nome}</strong></div><div><span>Comprador</span><strong>{dados.comprador.nome}</strong></div><div><span>Data da venda</span><strong>{dados.venda_data.split("-").reverse().join("/")}</strong></div></>}
            <div><span>Prazo</span><strong>{comunicado ? "Conforme processamento pelo órgão" : escolhido.assincrono ? "1 a 3 dias úteis" : "Imediato"}</strong></div>
            <div><span>Saldo após o pedido</span><strong>{brl(usuario.saldo_centavos - escolhido.preco_centavos)}</strong></div>
            <div className="total"><span>Total</span><strong>{brl(escolhido.preco_centavos)}</strong></div>
          </div>
        )}
        <p className="suave" style={{ marginTop: 16 }}>Se não for possível concluir, o valor volta automaticamente para o seu saldo.</p>
      </Modal>
    </>
  );
}
