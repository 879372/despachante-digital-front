import { Eye, EyeOff, FileCheck2, Gift, KeyRound, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../App";
import { useAuth } from "../auth";
import { Botao, Campo } from "../components/ui";
import { brl } from "../api";
import { useConfig } from "../config";

export function LayoutPublico({ children }) {
  const cfg = useConfig();
  return (
    <div className="login">
      <section className="login-arte">
        <Logo />
        <div>
          <h2>Documentos do veículo em poucos cliques.</h2>
          <ul>
            <li><FileCheck2 />CRLV-e digital em PDF</li>
            <li><KeyRound />Código de segurança do CRV na hora</li>
            <li><Wallet />Saldo pré-pago com recarga via PIX</li>
            <li><Gift />Indique amigos e ganhe {brl(cfg.bonus_indicacao_centavos)} por indicação</li>
          </ul>
        </div>
        <small style={{ opacity: .6 }}>Seus dados protegidos e acesso individual.</small>
      </section>
      <section className="login-form">{children}</section>
    </div>
  );
}

export function SenhaInput({ value, onChange, autoComplete = "current-password", ...props }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="senha">
      <input type={ver ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={onChange} placeholder="••••••••" {...props} />
      <button type="button" className="btn-icone" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar senha" : "Mostrar senha"}>
        {ver ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export default function Login() {
  const { entrar } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setErro(""); setEnviando(true);
    try { await entrar(form.username.trim(), form.password); }
    catch (err) {
      setErro(err.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "E-mail/usuário ou senha incorretos.");
      setEnviando(false);
    }
  };

  return (
    <LayoutPublico>
      <form onSubmit={enviar}>
        <h1>Área do despachante</h1>
        <p>Entre com seu e-mail e senha para continuar.</p>
        <Campo rotulo="E-mail ou usuário">
          <input autoFocus autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="voce@email.com" />
        </Campo>
        <div className="campo">
          <div className="rotulo-linha">
            <span className="campo-rotulo">Senha</span>
            <Link to="/esqueci-senha" className="link-pequeno">Esqueceu a senha?</Link>
          </div>
          <SenhaInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {erro && <div className="aviso erro"><ShieldCheck size={18} />{erro}</div>}
        <Botao variante="primario" className="btn-grande" carregando={enviando} disabled={!form.username || !form.password}>Entrar</Botao>
        <p className="rodape-form">Ainda não tem conta? <Link to="/cadastro">Criar conta grátis</Link></p>
        <p className="rodape-form" style={{ marginTop: 8 }}><Link to="/">← Voltar ao site de consultas</Link></p>
      </form>
    </LayoutPublico>
  );
}
