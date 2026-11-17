import { FileText, Gift, Headphones, Home, LogOut, Moon, Plus, Settings, Sun, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
import { brl } from "./api";
import { useAuth } from "./auth";
import { ChatProvider, useChat } from "./chat/ChatWidget";
import { useNaoLidas } from "./chat/hooks";
import { MARCA, partesNome } from "./config";
import Admin from "./pages/Admin";
import Atendimento from "./pages/Atendimento";
import Cadastro from "./pages/Cadastro";
import Carteira from "./pages/Carteira";
import EsqueciSenha from "./pages/EsqueciSenha";
import Indicacoes from "./pages/Indicacoes";
import Inicio from "./pages/Inicio";
import Login from "./pages/Login";
import PagamentoRetorno from "./pages/PagamentoRetorno";
import PedidoDetalhe from "./pages/PedidoDetalhe";
import Pedidos from "./pages/Pedidos";
import RedefinirSenha from "./pages/RedefinirSenha";
import InicioPublico from "./publico/Inicio";
import PedidoPublico from "./publico/Pedido";
import RetornoPublico from "./publico/Retorno";

export function Logo({ subtitulo = true }) {
  const [a, b] = partesNome();
  return (
    <div className="logo">
      <div className="logo-icone"><img src="/marca/simbolo.svg" alt="" /></div>
      <div>{a} <span className="logo-digital">{b}</span>{subtitulo && <small>{MARCA.subtitulo}</small>}</div>
    </div>
  );
}

function useTema() {
  const [tema, setTema] = useState(() => document.documentElement.dataset.theme || "light");
  const alternar = () => {
    const novo = tema === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem("desp_tema", novo); } catch { /* sem storage */ }
    setTema(novo);
  };
  return [tema, alternar];
}

export default function App() {
  const { usuario, carregando, sair } = useAuth();
  const [tema, alternarTema] = useTema();
  const local = useLocation();
  // Páginas do site público abrem para qualquer pessoa, logada ou não.
  if (local.pathname.startsWith("/c/")) {
    return (
      <Routes>
        <Route path="/c/retorno" element={<RetornoPublico />} />
        <Route path="/c/:token" element={<PedidoPublico />} />
      </Routes>
    );
  }
  if (carregando) return null;
  if (!usuario) {
    return (
      <Routes>
        <Route path="/" element={<InicioPublico />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/convite/:codigo" element={<Convite />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    );
  }

  return (
    <ChatProvider ativo={!usuario.is_staff}>
      <AreaLogada usuario={usuario} sair={sair} tema={tema} alternarTema={alternarTema} local={local} />
    </ChatProvider>
  );
}

function ContadorAtendimento() {
  const [n, atualizar] = useNaoLidas(15000);
  useEffect(() => {
    window.addEventListener("chat-lido", atualizar);
    return () => window.removeEventListener("chat-lido", atualizar);
  }, [atualizar]);
  return n > 0 ? <span className="contador">{n > 99 ? "99+" : n}</span> : null;
}

function AreaLogada({ usuario, sair, tema, alternarTema, local }) {
  const { abrir: abrirSuporte } = useChat();
  const avisarLido = () => window.dispatchEvent(new Event("chat-lido"));
  const nome = usuario.first_name || usuario.username;
  const iniciais = nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="app">
      <aside className="lateral">
        <Logo />
        <nav className="menu">
          <NavLink to="/" end><Home size={19} />Início</NavLink>
          <NavLink to="/pedidos"><FileText size={19} />Meus pedidos</NavLink>
          <NavLink to="/carteira"><Wallet size={19} />Carteira</NavLink>
          <NavLink to="/indique"><Gift size={19} />Indique e ganhe</NavLink>
          {!usuario.is_staff && <button type="button" className="menu-suporte" onClick={() => abrirSuporte()}><Headphones size={19} />Suporte</button>}
          {usuario.is_staff && (
            <>
              <div className="menu-titulo">Administração</div>
              <NavLink to="/atendimento"><Headphones size={19} />Atendimento<ContadorAtendimento /></NavLink>
              <NavLink to="/admin"><Settings size={19} />Gestão</NavLink>
            </>
          )}
        </nav>
        <div className="lateral-rodape">
          <div className="cartao-saldo">
            <span>Seu saldo</span>
            <strong>{brl(usuario.saldo_centavos)}</strong>
            <Link to="/carteira"><Plus size={14} />Adicionar saldo</Link>
          </div>
          <div className="perfil">
            <div className="avatar">{iniciais}</div>
            <div className="perfil-info"><strong>{nome}</strong><span>{usuario.is_staff ? "Administrador" : "Cliente"}</span></div>
            <button className="btn-icone" onClick={alternarTema} title="Alternar tema">{tema === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
            <button className="btn-icone" onClick={sair} title="Sair"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <div className="principal">
        <header className="topo-movel">
          <Logo />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Link to="/carteira" className="saldo-chip"><Wallet size={15} />{brl(usuario.saldo_centavos)}</Link>
            {!usuario.is_staff && <button type="button" className="btn-icone" onClick={() => abrirSuporte()} aria-label="Abrir suporte"><Headphones size={18} /></button>}
            <button className="btn-icone" onClick={alternarTema}>{tema === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="btn-icone" onClick={sair}><LogOut size={18} /></button>
          </div>
        </header>

        <main className="conteudo" key={local.pathname}>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
            <Route path="/carteira" element={<Carteira />} />
            <Route path="/indique" element={<Indicacoes />} />
            <Route path="/pagamento/retorno" element={<PagamentoRetorno />} />
            {usuario.is_staff && <Route path="/admin" element={<Admin />} />}
            {usuario.is_staff && <Route path="/atendimento" element={<Atendimento aoLer={avisarLido} />} />}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <nav className="navegacao-inferior">
          <NavLink to="/" end><Home size={20} />Início</NavLink>
          <NavLink to="/pedidos"><FileText size={20} />Pedidos</NavLink>
          <NavLink to="/" end className="nova"><span className="bola"><Plus size={20} /></span></NavLink>
          {usuario.is_staff ? <NavLink to="/admin"><Settings size={20} />Gestão</NavLink> : <NavLink to="/carteira"><Wallet size={20} />Carteira</NavLink>}
          {usuario.is_staff ? <NavLink to="/atendimento"><Headphones size={20} />Chat</NavLink> : <NavLink to="/indique"><Gift size={20} />Indique</NavLink>}
        </nav>
      </div>
    </div>
  );
}

function Convite() {
  const { codigo } = useParams();
  return <Navigate to={`/cadastro?indicacao=${encodeURIComponent(codigo || "")}`} replace />;
}
