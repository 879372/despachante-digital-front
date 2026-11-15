import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Botao, Campo } from "../components/ui";
import { useConfig } from "../config";
import { emailValido } from "../mascaras";
import { LayoutPublico } from "./Login";

export default function EsqueciSenha() {
  const cfg = useConfig();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    if (!emailValido(email)) { setErro("Digite um e-mail válido."); return; }
    setEnviando(true); setErro("");
    try { await api("/auth/senha/esqueci/", { metodo: "POST", corpo: { email } }); setEnviado(true); }
    catch (err) { setErro(err.status === 429 ? "Muitas tentativas. Aguarde um minuto." : err.message); }
    setEnviando(false);
  };

  const suporte = cfg.suporte_email && (
    <p className="rodape-form">Não recebeu ou não tem mais acesso ao e-mail? Fale com a gente:{" "}
      <a href={`mailto:${cfg.suporte_email}?subject=${encodeURIComponent("Alterar senha")}`}>{cfg.suporte_email}</a>
    </p>
  );

  return (
    <LayoutPublico>
      {enviado ? (
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div className="icone-grande verde"><MailCheck size={28} /></div>
          <h1>Confira seu e-mail</h1>
          <p>Se <strong>{email}</strong> estiver cadastrado, enviamos um link para criar uma nova senha. O link vale por 2 horas. Olhe também a caixa de spam.</p>
          <Link to="/entrar"><Botao className="btn-grande" icone={ArrowLeft}>Voltar para o login</Botao></Link>
          {suporte}
        </div>
      ) : (
        <form onSubmit={enviar} noValidate>
          <Link to="/entrar" className="voltar"><ArrowLeft size={16} />Voltar para o login</Link>
          <div className="icone-grande"><Mail size={26} /></div>
          <h1>Esqueceu a senha?</h1>
          <p>Digite o e-mail da sua conta e enviaremos um link para você criar uma nova senha.</p>
          <Campo rotulo="E-mail" erro={erro}>
            <input type="email" autoFocus autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErro(""); }} placeholder="voce@email.com" />
          </Campo>
          <Botao variante="primario" className="btn-grande" carregando={enviando} disabled={!email}>Enviar link</Botao>
          {suporte}
        </form>
      )}
    </LayoutPublico>
  );
}
