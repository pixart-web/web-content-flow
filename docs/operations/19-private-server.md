# Servidor privado (L7)

**Data:** 2026-11-16 · **Edição:** `APP_MODE=server` · **Ficheiros:** `Dockerfile`, `compose.yaml`, `deploy/Caddyfile`, `.env.server.example`

Um servidor privado guarda os projetos de uma equipa num servidor próprio (Hetzner, Nodera, um mini-PC no escritório…). A app desktop pode ligar-se a ele em vez de usar o workspace do computador. Não há nenhum serviço pago obrigatório.

## O que o `compose.yaml` arranca

| Serviço | Imagem | Papel |
|---|---|---|
| `postgres` | `postgres:16.15-alpine` | Base de dados. Só na rede interna do Compose, sem porta publicada. UTF-8 e `--no-locale`, como no desktop |
| `migrate` | `web-content-flow:server` | Corre uma vez antes dos outros: `migrate.mjs`, o executor de migrations da app (sem o CLI da Prisma). Recusa SQL destrutivo não aprovado e históricos editados ou com falhas |
| `web` | idem | Servidor Next.js (standalone), na porta 3000, só na rede interna |
| `worker` | idem | Tarefas de geração e indexação do conhecimento. Drain até 90 s ao parar |
| `maintenance` | idem | `maintenance.mjs` de hora a hora |
| `caddy` | `caddy:2.10-alpine` | HTTPS automático para `DOMAIN` (Let's Encrypt; `localhost` usa a CA local do Caddy) |

A imagem é compilada dentro de Linux (multi-stage). O `APP_URL` entra no build, porque o Next.js compila o URL público no bundle do cliente.

## Instalar

```bash
cp .env.server.example .env.server
```

1. Preenche o `.env.server`: `APP_URL` e `DOMAIN`; três segredos gerados com `openssl rand -hex 32` (`POSTGRES_PASSWORD`, `AUTH_SECRET` e `RATE_LIMIT_SECRET`); e o SMTP para a recuperação de passwords.
2. Aponta o DNS do domínio para o servidor (portas 80 e 443 abertas).
3. Arranca:

```bash
docker compose --env-file .env.server up -d --build
```

O `.env.server` está no `.gitignore` e nunca deve ser enviado para o repositório.

## Atualizar

```bash
git pull
docker compose --env-file .env.server up -d --build
```

O serviço `migrate` volta a correr antes do `web` e do `worker`. Se uma migration for recusada, o `web` não arranca, e o log do `migrate` diz porquê.

## Backups

O volume `pgdata` guarda os dados. Para um backup lógico:

```bash
docker compose --env-file .env.server exec postgres pg_dump -U wcf web_content_flow > backup.sql
```

Faz o backup antes de cada atualização.

## IA no servidor

O servidor arranca em modo simulado. Para usar modelos locais, instala o Ollama no host, define `AI_OLLAMA_BASE_URL` (por exemplo `http://host.docker.internal:11434`, ou o IP do host) e o modelo, e muda para `AI_PROVIDER_DEFAULT=LOCAL` só depois de o modelo passar a avaliação nesse hardware (`docs/technical/48`). O conhecimento por cliente usa `KNOWLEDGE_EMBEDDING_MODEL=bge-m3`.

## Ligar a app desktop

Na app desktop, em **Settings → Private server**, indica o endereço `https://…`. A app confirma que o servidor responde e reinicia já ligada a ele. Inicia-se sessão com a conta do servidor. Para voltar ao workspace do computador, usa o menu **Server → Use this computer's workspace**.

- Só são aceites endereços `https://`, e os certificados inválidos são recusados (comportamento normal do Electron).
- Em modo remoto não arranca nada local (base de dados, servidor, worker), e a ponte local da app fica desligada.
- Não há sincronização entre o workspace local e o servidor: são dois sítios diferentes.
- Os tokens de dispositivo ficam para a API (Kiko, fase F).
