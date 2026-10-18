const { chromium } = require("playwright");

const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pesquisa123";

(async () => {
  const browser = await chromium.launch(launchOptions);
  try {
    await runFlow(browser);
    console.log("OK: fluxo do questionário SUS (Sprint 4) funcionou de ponta a ponta.");
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

  // Responde o SUS como testadora, alternando respostas para gerar uma
  // pontuação diferente de 0/50/100 (mais parecido com um caso real).
  await page.goto("http://localhost:3000/sus.html", { waitUntil: "networkidle" });
  await page.fill("#tester-label", "Testadora Playwright");

  const answers = [4, 2, 5, 1, 4, 2, 5, 2, 4, 1]; // score esperado: ver cálculo abaixo
  for (let i = 0; i < answers.length; i++) {
    const itemNumber = i + 1;
    // Os inputs ficam visualmente ocultos (pointer-events: none) e o
    // clique real acontece no <label class="chip">, igual ao padrão já
    // usado nos outros testes (ver tests/test-admin-flow.js).
    await page.click(`label.chip:has(input[name="sus-item-${itemNumber}"][value="${answers[i]}"])`);
  }
  await page.screenshot({ path: "shot-sus-1-form.png" });

  await page.click("#sus-form button[type=submit]");
  await page.waitForSelector("#screen-sus-thanks:not([hidden])");
  await page.screenshot({ path: "shot-sus-2-thanks.png" });

  // Calcula a pontuação esperada localmente para conferir contra o painel.
  let total = 0;
  answers.forEach((value, idx) => {
    const itemNumber = idx + 1;
    total += itemNumber % 2 === 1 ? value - 1 : 5 - value;
  });
  const expectedScore = Math.round(total * 2.5 * 10) / 10;

  // Confere no painel da pesquisadora.
  await page.goto("http://localhost:3000/admin.html", { waitUntil: "networkidle" });
  await page.fill("#login-password", ADMIN_PASSWORD);
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector("#admin-screen-evaluator:not([hidden])");
  await page.click("#btn-evaluator-a");
  await page.waitForSelector("#admin-panel:not([hidden])");

  await page.click("#tab-usability");
  await page.waitForSelector("#admin-view-usability:not([hidden])");
  await page.waitForFunction(() => document.getElementById("sus-stat-count").textContent !== "—");
  await page.screenshot({ path: "shot-sus-3-admin.png" });

  const count = await page.locator("#sus-stat-count").innerText();
  if (count !== "1") throw new Error(`Esperava 1 resposta ao SUS, veio ${count}`);

  const score = await page.locator("#sus-stat-score").innerText();
  if (Number(score) !== expectedScore) {
    throw new Error(`Pontuação SUS esperada ${expectedScore}, veio ${score}`);
  }

  const rowCount = await page.locator("#sus-responses-tbody tr").count();
  if (rowCount !== 1) throw new Error(`Esperava 1 linha na tabela de respostas, encontrei ${rowCount}`);
  const label = await page.locator("#sus-responses-tbody tr td").first().innerText();
  if (label !== "Testadora Playwright") {
    throw new Error(`Identificação da sessão não apareceu corretamente: "${label}"`);
  }

  if (errors.length) {
    throw new Error("Erros de página encontrados: " + errors.join(" | "));
  }
}
