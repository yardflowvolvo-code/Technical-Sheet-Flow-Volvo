# Deploy do Yardflow (Render + Supabase)

Arquitetura: **1 único serviço Web no Render** roda a API (Express) e serve
os 3 frontends já buildados (admin na raiz `/`, PWA do motorista em
`/driver`, superadmin em `/superadmin`) — tudo na mesma origem, para que os
cookies de sessão do Clerk e as chamadas `/api/...` funcionem sem CORS.

## 1. Banco de dados (Supabase)

1. Crie um projeto em supabase.com.
2. Settings -> Database -> Connection string -> copie o modo **Session
   pooler** (porta 6543) — funciona melhor com serviços serverless/autoscale
   como o Render. Essa é a `DATABASE_URL`.
3. Localmente (ou via Render Shell, depois do primeiro deploy), rode:
   ```
   DATABASE_URL="..." pnpm --filter @workspace/db run push
   ```
   Isso cria as tabelas (`companies`, `company_users`, `superadmins`,
   `subscriptions`, `arrivals`, `push_subscriptions`, `config`) a partir do
   schema Drizzle.
4. Insira manualmente sua primeira linha em `superadmins` (com o
   `clerk_user_id` do seu próprio usuário, depois de criar a conta no
   Clerk) para conseguir entrar no painel superadmin.

## 2. Autenticação (Clerk)

1. Crie uma aplicação em dashboard.clerk.com.
2. Em **API Keys**, copie:
   - `Publishable key` -> `VITE_CLERK_PUBLISHABLE_KEY`
   - `Secret key` -> `CLERK_SECRET_KEY`
3. Em **Paths**, não é necessário configurar redirect URLs especiais — o
   app roda tudo em same-origin.

## 3. Notificações Push (VAPID)

Gere um par de chaves **uma vez** e reutilize sempre:
```
pnpm dlx web-push generate-vapid-keys
```
Guarde `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` — se elas mudarem depois,
toda inscrição de push dos motoristas para de funcionar silenciosamente.

## 4. Mercado Pago (opcional para o primeiro deploy)

Em dashboard.mercadopago.com.br -> suas integrações -> credenciais de
produção, copie o **Access Token** -> `MERCADOPAGO_ACCESS_TOKEN`. Sem essa
variável, o botão de assinatura devolve uma URL de demonstração (não
bloqueia o resto do app).

## 5. Deploy no Render

**Opção A — Blueprint (recomendado):** Render Dashboard -> New -> Blueprint
-> selecione o repositório `Technical-Sheet-Flow-Volvo`. Ele vai ler o
`render.yaml` da raiz e criar o serviço automaticamente. Depois preencha,
em Environment, as variáveis marcadas com `sync: false` no `render.yaml`
(valores obtidos nos passos 1–4 acima).

**Opção B — Manual:** New -> Web Service -> conecte o repo ->
- Build Command:
  ```
  pnpm install --frozen-lockfile && BASE_PATH=/ pnpm --filter @workspace/admin run build && BASE_PATH=/driver/ pnpm --filter @workspace/driver-pwa run build && BASE_PATH=/superadmin/ pnpm --filter @workspace/superadmin run build && pnpm --filter @workspace/api-server run build
  ```
- Start Command: `pnpm --filter @workspace/api-server run start`
- Adicione as env vars da seção "Variáveis de ambiente" abaixo.

## Variáveis de ambiente (resumo)

| Variável | Obrigatória | Onde conseguir |
|---|---|---|
| `DATABASE_URL` | sim | Supabase -> Connection string (Session pooler) |
| `CLERK_SECRET_KEY` | sim | Clerk -> API Keys |
| `VITE_CLERK_PUBLISHABLE_KEY` | sim | Clerk -> API Keys |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | sim (senão gera nova a cada restart) | `pnpm dlx web-push generate-vapid-keys` |
| `VAPID_MAILTO` | não (tem default) | qualquer `mailto:` seu |
| `MERCADOPAGO_ACCESS_TOKEN` | não no início | Mercado Pago -> credenciais de produção |
| `PUBLIC_APP_URL` | não (usa `RENDER_EXTERNAL_URL` automático) | URL pública do serviço no Render, ou domínio próprio |
| `NODE_ENV` | sim | sempre `production` |

## Depois do primeiro deploy

- Acesse `https://<seu-app>.onrender.com` -> deve carregar o admin.
- `/driver` -> PWA do motorista.
- `/superadmin` -> painel superadmin (só entra quem estiver na tabela
  `superadmins`).
- Crie sua primeira empresa pelo superadmin, depois um usuário
  `company_users` com role `gestor` para começar a operar.
- Domínio próprio: Render -> Settings -> Custom Domains. Depois de
  apontar o domínio, atualize `PUBLIC_APP_URL` para refletir o domínio
  final (importante para os links de callback do Mercado Pago).
