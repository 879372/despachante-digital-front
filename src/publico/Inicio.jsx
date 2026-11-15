import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock, CreditCard, ExternalLink, History, Lock, Mail, QrCode, Search,
  ShieldCheck, Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, brl, dataHora } from "../api";
import { Botao, Campo, Esqueleto, Modal, PlacaInput, PlacaMini, Status, useToast } from "../components/ui";
import { emailValido, mascaraTelefone, telefoneValido } from "../mascaras";
import { iconeServico } from "../servicos";
import { tokenPorRef } from "./armazenamento";
import LayoutPublico from "./LayoutPublico";

const PLACA_OK = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export default function InicioPublico() {
  const toast = useToast();
  const [placa, setPlaca] = useState("");
  const [placaConfirmada, setPlacaConfirmada] = useState("");
  const [servicos, setServicos] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [servico, setServico] = useState("");
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", aceite: false });
  const [tocado, setTocado] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [modalLinks, setModalLinks] = useState(false);
  const secao = useRef(null);

  useEffect(() => { api("/publico/servicos/").then((s) => { setServicos(s); if (s[0]) setServico(s[0].codigo); }).catch(() => setServicos([])); }, []);

  const consultar = async (e) => {
    e?.preventDefault();
    if (!PLACA_OK.test(placa)) return;
    setPlacaConfirmada(placa);
    setHistorico(null);
    setTimeout(() => secao.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    try { setHistorico((await api(`/publico/placa/${placa}/`)).consultas); }
    catch (err) { toast(err.message, "erro"); setHistorico([]); }
  };

  const escolhido = servicos?.find((s) => s.codigo === servico);
  const erros = useMemo(() => {
    const e = {};
    if (form.nome.trim().split(/\s+/).length < 2) e.nome = "Informe nome e sobrenome.";
    if (!emailValido(form.email)) e.email = "E-mail inválido. É para lá que enviamos o resultado.";
    if (!telefoneValido(form.telefone)) e.telefone = "WhatsApp inválido. Ex.: (84) 99999-1234";
    if (!form.aceite) e.aceite = "Aceite os termos para continuar.";
    return e;
  }, [form]);
  const erroDe = (c) => (tocado[c] ? erros[c] : undefined);

  const pagar = async (e) => {
    e.preventDefault();
    setTocado({ nome: true, email: true, telefone: true, aceite: true });
    if (Object.keys(erros).length || !escolhido) return;
    setEnviando(true);
    try {
      const r = await api("/publico/pagar/", { metodo: "POST", corpo: { servico, placa: placaConfirmada, ...form } });
      window.location.href = r.url;
    } catch (err) {
      const campo = err.dados && Object.entries(err.dados).find(([k]) => k !== "detail");
      toast(err.dados?.detail || (campo ? `${campo[1][0] || campo[1]}` : err.message), "erro");
      setEnviando(false);
    }
  };

  return (
    <LayoutPublico>
      <section className="hero">
        <div className="hero-texto">
          <span className="hero-selo"><ShieldCheck size={14} />Sem cadastro · pagamento seguro</span>
          <h1>Documento do veículo, <span>sem fila.</span></h1>
          <p>Digite a placa, escolha o serviço e pague com Pix ou cartão. A consulta é feita assim que o pagamento é confirmado.</p>
        </div>
        <form className="hero-busca" onSubmit={consultar}>
          <PlacaInput valor={placa} onChange={setPlaca} autoFocus />
          <Botao variante="primario" className="btn-grande" icone={Search} disabled={!PLACA_OK.test(placa)}>Consultar placa</Botao>
          <small>{placa.length === 7 && !PLACA_OK.test(placa) ? "Placa inválida" : "Padrão antigo (ABC1234) ou Mercosul (ABC1D23)"}</small>
        </form>
      </section>

      {!placaConfirmada && (
        <section className="como-site">
          {[[Search, "1. Digite a placa", "Veja também as consultas já feitas para ela."],
            [CreditCard, "2. Pague com Pix ou cartão", "Checkout seguro, em até 12x no cartão."],
            [Mail, "3. Receba o resultado", "Na tela e no seu e-mail, com link de acesso."]].map(([I, t, d]) => (
            <div key={t}><div className="item-icone roxo"><I size={18} /></div><strong>{t}</strong><p>{d}</p></div>
          ))}
        </section>
      )}

      {placaConfirmada && (
        <div className="site-fluxo" ref={secao}>
          <div className="site-fluxo-topo">
            <button className="voltar" onClick={() => { setPlacaConfirmada(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowLeft size={16} />Outra placa</button>
            <h2>Placa <PlacaMini placa={placaConfirmada} /></h2>
          </div>

          <div className="grade-2">
            <section className="cartao">
              <div className="passo"><span className="passo-num">1</span>Escolha o serviço</div>
              {!servicos ? <Esqueleto linhas={2} /> : servicos.length === 0 ? (
                <p className="suave">Nenhum serviço disponível no momento.</p>
              ) : (
                <div className="servicos">
                  {servicos.map((s) => {
                    const I = iconeServico(s.codigo);
                    const ativo = servico === s.codigo;
                    return (
                      <button type="button" key={s.codigo} className={`servico ${ativo ? "ativo" : ""}`} onClick={() => setServico(s.codigo)}>
                        {ativo && <CheckCircle2 className="servico-check" size={20} />}
                        <div className="servico-icone"><I size={22} /></div>
                        <div><strong>{s.nome}</strong><p>{s.descricao}</p></div>
                        <div className="servico-rodape">
                          <span className="servico-preco">{brl(s.preco_centavos)}</span>
                          <span className="servico-prazo">{s.assincrono ? <><Clock size={13} />1 a 3 dias úteis</> : <><Zap size={13} />Na hora</>}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <form onSubmit={pagar} noValidate>
                <div className="passo"><span className="passo-num">2</span>Seus dados</div>
                <div className="form-grade">
                  <div className="inteiro">
                    <Campo rotulo="Nome completo" erro={erroDe("nome")}>
                      <input autoComplete="name" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} onBlur={() => setTocado({ ...tocado, nome: true })} />
                    </Campo>
                  </div>
                  <Campo rotulo="E-mail" erro={erroDe("email")} dica="O resultado e o link de acesso vão para cá.">
                    <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onBlur={() => setTocado({ ...tocado, email: true })} placeholder="voce@email.com" />
                  </Campo>
                  <Campo rotulo="WhatsApp" erro={erroDe("telefone")}>
                    <input inputMode="tel" autoComplete="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })} onBlur={() => setTocado({ ...tocado, telefone: true })} placeholder="(84) 99999-1234" />
                  </Campo>
                </div>
                <label className="aceite">
                  <input type="checkbox" checked={form.aceite} onChange={(e) => { setForm({ ...form, aceite: e.target.checked }); setTocado({ ...tocado, aceite: true }); }} />
                  <span>Li e aceito os termos de uso e a política de privacidade.</span>
                </label>
                {erroDe("aceite") && <p className="campo-erro" style={{ marginTop: -8 }}>{erroDe("aceite")}</p>}

                {escolhido && (
                  <div className="caixa-pagar">
                    <div className="resumo-linhas">
                      <div><span>{escolhido.nome}</span><strong><PlacaMini placa={placaConfirmada} /></strong></div>
                      <div className="total"><span>Total</span><strong>{brl(escolhido.preco_centavos)}</strong></div>
                    </div>
                    <div className="formas"><span><QrCode size={14} />Pix</span><span><CreditCard size={14} />Cartão em até 12x</span><span><Lock size={14} />Pagamento seguro</span></div>
                  </div>
                )}
                <Botao variante="primario" className="btn-grande" icone={Lock} carregando={enviando} disabled={!escolhido}>
                  {escolhido ? `Pagar ${brl(escolhido.preco_centavos)} e consultar` : "Escolha um serviço"}
                </Botao>
              </form>
            </section>

            <section className="cartao">
              <div className="cartao-topo"><h2><History size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} />Consultas desta placa</h2></div>
              {!historico ? <Esqueleto /> : historico.length === 0 ? (
                <p className="suave">Nenhuma consulta feita para esta placa ainda.</p>
              ) : (
                <>
                  <div className="itens">
                    {historico.map((h) => {
                      const I = iconeServico(h.servico_codigo);
                      const token = tokenPorRef(h.ref);
                      const status = h.reembolso_pendente ? "FALHA" : h.status;
                      return (
                        <div className="item" key={h.ref}>
                          <div className="item-icone roxo"><I size={18} /></div>
                          <div className="item-corpo"><strong>{h.servico}</strong><span>{dataHora(h.criado_em)} · ref. {h.ref}</span></div>
                          <div className="item-fim">
                            <Status valor={status} texto={h.status_display} />
                            {token && <Link to={`/c/${token}`} className="link-pequeno">Abrir <ExternalLink size={12} /></Link>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="aviso info" style={{ marginTop: 16, marginBottom: 0 }}>
                    <Lock size={18} />
                    <span>Por segurança, o resultado só abre com o link enviado ao e-mail de quem comprou.{" "}
                      <button className="link-botao" onClick={() => setModalLinks(true)}>Reenviar meu link</button></span>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}

      <ReenviarLinks aberto={modalLinks} placa={placaConfirmada} onFechar={() => setModalLinks(false)} />
    </LayoutPublico>
  );
}

function ReenviarLinks({ aberto, placa, onFechar }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    if (!emailValido(email)) { toast("Digite um e-mail válido.", "erro"); return; }
    setEnviando(true);
    try {
      const r = await api(`/publico/placa/${placa}/links/`, { metodo: "POST", corpo: { email } });
      toast(r.detail, "info"); onFechar(); setEmail("");
    } catch (e) { toast(e.status === 429 ? "Muitas tentativas. Aguarde um minuto." : e.message, "erro"); }
    setEnviando(false);
  };
  return (
    <Modal aberto={aberto} titulo="Reenviar link de acesso" onFechar={onFechar}
      rodape={<><Botao onClick={onFechar}>Cancelar</Botao><Botao variante="primario" icone={ArrowRight} carregando={enviando} onClick={enviar}>Enviar</Botao></>}>
      <p className="suave" style={{ marginBottom: 16 }}>Informe o e-mail usado na compra. Se houver consultas da placa {placa} com ele, enviaremos os links.</p>
      <Campo rotulo="E-mail da compra"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" onKeyDown={(e) => e.key === "Enter" && enviar()} /></Campo>
    </Modal>
  );
}
