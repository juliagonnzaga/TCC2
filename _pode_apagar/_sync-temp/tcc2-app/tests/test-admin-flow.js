const { chromium } = require("playwright");

const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

async function apiSetup() {
  const base = "http://localhost:3000";
  const post = async (path, body) => {
    const res = await fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return res.json();
  };
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

  // Login correto
  await page.fill("#login-password", "pesquisa123");
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
