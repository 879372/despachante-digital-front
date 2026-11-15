import { ChevronLeft, ChevronRight, FileText, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, brl, dataHora } from "../api";
import { Botao, Esqueleto, PlacaMini, Status, Vazio } from "../components/ui";

const FILTROS = [["", "Todos"], ["PROCESSANDO", "Em andamento"], ["SUCESSO", "Concluídos"], ["FALHA", "Com falha"]];

export default function Pedidos() {
  const [dados, setDados] = useState(null);
  const [status, setStatus] = useState("");
  const [placa, setPlaca] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const q = new URLSearchParams({ page: pagina });
    if (status) q.set("status", status);
    if (placa) q.set("placa", placa);
    const t = setTimeout(() => api(`/pedidos/?${q}`).then(setDados).catch(() => setDados({ results: [], count: 0 })), placa ? 250 : 0);
    return () => clearTimeout(t);
  }, [status, placa, pagina]);

  return (
    <>
      <div className="pagina-topo">
        <div><h1>Meus pedidos</h1><p>Acompanhe suas solicitações e baixe os documentos.</p></div>
        <Link to="/"><Botao variante="primario" icone={Plus}>Nova solicitação</Botao></Link>
      </div>
      <section className="cartao">
        <div className="barra-filtros">
          <div className="busca"><Search size={17} /><input placeholder="Buscar por placa" value={placa} onChange={(e) => { setPagina(1); setPlaca(e.target.value.toUpperCase()); }} /></div>
        </div>
        <div className="pilulas">
          {FILTROS.map(([v, r]) => <button key={v} className={`pilula ${status === v ? "ativa" : ""}`} onClick={() => { setPagina(1); setStatus(v); }}>{r}</button>)}
        </div>
        {!dados ? <Esqueleto linhas={5} /> : <TabelaPedidos pedidos={dados.results} />}
        {dados && <Paginacao total={dados.count} pagina={pagina} setPagina={setPagina} />}
      </section>
    </>
  );
}

export function TabelaPedidos({ pedidos, mostrarUsuario = false }) {
  const navegar = useNavigate();
  if (!pedidos.length) return <Vazio icone={FileText} titulo="Nenhum pedido encontrado" texto="Ajuste os filtros ou faça uma nova solicitação." />;
  return (
    <div className="tabela-rolagem">
      <table>
        <thead><tr><th>Placa</th><th>Serviço</th>{mostrarUsuario && <th>Cliente</th>}<th className="esconde-movel">Data</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody>
          {pedidos.map((p) => (
            <tr key={p.id} className="clicavel" onClick={() => navegar(`/pedidos/${p.id}`)}>
              <td><PlacaMini placa={p.placa} /></td>
              <td>{p.servico}</td>
              {mostrarUsuario && <td>{p.usuario}</td>}
              <td className="esconde-movel suave">{dataHora(p.criado_em)}</td>
              <td><strong>{brl(p.valor_centavos)}</strong></td>
              <td><Status valor={p.status} texto={p.status_display} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Paginacao({ total, pagina, setPagina, porPagina = 25 }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  return (
    <div className="paginacao">
      <span>Página {pagina} de {paginas} · {total} registros</span>
      <div>
        <Botao icone={ChevronLeft} disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} aria-label="Anterior" />
        <Botao icone={ChevronRight} disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)} aria-label="Próxima" />
      </div>
    </div>
  );
}
