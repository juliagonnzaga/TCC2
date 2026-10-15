# TCC2 — Sistema web de coleta de recomendações

Implementação da **Sprint 1** do backlog (fundação do projeto e fluxo
inicial da participante), referente à Monografia II de Julia Carlos
Gonzaga (UFOP).

**Tecnologia:** HTML/CSS/JS puro no front-end, Node.js + Express no
back-end (ver observação sobre a metodologia abaixo).

## O que está implementado (Sprint 1)

- **Tela de boas-vindas e TCLE** — checkbox de aceite habilita o botão
  "Aceitar e continuar"; o aceite é registrado no back-end com data/hora.
- **Tela de perfil mínimo anônimo** — faixa etária + rede social mais
  usada; o back-end gera um código anônimo (ex.: `P442`) e recusa gerar
  o código se o TCLE não tiver sido aceito antes.
- **Tela de instruções de coleta** — conteúdo estático, sem back-end.
- Sessão sobrevive a um refresh de página (usa `localStorage` apenas
  para `consentId` e o código anônimo — nenhum dado identificável).

O envio de recomendações (Sprint 2) e o painel administrativo (Sprint 3)
ainda não existem nesta versão.

## Como rodar

```bash
npm install
npm start
```

Acesse `http://localhost:3000`.

## Como testar (Sprint 4 usa isso como base)

Há um teste automatizado de ponta a ponta com Playwright, que simula o
fluxo completo (TCLE → perfil → código → instruções):

```bash
npx playwright install chromium   # só na primeira vez
npm start                         # em um terminal
npm test                          # em outro terminal
```

O teste também cobre validações da API (`/api/consent`, `/api/profile`)
com `curl`, descritas nos comentários de `server.js`.

## Armazenamento de dados

Para a Sprint 1, os aceites de TCLE e os perfis são salvos em arquivos
JSON locais (`data/consents.json`, `data/profiles.json`), só para viabilizar
o desenvolvimento e os testes. **Antes de qualquer coleta real com
participantes**, isso precisa ser substituído por armazenamento cifrado,
como já previsto na metodologia (Seção 3.5.2 / Trabalhos Futuros da
Monografia 1). A pasta `data/` está no `.gitignore` para não subir dados
de teste (ou reais) para o GitHub.

## Nota sobre a metodologia entregue

A Seção 3.5.2 da metodologia já entregue ao professor descreve o uso do
Flutter como tecnologia de implementação. Este código usa HTML/CSS/JS
puro em vez disso — ajuste combinado para viabilizar o desenvolvimento
dentro do prazo. **Lembrete: atualizar aquela seção do documento** para
refletir essa mudança antes da entrega final.

## Estrutura do projeto

```
server.js            servidor Express + as 2 "serviços" da Sprint 1
public/
  index.html          as 3 telas (SPA simples, sem framework)
  css/style.css
  js/app.js            lógica de navegação entre telas + chamadas à API
tests/
  test-flow.js         teste de ponta a ponta (Playwright)
data/                  armazenamento local (gitignored)
```
