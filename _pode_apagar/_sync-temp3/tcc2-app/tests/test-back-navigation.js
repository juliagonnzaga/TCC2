const { chromium } = require("playwright");

const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

/**
 * TCC2 - Teste do botão "← Voltar" (pedido da Julia depois da Sprint 4)
 *
 * Atualizado na Sprint 5: a tela de "código anônimo" não existe mais
 * (substituída por cadastro/login com e-mail e senha), então o fluxo de
 * telas passou a ser welcome -> instructions -> submit -> status.
 *
 * Cobre:
 *  1. Cada tela (instruções, envio, status) tem um link "← Voltar" que
 *     leva para a tela anterior do fluxo.
 *  2. Ao voltar até a tela de boas-vindas depois de já estar logada
 *     nesta sessão, aparece o aviso "Você já está conectada" em vez dos
 *     formulários de cadastro/login de novo — e "Continuar" leva direto
 *     para as instruções, sem precisar logar de novo nem criar outra
 *     conta.
 */

(async () => {
  const browser = await chromium.launch(launchOptions);
  try {
    await runFlow(browser);
    console.log("OK: navegação com \"← Voltar\" funcionou em todas as telas, sem precisar logar de novo.");
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

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

  // ---- Tela 1: aceita o TCLE e cria a conta ----
  const email = `testadora-voltar-${Date.now()}@example.com`;
  await page.check("#tcle-checkbox");
  await page.fill("#register-email", email);
  await page.fill("#register-password", "senha123");
  await page.click("#btn-accept-tcle");
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // ---- Tela 2 (instruções) -> Voltar -> deve cair na tela de
  // boas-vindas, já no modo "Você já está conectada" (sem formulários) ----
  await page.click("#screen-instructions .btn-back-link");
  await page.waitForSelector("#screen-welcome:not([hidden])");
  const alreadyDoneVisible = await page.locator("#welcome-already-done").isVisible();
  const registerFormHidden = await page.locator("#register-form").isHidden();
  const loginFormHidden = await page.locator("#login-form").isHidden();
  if (!alreadyDoneVisible || !registerFormHidden || !loginFormHidden) {
    throw new Error("Ao voltar já logada, deveria mostrar o aviso 'já está conectada', não os formulários de cadastro/login.");
  }
  await page.screenshot({ path: "shot-back-1-welcome-already-done.png" });

  // "Continuar" deve levar direto pra instruções, sem logar de novo.
  await page.click("#btn-welcome-continue");
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // ---- Avança até envio ----
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");

  // Tela 3 (envio) -> Voltar -> deve cair em instruções.
  await page.click("#screen-submit .btn-back-link");
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // Segue de novo até envio e envia uma recomendação para poder ver status.
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");
  await page.fill("#rec-link", "https://www.instagram.com/reel/teste-voltar");
  await page.click('label.chip:has(input[name="rec-network"][value="Instagram"])');
  await page.click('label.chip:has(input[name="rec-format"][value="Reels"])');
  await page.fill("#rec-date", "2026-10-10");
  await page.fill("#rec-reason", "teste do botão voltar");
  await page.click("#submit-form button[type=submit]");
  // Com o modal de confirmação de envio, vai pro status pelo botão do modal.
  await page.waitForSelector("#submit-success-modal:not([hidden])");
  await page.click("#btn-modal-status");
  await page.waitForSelector("#screen-status:not([hidden])");

  // Tela 4 (status) -> Voltar -> deve cair em envio.
  await page.click("#screen-status .btn-back-link");
  await page.waitForSelector("#screen-submit:not([hidden])");
  await page.screenshot({ path: "shot-back-2-submit.png" });

  if (errors.length) {
    throw new Error("Erros de página encontrados: " + errors.join(" | "));
  }
}
