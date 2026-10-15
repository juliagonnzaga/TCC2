const { chromium } = require("playwright");

// Se o Chromium do Playwright já estiver instalado localmente
// (`npx playwright install chromium`), basta chromium.launch() sem
// executablePath. A variável de ambiente permite apontar para um
// Chromium específico quando necessário (ex.: ambientes sandboxed).
const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

(async () => {
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: "shot-1-welcome.png" });

  // Screen 1: TCLE
  const acceptBtn = page.locator("#btn-accept-tcle");
  if (!(await acceptBtn.isDisabled())) throw new Error("Aceitar deveria começar desabilitado");
  await page.check("#tcle-checkbox");
  if (await acceptBtn.isDisabled()) throw new Error("Aceitar deveria habilitar após marcar checkbox");
  await acceptBtn.click();
  await page.waitForSelector("#screen-profile:not([hidden])");
  await page.screenshot({ path: "shot-2-profile.png" });

  // Screen 2: profile
  await page.selectOption("#age-range", "18-24");
  await page.click('label.chip:has(input[value="Instagram"])');
  const instagramChecked = await page.isChecked('input[name="network"][value="Instagram"]');
  if (!instagramChecked) throw new Error("Clique no chip não marcou o rádio Instagram");
  await page.click('#profile-form button[type=submit]');
  await page.waitForSelector("#screen-code:not([hidden])");
  const code = await page.locator("#anonymous-code").innerText();
  if (!/^P\d{3}$/.test(code)) throw new Error(`Código anônimo com formato inesperado: ${code}`);
  await page.screenshot({ path: "shot-3-code.png" });

  // Screen 2b -> 3: instructions
  await page.click("#btn-go-instructions");
  await page.waitForSelector("#screen-instructions:not([hidden])");
  await page.screenshot({ path: "shot-4-instructions.png" });

  // Reload to confirm session resume (localStorage) lands back on instructions
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#screen-instructions:not([hidden])");

  if (errors.length) {
    console.error("Erros de console/página encontrados:", errors);
    process.exitCode = 1;
  } else {
    console.log("OK: fluxo completo da Sprint 1 funcionou de ponta a ponta. Código gerado:", code);
  }

  await browser.close();
})().catch((err) => {
  console.error("FALHA NO TESTE:", err);
  process.exitCode = 1;
});
