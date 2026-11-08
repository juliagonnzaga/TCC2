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

  // Screen 1: TCLE + cadastro (Sprint 5 — substituiu o código anônimo
  // por uma conta de verdade, e-mail + senha).
  const acceptBtn = page.locator("#btn-accept-tcle");
  if (!(await acceptBtn.isDisabled())) throw new Error("Aceitar deveria começar desabilitado");
  await page.check("#tcle-checkbox");
  if (await acceptBtn.isDisabled()) throw new Error("Aceitar deveria habilitar após marcar checkbox");

  const email = `testadora-${Date.now()}@example.com`;
  await page.fill("#register-email", email);
  await page.fill("#register-password", "senha123");
  await acceptBtn.click();

  await page.waitForSelector("#screen-instructions:not([hidden])");
  await page.screenshot({ path: "shot-2-instructions.png" });

  // Screen 2 -> 3: envio de recomendação (Sprint 2)
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");

  await page.fill("#rec-link", "https://www.instagram.com/reel/teste123");
  await page.click('label.chip:has(input[name="rec-network"][value="Instagram"])');
  await page.click('label.chip:has(input[name="rec-format"][value="Reels"])');
  await page.fill("#rec-date", "2026-09-29");
  await page.fill("#rec-reason", "Aparece muito conteúdo sobre dieta");
  await page.screenshot({ path: "shot-3-submit.png" });
  await page.click('#submit-form button[type=submit]');

  // Modal de confirmação de envio (feedback após enviar)
  await page.waitForSelector("#submit-success-modal:not([hidden])");
  const modalMessage = await page.locator("#submit-success-message").innerText();
  if (!modalMessage.includes("mais 2")) {
    throw new Error(`Mensagem do modal de confirmação inesperada: "${modalMessage}"`);
  }
  if (await page.locator("#btn-modal-new").isHidden()) {
    throw new Error("Botão 'Enviar nova recomendação' deveria aparecer no modal (ainda restam envios)");
  }

  // Screen 3 -> 4: status dos envios (via botão do modal)
  await page.click("#btn-modal-status");
  await page.waitForSelector("#submit-success-modal", { state: "hidden" });
  await page.waitForSelector("#screen-status:not([hidden])");
  await page.waitForSelector(".rec-item");
  const itemCount = await page.locator(".rec-item").count();
  if (itemCount !== 1) throw new Error(`Esperava 1 item na lista de envios, encontrei ${itemCount}`);
  const statusTitle = await page.locator("#status-title").innerText();
  if (!statusTitle.includes("1 de 3")) throw new Error(`Título de status inesperado: ${statusTitle}`);
  await page.screenshot({ path: "shot-4-status.png" });

  // Confirma que o link enviado aparece na lista
  const firstLink = await page.locator(".rec-link").first().getAttribute("href");
  if (firstLink !== "https://www.instagram.com/reel/teste123") {
    throw new Error(`Link salvo não corresponde ao enviado: ${firstLink}`);
  }

  // Reload to confirm session resume (localStorage) lands back on instructions
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // "Sair da conta" deve limpar a sessão e voltar pra tela de boas-vindas
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");
  await page.click("#btn-view-status");
  await page.waitForSelector("#screen-status:not([hidden])");
  await page.click("#btn-logout");
  await page.waitForSelector("#screen-welcome:not([hidden])");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#screen-welcome:not([hidden])");

  // Login com a conta criada deve funcionar e levar direto às instruções
  await page.click("#btn-show-login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha123");
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector("#screen-instructions:not([hidden])");

  if (errors.length) {
    console.error("Erros de console/página encontrados:", errors);
    process.exitCode = 1;
  } else {
    console.log("OK: fluxo completo de cadastro/login + envio (Sprints 1-5) funcionou de ponta a ponta. E-mail usado:", email);
  }

  await browser.close();
})().catch((err) => {
  console.error("FALHA NO TESTE:", err);
  process.exitCode = 1;
});
