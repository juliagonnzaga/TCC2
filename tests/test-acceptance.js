/**
 * TCC2 - Testes funcionais de aceitação (Sprints 4-5)
 *
 * Cobre os critérios de aceitação das User Stories das Sprints 1 a 5,
 * batendo diretamente na API (sem browser), conforme a Seção 3.5.7 da
 * metodologia: "testes funcionais de cada User Story, verificando o
 * atendimento aos critérios de aceitação definidos no backlog".
 *
 * Roda contra um servidor já no ar em http://localhost:3000 e espera
 * data/*.json limpo antes de começar (ver scripts/reset-data.js).
 */

const BASE = "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pesquisa123";

let passed = 0;
let failed = 0;

function ok(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ok - ${label}`);
  } else {
    failed += 1;
    console.error(`  FALHOU - ${label}`);
  }
}

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // sem corpo (ex.: favicon)
  }
  return { status: res.status, data };
}

(async () => {
  // -------- Sprint 1 (substituída na Sprint 5): cadastro/login da participante --------
  console.log("Sprint 1/5 — cadastro e login da participante (e-mail + senha)");

  const email = `participante-${Date.now()}@example.com`;

  const badEmail = await call("POST", "/api/participants/register", {
    email: "não-é-um-email",
    password: "senha123",
  });
  ok(badEmail.status === 400, "cadastro com e-mail inválido é rejeitado");

  const shortPassword = await call("POST", "/api/participants/register", {
    email,
    password: "123",
  });
  ok(shortPassword.status === 400, "cadastro com senha curta (<6 caracteres) é rejeitado");

  const register = await call("POST", "/api/participants/register", {
    email,
    password: "senha123",
  });
  ok(register.status === 201 && !!register.data.token, "cadastro com e-mail e senha válidos devolve um token");
  ok(register.data.tcleAccepted === false, "cadastro ainda não conta como TCLE aceito (etapa separada)");
  let token = register.data.token;

  const duplicateEmail = await call("POST", "/api/participants/register", {
    email,
    password: "outrasenha",
  });
  ok(duplicateEmail.status === 409, "cadastro com e-mail já usado é rejeitado");

  const loginWrongPassword = await call("POST", "/api/participants/login", {
    email,
    password: "senha-errada",
  });
  ok(loginWrongPassword.status === 401, "login com senha errada é rejeitado");

  const loginUnknownEmail = await call("POST", "/api/participants/login", {
    email: "nao-cadastrada@example.com",
    password: "senha123",
  });
  ok(loginUnknownEmail.status === 401, "login com e-mail não cadastrado é rejeitado");

  const login = await call("POST", "/api/participants/login", {
    email,
    password: "senha123",
  });
  ok(login.status === 200 && !!login.data.token, "login com e-mail e senha corretos devolve um token");
  ok(login.data.tcleAccepted === false, "login devolve se o TCLE já foi aceito por essa conta (ainda não, nesse caso)");

  const meNoAuth = await call("GET", "/api/participants/me");
  ok(meNoAuth.status === 401, "verificação de sessão sem token é bloqueada");

  const me = await call("GET", "/api/participants/me", undefined, token);
  ok(me.status === 200 && me.data.email === email, "verificação de sessão com token devolve o e-mail da participante");
  ok(me.data.tcleAccepted === false, "verificação de sessão também devolve que o TCLE ainda não foi aceito");

  // -------- Esqueci minha senha (pedido da Julia) --------
  console.log("Esqueci minha senha — redefinição de senha da participante");

  const forgotBadEmail = await call("POST", "/api/participants/forgot-password", {
    email: "não-é-um-email",
    newPassword: "novaSenha123",
  });
  ok(forgotBadEmail.status === 400, "redefinir com e-mail inválido é rejeitado");

  const forgotShortPassword = await call("POST", "/api/participants/forgot-password", {
    email,
    newPassword: "123",
  });
  ok(forgotShortPassword.status === 400, "redefinir com senha nova curta (<6 caracteres) é rejeitado");

  const forgotUnknownEmail = await call("POST", "/api/participants/forgot-password", {
    email: "ninguem-tem-essa-conta@example.com",
    newPassword: "novaSenha123",
  });
  ok(forgotUnknownEmail.status === 404, "redefinir senha de e-mail não cadastrado é rejeitado");

  const forgot = await call("POST", "/api/participants/forgot-password", {
    email,
    newPassword: "novaSenha123",
  });
  ok(forgot.status === 200, "redefinir com e-mail cadastrado e senha nova válida funciona");

  const meAfterForgot = await call("GET", "/api/participants/me", undefined, token);
  ok(meAfterForgot.status === 401, "token de sessão anterior é invalidado depois de redefinir a senha");

  const loginOldPassword = await call("POST", "/api/participants/login", { email, password: "senha123" });
  ok(loginOldPassword.status === 401, "a senha antiga para de funcionar depois da redefinição");

  const loginNewPassword = await call("POST", "/api/participants/login", { email, password: "novaSenha123" });
  ok(loginNewPassword.status === 200 && !!loginNewPassword.data.token, "a senha nova funciona depois da redefinição");
  token = loginNewPassword.data.token; // segue o teste com a sessão da senha nova

  // -------- Sprint 5, revisado: aceite do TCLE como etapa própria --------
  console.log("Sprint 5 (revisado) — aceite do TCLE em etapa separada do login/cadastro");

  const acceptTcleNoAuth = await call("POST", "/api/participants/accept-tcle");
  ok(acceptTcleNoAuth.status === 401, "aceitar o TCLE sem login (sem token) é bloqueado");

  const blockedBeforeTcle = await call(
    "POST",
    "/api/recommendations",
    {
      link: "https://www.instagram.com/reel/antes-do-tcle",
      network: "Instagram",
      reason: "teste",
      perceivedSubjects: ["Corpo e aparência"],
    },
    token
  );
  ok(blockedBeforeTcle.status === 403, "envio de recomendação é bloqueado antes de aceitar o TCLE");

  const acceptTcle = await call("POST", "/api/participants/accept-tcle", undefined, token);
  ok(acceptTcle.status === 201 && acceptTcle.data.tcleAccepted === true, "aceitar o TCLE com login devolve tcleAccepted: true");

  const acceptTcleAgain = await call("POST", "/api/participants/accept-tcle", undefined, token);
  ok(
    acceptTcleAgain.status === 201 && acceptTcleAgain.data.acceptedAt === acceptTcle.data.acceptedAt,
    "aceitar o TCLE de novo é idempotente (não troca a data do primeiro aceite)"
  );

  const meAfterTcle = await call("GET", "/api/participants/me", undefined, token);
  ok(meAfterTcle.data.tcleAccepted === true, "verificação de sessão reflete o TCLE já aceito");

  // Usa "novaSenha123" (não "senha123") porque a senha dessa conta já foi
  // trocada pelo bloco de "Esqueci minha senha" logo acima.
  const loginAfterTcle = await call("POST", "/api/participants/login", { email, password: "novaSenha123" });
  ok(loginAfterTcle.data.tcleAccepted === true, "login de novo (ex.: outro dispositivo) também reflete o TCLE já aceito");

  // -------- Sprint 2: envio de recomendações --------
  console.log("Sprint 2 — envio de recomendações");

  const noAuth = await call("POST", "/api/recommendations", {
    link: "https://www.instagram.com/reel/x",
    network: "Instagram",
    reason: "teste",
  });
  ok(noAuth.status === 401, "envio sem login (sem token) é rejeitado");

  const missingFields = await call("POST", "/api/recommendations", {}, token);
  ok(missingFields.status === 400, "envio sem campos obrigatórios é rejeitado");

  const badLink = await call(
    "POST",
    "/api/recommendations",
    {
      link: "não é um link",
      network: "Instagram",
      reason: "teste",
    },
    token
  );
  ok(badLink.status === 400, "link inválido é rejeitado");

  let firstRecommendationId = null;
  for (let i = 1; i <= 3; i++) {
    const res = await call(
      "POST",
      "/api/recommendations",
      {
        link: `https://www.instagram.com/reel/teste-${i}`,
        network: "Instagram",
        reason: `motivo ${i}`,
        perceivedSubjects: ["Corpo e aparência"],
      },
      token
    );
    ok(res.status === 201, `envio ${i}/3 é aceito`);
    if (i === 1) firstRecommendationId = res.data.recommendation.id;
  }

  const statusNoAuth = await call("GET", "/api/recommendations");
  ok(statusNoAuth.status === 401, "consulta de status sem login é bloqueada");

  const status = await call("GET", "/api/recommendations", undefined, token);
  ok(status.status === 200 && status.data.total === 3, "status dos envios mostra o total de 3 envios");

  // -------- Sprint 3: painel da pesquisadora --------
  console.log("Sprint 3 — painel da pesquisadora");

  const wrongLogin = await call("POST", "/api/auth/login", { password: "senha-errada" });
  ok(wrongLogin.status === 401, "login com senha errada é rejeitado");

  const adminLogin = await call("POST", "/api/auth/login", { password: ADMIN_PASSWORD });
  ok(adminLogin.status === 200 && !!adminLogin.data.token, "login com senha correta devolve token");
  const adminToken = adminLogin.data.token;

  // Só o caminho de validação aqui (não troca a senha de verdade, pra
  // não derrubar o adminToken usado no resto deste arquivo) — o
  // round-trip completo de "esqueci minha senha" do painel, com a senha
  // restaurada no final, é testado em test-admin-flow.js.
  const forgotAdminShortPassword = await call("POST", "/api/auth/forgot-password", { newPassword: "123" });
  ok(forgotAdminShortPassword.status === 400, "redefinir senha do painel com senha curta (<6 caracteres) é rejeitado");

  const queueNoAuth = await call("GET", "/api/queue");
  ok(queueNoAuth.status === 401, "fila sem token é bloqueada");

  const queue = await call("GET", "/api/queue", undefined, adminToken);
  ok(queue.status === 200 && queue.data.items.length === 3, "fila com token lista as 3 recomendações enviadas");
  ok(
    queue.data.items.find((i) => i.id === firstRecommendationId)?.status === "pendente",
    "item recém-enviado começa como pendente"
  );

  const tooManyCategories = await call(
    "POST",
    `/api/recommendations/${firstRecommendationId}/categorize`,
    {
      evaluator: "A",
      categories: ["Magreza ideal", "Autoaceitação", "Diversidade corporal"],
      tone: "inspiracional",
      commercialIntent: "não",
      apparentEditing: "não",
    },
    adminToken
  );
  ok(tooManyCategories.status === 400, "categorizar com mais de 2 categorias é rejeitado");

  const invalidCategory = await call(
    "POST",
    `/api/recommendations/${firstRecommendationId}/categorize`,
    {
      evaluator: "A",
      categories: ["categoria-que-não-existe"],
      tone: "inspiracional",
      commercialIntent: "não",
      apparentEditing: "não",
    },
    adminToken
  );
  ok(invalidCategory.status === 400, "categoria fora da taxonomia é rejeitada");

  const catA = await call(
    "POST",
    `/api/recommendations/${firstRecommendationId}/categorize`,
    {
      evaluator: "A",
      categories: ["Magreza ideal"],
      tone: "normativo",
      commercialIntent: "não",
      apparentEditing: "não",
    },
    adminToken
  );
  ok(catA.status === 201 && catA.data.status === "parcial", "após 1 avaliadora, status fica parcial");

  const catBAgree = await call(
    "POST",
    `/api/recommendations/${firstRecommendationId}/categorize`,
    {
      evaluator: "B",
      categories: ["Magreza ideal"],
      tone: "normativo",
      commercialIntent: "não",
      apparentEditing: "não",
    },
    adminToken
  );
  ok(catBAgree.status === 201 && catBAgree.data.status === "categorizado", "quando A e B concordam, status fica categorizado");

  const agreementAfterAgree = await call("GET", "/api/agreement", undefined, adminToken);
  ok(
    agreementAfterAgree.status === 200 && agreementAfterAgree.data.percentConcordancia === 100,
    "concordância fica 100% quando a única dupla avaliada concorda"
  );

  // Segundo item: avaliadoras discordam -> "em dúvida"
  const secondRecId = queue.data.items.find((i) => i.id !== firstRecommendationId).id;
  await call(
    "POST",
    `/api/recommendations/${secondRecId}/categorize`,
    {
      evaluator: "A",
      categories: ["Magreza ideal"],
      tone: "normativo",
      commercialIntent: "não",
      apparentEditing: "não",
    },
    adminToken
  );
  const catBDisagree = await call(
    "POST",
    `/api/recommendations/${secondRecId}/categorize`,
    {
      evaluator: "B",
      categories: ["Autoaceitação"],
      tone: "crítico",
      commercialIntent: "sim",
      apparentEditing: "sim",
    },
    adminToken
  );
  ok(catBDisagree.status === 201 && catBDisagree.data.status === "em dúvida", "quando A e B discordam, status fica em dúvida");

  const agreementAfterDisagree = await call("GET", "/api/agreement", undefined, adminToken);
  ok(
    agreementAfterDisagree.status === 200 && agreementAfterDisagree.data.percentConcordancia === 50,
    "concordância cai para 50% com 1 de 2 duplas discordando"
  );

  // -------- Sprint 4: SUS --------
  console.log("Sprint 4 — questionário SUS");

  const susWrongLength = await call("POST", "/api/sus", { answers: [3, 3, 3] });
  ok(susWrongLength.status === 400, "SUS com menos de 10 respostas é rejeitado");

  const susInvalidValue = await call("POST", "/api/sus", {
    answers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 9],
  });
  ok(susInvalidValue.status === 400, "SUS com resposta fora de 1-5 é rejeitado");

  const susNeutral = await call("POST", "/api/sus", {
    testerLabel: "Teste automatizado - neutro",
    answers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  });
  ok(susNeutral.status === 201 && susNeutral.data.score === 50, "respostas neutras (todas 3) geram pontuação 50");

  const susBest = await call("POST", "/api/sus", {
    testerLabel: "Teste automatizado - melhor caso",
    answers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
  });
  ok(susBest.status === 201 && susBest.data.score === 100, "melhor caso possível gera pontuação 100");

  const susNoAuth = await call("GET", "/api/sus");
  ok(susNoAuth.status === 401, "resultados do SUS exigem login da pesquisadora");

  const susResults = await call("GET", "/api/sus", undefined, adminToken);
  ok(
    susResults.status === 200 && susResults.data.count === 2 && susResults.data.averageScore === 75,
    "resultados do SUS agregam as respostas (2 respostas, média 75)"
  );

  // -------- Relatório público (dados abertos, pedido da Julia) --------
  // Reaproveita o estado deixado pelas Sprints 2/3 acima: 3 itens
  // coletados (todos Instagram/Reels), 1 categorizado (A e B concordam
  // em "Magreza ideal") e 1 "em dúvida" (A e B discordam) — dá pra
  // conferir tanto a agregação quanto que nada sensível vaza.
  console.log("Relatório público (dados abertos)");

  const publicReport = await call("GET", "/api/public/report");
  ok(publicReport.status === 200, "relatório público não exige login");
  ok(publicReport.data.itemsColetados === 3, "relatório público conta os 3 itens coletados");
  ok(
    publicReport.data.itemsCategorizados === 1 && publicReport.data.percentConcordancia === 50,
    "relatório público reflete 1 item categorizado e 50% de concordância (igual ao /api/agreement)"
  );
  ok(
    publicReport.data.porRede.some((r) => r.label === "Instagram" && r.count === 3),
    "relatório público agrega por rede social"
  );
  ok(
    publicReport.data.categorias.some((c) => c.label === "Magreza ideal" && c.count === 3),
    "relatório público agrega categorias (contando as 2 avaliações concordantes + 1 divergente)"
  );

  const reportText = JSON.stringify(publicReport.data);
  ok(
    !reportText.includes("instagram.com/reel") &&
      !reportText.includes("@example.com") &&
      !reportText.toLowerCase().includes("participantid") &&
      !reportText.toLowerCase().includes("\"link\""),
    "relatório público não vaza link, e-mail ou participantId"
  );

  // -------- Campos novos (pedido da Julia): rede ampliada, assunto --------
  // -------- percebido pela participante, como se sentiu --------
  // Usa uma participante própria pra não interferir na contagem de itens
  // usada nos testes do relatório público acima.
  console.log("Campos novos — rede ampliada, assunto percebido, como se sentiu");

  const email2 = `participante-camposnovos-${Date.now()}@example.com`;
  const { token: token2 } = (await call("POST", "/api/participants/register", {
    email: email2,
    password: "senha123",
  })).data;
  await call("POST", "/api/participants/accept-tcle", undefined, token2);

  const baseBody = {
    link: "https://www.instagram.com/reel/campos-novos",
    reason: "teste de campos novos",
  };

  const outraSemNome = await call(
    "POST",
    "/api/recommendations",
    { ...baseBody, network: "Outra", perceivedSubjects: ["Corpo e aparência"] },
    token2
  );
  ok(outraSemNome.status === 400, "rede \"Outra\" sem dizer qual rede é rejeitada");

  const semAssunto = await call(
    "POST",
    "/api/recommendations",
    { ...baseBody, network: "Instagram" },
    token2
  );
  ok(semAssunto.status === 400, "envio sem nenhum assunto percebido é rejeitado");

  const assuntoDemais = await call(
    "POST",
    "/api/recommendations",
    {
      ...baseBody,
      network: "Instagram",
      perceivedSubjects: ["Corpo e aparência", "Autoestima e bem-estar", "Beleza, moda e estética"],
    },
    token2
  );
  ok(assuntoDemais.status === 400, "mais de 2 assuntos percebidos é rejeitado");

  const assuntoInvalido = await call(
    "POST",
    "/api/recommendations",
    { ...baseBody, network: "Instagram", perceivedSubjects: ["assunto-que-não-existe"] },
    token2
  );
  ok(assuntoInvalido.status === 400, "assunto percebido fora da lista é rejeitado");

  const sentimentoInvalido = await call(
    "POST",
    "/api/recommendations",
    {
      ...baseBody,
      network: "Instagram",
      perceivedSubjects: ["Corpo e aparência"],
      feelings: ["sentimento-que-não-existe"],
    },
    token2
  );
  ok(sentimentoInvalido.status === 400, "sentimento fora da lista é rejeitado");

  const comFacebookSemSentimento = await call(
    "POST",
    "/api/recommendations",
    { ...baseBody, network: "Facebook", perceivedSubjects: ["Corpo e aparência"] },
    token2
  );
  ok(
    comFacebookSemSentimento.status === 201 &&
      comFacebookSemSentimento.data.recommendation.network === "Facebook" &&
      Array.isArray(comFacebookSemSentimento.data.recommendation.feelings) &&
      comFacebookSemSentimento.data.recommendation.feelings.length === 0,
    "rede ampliada (Facebook) é aceita, e \"como se sentiu\" é opcional (vazio por padrão)"
  );

  const comOutraENome = await call(
    "POST",
    "/api/recommendations",
    {
      ...baseBody,
      link: "https://www.pinterest.com/pin/campos-novos",
      network: "Outra",
      networkOther: "Pinterest",
      perceivedSubjects: ["Autoestima e bem-estar", "Beleza, moda e estética"],
      feelings: ["Incomodada", "Comparada"],
    },
    token2
  );
  ok(
    comOutraENome.status === 201 &&
      comOutraENome.data.recommendation.networkOther === "Pinterest" &&
      comOutraENome.data.recommendation.perceivedSubjects.length === 2 &&
      comOutraENome.data.recommendation.feelings.includes("Incomodada"),
    "rede \"Outra\" com nome, 2 assuntos percebidos e sentimentos são salvos corretamente"
  );

  // -------- Sem limite de envios (pedido da Julia, nov/2026) --------
  // Antes havia um teto de 3 recomendações por participante (Seção 3.3.1
  // da Monografia 1); a Julia decidiu remover esse limite. Usa uma
  // participante própria (token3) pra não mexer na contagem de 3 itens
  // usada pelos testes do painel/relatório público acima.
  console.log("Sem limite de envios");

  const { token: token3 } = (await call("POST", "/api/participants/register", {
    email: `participante-semlimite-${Date.now()}@example.com`,
    password: "senha123",
  })).data;
  await call("POST", "/api/participants/accept-tcle", undefined, token3);

  let semLimiteOk = true;
  for (let i = 1; i <= 4; i++) {
    const res = await call(
      "POST",
      "/api/recommendations",
      {
        link: `https://www.instagram.com/reel/sem-limite-${i}`,
        network: "Instagram",
        reason: `motivo ${i}`,
        perceivedSubjects: ["Corpo e aparência"],
      },
      token3
    );
    if (res.status !== 201) semLimiteOk = false;
  }
  ok(semLimiteOk, "4 envios seguidos (mais do que o antigo limite de 3) são todos aceitos");

  const statusSemLimite = await call("GET", "/api/recommendations", undefined, token3);
  ok(
    statusSemLimite.status === 200 &&
      statusSemLimite.data.total === 4 &&
      statusSemLimite.data.max === undefined,
    "status dos envios mostra o total (4), sem campo de máximo"
  );

  console.log(`\n${passed} ok, ${failed} falha(s).`);
  if (failed > 0) {
    process.exitCode = 1;
  } else {
    console.log("OK: testes funcionais de aceitação (Sprints 1-5) passaram.");
  }
})().catch((err) => {
  console.error("ERRO AO RODAR OS TESTES:", err);
  process.exitCode = 1;
});
