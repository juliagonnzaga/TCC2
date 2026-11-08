# Sistema Web de Coleta e Categorização de Recomendações Algorítmicas

Sistema web desenvolvido como parte do Trabalho de Conclusão de Curso (Monografia II) em Ciência da Computação na UFOP, continuação da Monografia I. O projeto apoia uma pesquisa sobre conteúdos relacionados à percepção corporal feminina recomendados algoritmicamente em redes sociais, seguindo a metodologia Design Science Research (Peffers et al., 2007).

**Autoria:** Julia Carlos Gonzaga
**Orientador:** Prof. Dr. Reinaldo Silva Fortes
**Coorientadora:** Profa. Dra. Aline Norberta de Brito

## Sobre o projeto

O sistema tem duas pontas:

- **App da participante** — a participante aceita o TCLE, cria uma conta (e-mail + senha) ou entra numa conta já existente, e envia links de conteúdos que percebeu como recomendados algoritmicamente, indicando rede, formato, data e o motivo de suspeitar da recomendação.
- **Painel da pesquisadora** — área autenticada em que as avaliadoras categorizam os conteúdos recebidos usando a taxonomia definida na Monografia I, e acompanham indicadores de concordância entre as duas avaliadoras.

A participante se identifica por e-mail e senha (ver [Limitações conhecidas](#limitações-conhecidas) sobre o impacto disso na anonimização). Internamente, cada participante também tem um código (ex.: `P427`), do mesmo jeito que na Sprint 1 — só que agora ele não é mais mostrado a ela: ele existe só para o painel da pesquisadora continuar identificando os envios sem nunca expor o e-mail às avaliadoras.

## Funcionalidades

**Participante**
- Termo de Consentimento Livre e Esclarecido (TCLE), com registro do aceite e data/hora.
- Cadastro (e-mail + senha) e login, para a participante poder entrar de qualquer dispositivo — substitui o código anônimo gerado por sessão que existia até a Sprint 4 (ver [Limitações conhecidas](#limitações-conhecidas)). Senha armazenada com hash (nunca em texto puro).
- Tela de instruções de coleta.
- Envio de recomendações por link do post/Reels (rede, formato, data e motivo), limitado a 3 envios por participante.
- Acompanhamento do status dos próprios envios.
- Botão "← Voltar" em todas as telas, para a participante poder revisar a tela anterior a qualquer momento. Ao voltar até a tela de TCLE já estando logada, aparece um aviso em vez dos formulários de cadastro/login de novo, para não tentar criar outra conta por engano.
- Botão "Sair da conta" na tela de status dos envios.

**Painel da pesquisadora**
- Login e seleção de avaliadora (A/B).
- Fila de submissões, com filtro por pendentes e status calculado automaticamente (pendente / parcial / categorizado / em dúvida).
- Categorização de conteúdos pela taxonomia da Monografia I (categorias, tom, intenção comercial, edição aparente), com marcação de casos ambíguos.
- Indicadores de concordância entre avaliadoras (itens coletados, % categorizados, % de concordância, tempo médio por item, lista de itens divergentes).
- Resultados do questionário SUS: pontuação média, classificação, contribuição por afirmação e respostas individuais.

**Testes (Sprint 4)**
- Questionário System Usability Scale (SUS) digital (`/sus.html`), aplicado às usuárias após a execução de tarefas representativas do protocolo de coleta — ver [`docs/guia-teste-usabilidade.md`](docs/guia-teste-usabilidade.md).
- Testes funcionais automatizados cobrindo os critérios de aceitação de cada User Story das Sprints 1 a 5 (`tests/test-acceptance.js`).
- Um defeito encontrado durante os testes foi corrigido: o envio de recomendação aceitava uma data futura como "data em que apareceu"; agora é validado.

**Login da participante (Sprint 5)**
- Cadastro com e-mail e senha, login, verificação de sessão e logout, substituindo o fluxo de TCLE + código anônimo gerado por sessão.

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

1. `test-flow.js` — fluxo da participante de ponta a ponta (cadastro, login, envio, status, logout);
2. `test-admin-flow.js` — fluxo do painel da pesquisadora de ponta a ponta;
3. `test-acceptance.js` — testes funcionais dos critérios de aceitação de todas as User Stories (Sprints 1-5), direto na API;
4. `test-sus-flow.js` — fluxo do questionário SUS de ponta a ponta, conferindo a pontuação no painel;
5. `test-back-navigation.js` — botão "← Voltar" em todas as telas da participante, incluindo a regra de não tentar criar outra conta ao voltar para o TCLE já logada.

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
  test-acceptance.js    testes funcionais de aceitação (Sprints 1-5), via API
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
- [x] Sprint 5 — login da participante (e-mail + senha), substituindo o código anônimo por sessão

## Próximos passos (fora do que já foi automatizado)

A Sprint 4 preparou o **instrumento** (questionário SUS digital) e o **roteiro** (`docs/guia-teste-usabilidade.md`), além dos testes funcionais automatizados — mas a aplicação do SUS com usuárias reais, prevista na Seção 3.5.7 da metodologia, ainda precisa ser **conduzida por você** (não é algo que dá pra automatizar): rodar o roteiro com 3 a 5 testadoras, registrar dificuldades observadas e, só então, olhar os resultados agregados no painel. Defeitos encontrados nesse processo devem virar issues no GitHub Project, conforme a metodologia.

## Limitações conhecidas

- **Login substitui o código anônimo (Sprint 5, orientação do professor) — impacto na anonimização**: até a Sprint 4, a participação era 100% anônima (código gerado por sessão, sem nenhum dado identificável). A partir da Sprint 5, a participante se cadastra com e-mail e senha, o que torna a coleta **confidencial em vez de anônima** (o e-mail identifica a participante, mesmo que só fique guardado no cadastro). Para reduzir o impacto, o painel da pesquisadora e as telas de categorização continuam mostrando só um código interno (nunca o e-mail), então as avaliadoras continuam sem acesso à identidade de quem enviou cada conteúdo. Ainda assim, isso precisa ser refletido no texto do TCLE e da metodologia (que hoje descrevem anonimato, não confidencialidade) antes de qualquer submissão ao Comitê de Ética ou coleta real.
- **Perfil mínimo anônimo pausado**: a tela que coletava faixa etária e rede social mais usada foi retirada do front-end a pedido do orientador, que indicou não desenvolver essa parte por enquanto. Como o fluxo de perfil foi substituído pelo cadastro da Sprint 5, essa informação demográfica não é coletada em lugar nenhum hoje.
- **Armazenamento local em JSON**: usado apenas para viabilizar desenvolvimento e testes. Antes de qualquer coleta real com participantes, precisa ser substituído por armazenamento cifrado, como previsto na metodologia — isso vale ainda mais agora que o cadastro guarda e-mail (a senha já fica só com hash, nunca em texto puro).
- **Mudança de protocolo (print → link)**: o protocolo original (Monografia I) previa envio de print anonimizado pela participante, ocultando terceiros antes de enviar. Para reduzir fricção, a coleta passou a ser por link do post/Reels, o que remove essa etapa de anonimização — quem acessa o link vê o conteúdo original, incluindo perfil e comentários de terceiros. Antes de submissão ao Comitê de Ética (Plataforma Brasil) ou coleta real, isso precisa ser refletido no texto do protocolo (TCLE, objetivos, resumo) e decidido como tratar a exposição de terceiros.
- **Stack trocada (Flutter → HTML/CSS/JS)**: a tecnologia de implementação foi trocada para viabilizar o desenvolvimento dentro do prazo. A Seção 3.5.2 da metodologia, já entregue, ainda cita Flutter e precisa ser atualizada.
- **Login da pesquisadora simplificado**: usa senha única compartilhada entre as avaliadoras + escolha manual de "sou a avaliadora A ou B" a cada sessão, em vez de contas individuais de verdade. Suficiente para segregar categorizações e calcular concordância, mas não é autenticação real.
- **Sessões de login em memória**: tanto o login da participante quanto o da pesquisadora guardam os tokens válidos só em memória no servidor (não em banco). Reiniciar o servidor invalida as sessões abertas — a pessoa precisa entrar de novo (mas a conta e os dados continuam lá). Suficiente para o MVP; antes de uma coleta real, vale revisar junto com a troca do armazenamento em JSON.
