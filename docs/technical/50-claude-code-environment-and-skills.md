# Ambiente do Claude Code e skills do projeto — inventário e proposta

**Data:** 2026-11-14 · **Estado:** PROPOSTA. Nada foi instalado, removido ou configurado.

Este documento separa dois mundos que não se podem misturar:

| | Skills de desenvolvimento (Claude Code) | Skills de produto (agentes locais do WCF) |
|---|---|---|
| Quem executa | O Claude Code, enquanto desenvolve o repositório | O worker do Web Content Flow, no computador do utilizador, com modelos locais |
| Para quê | Regras de arquitetura, testes, segurança e distribuição para quem escreve código | Gerar conteúdo para clientes (Brand Profile, Copy, Website…) |
| Onde vivem | `.claude/skills/<nome>/SKILL.md` | `catalog/skills/<id>/` (formato de pacote da proposta 49, §3.7) |
| Formato | Markdown com frontmatter (`name`, `description`) | Manifesto + prompts + schemas zod + casos de avaliação |
| Chegam ao utilizador final? | **Nunca** | Sim, no instalador e nas atualizações do catálogo |
| Versionamento | Git, revisto em PR | Git + `version` no manifesto + avaliação (`eval:ai`) antes de ativar |

---

## 1. Inventário do ambiente atual

### 1.1 Ferramentas nativas do Claude Code

| Ferramenta | Necessária? | Uso no projeto |
|---|---|---|
| Bash, Read, Edit, Write | **Sim** | Todo o trabalho de código |
| Subagentes (Agent) | Útil | Pesquisas amplas, revisão independente |
| WebFetch / WebSearch | Útil | Documentação (Render, Electron, Ollama, licenças) |
| Skill | **Sim** | Carregar as skills do projeto (§3) |

### 1.2 Ferramentas da app desktop do Claude

| Ferramenta | Necessária? | Nota |
|---|---|---|
| Browser integrado (`Claude_Browser`, `preview_*`) | **Sim** | Verificar a UI e a app local. `.claude/launch.json` já existe |
| Sessões, PR e CI (`ccd_session`, `ccd_pr`) | Útil | Fluxo de PRs e CI |
| Leitura do terminal | Útil | Ver comandos que o product owner corre |
| Visualização (`show_widget`), Artifacts | Opcional | Diagramas e relatórios |
| iOS Simulator | **Não** | Não há app iOS |

### 1.3 Skills nativas

| Skill | Necessária? | Nota |
|---|---|---|
| `code-review`, `security-review`, `simplify` | **Sim** | Revisão antes de cada PR |
| `run` | Útil | Lançar a app para verificação |
| `init`, `update-config`, `fewer-permission-prompts` | Útil, uma vez | `CLAUDE.md` e permissões do projeto |
| `loop`, `schedule` | Não | `schedule` cria agentes na cloud, contra o princípio local-first |
| `claude-api` | Não | O produto não usa a API da Anthropic |
| `dataviz`, `artifact-*` | Opcional | Relatórios visuais |

### 1.4 Plugins instalados (via claude.ai) e as suas skills e servidores MCP

| Plugin | Conteúdo | Veredicto | Motivo |
|---|---|---|---|
| **engineering** | Skills: architecture (ADR), code-review, debug, testing-strategy, system-design, tech-debt, documentation, deploy-checklist | **Manter (skills)** | Só prompts, sem custo nem rede |
| ↳ conectores MCP: github, linear, asana, atlassian, notion, slack | | Não necessários | O GitHub já funciona pelo `gh` CLI. Os outros não são usados |
| ↳ conectores MCP: datadog, pagerduty | | **Evitar** | Serviços comerciais pagos |
| **design** | Skills: accessibility-review, design-critique, ux-copy, design-system, design-handoff | Manter (skills) | Úteis para UI e, mais tarde, para o Experience Studio |
| ↳ conector MCP: intercom | | Evitar | Comercial, não usado |
| **figma** (plugin + 2 servidores MCP) | Design ↔ código no Figma | Desativar por agora | Exige conta Figma. Só o Experience Studio poderá justificar |
| **brightdata-plugin** | Scraping e pesquisa via Bright Data | **Desativar** | API comercial paga. A skill tenta substituir o WebFetch nativo |
| **searchfit-seo** | SEO e conteúdo de marketing | Desativar neste projeto | Fora do âmbito local-first |
| **zoom-plugin** (3 servidores MCP) | Integrações Zoom | **Desativar** | Não usado. Os 3 servidores falham autenticação |
| **desktop-commander** | Ficheiros e processos fora do Claude Code | Desativar neste projeto | Duplica o Bash e alarga o acesso ao sistema sem necessidade |
| **anthropic-skills** | docx, pdf, pptx, xlsx, computer-use, chrome-browser, google-workspace, deep-research… | Manter docx/pdf/xlsx. O resto é opcional | Entregáveis em documento. Google Workspace não é usado |
| claude-in-chrome | Controlo do Chrome do utilizador | Opcional | O browser integrado chega |
| easel, mcp-registry, scheduled-tasks, conector de documentos | Gráficos, registo MCP, tarefas agendadas, docs | Opcional / não | Sem papel no desenvolvimento |
| cc-plugin-agents-md (builtin) | Suporte a `AGENTS.md` | Manter | O repositório já tem `AGENTS.md` (regras do Next.js) |

**Conclusão:** para o desenvolvimento local-first não é preciso **nenhum** plugin novo nem nenhum servidor MCP. O que falta são **skills do próprio projeto**, versionadas no repositório.

### 1.5 Ferramentas locais (CLI) no Mac de desenvolvimento

| Ferramenta | Estado | Necessária? |
|---|---|---|
| Homebrew, Git, `gh` | Instalados | Sim |
| Node 26 (o CI usa 24.14), pnpm 11.9 | Instalados | Sim |
| PostgreSQL 16 (`brew services`) | Instalado | Sim (modo `server` e testes) |
| Ollama 0.40.16 + 3 modelos | Instalado | Sim (Local AI Engine) |
| Docker + Colima | Instalados | Opcional (servidor privado, Fase L7) |
| Navegadores do Playwright 1.65 | **Em falta** | Sim para E2E local (`pnpm exec playwright install chromium`, gratuito) |
| Xcode Command Line Tools / `notarytool` | Por verificar | Na Fase L4 (assinatura macOS) |

### 1.6 Configuração do Claude Code

- `/Users/tiago/Claude/.claude/settings.local.json`: 4 permissões `allow`, local e não versionado.
- `/Users/tiago/Claude/.claude/launch.json`: dev servers, incluindo `web-content-flow` na porta 4395.
- O repositório **não tem** `CLAUDE.md`, `.claude/settings.json` nem `.claude/skills/`.

---

## 2. O que é realmente necessário

| Necessidade do local-first | Coberta por |
|---|---|
| Arquitetura e ADRs | Skill `engineering:architecture` + skill do projeto `wcf-architecture` |
| Modelos locais de IA | Ollama CLI, `pnpm ai:health`, `pnpm eval:ai` + skill `wcf-local-ai` |
| Persistência | `psql`, Prisma CLI + skill `wcf-persistence` |
| Distribuição desktop | Dependências npm do próprio projeto (Electron, electron-builder), instaladas só quando a fase o pedir + skill `wcf-desktop` |
| Segurança | `security-review`, `pnpm security:secrets` + skill `wcf-security` |
| Testes | Vitest, Playwright (falta instalar os navegadores), `eval:ai` + skill `wcf-testing` |
| Verificação de UI | Browser integrado |

Nenhuma destas necessidades exige subscrição ou API comercial.

---

## 3. Proposta: skills de desenvolvimento versionadas no repositório

```
.claude/
  skills/
    wcf-architecture/SKILL.md      P0
    wcf-local-ai/SKILL.md          P0
    wcf-persistence/SKILL.md       P0
    wcf-security/SKILL.md          P0
    wcf-testing/SKILL.md           P0
    wcf-desktop/SKILL.md           P1 (preenchida a partir dos resultados da L0)
  settings.json                    permissões partilhadas do projeto (opcional)
CLAUDE.md                          entrada curta: princípios + índice das skills + @AGENTS.md
```

| Skill | Quando o Claude Code a carrega | Conteúdo |
|---|---|---|
| `wcf-architecture` | Qualquer mudança estrutural, novo módulo, decisão de modo `local`/`server` | Princípios local-first, modos, fronteiras (domínio, gateway, worker, supervisor), ADRs em vigor, "nada estrutural sem aprovação", onde vive cada tipo de código |
| `wcf-local-ai` | Mudanças no gateway, adapters, catálogo de modelos ou prompts | Ollama (`think:false`, modos estruturados por família), `ai:health`, `eval:ai` e limiares, regras de licença e digest, `status: evaluation` vs `active`, consentimento para fornecedores externos (ADR-073) |
| `wcf-persistence` | Schema, migrations, SQL, base de dados embutida | Migrations aditivas, `migrate:check`, marcador `destructive-approved`, regras da base de testes, SQL específico de PostgreSQL existente, backup antes de migrar, ciclo de vida do PostgreSQL embutido |
| `wcf-security` | Auth, segredos, rede, downloads | Sem segredos no repositório, servidor local só em `127.0.0.1` com token, keychain, licença aceite antes do download, nenhum pedido externo sem consentimento, rate limits |
| `wcf-testing` | Antes de qualquer PR | Gates do CI e a ordem para os correr, `TEST_DATABASE_URL`, armadilhas conhecidas (pnpm `--`, `beforeEach`, `prisma generate`), critérios de aceitação offline e de IA local |
| `wcf-desktop` | Electron, empacotamento, atualizações | Next standalone, worker compilado, supervisor, diretórios de dados por SO, assinatura e notarização, auto-update |

**Regra:** o conhecimento que hoje está espalhado em `16-development-handoff.md` e nas notas de memória passa para estas skills. O handoff aponta para elas.

### Skills de produto (só para referência; não é instalação do Claude Code)

Ficam em `catalog/skills/` com o formato de pacote da proposta 49 (§3.7) e são criadas na Fase L6. Os sete módulos atuais serão as primeiras. Nenhuma skill de desenvolvimento entra no catálogo, e nenhuma skill de produto vai para `.claude/`.

---

## 4. Proposta de instalação e configuração (para aprovação)

| # | Ação | Onde | Custo | Reversível |
|---|---|---|---|---|
| 1 | Criar as 5 skills P0 + `CLAUDE.md` | Repositório (PR) | 0 | Sim |
| 2 | `.claude/settings.json` do projeto: permitir `pnpm test/lint/typecheck/format`, `ollama list/ps`, `gh pr view/checks`; negar `prisma migrate reset`, `prisma db push`, `git push --force` | Repositório (PR) | 0 | Sim |
| 3 | Instalar os navegadores do Playwright (`chromium`) | Mac de desenvolvimento | 0 | Sim |
| 4 | Desativar neste projeto: brightdata, searchfit-seo, zoom, figma, desktop-commander e os conectores datadog, pagerduty e intercom | Definições de plugins em claude.ai (do product owner) | 0 | Sim |
| 5 | `wcf-desktop` depois da L0 | Repositório (PR) | 0 | Sim |

Não se propõe nenhum plugin novo, servidor MCP novo ou serviço pago.
