# Sistema Web de Coleta e Categorização de Recomendações Algorítmicas

Sistema web desenvolvido como parte do Trabalho de Conclusão de Curso (Monografia II) em Ciência da Computação na UFOP, continuação da Monografia I. O projeto apoia uma pesquisa sobre conteúdos relacionados à percepção corporal feminina recomendados algoritmicamente em redes sociais, seguindo a metodologia Design Science Research (Peffers et al., 2007).

**Autoria:** Julia Carlos Gonzaga
**Orientador:** Prof. Dr. Reinaldo Silva Fortes
**Coorientadora:** Profa. Dra. Aline Norberta de Brito

## Sobre o projeto

O sistema tem duas pontas:

- **App da participante** — fluxo anônimo em que a participante aceita o TCLE, cria um perfil mínimo (faixa etária + rede social), recebe um código anônimo e envia links de conteúdos que percebeu como recomendados algoritmicamente, indicando rede, formato, data e o motivo de suspeitar da recomendação.
- **Painel da pesquisadora** — área autenticada em que as avaliadoras categorizam os conteúdos recebidos usando a taxonomia definida na Monografia I, e acompanham indicadores de concordância entre as duas avaliadoras.

Nenhum dado de identificação real é coletado da participante; o vínculo entre envios e pessoa é feito só pelo código anônimo gerado no primeiro acesso.

## Funcionalidades

**Participante**
- Termo de Consentimento Livre e Esclarecido (TCLE), com registro do aceite e data/hora.
- Geração automática de código anônimo logo após o aceite do TCLE (a tela de perfil com faixa etária/rede social foi pausada por enquanto — ver [Limitações conhecidas](#limitações-conhecidas)).
- Tela de instruções de coleta.
- Envio de recomendações por link do post/Reels (rede, formato, data e motivo), limitado a 3 envios por participante.
- Acompanhamento do status dos próprios envios.
- Botão "← Voltar" em todas as telas, para a participante poder revisar a tela anterior a qualquer momento. Ao voltar até a tela de TCLE depois que o código anônimo já foi gerado, aparece um aviso em vez do checkbox/"Aceitar" de novo, para não gerar um segundo código por engano.

**Painel da pesquisadora**
- Login e seleção de avaliadora (A/B).
- Fila de submissões, com filtro por pendentes e status calculado automaticamente (pendente / parcial / categorizado / em dúvida).
- Categorização de conteúdos pela taxonomia da Monografia I (categorias, tom, intenção comercial, edição aparente), com marcação de casos ambíguos.
- Indicadores de concordância entre avaliadoras (itens coletados, % categorizados, % de concordância, tempo médio por item, lista de itens divergentes).
- Resultados do questionário SUS: pontuação média, classificação, contribuição por afirmação e respostas individuais.

**Testes (Sprint 4)**
- Questionário System Usability Scale (SUS) digital (`/sus.html`), aplicado às usuárias após a execução de tarefas representativas do protocolo de coleta — ver [`docs/guia-teste-usabilidade.md`](docs/guia-teste-usabilidade.md).
- Testes funcionais automatizados cobrindo os critérios de aceitação de cada User Story das Sprints 1 a 4 (`tests/test-acceptance.js`).
- Um defeito encontrado durante os testes foi corrigido: o envio de recomendação aceitava uma data futura como "data em que apareceu"; agora é validado.

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
- Questionário SUS (teste de usabilidade): `http://localhost:3000/sus.html`

## Como testar

```bash
npx playwright install chromium   # só na primeira vez
npm start                         # em um terminal
npm test                          # em outro terminal
```

`npm test` roda, em sequência (limpando `data/*.json` entre cada um):

1. `test-flow.js` — fluxo da participante de ponta a ponta;
2. `test-admin-flow.js` — fluxo do painel da pesquisadora de ponta a ponta;
3. `test-acceptance.js` — testes funcionais dos critérios de aceitação de todas as User Stories (Sprints 1-4), direto na API;
4. `test-sus-flow.js` — fluxo do questionário SUS de ponta a ponta, conferindo a pontuação no painel;
5. `test-back-navigation.js` — botão "← Voltar" em todas as telas da participante, incluindo a regra de não gerar um segundo código ao voltar para o TCLE.

## Estrutura do projeto

```
server.js            servidor Express (API das duas pontas)
public/
  index.html          telas da participante
  admin.html           painel da pesquisadora
  sus.html             questionário SUS (teste de usabilidade)
  css/style.css
  js/app.js            lógica da participante
  js/admin.js          lógica do painel da pesquisadora
  js/sus.js            lógica do questionário SUS
tests/
  test-flow.js          teste de ponta a ponta — participante
  test-admin-flow.js    teste de ponta a ponta — painel da pesquisadora
  test-acceptance.js    testes funcionais de aceitação (Sprints 1-4), via API
  test-sus-flow.js      teste de ponta a ponta — questionário SUS
  test-back-navigation.js  teste do botão "← Voltar" em todas as telas
scripts/
  reset-data.js          limpa data/*.json entre rodadas de teste
docs/
  guia-teste-usabilidade.md   roteiro para aplicar o teste de usabilidade + SUS
data/                  armazenamento local (gitignored)
```

## Metodologia de desenvolvimento

Desenvolvimento em Kanban + Sprints, com board no GitHub Projects, commits seguindo Conventional Commits e um Git Flow simplificado (`main`/`develop`/branches de feature). Planejamento em 4 sprints de 15 dias; a Sprint 4 é dedicada a testes (SUS e testes simples de usabilidade).

## Status do projeto

- [x] Sprint 1 — TCLE, código anônimo, instruções
- [x] Sprint 2 — envio de recomendações por link, status dos envios
- [x] Sprint 3 — painel da pesquisadora (login, fila, categorização, concordância)
- [x] Sprint 4 — testes funcionais de aceitação, questionário SUS, correção de defeito encontrado

## Próximos passos (fora do que já foi automatizado)

A Sprint 4 preparou o **instrumento** (questionário SUS digital) e o **roteiro** (`docs/guia-teste-usabilidade.md`), além dos testes funcionais automatizados — mas a aplicação do SUS com usuárias reais, prevista na Seção 3.5.7 da metodologia, ainda precisa ser **conduzida por você** (não é algo que dá pra automatizar): rodar o roteiro com 3 a 5 testadoras, registrar dificuldades observadas e, só então, olhar os resultados agregados no painel. Defeitos encontrados nesse processo devem virar issues no GitHub Project, conforme a metodologia.

## Limitações conhecidas

- **Perfil mínimo anônimo pausado**: a tela que coletava faixa etária e rede social mais usada foi retirada do front-end a pedido do orientador, que indicou não desenvolver essa parte por enquanto. O código anônimo agora é gerado automaticamente assim que a participante aceita o TCLE. O endpoint `/api/profile` continua existindo e aceita esses dados opcionalmente, para o caso de essa tela voltar depois.
- **Armazenamento local em JSON**: usado apenas para viabilizar desenvolvimento e testes. Antes de qualquer coleta real com participantes, precisa ser substituído por armazenamento cifrado, como previsto na metodologia.
- **Mudança de protocolo (print → link)**: o protocolo original (Monografia I) previa envio de print anonimizado pela participante, ocultando terceiros antes de enviar. Para reduzir fricção, a coleta passou a ser por link do post/Reels, o que remove essa etapa de anonimização — quem acessa o link vê o conteúdo original, incluindo perfil e comentários de terceiros. Antes de submissão ao Comitê de Ética (Plataforma Brasil) ou coleta real, isso precisa ser refletido no texto do protocolo (TCLE, objetivos, resumo) e decidido como tratar a exposição de terceiros.
- **Stack trocada (Flutter → HTML/CSS/JS)**: a tecnologia de implementação foi trocada para viabilizar o desenvolvimento dentro do prazo. A Seção 3.5.2 da metodologia, já entregue, ainda cita Flutter e precisa ser atualizada.
- **Login da pesquisadora simplificado**: usa senha única compartilhada entre as avaliadoras + escolha manual de "sou a avaliadora A ou B" a cada sessão, em vez de contas individuais de verdade. Suficiente para segregar categorizações e calcular concordância, mas não é autenticação real.
