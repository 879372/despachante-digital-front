import {
  BarChart3, Check, CircleDollarSign, Clock, CreditCard, Database, FileText, Package, QrCode, RotateCcw, Search, ShieldOff,
  TrendingUp, UserPlus, Users, Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, brl, dataHora } from "../api";
import { useAuth } from "../auth";
import { Botao, Campo, Esqueleto, Modal, Status, useToast, Vazio } from "../components/ui";
import { iconeServico } from "../servicos";
import { Paginacao, TabelaPedidos } from "./Pedidos";

const paraCentavos = (txt) => Math.round(parseFloat(String(txt).replace(/\./g, "").replace(",", ".")) * 100);
const paraTexto = (c) => (c / 100).toFixed(2).replace(".", ",");

export default function Admin() {
  const [aba, setAba] = useState("resumo");

  const ABAS = [
    ["resumo", "Resumo", BarChart3],
    ["pagamentos", "Pagamentos", CreditCard],
    ["clientes", "Clientes", Users],
    ["pedidos", "Pedidos", FileText],
    ["servicos", "Serviços e preços", Package],
  ];
  return (
    <>
      <div className="pagina-topo"><div><h1>Gestão</h1><p>Acompanhe o negócio, os pagamentos e gerencie clientes.</p></div></div>
      <div className="abas">
        {ABAS.map(([id, nome, I, n]) => (
          <button key={id} className={`aba ${aba === id ? "ativa" : ""}`} onClick={() => setAba(id)}>
            <I size={16} />{nome}{n > 0 && <span className="contador">{n}</span>}
          </button>
        ))}
      </div>
      {aba === "resumo" && <Resumo irPara={setAba} />}
      {aba === "pagamentos" && <Pagamentos />}
      {aba === "clientes" && <Clientes />}
      {aba === "pedidos" && <PedidosAdmin />}
      {aba === "servicos" && <Servicos />}
    </>
  );
}

function Indicador({ titulo, valor, detalhe, icone: I, cor = "roxo", destaque, onClick }) {
  return (
    <div className={`indicador ${destaque ? "destaque" : ""}`} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className="indicador-topo">{titulo}<div className={`item-icone ${cor}`}><I size={17} /></div></div>
      <strong>{valor}</strong>
      {detalhe && <small>{detalhe}</small>}
    </div>
  );
}

function Resumo({ irPara }) {
  const [r, setR] = useState(null);
  useEffect(() => { api("/admin/resumo/").then(setR); }, []);
  if (!r) return <div className="indicadores">{[1, 2, 3, 4].map((i) => <div key={i} className="indicador"><Esqueleto linhas={2} /></div>)}</div>;
  const fonte = r.saldo_fonte || {};
  const margem = (r.pedidos.receita || 0) - (r.pedidos.custo || 0);
  return (
    <div className="indicadores">
      <Indicador destaque icone={Database} titulo="Créditos de consulta"
        valor={fonte.erro ? "Indisponível" : fonte.modo === "POS_PAGO" ? "Pós-pago" : brl(fonte.saldo_centavos)}
        detalhe={fonte.erro ? "Verifique a chave de integração" : fonte.modo === "POS_PAGO" ? "Cobrança em fatura mensal" : "Recarregue no painel do fornecedor"} />
      <Indicador icone={CreditCard} cor="verde" titulo="Recebido hoje" valor={brl(r.pagamentos?.hoje)}
        detalhe={`${brl(r.pagamentos?.recebido)} no total · ${r.pagamentos?.total || 0} pagamentos`} onClick={() => irPara("pagamentos")} />
      <Indicador icone={RotateCcw} cor={r.reembolsos_pendentes ? "vermelho" : "verde"} titulo="Reembolsos pendentes" valor={r.reembolsos_pendentes}
        detalhe="Consultas do site pagas que falharam" onClick={() => irPara("pedidos")} />
      <Indicador icone={Clock} titulo="Pedidos em andamento" valor={r.pedidos.abertos} detalhe="Aguardando o órgão" onClick={() => irPara("pedidos")} />
      <Indicador icone={Check} cor="verde" titulo="Pedidos concluídos" valor={r.pedidos.concluidos} />
      <Indicador icone={CircleDollarSign} cor="verde" titulo="Receita" valor={brl(r.pedidos.receita)} detalhe="Pedidos concluídos" />
      <Indicador icone={TrendingUp} cor="verde" titulo="Margem estimada" valor={brl(margem)} detalhe="Receita menos custo das consultas" />
      <Indicador icone={Wallet} titulo="Saldo dos clientes" valor={brl(r.saldo_clientes_centavos)} detalhe="Recebido e ainda não usado" />
    </div>
  );
}

const STATUS_PG = { PENDENTE: "AGUARDANDO", PAGA: "APROVADA", CANCELADA: "RECUSADA" };

function Pagamentos() {
  const [status, setStatus] = useState("PAGA");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => api(`/admin/pagamentos/?status=${status}&busca=${encodeURIComponent(busca)}`).then(setLista), busca ? 250 : 0);
    return () => clearTimeout(t);
  }, [status, busca]);
  return (
    <section className="cartao">
      <div className="barra-filtros">
        <div className="busca"><Search size={17} /><input placeholder="Cliente ou placa" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
      </div>
      <div className="pilulas">
        {[["PAGA", "Pagos"], ["PENDENTE", "Aguardando pagamento"], ["", "Todos"]].map(([v, n]) => (
          <button key={v} className={`pilula ${status === v ? "ativa" : ""}`} onClick={() => setStatus(v)}>{n}</button>
        ))}
      </div>
      {!lista ? <Esqueleto linhas={5} /> : lista.length === 0 ? <Vazio icone={CreditCard} titulo="Nenhum pagamento" texto="Os pagamentos feitos pelo checkout aparecem aqui." /> : (
        <div className="tabela-rolagem">
          <table>
            <thead><tr><th>Data</th><th>Cliente</th><th>Referente a</th><th>Forma</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="suave">{dataHora(p.pago_em || p.criado_em)}</td>
                  <td>{p.usuario}</td>
                  <td>{["PEDIDO", "PUBLICO"].includes(p.tipo) ? `${p.servico} · ${p.placa}` : "Saldo"}</td>
                  <td>{p.forma === "pix" ? <span className="selo cinza"><QrCode size={13} />Pix</span> : p.forma ? <span className="selo cinza"><CreditCard size={13} />Cartão</span> : "—"}</td>
                  <td><strong>{brl(p.valor_centavos)}</strong>{p.valor_pago_centavos && p.valor_pago_centavos !== p.valor_centavos && <div className="suave">pago {brl(p.valor_pago_centavos)}</div>}</td>
                  <td><Status valor={STATUS_PG[p.status]} texto={p.status_display} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const NOVO = { username: "", first_name: "", documento: "", telefone: "", email: "", password: "" };

function Clientes() {
  const toast = useToast();
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [novo, setNovo] = useState(null);
  const [ajuste, setAjuste] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => api(`/admin/usuarios/?page=${pagina}&busca=${encodeURIComponent(busca)}`).then(setDados), [pagina, busca]);
  useEffect(() => { const t = setTimeout(carregar, busca ? 250 : 0); return () => clearTimeout(t); }, [carregar, busca]);

  const criar = async () => {
    setSalvando(true);
    try { await api("/admin/usuarios/", { metodo: "POST", corpo: novo }); toast("Cliente criado."); setNovo(null); carregar(); }
    catch (e) { toast(e.message, "erro"); }
    setSalvando(false);
  };

  const ajustar = async () => {
    setSalvando(true);
    const valor = paraCentavos(ajuste.valor) * (ajuste.tipo === "debito" ? -1 : 1);
    try {
      await api(`/admin/usuarios/${ajuste.usuario.id}/ajuste/`, { metodo: "POST", corpo: { valor_centavos: valor, descricao: ajuste.descricao || "Ajuste manual" } });
      toast("Saldo ajustado."); setAjuste(null); carregar();
    } catch (e) { toast(e.message, "erro"); }
    setSalvando(false);
  };

  const alternar = async (u) => {
    await api(`/admin/usuarios/${u.id}/`, { metodo: "PATCH", corpo: { is_active: !u.is_active } });
    toast(u.is_active ? "Cliente bloqueado." : "Cliente reativado.");
    carregar();
  };

  return (
    <section className="cartao">
      <div className="barra-filtros">
        <div className="busca"><Search size={17} /><input placeholder="Buscar por nome, usuário ou CPF/CNPJ" value={busca} onChange={(e) => { setPagina(1); setBusca(e.target.value); }} /></div>
        <Botao variante="primario" icone={UserPlus} onClick={() => setNovo({ ...NOVO })}>Novo cliente</Botao>
      </div>
      {!dados ? <Esqueleto linhas={5} /> : dados.results.length === 0 ? <Vazio icone={Users} titulo="Nenhum cliente encontrado" /> : (
        <div className="tabela-rolagem">
          <table>
            <thead><tr><th>Cliente</th><th className="esconde-movel">Documento</th><th>Saldo</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {dados.results.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar">{(u.first_name || u.username).slice(0, 2).toUpperCase()}</div>
                      <div><strong>{u.first_name || u.username}</strong><div className="suave">{u.username}{u.is_staff && " · gestão"}</div></div>
                    </div>
                  </td>
                  <td className="esconde-movel">{u.documento || "—"}</td>
                  <td><strong>{brl(u.saldo_centavos)}</strong></td>
                  <td><Status valor={u.is_active ? "APROVADA" : "RECUSADA"} texto={u.is_active ? "Ativo" : "Bloqueado"} /></td>
                  <td>
                    <div className="acoes">
                      <Botao icone={Wallet} onClick={() => setAjuste({ usuario: u, tipo: "credito", valor: "", descricao: "" })}><span className="esconde-movel">Saldo</span></Botao>
                      <Botao variante="fantasma" icone={u.is_active ? ShieldOff : Check} onClick={() => alternar(u)} title={u.is_active ? "Bloquear" : "Reativar"} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dados && <Paginacao total={dados.count} pagina={pagina} setPagina={setPagina} />}

      <Modal aberto={!!novo} titulo="Novo cliente" largura={520} onFechar={() => setNovo(null)}
        rodape={<><Botao onClick={() => setNovo(null)}>Cancelar</Botao><Botao variante="primario" carregando={salvando} disabled={!novo?.username || !novo?.password} onClick={criar}>Criar cliente</Botao></>}>
        {novo && (
          <div className="form-grade">
            <div className="inteiro"><Campo rotulo="Nome completo / razão social"><input value={novo.first_name} onChange={(e) => setNovo({ ...novo, first_name: e.target.value })} /></Campo></div>
            <Campo rotulo="CPF/CNPJ"><input value={novo.documento} onChange={(e) => setNovo({ ...novo, documento: e.target.value })} /></Campo>
            <Campo rotulo="Telefone"><input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} /></Campo>
            <div className="inteiro"><Campo rotulo="E-mail"><input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></Campo></div>
            <Campo rotulo="Usuário de acesso"><input value={novo.username} onChange={(e) => setNovo({ ...novo, username: e.target.value.trim() })} /></Campo>
            <Campo rotulo="Senha inicial" dica="Mínimo de 6 caracteres"><input type="password" value={novo.password} onChange={(e) => setNovo({ ...novo, password: e.target.value })} /></Campo>
          </div>
        )}
      </Modal>

      <Modal aberto={!!ajuste} titulo={`Ajustar saldo · ${ajuste?.usuario.first_name || ajuste?.usuario.username || ""}`} onFechar={() => setAjuste(null)}
        rodape={<><Botao onClick={() => setAjuste(null)}>Cancelar</Botao><Botao variante="primario" carregando={salvando} disabled={!(paraCentavos(ajuste?.valor || 0) > 0)} onClick={ajustar}>Confirmar ajuste</Botao></>}>
        {ajuste && (
          <>
            <p className="suave" style={{ marginBottom: 16 }}>Saldo atual: <strong>{brl(ajuste.usuario.saldo_centavos)}</strong></p>
            <div className="pilulas">
              <button className={`pilula ${ajuste.tipo === "credito" ? "ativa" : ""}`} onClick={() => setAjuste({ ...ajuste, tipo: "credito" })}>Adicionar</button>
              <button className={`pilula ${ajuste.tipo === "debito" ? "ativa" : ""}`} onClick={() => setAjuste({ ...ajuste, tipo: "debito" })}>Remover</button>
            </div>
            <Campo rotulo="Valor (R$)"><input inputMode="decimal" placeholder="0,00" value={ajuste.valor} onChange={(e) => setAjuste({ ...ajuste, valor: e.target.value })} /></Campo>
            <Campo rotulo="Motivo"><input placeholder="Ex.: bônus, correção, cortesia" value={ajuste.descricao} onChange={(e) => setAjuste({ ...ajuste, descricao: e.target.value })} /></Campo>
          </>
        )}
      </Modal>
    </section>
  );
}

function PedidosAdmin() {
  const toast = useToast();
  const [dados, setDados] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [filtro, setFiltro] = useState("");
  const [origem, setOrigem] = useState("");
  const [placa, setPlaca] = useState("");
  const [confirmar, setConfirmar] = useState(null);
  const carregar = useCallback(() => {
    const q = new URLSearchParams({ page: pagina, placa, origem });
    if (filtro === "REEMBOLSO") q.set("reembolso", "1"); else if (filtro) q.set("status", filtro);
    return api(`/admin/pedidos/?${q}`).then(setDados);
  }, [pagina, filtro, origem, placa]);
  useEffect(() => { const t = setTimeout(carregar, placa ? 250 : 0); return () => clearTimeout(t); }, [carregar, placa]);

  const reembolsado = async () => {
    try { await api(`/admin/pedidos/${confirmar.id}/reembolsado/`, { metodo: "POST" }); toast("Reembolso registrado."); setConfirmar(null); carregar(); }
    catch (e) { toast(e.message, "erro"); }
  };

  return (
    <section className="cartao">
      <div className="barra-filtros">
        <div className="busca"><Search size={17} /><input placeholder="Buscar por placa" value={placa} onChange={(e) => { setPagina(1); setPlaca(e.target.value.toUpperCase()); }} /></div>
        <select value={origem} onChange={(e) => { setPagina(1); setOrigem(e.target.value); }}>
          <option value="">Painel e site</option><option value="PAINEL">Só painel</option><option value="PUBLICO">Só site público</option>
        </select>
      </div>
      <div className="pilulas">
        {[["", "Todos"], ["PROCESSANDO", "Em andamento"], ["SUCESSO", "Concluídos"], ["FALHA", "Com falha"], ["REEMBOLSO", "Reembolso pendente"]].map(([v, n]) => (
          <button key={v} className={`pilula ${filtro === v ? "ativa" : ""}`} onClick={() => { setPagina(1); setFiltro(v); }}>{n}</button>
        ))}
      </div>
      {filtro === "REEMBOLSO" && <div className="aviso alerta"><RotateCcw size={18} /><span>Consultas do site que foram pagas e falharam. Faça o estorno no app da InfinitePay e depois marque aqui como reembolsado.</span></div>}
      {!dados ? <Esqueleto linhas={5} /> : filtro === "REEMBOLSO" ? (
        dados.results.length === 0 ? <Vazio icone={RotateCcw} titulo="Nenhum reembolso pendente" /> : (
          <div className="itens">
            {dados.results.map((p) => (
              <div className="item" key={p.id}>
                <div className="item-icone vermelho"><RotateCcw size={18} /></div>
                <div className="item-corpo"><strong>{p.servico} · {p.placa} · {brl(p.valor_centavos)}</strong><span>{p.usuario} · {p.comprador_email} · {dataHora(p.criado_em)}</span></div>
                <Botao variante="sucesso" icone={Check} onClick={() => setConfirmar(p)}>Marcar reembolsado</Botao>
              </div>
            ))}
          </div>
        )
      ) : <TabelaPedidos pedidos={dados.results} mostrarUsuario />}
      {dados && <Paginacao total={dados.count} pagina={pagina} setPagina={setPagina} />}
      <Modal aberto={!!confirmar} titulo="Confirmar reembolso" onFechar={() => setConfirmar(null)}
        rodape={<><Botao onClick={() => setConfirmar(null)}>Cancelar</Botao><Botao variante="sucesso" onClick={reembolsado}>Já estornei</Botao></>}>
        {confirmar && <p>Você já estornou <strong>{brl(confirmar.valor_centavos)}</strong> de <strong>{confirmar.usuario}</strong> no app da InfinitePay? O cliente verá no link do pedido que o valor foi estornado.</p>}
      </Modal>
    </section>
  );
}

function Servicos() {
  const toast = useToast();
  const [lista, setLista] = useState(null);
  useEffect(() => {
    api("/admin/servicos/").then((l) => setLista(l.map((s) => ({
      ...s, preco_txt: paraTexto(s.preco_centavos), preco_publico_txt: paraTexto(s.preco_publico_centavos),
    }))));
  }, []);
  const mudar = (id, campo, valor) => setLista(lista.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));
  const salvar = async (s) => {
    const preco = paraCentavos(s.preco_txt), publico = paraCentavos(s.preco_publico_txt);
    if (!Number.isFinite(preco) || preco < 0 || !Number.isFinite(publico) || publico < 0) { toast("Preço inválido.", "erro"); return; }
    try {
      await api(`/admin/servicos/${s.id}/`, { metodo: "PATCH", corpo: {
        nome: s.nome, descricao: s.descricao, preco_centavos: preco, ativo: s.ativo,
        preco_publico_centavos: publico, publico_ativo: s.publico_ativo,
      } });
      toast(`${s.nome} atualizado.`);
    } catch (e) { toast(e.message, "erro"); }
  };
  if (!lista) return <section className="cartao"><Esqueleto /></section>;
  return (
    <div className="indicadores" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
      {lista.map((s) => {
        const I = iconeServico(s.codigo);
        return (
          <section className="cartao" key={s.id} style={{ marginTop: 0 }}>
            <div className="cartao-topo">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="item-icone roxo"><I size={18} /></div>
                <div><h3>{s.nome}</h3><span className="suave">{s.assincrono ? "Emissão em 1 a 3 dias úteis" : "Resposta imediata"}</span></div>
              </div>
            </div>
            <Campo rotulo="Nome exibido"><input value={s.nome} onChange={(e) => mudar(s.id, "nome", e.target.value)} /></Campo>
            <Campo rotulo="Descrição"><input value={s.descricao} onChange={(e) => mudar(s.id, "descricao", e.target.value)} /></Campo>
            <div className="precos-canal">
              <div className={`canal ${s.ativo ? "" : "desligado"}`}>
                <div className="canal-topo"><strong>Painel dos despachantes</strong>
                  <label className="alternar"><input type="checkbox" checked={s.ativo} onChange={(e) => mudar(s.id, "ativo", e.target.checked)} />{s.ativo ? "Ativo" : "Inativo"}</label>
                </div>
                <Campo rotulo="Preço (R$)" dica="Debitado da carteira"><input inputMode="decimal" value={s.preco_txt} onChange={(e) => mudar(s.id, "preco_txt", e.target.value)} /></Campo>
              </div>
              <div className={`canal ${s.publico_ativo ? "" : "desligado"}`}>
                <div className="canal-topo"><strong>Site público</strong>
                  <label className="alternar"><input type="checkbox" checked={s.publico_ativo} onChange={(e) => mudar(s.id, "publico_ativo", e.target.checked)} />{s.publico_ativo ? "Ativo" : "Inativo"}</label>
                </div>
                <Campo rotulo="Preço (R$)" dica="Pago no checkout · mín. R$ 1,00"><input inputMode="decimal" value={s.preco_publico_txt} onChange={(e) => mudar(s.id, "preco_publico_txt", e.target.value)} /></Campo>
              </div>
            </div>
            <Botao variante="primario" className="btn-grande" onClick={() => salvar(s)}>Salvar alterações</Botao>
          </section>
        );
      })}
    </div>
  );
}
