import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Botao, Campo } from "../components/ui";
import { forcaSenha } from "../mascaras";
import { LayoutPublico, SenhaInput } from "./Login";

const FORCA = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const uid = params.get("uid"), token = params.get("token");
  const forca = forcaSenha(senha);

  const enviar = async (e) => {
    e.preventDefault();
    if (senha.length < 8) { setErro("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (senha !== confirmar) { setErro("As senhas não conferem."); return; }
    setEnviando(true); setErro("");
    try { await api("/auth/senha/redefinir/", { metodo: "POST", corpo: { uid, token, password: senha } }); setOk(true); }
    catch (err) { setErro(err.dados?.password?.[0] || err.message); }
    setEnviando(false);
  };

  if (!uid || !token) {
    return (
      <LayoutPublico>
        <div style={{ maxWidth: 380 }}>
          <h1>Link inválido</h1>
          <p>Este link de redefinição está incompleto. Peça um novo.</p>
          <Link to="/esqueci-senha"><Botao variante="primario" className="btn-grande">Pedir novo link</Botao></Link>
        </div>
      </LayoutPublico>
    );
  }

  return (
    <LayoutPublico>
      {ok ? (
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div className="icone-grande verde"><CheckCircle2 size={28} /></div>
          <h1>Senha alterada!</h1>
          <p>Pronto. Agora é só entrar com a sua nova senha.</p>
          <Link to="/entrar"><Botao variante="primario" className="btn-grande">Ir para o login</Botao></Link>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate>
          <Link to="/entrar" className="voltar"><ArrowLeft size={16} />Voltar para o login</Link>
          <div className="icone-grande"><LockKeyhole size={26} /></div>
          <h1>Criar nova senha</h1>
          <p>Escolha uma senha forte, com letras e números.</p>
          <Campo rotulo="Nova senha">
            <SenhaInput autoFocus autoComplete="new-password" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }} />
            {senha && <div className="forca"><div className={`forca-barra f${forca}`}><span /><span /><span /><span /></div><small>{FORCA[forca]}</small></div>}
          </Campo>
          <Campo rotulo="Confirmar nova senha">
            <SenhaInput autoComplete="new-password" value={confirmar} onChange={(e) => { setConfirmar(e.target.value); setErro(""); }} />
          </Campo>
          {erro && <div className="aviso erro">{erro}{erro.includes("expirado") && <> <Link to="/esqueci-senha">Pedir novo link</Link></>}</div>}
          <Botao variante="primario" className="btn-grande" carregando={enviando} disabled={!senha || !confirmar}>Salvar nova senha</Botao>
        </form>
      )}
    </LayoutPublico>
  );
}
