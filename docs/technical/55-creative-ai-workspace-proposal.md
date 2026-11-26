# Creative AI Workspace — proposta de nova direção UX/UI

**Data:** 2026-11-20 · **Estado:** direção aprovada a 2026-11-20 (com as propostas da secção 6: inglês, tema claro mantido, SEO dentro de Website). S0 a S6 feitas; falta a passagem final de testes · **Protótipo:** `/app/studio` (não substitui nada)

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
| **S1** Fundações ✅ | Paleta Studio em `design-tokens/` (`--color-studio-*`). As 87 cores soltas da app em `globals.css` passaram a 59 tokens de papel (`--color-app-*`) com os valores exatos. O CSS do marketing fica de fora (direção própria, doc 15). O protótipo usa os tokens | Feito: 23 ecrãs iguais píxel a píxel (1440 e 390 px), zero hex no CSS da app |
| **S2** Shell + Command Bar ✅ | `[data-theme="studio"]` redefine os tokens semânticos e os `--color-app-*`, e o tema Studio passa a ser o da app por omissão. O claro continua disponível (botão no shell, cookie `wcf-theme` lido no servidor, sem flash). Command Bar global no topo, com projetos, módulos e definições reais. Local AI na navegação no desktop | Feito: axe WCAG 2.2 AA sem violações em 23 rotas × 2 tamanhos, nos dois temas, sem scroll horizontal |
| **S3** Home ✅ | A home Studio passa a ser `/app`, dentro do shell e nos dois temas, com o "Conteúdo recente" vindo do dashboard. O dashboard antigo fica em `/app/dashboard` durante esta versão, ligado no fim da home e na Command Bar. `/app/studio` redireciona para `/app`. A entrada da navegação chama-se "Studio" | Feito: E2E web 63/63 numa base semeada como no CI, axe sem violações na home e no dashboard (2 temas × 2 tamanhos) |
| **S4** Projeto e módulos ✅ | Cabeçalho do projeto com monograma. No overview, os seis módulos passam a tiles de criação com a contagem real de conteúdos e o aviso de limites de cada um. O modo de geração é o verdadeiro (antes dizia sempre "Mock mode"). Os workspaces dos módulos já estavam no tema desde a S2 e mantêm layout e ações | Feito: axe sem violações em 8 rotas × 2 temas × 2 tamanhos, E2E web 63/63 mais um teste novo |
| **S5** Restantes ecrãs ✅ | O login, o registo e a recuperação de password passam ao tema da app (cookie lido no servidor), com a marca e um brilho discreto. Library: os filtros de cada módulo só aparecem para o módulo escolhido, ou quando têm um valor ativo (só CSS, o formulário não muda). Settings: cada secção diz o que contém. Privacy: no desktop, o texto deixa de dizer que a geração envia o contexto para fora. Library, Calendar, Brand Profile, Brief, Knowledge e Export já estavam no tema desde a S2 | Feito: axe sem violações em 27 rotas × 2 temas × 2 tamanhos (108 verificações), E2E web 64/64 |
| **S6** Polimento ✅ | Os separadores do projeto mostram por esbatimento que há mais para os lados e mantêm o ativo visível. O carregamento tem a forma de uma página Studio, e o erro aponta para o Studio. Monogramas feitos só de tokens. Scroll horizontal a 320 px corrigido (os campos de ficheiro). Capturas de referência em `docs/design/reference/`. Checklist do doc 18 abaixo | Feito: axe sem violações e sem scroll horizontal em 23 rotas × 2 temas × 320 e 1440 px |

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

### Notas da S2 (2026-11-21)

- **Tema pelos tokens:** os componentes já usavam utilitários semânticos (`bg-surface`, `text-secondary`…). Por isso o tema escuro chega a todos os ecrãs só pelos tokens, sem reescrever o CSS de cada um. Cada par de texto e fundo do Studio foi calculado, e o pior fica em 4,51:1.
- **Contraste do tema claro:** o axe encontrou falhas que já existiam. Vários tons de "muted" (`#748094`, `#8993A5`…) ficavam entre 2,4:1 e 4:1, incluindo o email no shell, em todas as rotas. Passaram a `#636E82` (5,1:1), e o estado "draft" passou a `#5A6579`. É a única mudança visual no claro, além da Command Bar e do botão de tema.
- **Corrigido de passagem:** o botão do menu móvel aparecia também em desktop (o CSS do shell ganhava ao `lg:hidden`). Os links do breadcrumb do editor passaram a ser sublinhados, porque não se distinguiam do texto à volta.
- **Ainda não:** a home do protótipo continua em `/app/studio` (S3), e o login e o registo continuam claros (S5).

### Notas da S3 (2026-11-23)

- **Na shell:** a home deixou de ter sidebar própria e vive no shell da app. Usa só tokens semânticos, por isso acompanha o tema claro.
- **Coral nos dois temas:** novo token `--color-accent-warm` (`#C2410C` no claro, 5,2:1; `#FF9474` no Studio).
- **E2E atualizados:** a home de quem regressa e a home vazia (sem projetos nem conteúdo de exemplo). Os testes clicam em itens das listas, e não no link do cabeçalho.
- **Nome da navegação:** "Home" colidia com a página "Home" do website nos testes e nos leitores de ecrã. Passou a "Studio".

### Notas da S4 (2026-11-23)

- **Verdade no overview:**
  - o "Generation mode" vem da configuração (`Mock mode`, `Local model · <tag>` ou `External provider · OpenAI`);
  - a contagem por módulo é uma contagem agrupada na base de dados (a lista de itens está limitada a 50).
- **Bug corrigido:** na secção "Shared content platform", todos os conteúdos ligavam à rota de Copy. Os posts sociais abriam "This project is not available", e todos diziam "Mock platform proof", mesmo quando não eram simulados. Cada item abre agora no editor do seu módulo e mostra o módulo, a versão e "Mock" só quando a versão o é. Há um E2E novo para isto.

### Notas da S5 (2026-11-23)

- **Filtros da Library:** eram 15 sempre visíveis antes do conteúdo. Ficam a pesquisa, o módulo, o estado e a campanha (que serve vários módulos). Os restantes aparecem por `:has()` quando o módulo está escolhido ou quando o filtro tem um valor, por isso um filtro aplicado nunca fica escondido. Os E2E não mudaram, porque já escolhiam o módulo primeiro.
- **Textos verdadeiros:** em modo `local`, a página Privacy passa a dizer que a geração corre no computador. Duas descrições novas das Settings foram acertadas ao conteúdo real das páginas.
- **Fica para a S6:** a barra de separadores do projeto tem 12 entradas e faz scroll horizontal em desktop sem indicação visual. Também ficam os estados vazios, de carregamento e de erro.

### S6: checklist do doc 18 (2026-11-23)

| Área | Resultado |
|---|---|
| Tokens | ✅ Zero hex no CSS da app (do shell em diante). Os monogramas usam `var(--color-*)`, com teste unitário. As sombras decorativas mantêm `rgb()` de preto com alfa |
| Contraste e foco | ✅ axe WCAG 2.2 AA sem violações em todas as rotas, nos dois temas, a 320, 390 e 1440 px. Foco visível em tokens |
| Estado e seleção | ✅ Nunca só pela cor: texto em todos os estados, `aria-current` na navegação |
| Shell e navegação | ✅ A navegação global ("Studio", "Projects"…) e a do projeto (separadores) são distintas. O separador ativo fica sempre visível |
| Home vazia e de quem regressa | ✅ A vazia leva a "Create your first project", sem exemplos inventados. A de quem regressa dá continuidade ("Continue …", conteúdo recente) |
| Estados | ✅ O carregamento tem a forma da página (sem percentagens falsas) e o pulso pára com movimento reduzido. O erro diz que os dados não mudaram e dá duas saídas. O conteúdo simulado continua marcado |
| Motion | ✅ Só `transform` e `opacity`, 160–180 ms. Brilho ambiente de 24 s. Tudo pára com `prefers-reduced-motion` |
| Responsivo | ✅ Sem scroll horizontal da página a 320 px (dois campos de ficheiro corrigidos). Alvos de 44 px |
| Fora de âmbito | ✅ Não se mostram como disponíveis templates, componentes, automações, publicação nem analytics |
| "Sem orbs brilhantes" | ⚠️ **Exceção revista:** a direção aprovada (mockup de 2026-11-20) pede gradientes e brilho. Fica um único brilho ambiente, desfocado e atrás do conteúdo, na home e no login, mais fraco no tema claro. Não há orbs como motivo, nem robôs, nem cérebros |
| Zoom a 200% | ✅ 2026-11-26: 24 rotas da app (Studio e claro) a 640×400 e 512×384 CSS px, ou seja, 1280×800 e 1024×768 a 200%. Sem scroll horizontal nem conteúdo cortado. Barra de comandos e menu também a 260 px de altura (WCAG 1.4.10). Corrigido: a barra de comandos ficava presa aos 56 px do topo (o `backdrop-filter` do topo prende os filhos fixos), o fundo escurecido nunca cobria a página e, em janelas baixas, a barra saía do ecrã. O menu móvel e a barra lateral cortavam a conta e o "Sign out" sem scroll |
| Leitores de ecrã reais | ⏳ O axe cobre a semântica. Falta uma passagem humana com VoiceOver |

**Capturas de referência** (`docs/design/reference/`): `studio-home`, `studio-home-light`, `studio-home-mobile`, `project-overview`, `library`, `social-editor`, `sign-in`, todas com os dados demo.

**Regressão encontrada na S6:** o E2E desktop (LF-21) ainda procurava o dashboard antigo no segundo arranque. O workflow Desktop da `main` falhava desde a S3 (#69, #70 e #71), sem que ninguém desse por isso, porque o workflow não corria em PRs que mexem só em `src/app`. O teste passou a usar a home Studio, e o workflow passa a correr também com mudanças em `src/app`, `src/components` e `src/features`.
