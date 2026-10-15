
# Sistema Web de Coleta e Categorização de Recomendações Algorítmicas

Sistema web desenvolvido como parte do Trabalho de Conclusão de Curso (Monografia II) em Ciência da Computação na UFOP, continuação da Monografia I. O projeto apoia uma pesquisa sobre conteúdos relacionados à percepção corporal feminina recomendados algoritmicamente em redes sociais, seguindo a metodologia Design Science Research.

**Aluno(a):** Julia Carlos Gonzaga
**Orientador:** Prof. Dr. Reinaldo Silva Fortes
**Coorientadora:** Profa. Dra. Aline Norberta de Brito

## Sobre o projeto

O sistema tem dois focos:

- **App da participante** — fluxo anônimo em que a participante aceita o TCLE, cria um perfil mínimo (faixa etária + rede social), recebe um código anônimo e envia links de conteúdos que percebeu como recomendados algoritmicamente, indicando rede, formato, data e o motivo de suspeitar da recomendação.
- **Painel da pesquisadora** — área autenticada em que as avaliadoras categorizam os conteúdos recebidos usando a taxonomia definida na Monografia I, e acompanham indicadores de concordância entre as duas avaliadoras.

Nenhum dado de identificação real é coletado da participante; o vínculo entre envios e pessoa é feito só pelo código anônimo gerado no primeiro acesso.

## Funcionalidades

**Participante**
- Termo de Consentimento Livre e Esclarecido (TCLE), com registro do aceite e data/hora.
- Perfil mínimo anônimo (faixa etária, rede social mais usada) com geração de código anônimo.
- Tela de instruções de coleta.
- Envio de recomendações por link do post/Reels (rede, formato, data e motivo), limitado a 3 envios por participante.
- Acompanhamento do status dos próprios envios.

**Painel da pesquisadora**
- Login e seleção de avaliadora (A/B).
- Fila de submissões, com filtro por pendentes e status calculado automaticamente (pendente / parcial / categorizado / em dúvida).
- Categorização de conteúdos pela taxonomia da Monografia I (categorias, tom, intenção comercial, edição aparente), com marcação de casos ambíguos.
- Indicadores de concordância entre avaliadoras (itens coletados, % categorizados, % de concordância, tempo médio por item, lista de itens divergentes).

## Tecnologias

- Front-end: HTML, CSS e JavaScript puros (sem framework)
- Back-end: Node.js + Express
- Armazenamento: arquivos JSON locais (ver observação em [Limitações conhecidas](#limitações-conhecidas))
- Testes: Playwright (end-to-end)

## Como executar

```bash
npm install
npm start
```

- Participante: `http://localhost:3000`
- Painel da pesquisadora: `http://localhost:3000/admin.html` (senha definida pela variável de ambiente `ADMIN_PASSWORD`; padrão de desenvolvimento: `pesquisa123`)

## Como testar

```bash
npx playwright install chromium   # só na primeira vez
npm start                         # em um terminal
npm test                          # em outro terminal
```

`npm test` roda os dois testes de ponta a ponta (fluxo da participante e fluxo da pesquisadora), limpando os dados locais entre eles.

## Estrutura do projeto

```
server.js            servidor Express (API das duas pontas)
public/
  index.html          telas da participante
  admin.html           painel da pesquisadora
  css/style.css
  js/app.js            lógica da participante
  js/admin.js          lógica do painel da pesquisadora
tests/
  test-flow.js         teste de ponta a ponta — participante
  test-admin-flow.js   teste de ponta a ponta — painel da pesquisadora
scripts/
  reset-data.js         limpa data/*.json entre rodadas de teste
data/                  armazenamento local (gitignored)
```

## Metodologia de desenvolvimento

Desenvolvimento em Kanban + Sprints, com board no GitHub Projects, commits seguindo Conventional Commits e um Git Flow simplificado (`main`/`develop`/branches de feature). Planejamento em 4 sprints de 15 dias; a Sprint 4 é dedicada a testes (SUS e testes simples de usabilidade).

## Status do projeto

- [x] Sprint 1 — TCLE, perfil anônimo, instruções
- [x] Sprint 2 — envio de recomendações por link, status dos envios
- [x] Sprint 3 — painel da pesquisadora (login, fila, categorização, concordância)
- [ ] Sprint 4 — testes funcionais, SUS e testes de usabilidade

## Limitações conhecidas

- **Armazenamento local em JSON**: usado apenas para viabilizar desenvolvimento e testes. Antes de qualquer coleta real com participantes, precisa ser substituído por armazenamento cifrado, como previsto na metodologia.
- **Mudança de protocolo (print → link)**: o protocolo original (Monografia I) previa envio de print anonimizado pela participante, ocultando terceiros antes de enviar. Para reduzir fricção, a coleta passou a ser por link do post/Reels, o que remove essa etapa de anonimização — quem acessa o link vê o conteúdo original, incluindo perfil e comentários de terceiros. Antes de submissão ao Comitê de Ética (Plataforma Brasil) ou coleta real, isso precisa ser refletido no texto do protocolo (TCLE, objetivos, resumo) e decidido como tratar a exposição de terceiros.
- **Stack trocada (Flutter → HTML/CSS/JS)**: a tecnologia de implementação foi trocada para viabilizar o desenvolvimento dentro do prazo. A Seção 3.5.2 da metodologia, já entregue, ainda cita Flutter e precisa ser atualizada.
- **Login da pesquisadora simplificado**: usa senha única compartilhada entre as avaliadoras + escolha manual de "sou a avaliadora A ou B" a cada sessão, em vez de contas individuais de verdade. Suficiente para segregar categorizações e calcular concordância, mas não é autenticação real.
