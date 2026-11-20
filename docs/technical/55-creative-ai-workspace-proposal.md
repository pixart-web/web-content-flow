# Creative AI Workspace — proposta de nova direção UX/UI

**Data:** 2026-11-20 · **Estado:** proposta e protótipo, à espera de aprovação · **Protótipo:** `/app/studio` (não substitui nada)

Objetivo: o Web Content Flow deixa de parecer um dashboard SaaS administrativo e passa a ter identidade própria de *Creative AI Workspace*: escuro, premium e cinematográfico, com a criação no centro. Mantém-se a arquitetura, a lógica de negócio e todos os módulos.

---

## 1. Auditoria da interface atual

| Área | Estado atual | Problema para a nova direção |
|---|---|---|
| Identidade | Tema claro, neutros slate, índigo/azul/roxo (docs/design 04). Poppins + Inter | Correto e acessível, mas genérico: lê-se como "SaaS de administração" |
| Shell | Sidebar de 240 px com 3 entradas (Dashboard, Projects, Settings) e topbar com o nome da página | Navegação pensada para gerir, não para criar. A IA local está enterrada em Settings |
| Dashboard (`/app`) | Saudação, 4 cartões de módulo do projeto ativo, conteúdo recente, calendário, projetos | Boa base de dados reais. Os módulos aparecem como cartões de igual peso, sem chamada clara a "criar". Só mostra 4 dos 6 módulos |
| Procura e comandos | Não existem | Não há forma rápida de saltar para um projeto, módulo ou definição |
| Projetos | Cartões de texto (nome, tipo, data) | Sem presença visual. Todos os projetos parecem iguais |
| Estado da IA | Só em Settings → Local AI (desktop) ou implícito ("Mock mode" nas páginas de projeto) | O dono não vê, de relance, se a IA está ativa |
| Skills | 7 skills incorporadas existem no código (`src/skills/builtin-skills.ts`), sem lugar na interface | Capacidade real invisível |
| Tokens | `design-tokens/tokens.css` com tema claro e um `[data-theme="dark"]` definido mas nunca aplicado. `globals.css` com ~2000 linhas e 113 hex soltos | O tema escuro não tem base de produto. Há valores fora dos tokens |
| Acessibilidade | Foco visível, alvos de 44 px, drawer móvel acessível (doc 45), E2E com axe | Boa. É preciso mantê-la no tema escuro (contraste mais difícil) |
| Desempenho | Sem animações pesadas | Manter. A direção nova pede motion, e tem de ser barata |

**Conclusão:** a base funcional está sólida e os dados são reais. Falta a camada de produto: hierarquia orientada à criação, comandos rápidos, estado da IA visível e uma identidade visual própria.

---

## 2. Design system proposto ("Studio")

Tokens com âmbito `.studio` no protótipo (`src/features/studio/studio.module.css`). Na implementação passam a `design-tokens/` como tema `studio`.

### Cor

| Token | Valor | Uso | Contraste em `canvas` |
|---|---|---|---|
| `canvas` | `#0C0816` | Fundo da app (violeta muito profundo, não preto) | — |
| `surface` / `surface-raised` / `surface-hover` | `#141022` / `#1B152D` / `#221A39` | Painéis, cartões, estados | — |
| `border` / `border-strong` | lavanda a 12% / 26% | Separação discreta | — |
| `text` | `#F5F1FF` | Texto principal | 17,8:1 |
| `text-2` | `#BDB3DA` | Texto de apoio | 10:1 |
| `text-3` | `#9187B3` | Metadados | 6:1 |
| `violet` | `#6D4AFF` | Ação principal (texto branco 5,2:1; hover `#5B3BEA`, mais escuro, 6,4:1) | — |
| `lavender` | `#C4B5FD` | Destaque editorial, links, ícones | 10,7:1 |
| `coral` | `#FF9474` | Apontamento quente: "novo", etiquetas, brilho | 9,2:1 |
| `success` / `warning` | `#6EE7B7` / `#FCD34D` | Estado (nunca só pela cor: há sempre texto) | — |
| `focus` | `#D8CCFF` | Anel de foco de 2 px | — |

Regras:
- **Coral nunca como fundo de texto branco**, porque falha AA. Serve para acentos, etiquetas e o brilho do botão principal.
- **Sem texto em gradiente.** O destaque editorial é lavanda sólido. Os gradientes ficam no fundo do hero, nos monogramas e no brilho.
- O índigo, o azul e o roxo atuais continuam como referência de marca. O violeta do Studio é uma evolução, não uma rutura.

### Tipografia

Sem fontes novas: Poppins (display) e Inter (interface), já carregadas e servidas localmente pelo `next/font`.

| Estilo | Tamanho | Uso |
|---|---|---|
| Display | `clamp(36px, 5.2vw, 64px)` / 1.04, -0.035em | Hero da home |
| Secção | `clamp(22px, 2.4vw, 28px)`, -0.02em | Títulos de secção |
| Eyebrow | 13 px, 600, maiúsculas, +0.08em | Contexto acima do título |
| Corpo | 17 px no hero, 14–15 px na interface | — |

### Forma, espaço e motion

- **Raios:** 10 px (controlos), 16 px (cartões) e 24 px (painéis e hero). Margem lateral de `clamp(16px, 3vw, 40px)`. Secções separadas por 48 px.
- **Motion:** só `transform` e `opacity`, a 160 ms com ease-out.
  - Um único brilho ambiente no hero (24 s, alternado).
  - Elevação de 1–2 px no hover.
  - A palette entra em 180 ms.
- Tudo pára com `prefers-reduced-motion`. Não há blur animado, vídeo nem canvas.

### Componentes (reutilizáveis)

- **Shell Studio:** sidebar escura com marca, navegação e nota de pré-visualização. Em ecrãs estreitos passa a barra horizontal.
- **Command Bar:** `⌘K`/`Ctrl+K`, combobox acessível (`role="combobox"`, `listbox` e `aria-activedescendant`), foco preso no diálogo, Esc devolve o foco.
- **Tile de criação:** ícone, nome do módulo e sugestão.
- **Linha de projeto:** monograma em gradiente derivado do nome (decorativo, `aria-hidden`), nome, marca, módulos, número de conteúdos, data e estado.
- **Painel de estado da IA:** usa só dados reais. No desktop lê o `aiOverview()` do invólucro; no servidor, a configuração. Tem três estados: ativo, desligado (mock) e externo.
- **Cartão de skill:** etiqueta "Built in", título e descrição vindos do manifesto.

---

## 3. Mapa de navegação e ecrãs a redesenhar

```
Studio (home)            /app            ← hoje: Dashboard
├─ Command Bar (⌘K)      em todos os ecrãs
├─ Projetos              /app/projects
│  └─ Projeto            /app/projects/:id   (overview com os módulos)
│     ├─ Brief · Brand Profile · Knowledge
│     ├─ Workspaces de criação: Website · Social · Ads · Video · Copy · Calendar
│     ├─ Library · Export
├─ Library               a biblioteca do projeto atual (sem nova rota global, para já)
├─ Local AI              /app/settings/local-ai   (só no desktop; sobe para a navegação principal)
└─ Settings              /app/settings/*
```

| Prioridade | Ecrã | Mudança |
|---|---|---|
| 1 | Shell (sidebar, topbar) | Tema Studio, Command Bar global, Local AI na navegação no desktop |
| 1 | Home | O protótipo: hero, "What do you want to create today?", projetos visuais, estado da IA, skills |
| 2 | Overview do projeto | Cabeçalho com monograma, módulos como tiles de criação, estado dos jobs |
| 2 | Workspaces dos módulos (6) | Mesmo layout e mesmas ações, no tema Studio. Editor com foco no conteúdo |
| 3 | Library, Calendar, Brand Profile, Brief, Knowledge | Tema e hierarquia, sem mudar fluxos |
| 3 | Settings, Local AI, Workspace | Tema. A Local AI ganha o visual do painel de estado |
| 4 | Sign-in, Sign-up, onboarding e first-run | Tema escuro coerente com a app desktop |
| — | Site de marketing | Fora do âmbito (tem direção própria, doc 15) |

**Workspaces contextuais (pedido):**
- **Website, Conteúdo/Copy, Social, Ads, Video e Calendar** existem e são redesenhados.
- **SEO** vive hoje dentro de Website (meta e páginas). Proponho mostrá-lo como secção dentro do workspace Website, não como módulo falso.
- **Design e Automações** não existem. Ficam fora do protótipo e da navegação até terem funcionalidade real, coerente com "não implementar já o Experience Studio".

---

## 4. Plano de implementação por etapas

Cada etapa é um PR com CI verde, sem migrations nem mudanças de API ou de lógica.

| Etapa | Conteúdo | Critério de saída |
|---|---|---|
| **S0** (este PR) | Proposta, protótipo `/app/studio`, tokens com âmbito | Aprovação da direção |
| **S1** Fundações | Tokens Studio em `design-tokens/` (tema `studio`), `globals.css` passa a consumir tokens, hex soltos migrados | Mesma interface visual, zero hex fora dos tokens, testes visuais iguais |
| **S2** Shell + Command Bar | Shell Studio para todas as rotas `/app` (no layout, sem depender do pathname), Command Bar global, Local AI na navegação | E2E e axe verdes, sem regressão móvel |
| **S3** Home | O protótipo passa a ser `/app`. O dashboard antigo fica acessível durante uma versão | E2E de criação e navegação |
| **S4** Projeto e módulos | Overview e os 6 workspaces no tema | Todos os E2E de fase 2–4 verdes |
| **S5** Restantes ecrãs | Library, Calendar, Brand Profile, Brief, Knowledge, Settings, auth e onboarding | Auditoria axe em todas as rotas |
| **S6** Polimento | Motion final, estados vazios, carregamento e erro, screenshots de referência | Checklist do doc 18 e testes finais |

**Riscos:**
- **Contraste no escuro:** valores calculados (WCAG 2.x) acima, e o axe corre em cada etapa. Um primeiro tom de hover (`#7D5EFF`, 4,3:1) falhava AA e foi substituído.
- **Regressões em E2E** que dependem de texto: os rótulos mantêm-se em inglês, como hoje.
- **Desempenho no desktop:** sem bibliotecas de animação. O brilho do hero é um gradiente CSS.

---

## 5. Protótipo (S0)

- **Rota `/app/studio`**, em grupo de rotas próprio (`src/app/(studio)/`), com shell próprio. Não está ligada na navegação e o `/app` não muda.
  - Escolher o shell pelo `usePathname()` dentro do layout atual dava erro de hidratação com o Proxy (comportamento documentado do Next). O grupo de rotas evita-o sem mexer no layout.
- **Só dados reais:**
  - projetos, módulos e número de conteúdos do dono;
  - as 7 skills incorporadas;
  - o estado da IA, pelo invólucro desktop ou pela configuração do servidor.

  Templates, componentes e pacotes de skills não existem, e o protótipo diz isso em vez de os simular. Nenhum modelo aparece como instalado se não estiver.
- **Command Bar:** navega para projetos, módulos, Library e definições reais. Pedir tarefas livres à IA local fica para uma etapa posterior, e a própria barra o diz.
- **Verificado:**
  - 1440 px e 375 px sem scroll horizontal;
  - axe WCAG 2.2 AA sem violações, com e sem a palette aberta;
  - `⌘K` → "social" → Enter abre o módulo Social do projeto.

---

## 6. Decisões pedidas

1. **Aprovar a direção visual** (paleta, tipografia, motion) tal como no protótipo, ou com ajustes.
2. **Idioma da interface:** o produto está em inglês e os E2E dependem disso. O mockup está em português. Proponho manter o inglês nesta reformulação e tratar o português como i18n à parte, para não misturar línguas.
3. **Tema claro:** o Studio é escuro por omissão. O claro atual continua disponível como alternativa ou é descontinuado no produto? Proponho mantê-lo, por acessibilidade e preferência.
4. **SEO dentro de Website** e **Design/Automações fora** até existirem.
