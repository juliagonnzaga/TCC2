/**
 * TCC2 - Testes funcionais de aceitação (Sprint 4)
 *
 * Cobre os critérios de aceitação das User Stories das Sprints 1 a 4,
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
  // -------- Sprint 1: TCLE + código anônimo --------
  console.log("Sprint 1 — TCLE e código anônimo");

  const consent = await call("POST", "/api/consent");
  ok(consent.status === 201 && !!consent.data.consentId, "aceite do TCLE registra e devolve consentId");

  const profileNoConsent = await call("POST", "/api/profile", {});
  ok(profileNoConsent.status === 400, "gerar código sem consentId é rejeitado");

  const profileBadConsent = await call("POST", "/api/profile", { consentId: "não-existe" });
  ok(profileBadConsent.status === 400, "gerar código com consentId inexistente é rejeitado");

  // Tela de perfil retirada (orientação do professor): o código deve sair
  // só com o consentId, sem ageRange/network.
  const profile = await call("POST", "/api/profile", { consentId: consent.data.consentId });
  ok(profile.status === 201 && /^P\d{3}$/.test(profile.data.code), "código anônimo é gerado só com o consentId (sem perfil demográfico)");
  const code = profile.data.code;

  const profileBadAgeRange = await call("POST", "/api/profile", {
    consentId: consent.data.consentId,
    ageRange: "idade-invalida",
  });
  ok(profileBadAgeRange.status === 400, "ageRange, se enviado, continua validado (endpoint não foi removido, só ficou opcional)");

  // -------- Sprint 2: envio de recomendações --------
  console.log("Sprint 2 — envio de recomendações");

  const missingFields = await call("POST", "/api/recommendations", { code });
  ok(missingFields.status === 400, "envio sem campos obrigatórios é rejeitado");

  const badLink = await call("POST", "/api/recommendations", {
    code,
    link: "não é um link",
    network: "Instagram",
    format: "Reels",
    appearedAt: "2026-10-10",
    reason: "teste",
  });
  ok(badLink.status === 400, "link inválido é rejeitado");

  const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const badDate = await call("POST", "/api/recommendations", {
    code,
    link: "https://www.instagram.com/reel/x",
    network: "Instagram",
    format: "Reels",
    appearedAt: futureDate,
    reason: "teste",
  });
  ok(badDate.status === 400, "data no futuro é rejeitada (defeito corrigido na Sprint 4)");

  const unknownCode = await call("POST", "/api/recommendations", {
    code: "P000",
    link: "https://www.instagram.com/reel/x",
    network: "Instagram",
    format: "Reels",
    appearedAt: "2026-10-10",
    reason: "teste",
  });
  ok(unknownCode.status === 400, "código anônimo inexistente é rejeitado");

  let lastRemaining = null;
  let firstRecommendationId = null;
  for (let i = 1; i <= 3; i++) {
    const res = await call("POST", "/api/recommendations", {
      code,
      link: `https://www.instagram.com/reel/teste-${i}`,
      network: "Instagram",
      format: "Reels",
      appearedAt: "2026-10-10",
      reason: `motivo ${i}`,
    });
    ok(res.status === 201, `envio ${i}/3 é aceito`);
    if (i === 1) firstRecommendationId = res.data.recommendation.id;
    lastRemaining = res.data.remaining;
  }
  ok(lastRemaining === 0, "após 3 envios, não resta nenhum (remaining === 0)");

  const fourth = await call("POST", "/api/recommendations", {
    code,
    link: "https://www.instagram.com/reel/teste-4",
    network: "Instagram",
    format: "Reels",
    appearedAt: "2026-10-10",
    reason: "motivo 4",
  });
  ok(fourth.status === 409, "4º envio é bloqueado pelo limite de 3 por participante");

  const status = await call("GET", `/api/recommendations/${code}`);
  ok(status.status === 200 && status.data.total === 3 && status.data.max === 3, "status dos envios mostra 3 de 3");

  // -------- Sprint 3: painel da pesquisadora --------
  console.log("Sprint 3 — painel da pesquisadora");

  const wrongLogin = await call("POST", "/api/auth/login", { password: "senha-errada" });
  ok(wrongLogin.status === 401, "login com senha errada é rejeitado");

  const login = await call("POST", "/api/auth/login", { password: ADMIN_PASSWORD });
  ok(login.status === 200 && !!login.data.token, "login com senha correta devolve token");
  const token = login.data.token;

  const queueNoAuth = await call("GET", "/api/queue");
  ok(queueNoAuth.status === 401, "fila sem token é bloqueada");

  const queue = await call("GET", "/api/queue", undefined, token);
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
    token
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
    token
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
    token
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
    token
  );
  ok(catBAgree.status === 201 && catBAgree.data.status === "categorizado", "quando A e B concordam, status fica categorizado");

  const agreementAfterAgree = await call("GET", "/api/agreement", undefined, token);
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
    token
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
    token
  );
  ok(catBDisagree.status === 201 && catBDisagree.data.status === "em dúvida", "quando A e B discordam, status fica em dúvida");

  const agreementAfterDisagree = await call("GET", "/api/agreement", undefined, token);
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

  const susResults = await call("GET", "/api/sus", undefined, token);
  ok(
    susResults.status === 200 && susResults.data.count === 2 && susResults.data.averageScore === 75,
    "resultados do SUS agregam as respostas (2 respostas, média 75)"
  );

  console.log(`\n${passed} ok, ${failed} falha(s).`);
  if (failed > 0) {
    process.exitCode = 1;
  } else {
    console.log("OK: testes funcionais de aceitação (Sprints 1-4) passaram.");
  }
})().catch((err) => {
  console.error("ERRO AO RODAR OS TESTES:", err);
  process.exitCode = 1;
});
