const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const DATA_DIR = path.join(__dirname, "..", "data");

let passed = 0;
let failed = 0;

function ok(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ok - ${label}`);
  } else {
    failed += 1;
    console.error(`  FALHA - ${label}`);
  }
}

async function post(apiPath, body, token) {
  const res = await fetch(BASE + apiPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, body: await res.json() };
}

async function get(apiPath, token) {
  const res = await fetch(BASE + apiPath, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

function readDataFile(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

async function registerAndSubmit({ email, password, state, city, link }) {
  const register = await post("/api/participants/register", { email, password });
  const token = register.body.token;
  await post("/api/participants/accept-tcle", {}, token);
  await post(
    "/api/recommendations",
    {
      link,
      ageBand: "25 a 34 anos",
      state,
      city,
      whyReasons: ["Incentiva dieta ou emagrecimento"],
      recurrence: "Vejo com frequência",
      desiredContent: ["Diversidade de corpos"],
      comment: "comentário de teste, nunca deve aparecer em dados públicos",
    },
    token
  );
  return { email, password, token };
}

(async () => {
  console.log("Privacidade e anonimização — evidência dos dados armazenados e expostos");

  const adminLogin = await post("/api/auth/login", { password: process.env.ADMIN_PASSWORD || "pesquisa123" });
  const adminToken = adminLogin.body.token;

  console.log("\nSenhas em repouso (data/participants.json)");
  const email1 = `privacidade-${Date.now()}-1@example.com`;
  const password1 = "senhaBemSecreta1";
  const participant1 = await registerAndSubmit({
    email: email1,
    password: password1,
    state: "AC",
    city: "Rio Branco",
    link: "https://www.instagram.com/reel/privacidade1",
  });

  const storedParticipants = readDataFile("participants.json");
  const storedRecord = storedParticipants.find((p) => p.email === email1);

  ok(!!storedRecord, "a participante criada está no arquivo de dados");
  ok(
    typeof storedRecord.passwordHash === "string" && !storedRecord.passwordHash.includes(password1),
    "a senha em texto puro não aparece em nenhum lugar do registro salvo"
  );
  ok(
    /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(storedRecord.passwordHash || ""),
    "a senha é salva como salt:hash (scrypt), nunca em texto puro"
  );
  ok(
    !Object.prototype.hasOwnProperty.call(storedRecord, "password"),
    "não existe nenhum campo 'password' (só 'passwordHash') no registro salvo"
  );

  console.log(`  evidência: participants.json guarda passwordHash = "${storedRecord.passwordHash.slice(0, 12)}...${storedRecord.passwordHash.slice(-8)}" (nunca "${password1}")`);

  console.log("\nCegueira das avaliadoras: o e-mail nunca chega ao painel da pesquisadora");
  const queue = await get("/api/queue", adminToken);
  const queueText = JSON.stringify(queue.body);

  ok(!queueText.includes(email1), "o e-mail da participante não aparece na fila do painel da pesquisadora");
  ok(
    queue.body.items.every((item) => !Object.prototype.hasOwnProperty.call(item, "email")),
    "nenhum item da fila tem o campo 'email' — só o código interno ('code')"
  );
  ok(
    queue.body.items.every((item) => typeof item.code === "string" && /^P\d+$/.test(item.code)),
    "cada item da fila é identificado só pelo código interno (ex.: P123)"
  );

  console.log("\nProteção por número mínimo de participantes (anonimato por agregação, k-anonimato simplificado)");
  const reportBeforeThreshold = await get("/api/public/report");
  ok(
    reportBeforeThreshold.body.porEstado.AC.liberado === false,
    "com só 1 participante no Acre, o recorte por estado fica oculto ('poucos dados')"
  );
  ok(
    Object.keys(reportBeforeThreshold.body.porEstado.AC).length === 1,
    "o recorte oculto não carrega nenhum dado além de 'liberado: false' (nada de contagens parciais)"
  );

  const email2 = `privacidade-${Date.now()}-2@example.com`;
  await registerAndSubmit({
    email: email2,
    password: "outraSenhaSecreta2",
    state: "AC",
    city: "Rio Branco",
    link: "https://www.tiktok.com/@alguem/video/privacidade2",
  });

  const reportStillBelow = await get("/api/public/report");
  ok(
    reportStillBelow.body.porEstado.AC.liberado === false,
    `com só ${reportStillBelow.body.porEstado.AC.liberado === false ? 2 : "?"} participantes (mínimo é ${reportStillBelow.body.minimoParticipantes}), o recorte do Acre continua oculto`
  );

  const email3 = `privacidade-${Date.now()}-3@example.com`;
  await registerAndSubmit({
    email: email3,
    password: "maisUmaSenhaSecreta3",
    state: "AC",
    city: "Rio Branco",
    link: "https://www.youtube.com/shorts/privacidade3",
  });

  const reportAfterThreshold = await get("/api/public/report");
  const acre = reportAfterThreshold.body.porEstado.AC;
  ok(acre.liberado === true, `ao atingir ${reportAfterThreshold.body.minimoParticipantes} participantes distintas, o recorte do Acre passa a ser exibido`);
  ok(acre.participantes === 3, "o recorte liberado mostra a contagem de participantes, mas agregada (3), nunca uma lista de quem são");

  console.log(`  evidência: porEstado.AC antes = {"liberado":false}; depois de 3 participantes = ${JSON.stringify(acre).slice(0, 120)}...`);

  console.log("\nO relatório público nunca expõe dado identificável por registro");
  const fullReportText = JSON.stringify(reportAfterThreshold.body);
  ok(!fullReportText.includes(email1) && !fullReportText.includes(email2) && !fullReportText.includes(email3), "nenhum e-mail aparece em qualquer lugar do relatório público");
  ok(!fullReportText.includes("privacidade1") && !fullReportText.includes("privacidade2") && !fullReportText.includes("privacidade3"), "nenhum link individual aparece no relatório público");
  ok(!fullReportText.includes("comentário de teste"), "nenhum comentário individual aparece no relatório público");
  ok(!fullReportText.includes(participant1.token), "nenhum token de sessão aparece no relatório público");

  console.log("\nMural de comentários: identificação por e-mail é deliberada e documentada (coleta confidencial, não anônima — igual ao padrão do YouTube), diferente do relatório público acima");
  const feedbackSubmit = await post("/api/feedback", { message: "Plataforma fácil de usar, parabéns!" }, participant1.token);
  ok(feedbackSubmit.status === 201 && feedbackSubmit.body.feedback.email === email1, "ao comentar, o e-mail da própria autora é devolvido (mostrado só a ela e no mural, nunca às avaliadoras)");
  const feedbackPublic = await get("/api/feedback/public");
  ok(!JSON.stringify(feedbackPublic.body).includes(password1), "mesmo no mural, a senha nunca é exposta, só o e-mail");

  console.log(`\n${passed} ok, ${failed} falha(s).`);
  if (failed > 0) {
    throw new Error(`${failed} verificação(ões) de privacidade/anonimização falharam.`);
  }
  console.log("OK: evidências de privacidade e anonimização (senha com hash, cegueira das avaliadoras, proteção por mínimo de participantes, relatório público sem dado identificável) confirmadas.");
})().catch((err) => {
  console.error("FALHA NO TESTE:", err);
  process.exitCode = 1;
});
