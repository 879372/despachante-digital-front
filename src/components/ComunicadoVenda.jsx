import { forwardRef, useRef, useState } from "react";
import { api } from "../api";
import { Campo } from "./ui";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
export const novoComunicado = () => ({
  vendedor: { tipo_pessoa: "F", documento: "", nome: "" },
  comprador: { tipo_pessoa: "F", documento: "", nome: "" },
  endereco_comprador: { cep: "", logradouro: "", numero: "", bairro: "", complemento: "", cidade_ibge: "", cidade_nome: "" },
  venda_data: "", venda_valor: "", venda_cidade_ibge: "", comprador_solicitante: false,
  renavam: "", ano_fabricacao: "", ano_modelo: "", crv_numero: "", crv_codigo_seguranca: "", crv_via: 1,
  crv_data_emissao: "", crv_uf: "", arquivos: [],
});
export function validarComunicado(ref) {
  for (const campo of ref.current?.querySelectorAll("input, select") || []) {
    if (!campo.reportValidity()) return false;
  }
  return true;
}

const ComunicadoVenda = forwardRef(function ComunicadoVenda({ dados, onChange }, ref) {
  const [aviso, setAviso] = useState("");
  const leituraAtual = useRef(0);
  const alterar = (campo, valor) => onChange((anterior) => ({ ...anterior, [campo]: valor }));
  const grupo = (nome, campo, valor) => onChange((anterior) => ({ ...anterior, [nome]: { ...anterior[nome], [campo]: valor } }));
  const campo = (nome, rotulo, tipo = "text", extra = {}) => (
    <Campo rotulo={rotulo} key={nome}><input type={tipo} required value={dados[nome]} onChange={(e) => alterar(nome, e.target.value)} {...extra} /></Campo>
  );
  const consultarCep = async (valor) => {
    const cep = valor.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setAviso("");
    try {
      const endereco = await api(`/cep/${cep}/`);
      onChange((anterior) => anterior.endereco_comprador.cep.replace(/\D/g, "") !== cep ? anterior : ({
        ...anterior, endereco_comprador: { ...anterior.endereco_comprador, ...endereco },
      }));
    } catch { setAviso("Não foi possível localizar o CEP. Preencha o endereço e o código IBGE manualmente."); }
  };
  const anexar = async (e) => {
    const leitura = ++leituraAtual.current;
    const input = e.target;
    const arquivos = Array.from(input.files || []);
    alterar("arquivos", []);
    if (arquivos.length > 2 || arquivos.some((a) => !["application/pdf", "image/jpeg", "image/png"].includes(a.type) || a.size > 5 * 1024 * 1024 || !a.size)) {
      input.setCustomValidity("Envie até 2 arquivos PDF, JPG ou PNG, com até 5 MB cada e conteúdo não vazio.");
      input.reportValidity(); return;
    }
    input.setCustomValidity("Aguarde a leitura dos arquivos.");
    try {
      const lidos = await Promise.all(arquivos.map((arquivo) => new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve({ nome: arquivo.name, mime_type: arquivo.type, base64: leitor.result.split(",")[1] });
        leitor.onerror = reject;
        leitor.readAsDataURL(arquivo);
      })));
      if (leitura !== leituraAtual.current) return;
      alterar("arquivos", lidos); input.setCustomValidity("");
    } catch {
      if (leitura !== leituraAtual.current) return;
      input.setCustomValidity("Não foi possível ler o arquivo. Selecione novamente."); input.reportValidity();
    }
  };
  return (
    <fieldset ref={ref} className="comunicado-form">
      <legend>Dados do comunicado de venda</legend>
      <p className="suave">Confira os dados conforme o CRV/ATPV-e antes de confirmar. A conclusão depende do processamento pelo órgão de trânsito.</p>
      {[['vendedor', 'Vendedor'], ['comprador', 'Comprador']].map(([nome, titulo]) => (
        <section key={nome}>
          <h3>{titulo}</h3>
          <div className="form-grade">
            <Campo rotulo="Tipo de pessoa"><select value={dados[nome].tipo_pessoa} onChange={(e) => grupo(nome, "tipo_pessoa", e.target.value)}><option value="F">Pessoa física</option><option value="J">Pessoa jurídica</option></select></Campo>
            <Campo rotulo={dados[nome].tipo_pessoa === "F" ? "CPF" : "CNPJ"}><input required inputMode="numeric" maxLength={18} value={dados[nome].documento} onChange={(e) => grupo(nome, "documento", e.target.value)} /></Campo>
            <Campo rotulo="Nome / razão social"><input required minLength={3} maxLength={120} value={dados[nome].nome} onChange={(e) => grupo(nome, "nome", e.target.value)} /></Campo>
          </div>
        </section>
      ))}
      <h3>Endereço do comprador</h3>
      <div className="form-grade">
        {[["cep", "CEP"], ["logradouro", "Logradouro"], ["numero", "Número"], ["bairro", "Bairro"], ["complemento", "Complemento"], ["cidade_nome", "Cidade"], ["cidade_ibge", "Código IBGE da cidade (7 dígitos)"]].map(([nome, rotulo]) => (
          <Campo rotulo={rotulo} key={nome}><input required={!["complemento", "cidade_nome"].includes(nome)} value={dados.endereco_comprador[nome]} pattern={nome === "cidade_ibge" ? "[0-9]{7}" : undefined} maxLength={nome === "cep" ? 9 : nome === "numero" ? 10 : nome === "cidade_ibge" ? 7 : 60} onChange={(e) => grupo("endereco_comprador", nome, e.target.value)} onBlur={nome === "cep" ? (e) => consultarCep(e.target.value) : undefined} /></Campo>
        ))}
      </div>
      {aviso && <p role="status">{aviso}</p>}
      <h3>Veículo e CRV</h3>
      <div className="form-grade">
        {campo("renavam", "Renavam", "text", { inputMode: "numeric", pattern: "[0-9]{9,11}", maxLength: 11 })}
        {campo("ano_fabricacao", "Ano de fabricação", "number", { min: 1900, max: new Date().getFullYear() })}
        {campo("ano_modelo", "Ano do modelo", "number", { min: 1900, max: new Date().getFullYear() + 1 })}
        {campo("crv_numero", "Número do CRV", "text", { inputMode: "numeric", maxLength: 20 })}
        {campo("crv_codigo_seguranca", "Código de segurança do CRV", "password", { inputMode: "numeric", autoComplete: "off", minLength: 8, maxLength: 20 })}
        {campo("crv_via", "Via do CRV", "number", { min: 1, max: 99 })}
        {campo("crv_data_emissao", "Data de emissão do CRV", "date")}
        <Campo rotulo="UF de emissão"><select required value={dados.crv_uf} onChange={(e) => alterar("crv_uf", e.target.value)}><option value="">Selecione</option>{UFS.map((uf) => <option key={uf}>{uf}</option>)}</select></Campo>
      </div>
      <h3>Venda</h3>
      <div className="form-grade">
        {campo("venda_data", "Data da venda", "date")}
        {campo("venda_valor", "Valor da venda (R$)", "number", { min: 1, step: "0.01" })}
        <Campo rotulo="Código IBGE da cidade da venda" dica="Deixe vazio para usar a cidade do comprador."><input inputMode="numeric" pattern="[0-9]{7}" maxLength={7} value={dados.venda_cidade_ibge} onChange={(e) => alterar("venda_cidade_ibge", e.target.value)} /></Campo>
      </div>
      <label className="aceite"><input type="checkbox" checked={dados.comprador_solicitante} onChange={(e) => alterar("comprador_solicitante", e.target.checked)} /><span>O comprador é o solicitante da comunicação.</span></label>
      <Campo rotulo="CRV/ATPV-e assinado (DUT)" dica="Até 2 arquivos PDF, JPG ou PNG de até 5 MB. O órgão pode exigir estes anexos."><input type="file" multiple accept="application/pdf,image/jpeg,image/png" onChange={anexar} /></Campo>
    </fieldset>
  );
});
export default ComunicadoVenda;
