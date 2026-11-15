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

Publique a pasta `dist` e configure o servidor para encaminhar `/api/` e `/gestao/` ao backend. As rotas da aplicação precisam de fallback para `index.html`.

## Configuração

A marca pode ser configurada com `VITE_APP_NOME` e `VITE_APP_SUBTITULO` durante o build. Credenciais de integração e pagamento ficam exclusivamente no backend.

## Funcionalidades

- Compra pública sem cadastro e acesso ao resultado por link privado.
- Login, cadastro, recuperação de senha e programa de indicação.
- Pedidos, documentos, carteira e checkout InfinitePay.
- Gestão de clientes, serviços, pagamentos e reembolsos.
- Chat de suporte, interface responsiva e temas claro/escuro.
