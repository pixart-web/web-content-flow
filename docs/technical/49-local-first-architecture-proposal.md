# Arquitetura local-first — auditoria, arquitetura-alvo e plano de migração

**Data:** 2026-11-14 · **Base:** `main` em `7f6713f` · **Estado:** PROPOSTA para revisão. Nada implementado.

**Decisão do product owner (2026-11-14):** o Web Content Flow passa a ser uma aplicação **local-first**, com IA própria executada localmente e servidor privado opcional. Não haverá dependência obrigatória de Render, de APIs de IA comerciais nem de subscrições externas. O staging no Render fica suspenso (PR #27 em rascunho). O Experience Studio fica preparado na arquitetura, mas não é implementado.

---

## 1. Resumo executivo

- **Cerca de 85% do código mantém-se.** O domínio, os schemas zod, os sete módulos, os prompts, o gateway de IA, o worker com leases, as exportações, a avaliação de modelos e a UI correm localmente sem alterações de fundo. O Next.js funciona como servidor local em Node.
- **Há três bloqueios reais para correr no computador do utilizador:**
  1. o PostgreSQL tem de existir como serviço;
  2. a configuração exige segredos e URLs definidos à mão;
  3. a recuperação de password depende de email.

  Os três resolvem-se sem reescrever funcionalidades.
- **IA local:** o adapter Ollama, o health check e a suite de avaliação já existem. Falta o *Local AI Engine*: gestor de runtime, catálogo de modelos com licenças, downloads e perfis de hardware. Falta também o passo do enum (ADR-070), que permite gravar jobs feitos por modelos locais.
- **Recomendação:**
  - **Electron** como invólucro desktop, a correr o servidor Next.js e o worker em processos locais;
  - **PostgreSQL embebido** como persistência, para manter todo o SQL e as migrations atuais;
  - **PGlite** como alternativa a validar num spike de 3 dias;
  - **SQLite** só se ambos falharem.
- **Esforço estimado até à primeira versão desktop instalável (macOS) com IA local:** 10 a 14 semanas. Windows e Linux somam 3 a 5 semanas, que dependem de uma máquina Windows de teste. Servidor privado, skills e conhecimento por cliente vêm depois, como fases próprias.

---

## 2. Auditoria técnica

### 2.1 Inventário do repositório

| Área | Estado atual | Funciona localmente? |
|---|---|---|
| Next.js 16 (App Router), React 19 | 44 páginas, 13 ficheiros de server actions, 6 route handlers, `proxy.ts` (headers e redireções) | ✅ `next start` corre em Node. Para empacotar falta `output: "standalone"` |
| Domínio e módulos | 34 mil linhas de TS/TSX (mais 3,8 mil de testes): Brief, Brand Profile, Website, Social, Ads, Video, Copy, Calendar, Library, versões e exportações | ✅ sem dependências cloud |
| Base de dados | Prisma 7 + `@prisma/adapter-pg`, 20 modelos, 20 enums, 10 campos `Json`, exportações em `Bytes`, 14 migrations | ⚠️ precisa de um PostgreSQL disponível |
| SQL específico de PostgreSQL | 6 ficheiros: `FOR UPDATE SKIP LOCKED` (worker), `pg_advisory_xact_lock` (versões), `INTERVAL`, checks de migrations | ⚠️ prende a escolha a PostgreSQL ou obriga a reescrever |
| Worker | Processo dedicado com loop, leases fenced, heartbeat e drain | ✅ corre como processo filho. Hoje usa `tsx` em runtime, o que tem de ser compilado para empacotar |
| Manutenção | Script de uma passagem (cron no Render) | ✅ passa a timer interno |
| Autenticação | Auth.js 5 (beta) com credenciais próprias (argon2), sem fornecedores OAuth | ✅ local. ⚠️ em modo pessoal, um login com password é fricção |
| Email | SMTP (nodemailer) ou Resend, usado na recuperação de password e nas definições | ⚠️ não existe email num computador. Precisa de alternativa local |
| IA | Gateway com Model Registry, TaskPolicy e router, mais adapters mock, OpenAI, Ollama e OpenAI-compatible. Suite `eval:ai` com 9 casos. Modelos locais em `status: "evaluation"` | ✅ base pronta. ⚠️ falta o enum (ADR-070) e o gestor de modelos |
| Configuração | `serverEnvSchema` exige `AUTH_SECRET`, `DATABASE_URL`, `AUTH_URL` e `NEXT_PUBLIC_APP_URL`. Regras de produção exigem email real e `RATE_LIMIT_SECRET` | ⚠️ tem de ser gerada no primeiro arranque, sem ficheiro `.env` |
| Marketing público | Páginas públicas, preços, blog, SEO, robots e interesse na beta | ➖ pertencem ao site e ao servidor, não à app desktop |
| Fontes | `next/font/google`, descarregadas no build e servidas localmente | ✅ offline em runtime |
| Imagens | `sharp` nativo (dependência do Next) | ✅ com binários por plataforma |
| Telemetria e analytics | Nenhuma encontrada | ✅ |
| Deploy | `render.yaml`, documentos de staging, migrations no pre-deploy | ➖ fica como opção de servidor privado |

### 2.2 Dependências cloud e de serviços pagos

| Dependência | Obrigatória hoje? | Destino local-first |
|---|---|---|
| Render (web, worker, cron, Postgres) | Só no plano de staging | **Opcional:** um dos alvos de "servidor privado" |
| PostgreSQL gerido | Sim (qualquer PostgreSQL) | **Embebido** na app |
| OpenAI (`openai` SDK) | Não (MOCK é o default) | **Opcional:** "fornecedor externo" com chave do utilizador e consentimento por tarefa (ADR-073 já o prevê) |
| Resend / SMTP | Sim em produção (regra do env) | **Opcional:** em modo local, recuperação sem email |
| Google Fonts | Só no build | ✅ sem mudança |
| GitHub (código, CI) | Desenvolvimento | Sem impacto no utilizador |
| Certificados de assinatura (Apple, Windows) | — | **Custo de distribuição**, não do utilizador. Ver §4.4 |

Não há SDKs de analytics, de feature flags remotas nem de storage cloud. O núcleo já está isolado da cloud: o que falta é empacotar e configurar.

---

## 3. Arquitetura-alvo

### 3.1 Visão geral

```
┌──────────────────────────── App desktop (Electron) ────────────────────────────┐
│  Janela (Chromium) ── http://127.0.0.1:<porta aleatória> + token por sessão    │
│                                                                                │
│  Processo principal (supervisor)                                               │
│   ├─ Servidor Next.js (standalone, Node)  ── UI, server actions, API local      │
│   ├─ Worker de geração (utility process)  ── processNextJob(), leases, drain    │
│   ├─ Manutenção (timer interno, horária)                                       │
│   ├─ PostgreSQL embebido (dados em ~/…/WebContentFlow/data)                     │
│   └─ Local AI Engine                                                           │
│        ├─ Runtime manager: Ollama (deteta/instala/arranca), MLX opcional        │
│        ├─ Model catalog: manifesto assinado, licença, tamanho, perfil HW, digest│
│        ├─ Downloads com progresso, retoma e verificação                        │
│        └─ Avaliação local (eval:ai reduzido) antes de ativar um modelo           │
│                                                                                │
│  Opcional: ligação a servidor privado (HTTPS + dispositivo emparelhado)         │
│  Opcional: fornecedor externo de IA (chave do utilizador, consentimento)        │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Princípio:** o mesmo código corre em três modos, escolhidos por `APP_MODE`:

| Modo | Para quem | Persistência | Utilizadores | Email |
|---|---|---|---|---|
| `local` (novo, por omissão no desktop) | Edições macOS, Windows e Linux | PostgreSQL embebido | Um perfil local (owner), com várias contas opcionais | Não necessário |
| `server` (o atual) | Servidor privado (Hetzner/Nodera, Render, Docker) e edição web | PostgreSQL externo | Várias contas, convites | SMTP |
| `server` + cliente desktop | Equipas | No servidor | Contas do servidor | SMTP no servidor |

### 3.2 Next.js em execução local (investigação 1)

- **Compatível.** O App Router, as server actions, os route handlers e o `proxy.ts` funcionam em `next start`. A mudança é `output: "standalone"`, que gera `server.js` com as dependências mínimas (cerca de 30 a 60 MB). O Electron arranca-o como processo Node.
- **Segurança da porta local:**
  - escuta só em `127.0.0.1`;
  - porta aleatória;
  - token de sessão por arranque, injetado pelo Electron num header ou cookie e validado no `proxy.ts`.

  Assim nenhuma outra app ou página web consegue usar a API local.
- **Rotas de marketing:** em modo `local` não aparecem (o `proxy.ts` redireciona para `/app`). Os ficheiros não se apagam.
- **Arranque esperado:** 1 a 3 s até à primeira janela, mais o arranque do PostgreSQL.

### 3.3 Persistência local (investigação 4)

| Opção | O que preserva | Custo | Riscos | Avaliação |
|---|---|---|---|---|
| **A. PostgreSQL embebido** (binários oficiais por plataforma, iniciados pela app num diretório de dados próprio) | **Tudo:** Prisma, as 14 migrations, `SKIP LOCKED`, advisory locks, enums, `pgvector` para RAG | +30 a 60 MB por plataforma. A app gere o processo (porta, socket, shutdown limpo) | Upgrades de versão major (`pg_upgrade` ou dump/restore). Antivírus no Windows. Processos órfãos | **Recomendada.** Risco conhecido e código intacto |
| **B. PGlite** (PostgreSQL compilado para WASM, persistência em ficheiros) | Quase tudo. Dialeto PostgreSQL, e tem extensão `pgvector` | Pequeno. Corre dentro do processo Node | Uma ligação apenas. Maturidade do adapter Prisma por confirmar. Desempenho com muitos dados | **Spike de 3 dias.** Se o Prisma 7 e as migrations passarem, simplifica a gestão de processos |
| **C. SQLite** | Domínio e UI. O schema precisa de revisão | Mínimo. Backup é copiar um ficheiro | Reescrever SQL em 6 ficheiros (sem `SKIP LOCKED` nem advisory locks). Duas histórias de migrations (PG no servidor, SQLite no desktop). Sem `pgvector` (precisa de `sqlite-vec`) | Só como recurso. Duplica a manutenção das migrations |

**Critério de decisão no spike:** as 14 migrations aplicam-se, a suite de integração e a do worker passam, o arranque leva menos de 3 s, há recuperação após o processo ser morto (kill -9), e o backup e restauro funcionam.

### 3.4 Workers e serviços no computador (investigação 5)

- O **supervisor** (processo principal do Electron) arranca por esta ordem: PostgreSQL → migrations (`migrate:check` + `migrate deploy`) → servidor Next → worker → timer de manutenção. Para por ordem inversa, com drain do worker (até 90 s, como hoje).
- O **worker** passa a ser compilado (esbuild) em vez de usar `tsx` em runtime. O `processNextJob()`, as leases e o heartbeat não mudam. Com `AI_MAX_CONCURRENT_REQUESTS=1` por omissão, o hardware local serve um pedido de cada vez.
- O **timer de manutenção** chama o `runMaintenanceBatch()` existente de hora a hora e no arranque.
- **Suspensão ou fecho:** os jobs `RUNNING` voltam a `QUEUED` quando a lease expira (o comportamento atual), e retomam no arranque seguinte.
- **Sem serviços de sistema:** tudo vive enquanto a app estiver aberta. Mais tarde pode haver uma opção "continuar em segundo plano" (bandeja do sistema).

### 3.5 Local AI Engine (investigações 6 e 7)

**Runtimes:**

| Runtime | Plataformas | Papel | Licença |
|---|---|---|---|
| **Ollama** | macOS, Windows, Linux (CPU, Metal, CUDA, ROCm) | Principal. API local, gestão de modelos, JSON Schema (`format`) | MIT |
| MLX (`mlx_lm.server`, OpenAI-compatible) | macOS Apple Silicon | Opcional, para desempenho em Apple Silicon | MIT |
| llama.cpp `llama-server` (OpenAI-compatible) | Todas | Alternativa embutível se não se quiser depender da instalação do Ollama | MIT |
| Fornecedor externo (OpenAI) | — | Opcional, com chave do utilizador e consentimento | Comercial, do utilizador |

**Instalação do runtime:** a app deteta se o Ollama está a correr (`pnpm ai:health` já faz isto). Se não estiver, há duas opções a decidir na Fase L3:
- (a) instalação guiada com o instalador oficial do Ollama;
- (b) binário do Ollama ou do `llama-server` incluído na app (MIT permite redistribuir; o instalador cresce cerca de 50 a 100 MB).

**Recomendação:** começar com (a) e reavaliar depois da primeira beta.

**Catálogo de modelos** (manifesto versionado no repositório, depois servido pelo catálogo próprio):

```yaml
- id: gemma4-12b-qat
  runtime: ollama
  tag: gemma4:12b-it-qat
  digest: sha256:…          # versão fixa; atualizações são explícitas
  license: Apache-2.0
  licenseUrl: …
  sizeBytes: 7.2e9
  minProfile: standard       # ver §3.6
  structuredMode: native_schema
  tasks: [brand_profile, copy, website, social, ads, video, calendar]
  evaluation: { suite: "1.4.0", status: candidate, report: docs/technical/48-… }
```

- **Download:** através do `/api/pull` do Ollama, com progresso, retoma e verificação do digest. A licença aparece e tem de ser aceite antes do download.
- **Versões:** cada job grava `modelRef` com o digest (as colunas de rota já existem desde B-05). Atualizar um modelo é uma ação explícita, com a avaliação local a correr antes de ativar.
- **Ativação:** um modelo passa de `evaluation` a `active` só depois de passar a avaliação local reduzida no hardware do utilizador (a suite `eval:ai` com 1 a 2 amostras por caso). Isto **requer o passo ADR-070**: adicionar `LOCAL` ao enum `GenerationProvider`. Em instalações novas, faz parte do schema inicial; no servidor, é a migration irreversível que fica para aprovação.

**Modelos e licenças** (estado de 2026-11-14):

| Modelo | Licença | Tamanho | Estado | Uso proposto |
|---|---|---|---|---|
| `gemma4:12b-it-qat` | Apache 2.0 (confirmado no `ollama show --license`) | 7,2 GB | Candidato principal: JSON sempre válido nos 7 módulos, invenção ocasional de atributos | Perfil Standard |
| `qwen3.5:4b` | Apache 2.0 (confirmado) | 4,0 GB | Inventa atributos com frequência | Não recomendado |
| `qwen3.5:9b` | Apache 2.0 (confirmado) | 7,6 GB | Falha limites de comprimento | Não recomendado |
| Modelo pequeno (≤ 5 GB) para 16 GB | a escolher | — | **Lacuna:** nenhum aprovado | Perfil Essential. Avaliar novos candidatos |
| Embeddings para RAG | a escolher (verificar a licença no manifesto) | < 1 GB | Por avaliar | Conhecimento por cliente (Fase L5) |

**Regra:** só entram no catálogo modelos com licença que permita uso comercial pelo utilizador final, verificada contra o texto da licença do próprio artefacto e não contra resumos.

### 3.6 Perfis de hardware e requisitos mínimos

| Perfil | Hardware | Modelo de texto | Experiência |
|---|---|---|---|
| **Essential** | 16 GB RAM, Apple Silicon M1+ ou x86-64 com AVX2, 25 GB livres | Modelo ≤ 5 GB (**ainda sem candidato aprovado**) | Geração em segundo plano, 1 a 3 min por item |
| **Standard** (recomendado) | 32 GB RAM (Apple Silicon) ou GPU NVIDIA ≥ 12 GB VRAM, 40 GB livres | `gemma4:12b-it-qat` | 20 s a 2 min por item (medido no M4) |
| **Advanced** | 64 GB+ ou GPU ≥ 24 GB VRAM | Modelos maiores (por avaliar) | Mais qualidade, contexto maior |
| **Sem IA local** | Abaixo do Essential | — | Gerações determinísticas (mock), servidor privado ou fornecedor externo opcional |

A app deteta o hardware no primeiro arranque (o `eval:ai` já o faz) e propõe o perfil. O utilizador pode mudar.

### 3.7 Skills, agentes e conhecimento por cliente (investigação 8)

Proposta de um **formato de pacote único** para skills, templates e, no futuro, componentes do Experience Studio:

```
package.json-like manifest
  id, version, kind: skill | template | component | animation | agent
  license, author, compatibility (app >= x, profile >= y)
  prompts/        prompts versionados (o registry atual)
  schemas/        schemas zod/JSON de entrada e saída
  evaluation/     casos para o eval:ai (como os 9 atuais)
  assets/         ficheiros estáticos (templates, imagens)
```

- **Skills:** generalizam o que hoje são prompts e TaskPolicies. Cada skill declara a tarefa, o schema, o perfil de hardware mínimo e os casos de avaliação. Os sete módulos atuais tornam-se as primeiras skills, sem mudar o comportamento.
- **Agentes:** são orquestrações de skills executadas pelo worker (jobs com passos, que já existem). Ficam fora do âmbito até as skills estabilizarem.
- **Conhecimento por cliente:** documentos e marca por projeto, com indexação local (embeddings + `pgvector` no PostgreSQL embebido), com âmbito obrigatório por projeto. É a Fase E do plano atual (ADR-076), agora local.
- **Catálogo:** é instalado e atualizado pela app a partir de uma fonte assinada. A primeira versão é incluída no instalador. Funciona offline com o que já está instalado.

### 3.8 Servidor privado opcional (investigação 9)

- O **servidor** é o modo `server` atual, sem alterações, implantado onde o dono quiser: Hetzner/Nodera, Docker, Render. O `render.yaml` e o guia de staging ficam como uma das opções.
- **Ligação da app desktop, fase 1 (cliente remoto):** a app abre o workspace do servidor em vez do local. Não há sincronização.
- **Autenticação segura:**
  - emparelhamento de dispositivo (código de uso único mostrado no servidor);
  - token de dispositivo com âmbito e revogável, guardado no keychain do sistema;
  - HTTPS obrigatório;
  - rate limit, que já existe.
- **Sincronização local↔servidor:** é uma fase posterior e explícita (conflitos, versões). As versões imutáveis de conteúdo que já existem ajudam, mas a sincronização não entra na primeira versão.

### 3.9 Backups, exportação e migração

- **Backup:** snapshot do diretório de dados (com o PostgreSQL parado) ou `pg_dump` lógico. Fica numa pasta escolhida pelo utilizador, com agendamento opcional e retenção.
- **Exportação:** as exportações atuais (texto, Markdown, JSON, CSV, pacote de projeto) mantêm-se. Acresce um pacote de workspace completo (dump + manifesto de versão).
- **Migração:** importar um pacote de workspace noutro computador ou num servidor privado. É o mesmo formato nos dois sentidos.
- **Restauro:** é testado em CI com o `restore:verify`, que já existe.

### 3.10 Compatibilidade com o Experience Studio (investigação 10)

- Fica preparado com o formato de pacote (§3.7), com `kind: template | component | animation`, licenças e compatibilidade por versão.
- A UI atual já usa design tokens (`tokens:check` no CI). Os templates do Studio consomem os mesmos tokens.
- **Nada do Studio é implementado** antes de a Fase L4 estar concluída.

---

## 4. Distribuição para macOS, Windows e Linux (investigação 2)

### 4.1 Opções

| Opção | Como corre o código atual | Tamanho do instalador (sem modelos) | Prós | Contras |
|---|---|---|---|---|
| **Electron** | Next standalone e worker em processos Node do próprio Electron | ≈ 150 a 250 MB | Node incluído, Chromium igual nas 3 plataformas, `electron-builder` (dmg, nsis, AppImage/deb), auto-update maduro | Tamanho, mais RAM (≈ 200 a 400 MB) |
| **Tauri 2** + sidecar Node | WebView do sistema e Node empacotado como sidecar | ≈ 60 a 120 MB | Mais leve, Rust para o supervisor | WebViews diferentes (WebKit no macOS e Linux), sidecar Node para gerir, menos maturidade com servidores Node |
| **Servidor local + browser** (CLI ou Docker Compose) | `next start` + Postgres em Docker | — | Zero código novo. Bom para Linux e técnicos | Não é uma app. Exige Docker ou Node no utilizador |

**Recomendação:**
- **Electron** para as três edições desktop: menor risco e todo o código Node reutilizado.
- O **Docker Compose** fica como forma oficial de instalar o **servidor privado**.
- Reavaliar o Tauri depois da primeira versão, se o tamanho for um problema.

### 4.2 Atualizações

`electron-updater` com feed próprio (GitHub Releases ou servidor privado). As migrations correm no arranque, depois do `migrate:check`, com backup automático antes de qualquer migration.

### 4.3 Dados do utilizador

| SO | Diretório |
|---|---|
| macOS | `~/Library/Application Support/WebContentFlow/` |
| Windows | `%APPDATA%\WebContentFlow\` |
| Linux | `~/.local/share/WebContentFlow/` |

Os modelos ficam no diretório do Ollama (partilhado com outras apps) ou num diretório próprio configurável.

### 4.4 Custos de distribuição (decisão do product owner)

Não são subscrições para o utilizador, mas são necessários para instalar sem avisos de segurança:
- **Apple Developer Program**, para assinar e notarizar no macOS;
- **certificado de assinatura de código no Windows** (ou um serviço de assinatura).

Linux não precisa. Valores a confirmar no momento da compra.

---

## 5. Plano de migração faseado

Cada fase entrega algo que funciona e mantém o modo `server` (o atual) verde no CI.

| Fase | Objetivo | Principais entregas | Esforço | Depende de |
|---|---|---|---|---|
| **L0 — Decisões e spikes** | Escolher a persistência e validar o invólucro | Spike PostgreSQL embebido vs PGlite (§3.3). Spike Electron + Next standalone + worker. Spike do gestor Ollama (pull com progresso). ADRs L-1…L-6 aceites | 1,5 a 2 sem | Aprovação desta proposta |
| **L1 — Modo local no código** | O mesmo código arranca sem `.env` | `APP_MODE=local\|server`. Segredos gerados no primeiro arranque e guardados no diretório de dados / keychain. Perfil owner local sem email (recuperação por código local). Email opcional. Rotas de marketing desligadas em `local`. Worker compilado. Manutenção em timer | 2 a 3 sem | L0 |
| **L2 — Persistência local** | Base de dados dentro da app | Supervisor do PostgreSQL embebido (ou PGlite). Migrations no arranque com backup prévio. Backup, restauro e pacote de workspace | 2 a 3 sem | L0, L1 |
| **L3 — Local AI Engine** | IA local sem chaves | Gestor de runtime (deteção e instalação guiada do Ollama). Catálogo e manifesto com licenças e digest. Downloads com progresso. Deteção de hardware e perfis. Avaliação local antes de ativar. ADR-070 (`LOCAL` no enum). Router com modelos locais `active` | 3 a 4 sem | L1 |
| **L4 — App desktop macOS** | Primeira edição instalável | Electron, dmg assinado e notarizado, auto-update, primeiro arranque (assistente: dados, perfil, modelo). Testes E2E no app empacotado | 2 a 3 sem | L1–L3, conta Apple |
| **L5 — Windows e Linux** | Três edições | Instalador NSIS assinado, AppImage/deb. Testes em hardware Windows (CUDA e CPU) | 3 a 5 sem | L4, máquina Windows, certificado |
| **L6 — Skills e conhecimento por cliente** | Pacotes e RAG local | Formato de pacote. Módulos atuais como skills. Embeddings locais + `pgvector` com isolamento por projeto | 3 a 4 sem | L2, L3 |
| **L7 — Servidor privado opcional** | Equipas e acesso remoto | Docker Compose oficial. Emparelhamento de dispositivo. App como cliente remoto | 3 a 4 sem | L4 |
| **L8 — Fundações do Experience Studio** | Só depois de L4 estável | Tipos `template/component/animation` no catálogo. Nenhuma UI do Studio | por definir | L6 |

**Caminho crítico até à primeira beta macOS:** L0 → L1 → L2 + L3 (em paralelo) → L4, ≈ **10 a 14 semanas**.

### O que acontece ao trabalho existente

| Item | Destino |
|---|---|
| Gateway de IA, router, políticas, adapters, `eval:ai`, `ai:health` | **Mantém-se.** É o núcleo do Local AI Engine |
| Worker, leases, manutenção | Mantém-se, com outro supervisor |
| Schema e migrations | Mantêm-se (opção A ou B) |
| `render.yaml`, guia de staging, PR #27 | Suspensos. Ficam como alvo opcional de servidor privado. O `migrate:check` do #27 aproveita-se em L2 |
| SMTP e Resend | Opcionais (modo `server`) |
| Páginas de marketing | Mantêm-se no site. Não aparecem na app desktop |
| Fase D (Nodera) e Fase F (API Kiko) | Passam a integrações opcionais do modo `server` |
| ADR-058 (Render) | Passa a "opcional", substituído para o caminho principal pelas ADRs L-x |

---

## 6. Decisões arquiteturais propostas

| ID | Decisão | Alternativas rejeitadas |
|---|---|---|
| **L-1** | Um só código com `APP_MODE=local\|server`. Nada se bifurca | Fork desktop (duplica manutenção) |
| **L-2** | Electron como invólucro desktop | Tauri (reavaliar depois), servidor + browser (não é uma app) |
| **L-3** | PostgreSQL embebido. PGlite se o spike o aprovar. SQLite só como recurso | SQLite primeiro (reescreve SQL e duplica migrations) |
| **L-4** | Ollama como runtime principal, por API local. MLX e llama.cpp via adapter OpenAI-compatible | Embutir inferência no processo Node (complexo, sem benefício) |
| **L-5** | Catálogo de modelos com licença, digest e perfil. Ativação só após avaliação local | Lista livre de modelos sem verificação |
| **L-6** | Servidor privado = modo `server` atual. Desktop liga como cliente com token de dispositivo. Sincronização fica para depois | Sincronização bidirecional na v1 |
| **L-7** | Formato de pacote único para skills, templates, componentes e agentes | Formatos separados por tipo |

---

## 7. Backlog priorizado

| ID | Item | Fase | Prioridade |
|---|---|---|---|
| LF-01 | Spike: PostgreSQL embebido (macOS) com as 14 migrations, integração e worker | L0 | P0 |
| LF-02 | Spike: PGlite + Prisma 7 com as mesmas provas | L0 | P0 |
| LF-03 | Spike: Electron a correr Next standalone + worker compilado, ligados a 127.0.0.1 com token | L0 | P0 |
| LF-04 | Spike: pull de modelo pelo `/api/pull` do Ollama, com progresso e cancelamento | L0 | P1 |
| LF-05 | `APP_MODE` e defaults do env por modo. Geração de segredos no primeiro arranque | L1 | P0 |
| LF-06 | Perfil owner local e recuperação de acesso sem email | L1 | P0 |
| LF-07 | Email opcional em `local` (o schema deixa de exigir provider real) | L1 | P0 |
| LF-08 | Rotas de marketing fora do modo `local` | L1 | P1 |
| LF-09 | Worker e manutenção compilados (esbuild) e arrancáveis por um supervisor | L1 | P0 |
| LF-10 | Supervisor de base de dados (start/stop, porta, recuperação, logs) | L2 | P0 |
| LF-11 | Migrations no arranque, com `migrate:check` e backup automático prévio | L2 | P0 |
| LF-12 | Backup, restauro e pacote de workspace (export/import) | L2 | P0 |
| LF-13 | ADR-070: `LOCAL` em `GenerationProvider` (irreversível no servidor, precisa de aprovação) | L3 | P0 |
| LF-14 | Manifesto do catálogo de modelos com licença, digest, tamanho e perfil | L3 | P0 |
| LF-15 | Gestor de runtime: deteção, instalação guiada e arranque do Ollama | L3 | P0 |
| LF-16 | Downloads de modelos com aceitação de licença, progresso e verificação | L3 | P0 |
| LF-17 | Deteção de hardware e perfis Essential/Standard/Advanced | L3 | P1 |
| LF-18 | Avaliação local reduzida antes de ativar um modelo, e router com modelos `active` | L3 | P0 |
| LF-19 | Candidato de modelo para o perfil Essential (16 GB) | L3 | P1 |
| LF-20 | App Electron macOS: assistente de primeiro arranque, auto-update, assinatura e notarização | L4 | P0 |
| LF-21 | E2E (Playwright) contra a app empacotada, incluindo offline | L4 | P0 |
| LF-22 | Instalador Windows assinado e testes CUDA/CPU | L5 | P1 |
| LF-23 | AppImage/deb e testes Linux | L5 | P2 |
| LF-24 | Formato de pacote e módulos atuais como skills | L6 | P1 |
| LF-25 | Embeddings locais + `pgvector`, isolamento por projeto | L6 | P1 |
| LF-26 | Docker Compose do servidor privado | L7 | P2 |
| LF-27 | Emparelhamento de dispositivo e cliente remoto | L7 | P2 |

---

## 8. Critérios de aceitação

### 8.1 Funcionamento offline

Com a rede desligada, depois de instalada a app e descarregado um modelo:

- [ ] A app abre, inicia sessão local e mostra os projetos em menos de 10 s num Mac do perfil Standard.
- [ ] Criar um projeto, editar o Brief e gerar Brand Profile e os sete módulos com o modelo local completa sem pedidos de rede (verificado com a rede física desligada e um registo de ligações a zero, fora de `127.0.0.1`).
- [ ] Versões, restauro de versões, Library, Calendar e exportações (todos os formatos) funcionam.
- [ ] Fechar a app a meio de um job e reabrir retoma o job sem duplicar versões nem consumo de uso.
- [ ] Backup e restauro do workspace funcionam sem rede. Importar o pacote noutro computador recupera tudo.
- [ ] O que precisa de rede (download de modelos, atualizações, servidor privado, fornecedor externo) falha com uma mensagem clara e não bloqueia o resto.

### 8.2 IA local

- [ ] A primeira instalação num Mac Standard guia até um modelo ativo sem chaves nem contas.
- [ ] Antes do download aparecem a licença, o tamanho e o perfil exigido. Sem aceitação, nada é descarregado.
- [ ] O modelo descarregado é verificado pelo digest. Cada conteúdo gerado grava `modelRef` com o digest e a política usada.
- [ ] Um modelo só fica `active` depois de passar a avaliação local: JSON válido ≥ 90% à primeira e ≥ 99% após reparação, 0 palavras proibidas.
- [ ] Os sinais de afirmações não suportadas ficam visíveis na revisão humana.
- [ ] Nenhum pedido sai para um fornecedor externo sem consentimento explícito por tarefa (ADR-073).
- [ ] Com o Ollama parado, a app mostra o estado (`unreachable`) e oferece arrancá-lo, sem perder jobs.
- [ ] Os perfis Essential, Standard e Advanced têm cada um pelo menos um modelo aprovado antes de serem oferecidos. Hoje só o Standard tem candidato.

### 8.3 Preservação

- [ ] O modo `server` continua a passar todo o CI atual em todas as fases.
- [ ] Nenhuma funcionalidade é removida. O que não se aplica ao modo `local` (marketing, convites por email) fica desligado, não apagado.

---

## 9. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Nenhum modelo pequeno com qualidade para 16 GB | O perfil Essential fica sem IA local | Avaliar novos modelos com o `eval:ai`. Até lá, oferecer servidor privado ou fornecedor opcional nesse perfil |
| Gestão do PostgreSQL embebido (upgrades, processos órfãos, antivírus) | Arranques falhados, dados presos | Spike L0, backup antes de migrations, PGlite como alternativa |
| Tamanho total (app + modelo ≈ 8 GB) | Instalação lenta | Download do modelo separado, retomável, com escolha de perfil |
| Desempenho em Windows e GPUs variadas | Experiência irregular | Máquina Windows de teste (L5). Perfis com mínimos medidos |
| Auth.js 5 em beta | Mudanças na API | Já é risco hoje. Em `local`, a sessão pode ser simplificada |
| Licenças de modelos mudam | Uso indevido | Licença guardada no manifesto, revista em cada atualização, aceite pelo utilizador |
| Assinatura de código (custo e processo) | Avisos de segurança nos instaladores | Decisão de compra antes de L4/L5 |
| Âmbito do servidor privado e da sincronização | Atraso da v1 | v1 só cliente remoto. Sincronização explicitamente fora |

---

## 10. Pedido de aprovação

Antes de qualquer alteração estrutural, são precisas estas decisões:

1. Arquitetura-alvo (§3) e ADRs L-1…L-7 (§6).
2. Início da **Fase L0** (spikes, sem mudanças estruturais no `main`; o código dos spikes fica em ramos próprios).
3. Distribuição: Electron (§4.1).
4. Ordem das edições: macOS primeiro, depois Windows e Linux.
5. Custos de assinatura de código (§4.4), a decidir até L4.
6. O que fazer ao PR #27: manter em rascunho como alvo opcional (recomendado), ou fechar.
