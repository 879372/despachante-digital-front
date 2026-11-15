import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, sessao } from "./api";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!sessao.token) { setUsuario(null); setCarregando(false); return; }
    try { setUsuario(await api("/eu/")); } catch { setUsuario(null); }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
    const sair = () => setUsuario(null);
    window.addEventListener("sessao-expirada", sair);
    return () => window.removeEventListener("sessao-expirada", sair);
  }, [recarregar]);

  const entrar = async (username, password) => {
    sessao.salvar(await api("/auth/token/", { metodo: "POST", corpo: { username, password } }));
    await recarregar();
  };
  const entrarComTokens = async (tokens) => { sessao.salvar(tokens); await recarregar(); };
  const sair = () => { sessao.sair(); setUsuario(null); };

  return <Ctx.Provider value={{ usuario, carregando, entrar, entrarComTokens, sair, recarregar }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
