const { chromium } = require("playwright");

const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

const BASE = "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pesquisa123";

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(`Falhou: ${message}`);
}

async function apiChecks() {
  const semAuth = await call("POST", "/api/feedback", { message: "Sem login" });
  assert(semAuth.status === 401, "comentar sem login deve ser rejeitado (401)");

  const { data: participante } = await call("POST", "/api/participants/register", {
    email: `feedback-${Date.now()}@example.com`,
    password: "senha123",
  });

  const vazio = await call("POST", "/api/feedback", { message: "" }, participante.token);
  assert(vazio.status === 400, "comentário vazio deve ser rejeitado");

  const comNome = await call(
    "POST",
    "/api/feedback",
    { message: "Adorei o mapa, ficou bem mais claro agora!", displayName: "Fulana" },
    participante.token
  );
  assert(comNome.status === 201, "comentário válido com nome deve ser aceito");
  assert(comNome.data.feedback.displayName === "Fulana", "nome enviado deve ser preservado");

  const anonimo = await call(
    "POST",
    "/api/feedback",
    { message: "Essa parte do formulário poderia ser mais curta." },
    participante.token
  );
  assert(anonimo.status === 201, "comentário sem nome deve ser aceito");
  assert(anonimo.data.feedback.displayName === null, "sem nome enviado, displayName deve ser null");

  const publico = await call("GET", "/api/feedback/public");
  assert(publico.status === 200, "listagem pública deve responder 200");
  assert(publico.data.items.length === 2, "os 2 comentários enviados devem aparecer na listagem pública");
  const publicoRaw = JSON.stringify(publico.data);
  assert(!publicoRaw.includes(participante.email), "e-mail da participante não pode vazar na listagem pública");
  assert(!publicoRaw.includes(participante.token), "token não pode vazar na listagem pública");

  const semAuthAdmin = await call("GET", "/api/feedback");
  assert(semAuthAdmin.status === 401, "listagem completa deve exigir login da pesquisadora");

  const { data: adminLogin } = await call("POST", "/api/auth/login", { password: ADMIN_PASSWORD });
  const listaAdmin = await call("GET", "/api/feedback", null, adminLogin.token);
  assert(listaAdmin.data.items.length === 2, "painel da pesquisadora deve ver todos os comentários");
  assert(
    listaAdmin.data.items.every((item) => typeof item.code === "string" && /^P\d+$/.test(item.code)),
    "painel deve conseguir identificar o código interno de quem comentou (sem mostrar e-mail)"
  );

  const itemParaOcultar = comNome.data.feedback.id;
  const ocultar = await call(
    "POST",
    `/api/feedback/${itemParaOcultar}/hide`,
    { hidden: true },
    adminLogin.token
  );
  assert(ocultar.status === 200 && ocultar.data.hidden === true, "ocultar deve funcionar");

  const publicoDepois = await call("GET", "/api/feedback/public");
  assert(
    publicoDepois.data.items.length === 1,
    "comentário ocultado não deve mais aparecer na listagem pública"
  );

  const mostrar = await call(
    "POST",
    `/api/feedback/${itemParaOcultar}/hide`,
    { hidden: false },
    adminLogin.token
  );
  assert(mostrar.data.hidden === false, "mostrar de novo deve funcionar");

  console.log("ok - checagens de API do feedback (auth, privacidade, moderação) passaram");
}

async function uiCheck() {
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  await page.goto(`${BASE}/resultados.html`, { waitUntil: "networkidle" });

  await page.click("#btn-open-feedback");
  await page.waitForSelector("#feedback-modal:not([hidden])");
  await page.waitForSelector("#feedback-auth:not([hidden])");

  const email = `feedback-ui-${Date.now()}@example.com`;
  await page.fill("#feedback-register-email", email);
  await page.fill("#feedback-register-password", "senha123");
  await page.click("#feedback-register-form button[type=submit]");

  await page.waitForSelector("#feedback-compose:not([hidden])", { timeout: 10000 });
  await page.fill("#feedback-display-name", "Testadora UI");
  await page.fill("#feedback-message", "Comentário enviado pelo teste automatizado.");
  await page.click("#feedback-form button[type=submit]");

  await page.waitForSelector("#feedback-success:not([hidden])", { timeout: 10000 });
  const listText = await page.locator("#feedback-list").innerText();
  assert(listText.includes("Testadora UI"), "comentário enviado pela UI deve aparecer no mural");
  assert(listText.includes("Comentário enviado pelo teste automatizado."), "texto do comentário deve aparecer");

  await page.fill("#feedback-display-name", "Nome que não deveria ser enviado");
  await page.check("#feedback-anonymous");
  assert(
    await page.locator("#feedback-display-name").inputValue() === "",
    "marcar anônima deve limpar o campo nome"
  );
  assert(
    await page.locator("#feedback-display-name").isDisabled(),
    "marcar anônima deve bloquear o campo nome"
  );
  await page.fill("#feedback-message", "Comentário anônimo enviado pelo teste automatizado.");
  await page.click("#feedback-form button[type=submit]");
  await page.waitForSelector("#feedback-success:not([hidden])", { timeout: 10000 });
  const listTextAnon = await page.locator("#feedback-list").innerText();
  assert(
    listTextAnon.includes("Comentário anônimo enviado pelo teste automatizado."),
    "comentário anônimo deve aparecer no mural"
  );
  assert(
    !listTextAnon.includes("Nome que não deveria ser enviado"),
    "nome digitado antes de marcar anônima não pode ser enviado"
  );
  assert(listTextAnon.includes("Anônima"), "comentário marcado como anônimo deve aparecer como Anônima");
  assert(
    !(await page.locator("#feedback-display-name").isDisabled()),
    "campo nome deve voltar a ficar liberado após enviar"
  );

  await browser.close();
  console.log("ok - fluxo da UI (modal, cadastro inline, envio e mural) funcionou de ponta a ponta");
}

(async () => {
  await apiChecks();
  await uiCheck();
  console.log("OK: feedback e sugestões (modal público) funcionou de ponta a ponta.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
