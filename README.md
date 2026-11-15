# despachante-digital-front

Frontend React + Vite do Despachante Digital, com site público, painel do cliente e gestão.

Backend: https://github.com/879372/despachante-digital-back

## Desenvolvimento

```bash
npm ci
npm run dev
```

O Vite encaminha `/api` para `http://127.0.0.1:8000`. Execute o backend separadamente.

## Build

```bash
npm run build
npm run preview
```

Na Vercel, `vercel.json` configura Vite, a saída `dist` e o fallback das rotas para `index.html`.

## Configuração

Configure em Production na Vercel:

```env
VITE_API_URL=https://api-production-16b340bd.up.railway.app
```

A variável é incorporada no build; alterações exigem um novo deploy. Sem ela, as chamadas usam `/api/` no mesmo domínio, inclusive no desenvolvimento local. Também é aceito um endereço terminado em `/api`. Configure o domínio do frontend nas origens CORS do backend.

A marca pode ser configurada com `VITE_APP_NOME` e `VITE_APP_SUBTITULO` durante o build. Credenciais de integração e pagamento ficam exclusivamente no backend.

## Funcionalidades

- Compra pública sem cadastro e acesso ao resultado por link privado.
- Login, cadastro, recuperação de senha e programa de indicação.
- Pedidos, documentos, carteira e checkout InfinitePay.
- Gestão de clientes, serviços, pagamentos e reembolsos.
- Chat de suporte, interface responsiva e temas claro/escuro.
