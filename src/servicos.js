import { FileText, KeyRound, Search } from "lucide-react";

export function iconeServico(codigo = "") {
  if (codigo.startsWith("crlv")) return FileText;
  if (codigo.includes("seguranca")) return KeyRound;
  return Search;
}
