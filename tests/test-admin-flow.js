const { chromium } = require("playwright");

const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

<<<<<<< HEAD
async function apiSetup() {
  const base = "http://localhost:3000";
  const post = async (path, body) => {
    const res = await fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
=======
// Mesmo valor que o server.js usa por padrão (ver ADMIN_PASSWORD em
// server.js) — usado tanto pro login normal quanto pra restaurar a
// senha do painel depois do teste de "esqueci minha senha" abaixo.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pesquisa123";

async function apiSetup() {
  const base = "http://localhost:3000";
  const post = async (path, body, token) => {
    const res = await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
>>>>>>> Sprint1
      body: JSON.stringify(body || {}),
    });
    return res.json();
  };
<<<<<<< HEAD
  const { consentId } = await post("/api/consent");
  const { code } = await post("/api/profile", {
    consentId,
    ageRange: "18-24",
    network: "Instagram",
  });
  await post("/api/recommendations", {
    code,
    link: "https://www.instagram.com/reel/paraadmin",
    network: "Instagram",
    format: "Reels",
    appearedAt: "2026-09-29",
    reason: "Aparece muito treino puxado",
  });
  return code;
=======
  // Sprint 5: participante agora se cadastra com e-mail/senha (em vez de
  // TCLE + código anônimo) para poder enviar recomendações.
  //
  // Sprint 5, revisado: o aceite do TCLE virou uma chamada própria,
  // separada do cadastro — sem ela, o envio de recomendação é bloqueado
  // (403), então precisa ser chamada aqui antes do POST de recomendação.
  const { token } = await post("/api/participants/register", {
    email: `participante-admin-${Date.now()}@example.com`,
    password: "senha123",
  });
  await post("/api/participants/accept-tcle", {}, token);
  await post(
    "/api/recommendations",
    {
      link: "https://www.instagram.com/reel/paraadmin",
      network: "Instagram",
      format: "Reels",
      appearedAt: "2026-09-29",
      reason: "Aparece muito treino puxado",
    },
    token
  );
>>>>>>> Sprint1
}

(async () => {
  await apiSetup();

  const browser = await chromium.launch(launchOptions);
  try {
    await runFlow(browser);
    console.log("OK: fluxo do painel da pesquisadora (Sprint 3) funcionou de ponta a ponta.");
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("FALHA NO TESTE:", err);
  process.exitCode = 1;
});

async function runFlow(browser) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("http://localhost:3000/admin.html", { waitUntil: "networkidle" });

  // Login com senha errada
  await page.fill("#login-password", "senha-errada");
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector("#login-error:not([hidden])");

<<<<<<< HEAD
  // Login correto
  await page.fill("#login-password", "pesquisa123");
=======
  // "Esqueci minha senha" (pedido da Julia): redefine a senha
  // compartilhada do painel, confirma o modal de feedback e confirma
  // que a senha nova já funciona pra entrar. Depois restaura a senha
  // original direto pela API (sem UI), pra não atrapalhar os outros
  // arquivos de teste, que esperam a senha padrão de sempre.
  await page.click("#btn-admin-forgot-password");
  await page.waitForSelector("#admin-screen-reset-password:not([hidden])");
  await page.fill("#admin-reset-new-password", "senhaNovaDoPainel456");
  await page.fill("#admin-reset-confirm-password", "senhaNovaDoPainel456");
  await page.click('#admin-reset-password-form button[type=submit]');
  await page.waitForSelector("#admin-reset-password-success-modal:not([hidden])");
  await page.click("#btn-admin-reset-modal-login");
  await page.waitForSelector("#admin-reset-password-success-modal", { state: "hidden" });
  await page.waitForSelector("#admin-screen-login:not([hidden])");

  await page.fill("#login-password", "senhaNovaDoPainel456");
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector("#admin-screen-evaluator:not([hidden])");

  const restoreRes = await fetch("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword: ADMIN_PASSWORD }),
  });
  if (!restoreRes.ok) {
    throw new Error("Não foi possível restaurar a senha original do painel depois do teste de \"esqueci minha senha\".");
  }

  // A redefinição acima derruba todas as sessões (inclusive a que acabamos
  // de abrir). Volta pra tela de login chamando a própria função do
  // admin.js (em vez de recarregar a página): o Chromium usado aqui
  // restaura o estado anterior das telas num reload/goto — o que não é
  // bug do sistema, é só uma particularidade deste navegador automatizado
  // — então um reload deixaria a tela de "escolha de avaliadora" visível
  // por engano, mesmo com a sessão já invalidada.
  await page.evaluate(() => showAdminScreen("login"));
  await page.waitForSelector("#admin-screen-login:not([hidden])");

  // Login correto
  await page.fill("#login-password", ADMIN_PASSWORD);
>>>>>>> Sprint1
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector("#admin-screen-evaluator:not([hidden])");
  await page.screenshot({ path: "shot-admin-1-evaluator.png" });

  // Escolhe avaliadora A
  await page.click("#btn-evaluator-a");
  await page.waitForSelector("#admin-panel:not([hidden])");
  await page.waitForSelector("#queue-tbody tr");
  await page.screenshot({ path: "shot-admin-2-queue.png" });

  const rowCount = await page.locator("#queue-tbody tr").count();
  if (rowCount !== 1) throw new Error(`Esperava 1 item na fila, encontrei ${rowCount}`);

  // Abre categorização
  await page.click('[data-open]');
  await page.waitForSelector("#admin-view-categorize:not([hidden])");
  await page.screenshot({ path: "shot-admin-3-categorize.png" });

  // Seleciona 2 categorias (1 de cada dimensão) e demais campos
  await page.click('label.chip:has-text("Corpo fitness/definido")');
  await page.click('label.chip:has-text("Autoaceitação")');
  await page.selectOption("#cat-tone", "inspiracional");
  await page.click('label.chip:has(input[name="cat-commercial"][value="não"])');
  await page.click('label.chip:has(input[name="cat-editing"][value="incerto"])');

  // Confirma que uma 3ª categoria fica desabilitada (máximo 2)
  const thirdChip = page.locator('input[name="cat-category"]:not(:checked)').first();
  const isDisabled = await thirdChip.isDisabled();
  if (!isDisabled) throw new Error("Esperava que categorias extras ficassem desabilitadas após escolher 2");

  await page.click('#categorize-form button[type=submit]');
  await page.waitForSelector("#admin-view-queue:not([hidden])");
  await page.waitForSelector(".status-badge");
  const status = await page.locator(".status-badge").first().innerText();
  if (status.trim().toLowerCase() !== "parcial") throw new Error(`Esperava status "parcial" após 1 avaliadora, veio "${status}"`);
  await page.screenshot({ path: "shot-admin-4-queue-after.png" });

  // Vai para Indicadores
  await page.click("#tab-indicators");
  await page.waitForSelector("#admin-view-indicators:not([hidden])");
  await page.waitForFunction(() => document.getElementById("stat-collected").textContent !== "—");
  await page.screenshot({ path: "shot-admin-5-indicators.png" });

  const collected = await page.locator("#stat-collected").innerText();
  if (collected !== "1") throw new Error(`Esperava 1 item coletado, veio ${collected}`);

  if (errors.length) {
    throw new Error("Erros de página encontrados: " + errors.join(" | "));
  }
}
