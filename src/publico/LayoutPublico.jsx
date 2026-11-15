import { LogIn, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../App";
import { MARCA } from "../config";
import ChatVisitante from "./ChatVisitante";

export default function LayoutPublico({ children, chat = true }) {
  const [tema, setTema] = useState(() => document.documentElement.dataset.theme || "light");
  const alternar = () => {
    const novo = tema === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem("desp_tema", novo); } catch { /* sem storage */ }
    setTema(novo);
  };
  return (
    <div className="site">
      <header className="site-topo">
        <Link to="/" className="logo-link" aria-label={`${MARCA.nome}, início`}><Logo /></Link>
        <div className="site-topo-acoes">
          <button className="btn-icone" onClick={alternar} aria-label="Alternar tema">{tema === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <Link to="/entrar" className="btn btn-fantasma"><LogIn size={16} /><span className="esconde-movel">Área do despachante</span></Link>
        </div>
      </header>
      <main className="site-conteudo">{children}</main>
      <footer className="site-rodape">
        <span>© {new Date().getFullYear()} {MARCA.nome}</span>
        <span>Pagamento seguro · Pix ou cartão</span>
      </footer>
      {chat && <ChatVisitante />}
    </div>
  );
}
