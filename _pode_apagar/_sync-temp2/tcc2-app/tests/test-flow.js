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

  // Tela de perfil mínimo anônimo foi retirada (orientação do
  // professor) — aceitar o TCLE já gera e mostra o código direto.
  await page.waitForSelector("#screen-code:not([hidden])");
  const code = await page.locator("#anonymous-code").innerText();
  if (!/^P\d{3}$/.test(code)) throw new Error(`Código anônimo com formato inesperado: ${code}`);
  await page.screenshot({ path: "shot-2-code.png" });

  // Screen 2 -> 3: instructions
  await page.click("#btn-go-instructions");
  await page.waitForSelector("#screen-instructions:not([hidden])");
  await page.screenshot({ path: "shot-3-instructions.png" });

  // Screen 3 -> 4: envio de recomendação (Sprint 2)
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");

  await page.fill("#rec-link", "https://www.instagram.com/reel/teste123");
  await page.click('label.chip:has(input[name="rec-network"][value="Instagram"])');
  await page.click('label.chip:has(input[name="rec-format"][value="Reels"])');
  await page.fill("#rec-date", "2026-09-29");
  await page.fill("#rec-reason", "Aparece muito conteúdo sobre dieta");
  await page.screenshot({ path: "shot-4-submit.png" });
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

  // Screen 4 -> 5: status dos envios (via botão do modal)
  await page.click("#btn-modal-status");
  await page.waitForSelector("#submit-success-modal", { state: "hidden" });
  await page.waitForSelector("#screen-status:not([hidden])");
  await page.waitForSelector(".rec-item");
  const itemCount = await page.locator(".rec-item").count();
  if (itemCount !== 1) throw new Error(`Esperava 1 item na lista de envios, encontrei ${itemCount}`);
  const statusTitle = await page.locator("#status-title").innerText();
  if (!statusTitle.includes("1 de 3")) throw new Error(`Título de status inesperado: ${statusTitle}`);
  await page.screenshot({ path: "shot-5-status.png" });

  // Volta pra tela de envio e confirma que o link enviado aparece na lista
  const firstLink = await page.locator(".rec-link").first().getAttribute("href");
  if (firstLink !== "https://www.instagram.com/reel/teste123") {
    throw new Error(`Link salvo não corresponde ao enviado: ${firstLink}`);
  }

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
