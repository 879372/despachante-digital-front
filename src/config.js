import { useEffect, useState } from "react";
import { apiUrl } from "./api-url";

// Nome e subtítulo da marca. Troque aqui ou defina VITE_APP_NOME / VITE_APP_SUBTITULO no .env do frontend.
export const MARCA = {
  nome: import.meta.env.VITE_APP_NOME || "Despachante Digital",
  subtitulo: import.meta.env.VITE_APP_SUBTITULO || "Documentos veiculares",
};

/** Nome em duas cores: a última palavra vai em azul-placa ("Despachante <Digital>"). */
export function partesNome(nome = MARCA.nome) {
  const i = nome.lastIndexOf(" ");
  return i > 0 ? [nome.slice(0, i), nome.slice(i + 1)] : [nome, ""];
}

let cache = null;
export function useConfig() {
  const [cfg, setCfg] = useState(cache || { bonus_indicacao_centavos: 500, bonus_gatilho: "primeira_recarga", suporte_email: "" });
  useEffect(() => {
    if (cache) return;
    fetch(apiUrl("/config/")).then((r) => r.json()).then((c) => { cache = c; setCfg(c); }).catch(() => {});
  }, []);
  return cfg;
}
