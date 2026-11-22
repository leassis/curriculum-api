# Prompt de implementação — curriculum-api

Cole o texto abaixo numa sessão nova na raiz do repo (`/Users/leassis/workspace/curriculum-api`).

---

Você é o **orquestrador**. Sua missão: implementar TODAS as specs em `.specs/features/` e entregar uma aplicação **usável de ponta a ponta** (API + admin HTML/HTMX rodando local, com dados de seed, login, chat público, chat de recrutador e currículos tailored com impressão).

## Regra de ouro: contexto principal limpo

- **Você não escreve código de feature nem lê arquivos grandes.** Todo trabalho de implementação, leitura de spec/design/tasks, testes e debug vai para **sub-agents** (Agent tool). Use `general-purpose` para implementar e verificar; `Explore` só para localizar coisas.
- Cada sub-agent recebe um brief **autossuficiente** (caminhos das specs, o que fazer, o que NÃO tocar, definição de pronto). Sem "com base no que você achou".
- Sub-agent devolve relatório de **no máximo 15 linhas**: o que foi feito, comandos rodados com resultado (pass/fail), commits, pendências. Sem dump de código ou logs.
- Você só guarda: fase atual, status por task, branch/commit, bloqueios. Se um relatório vier longo ou vago, peça resumo e confira com `git log --oneline` e `git status`, nunca lendo diffs inteiros.
- Rode **um sub-agent escrevedor por vez** (as tracks tocam arquivos disjuntos mas compartilham `main`). Verificadores/revisores podem rodar em paralelo, somente leitura.
- Use `mcp__ccd_turn__update_plan` com uma linha por fase/task.

## Como cada sub-agent trabalha

Instrução fixa em todo brief de implementação:

1. Ativar a skill `tlc-spec-driven` pelo nome e seguir o fluxo Execute (task → gate → um commit atômico por task). Se a skill não ativar, **parar e reportar**.
2. Ler apenas: `spec.md` e `design.md`/`tasks.md` da feature, `GLOSSARY.md`, `curriculum-specs/` quando citado, e o código já existente da área.
3. Respeitar a propriedade de arquivos (AD-003): tracks só editam os arquivos listados em "Owns" na spec. Se precisar mudar `app.ts`, `container.ts`, `schema.ts` ou `drizzle/`, **parar e reportar** (é mudança de uma linha em `main`, decisão do orquestrador).
4. Testes: nomes de teste são contrato (`describe > it` da spec). Integração exige `docker compose up -d` e `TEST_DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/curriculum_test`.
5. Gate de fim de task/feature: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verdes. Reportar falha com a saída exata; nunca marcar pronto com teste vermelho ou pulado.
6. Não dar push. Não usar `--no-verify`.

## Ordem de execução

### Fase 0 — Pré-requisitos (você, direto, curto)
- Confirmar Docker rodando e `pnpm` disponível.
- `foundation/spec.md` já está aprovada. `foundation/tasks.md` está `Draft`: sub-agent revisa a matriz de cobertura e marca aprovada (registrar "aprovado pelo usuário via este prompt" no arquivo).
- As specs `public-chat`, `admin-core`, `tailored-resumes`, `recruiter-chat` estão `Approved: pending`. Cada uma ganha, no início da sua fase, um sub-agent que a lê, lista premissas "Confirmed? n" e decide o default registrado. **Só pare e pergunte ao usuário** se uma premissa tiver impacto de segurança/dados e o default não for óbvio. Caso contrário, aprovar com o default e anotar.

### Fase 1 — `foundation` (sequencial, bloqueia tudo)
- Executar `foundation/tasks.md` na ordem FND-01 → FND-26.
- Quebre em sub-agents por bloco coerente (ex.: tooling+lint; Drizzle/migrate/seed; config+app+erros; segurança; serviços compartilhados; LLM gateway+PII guard; admin shell; CLI). Um por vez.
- Pronto quando: gate verde; `migrate` cria 7 tabelas só em `curriculum_api`; `seed` + `hash-password` + `pnpm dev` + `curl :3001/api/health` funcionam; routers vazios montados.
- Verificação independente: sub-agent **Verifier** diferente do implementador confere cada AC com seu teste (skill: author ≠ verifier).
- Merge em `main` antes de seguir.

### Fase 2 — Tracks, nesta ordem, uma por vez, cada uma a partir de `main` atualizada
Cada track: branch própria (worktree opcional), sub-agent aprova spec → design/tasks se faltarem (skill adapta a profundidade) → implementa → Verifier independente → merge em `main` com gate verde.

1. **`admin-core`** — login com throttle (6ª tentativa recusada), dashboard, profile (PII Guard no save), settings, personal-info (mascarado/revelar/deletar).
2. **`public-chat`** — Turnstile → cookie de sessão → chat streamado, limite atômico por IP hash (20 paralelos/limite 5 = exatamente 5), nenhum valor de Personal Info nos prompts.
3. **`tailored-resumes`** — CRUD, geração com tailor model (só Career Body + JD), edição, preview com markdown sanitizado, print A4/Letter com dados reais, download.
4. **`recruiter-chat`** — criar/revogar/resetar/deletar links, `/r/:token`, sessão com `cid`, quota, expiração, revogação imediata (410 `chat_revoked`), sem identidade do recrutador nem PII no LLM.

Se a spec de uma track contradisser outra (ex.: print do master CV fica em `tailored-resumes`), siga a spec que **possui** o arquivo.

### Fase 3 — Integração e "usável de verdade"
Um sub-agent dedicado (depois dos 4 merges), com browser embutido disponível:
1. Clean slate: `docker compose down -v && docker compose up -d`, `migrate`, `seed`, `hash-password`, `pnpm dev`.
2. **Smoke end-to-end real** (modelo de LLM mockado/recording se não houver chave; documentar o que precisou de chave real):
   - login admin → editar Master CV (e-mail no corpo é rejeitado) → cadastrar personal info → ajustar settings
   - chat público: sessão + resposta streamada + limite diário
   - criar resume tailored → gerar → editar → imprimir
   - criar link de recrutador → conversar até a quota → revogar → próxima pergunta 410
3. Rodar **toda** a suíte (unit + integration) e `pnpm lint && pnpm typecheck && pnpm build` do zero.
4. Escrever `RUNNING.md` curto na raiz: pré-requisitos, `.env` (variáveis obrigatórias, sem segredos), comandos de migrate/seed/hash-password/dev, URLs (`/admin`, `/api/health`, chat público, `/r/:token`), como rodar os testes.
5. Corrigir o que o smoke achar (via sub-agent de correção, escopo mínimo, teste de regressão).

## Definição de pronto (só declare terminado quando tudo for verdade)
- [ ] As 5 features em `main`, specs marcadas aprovadas, tasks/ACs com status atualizado.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verdes num checkout limpo com Docker.
- [ ] Smoke end-to-end da Fase 3 passou; `RUNNING.md` permite alguém subir do zero.
- [ ] Nenhum valor de Personal Info chega a prompt de LLM (testes de gravação passam).
- [ ] Relatório final seu: 10 linhas — o que roda, o que ficou fora de escopo (frontend Svelte, publish npm, Vercel, Phase 5/6), o que exige chave/config real (OpenRouter, Turnstile).

## Quando parar e perguntar ao usuário
Só para: decisão de segurança/dados sem default óbvio; conflito entre specs que o dono do arquivo não resolve; credencial real necessária; qualquer push, publish ou ação fora do repo local. Fora isso, siga sem pedir confirmação.
