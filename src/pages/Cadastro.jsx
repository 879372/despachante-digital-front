import { ArrowLeft, Check, Gift, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, brl } from "../api";
import { useAuth } from "../auth";
import { Botao, Campo, useToast } from "../components/ui";
import { useConfig } from "../config";
import { documentoValido, emailValido, forcaSenha, mascaraDocumento, mascaraTelefone, telefoneValido } from "../mascaras";
import { LayoutPublico, SenhaInput } from "./Login";

const FORCA = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];

export default function Cadastro() {
  const [params] = useSearchParams();
  const { entrarComTokens } = useAuth();
  const toast = useToast();
  const cfg = useConfig();
  const [form, setForm] = useState({
    nome: "", email: "", documento: "", telefone: "", password: "", confirmar: "",
    codigo_indicacao: (params.get("indicacao") || params.get("ref") || "").toUpperCase(), aceite: false,
  });
  const [tocado, setTocado] = useState({});
  const [erroServidor, setErroServidor] = useState({});
  const [codigo, setCodigo] = useState({ estado: "vazio" }); // vazio | verificando | ok | invalido
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo, valor) => { setForm((f) => ({ ...f, [campo]: valor })); setErroServidor((e) => ({ ...e, [campo]: undefined })); };
  const tocar = (campo) => setTocado((t) => ({ ...t, [campo]: true }));

  // valida o código de indicação enquanto digita
  useEffect(() => {
    const c = form.codigo_indicacao.trim();
    if (!c) { setCodigo({ estado: "vazio" }); return; }
    setCodigo({ estado: "verificando" });
    const t = setTimeout(() => {
      fetch(`/api/auth/indicacao/${encodeURIComponent(c)}/`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setCodigo(d?.valido ? { estado: "ok", indicador: d.indicador } : { estado: "invalido" }))
        .catch(() => setCodigo({ estado: "invalido" }));
    }, 400);
    return () => clearTimeout(t);
  }, [form.codigo_indicacao]);

  const erros = useMemo(() => {
    const e = {};
    if (form.nome.trim().split(/\s+/).length < 2) e.nome = "Informe nome e sobrenome (ou razão social).";
    if (!emailValido(form.email)) e.email = "E-mail inválido.";
    if (!documentoValido(form.documento)) e.documento = "CPF ou CNPJ inválido.";
    if (!telefoneValido(form.telefone)) e.telefone = "Telefone inválido. Ex.: (84) 99999-1234";
    if (form.password.length < 8) e.password = "Mínimo de 8 caracteres.";
    else if (/^\d+$/.test(form.password)) e.password = "A senha não pode ter só números.";
    if (form.confirmar !== form.password) e.confirmar = "As senhas não conferem.";
    if (codigo.estado === "invalido") e.codigo_indicacao = "Código não encontrado.";
    if (!form.aceite) e.aceite = "Aceite os termos para continuar.";
    return e;
  }, [form, codigo.estado]);

  const erroDe = (campo) => erroServidor[campo] || (tocado[campo] ? erros[campo] : undefined);
  const valido = Object.keys(erros).length === 0 && codigo.estado !== "verificando";
  const forca = forcaSenha(form.password);

  const enviar = async (e) => {
    e.preventDefault();
    setTocado(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (!valido) return;
    setEnviando(true);
    try {
      const { confirmar, ...corpo } = form; // eslint-disable-line no-unused-vars
      const r = await api("/auth/cadastro/", { metodo: "POST", corpo });
      await entrarComTokens(r);
      toast(r.bonus_creditado ? `Conta criada! Você ganhou ${brl(cfg.bonus_indicacao_centavos)} de bônus.` : "Conta criada com sucesso. Bem-vindo!");
    } catch (err) {
      const d = err.dados || {};
      const porCampo = Object.fromEntries(Object.entries(d).filter(([k]) => k !== "detail").map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
      setErroServidor(porCampo);
      toast(d.detail || (err.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "Confira os campos destacados."), "erro");
      setEnviando(false);
    }
  };

  const bonus = brl(cfg.bonus_indicacao_centavos);
  const quando = cfg.bonus_gatilho === "cadastro" ? "agora no cadastro" : "na sua primeira recarga";

  return (
    <LayoutPublico>
      <form onSubmit={enviar} noValidate style={{ maxWidth: 460 }}>
        <Link to="/entrar" className="voltar"><ArrowLeft size={16} />Já tenho conta</Link>
        <h1>Criar sua conta</h1>
        <p>Leva menos de um minuto.</p>

        {codigo.estado === "ok" && (
          <div className="aviso ok"><Gift size={18} /><span>Você foi indicado por <strong>{codigo.indicador}</strong>! Vocês dois ganham <strong>{bonus}</strong> de saldo {quando}.</span></div>
        )}

        <div className="form-grade">
          <div className="inteiro">
            <Campo rotulo="Nome completo ou razão social" erro={erroDe("nome")}>
              <input autoFocus autoComplete="name" value={form.nome} onChange={(e) => mudar("nome", e.target.value)} onBlur={() => tocar("nome")} />
            </Campo>
          </div>
          <div className="inteiro">
            <Campo rotulo="E-mail" erro={erroDe("email")}>
              <input type="email" autoComplete="email" value={form.email} onChange={(e) => mudar("email", e.target.value)} onBlur={() => tocar("email")} placeholder="voce@email.com" />
            </Campo>
          </div>
          <Campo rotulo="CPF ou CNPJ" erro={erroDe("documento")}>
            <input inputMode="numeric" value={form.documento} onChange={(e) => mudar("documento", mascaraDocumento(e.target.value))} onBlur={() => tocar("documento")} placeholder="000.000.000-00" />
          </Campo>
          <Campo rotulo="Celular / WhatsApp" erro={erroDe("telefone")}>
            <input inputMode="tel" autoComplete="tel" value={form.telefone} onChange={(e) => mudar("telefone", mascaraTelefone(e.target.value))} onBlur={() => tocar("telefone")} placeholder="(84) 99999-1234" />
          </Campo>
          <Campo rotulo="Senha" erro={erroDe("password")}>
            <SenhaInput autoComplete="new-password" value={form.password} onChange={(e) => mudar("password", e.target.value)} onBlur={() => tocar("password")} />
            {form.password && (
              <div className="forca"><div className={`forca-barra f${forca}`}><span /><span /><span /><span /></div><small>{FORCA[forca]}</small></div>
            )}
          </Campo>
          <Campo rotulo="Confirmar senha" erro={erroDe("confirmar")}>
            <SenhaInput autoComplete="new-password" value={form.confirmar} onChange={(e) => mudar("confirmar", e.target.value)} onBlur={() => tocar("confirmar")} />
          </Campo>
          <div className="inteiro">
            <Campo rotulo="Código de indicação (opcional)" erro={erroDe("codigo_indicacao")} dica={codigo.estado === "vazio" ? `Tem um código? Você ganha ${bonus} de saldo.` : undefined}>
              <div className="com-icone">
                <input value={form.codigo_indicacao} onChange={(e) => mudar("codigo_indicacao", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} onBlur={() => tocar("codigo_indicacao")} placeholder="Ex.: MARIA1234" className="mono" />
                {codigo.estado === "verificando" && <Loader2 size={17} className="girar" />}
                {codigo.estado === "ok" && <Check size={17} style={{ color: "var(--verde)" }} />}
                {codigo.estado === "invalido" && <X size={17} style={{ color: "var(--vermelho)" }} />}
              </div>
            </Campo>
          </div>
        </div>

        <label className="aceite">
          <input type="checkbox" checked={form.aceite} onChange={(e) => { mudar("aceite", e.target.checked); tocar("aceite"); }} />
          <span>Li e aceito os termos de uso e a política de privacidade.</span>
        </label>
        {erroDe("aceite") && <p className="campo-erro" style={{ marginTop: -8 }}>{erroDe("aceite")}</p>}

        <Botao variante="primario" className="btn-grande" carregando={enviando}>Criar conta</Botao>
      </form>
    </LayoutPublico>
  );
}
