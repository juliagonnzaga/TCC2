const { chromium } = require("playwright");

const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

/**
 * TCC2 - Teste do botão "← Voltar" (pedido da Julia depois da Sprint 4)
 *
 * Atualizado na Sprint 5: a tela de "código anônimo" não existe mais
 * (substituída por cadastro/login com e-mail e senha).
 *
 * Atualizado de novo (Sprint 5, revisado): login/cadastro e TCLE viraram
 * telas separadas. O fluxo de telas agora é:
 * login -> tcle -> instructions -> submit -> status.
 *
 * Cobre:
 *  1. Cada tela (tcle, instruções, envio, status) tem um link "← Voltar"
 *     que leva para a tela anterior do fluxo.
 *  2. Ao voltar até a tela de TCLE já tendo aceitado nesta conta, aparece
 *     o aviso "Você já aceitou o TCLE" em vez do formulário de novo — e
 *     "Continuar" leva direto para as instruções.
 *  3. Ao voltar até a tela de login já estando logada nesta sessão,
 *     aparece o aviso "Você já está conectada" em vez dos formulários de
 *     cadastro/login de novo — e "Continuar" leva direto para onde a
 *     conta deveria estar (instruções, já que o TCLE já foi aceito).
 */

(async () => {
  const browser = await chromium.launch(launchOptions);
  try {
    await runFlow(browser);
    console.log("OK: navegação com \"← Voltar\" funcionou em todas as telas, sem precisar logar ou aceitar o TCLE de novo.");
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

  // ---- Tela 1 (login): cria a conta ----
  const email = `testadora-voltar-${Date.now()}@example.com`;
  await page.fill("#register-email", email);
  await page.fill("#register-password", "senha123");
  await page.click('#register-form button[type=submit]');

  // ---- Tela 2 (TCLE): aceita ----
  await page.waitForSelector("#screen-tcle:not([hidden])");
  await page.check("#tcle-checkbox");
  await page.click("#btn-accept-tcle");
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // ---- Tela 3 (instruções) -> Voltar -> deve cair na tela de TCLE, já
  // no modo "Você já aceitou o TCLE" (sem o formulário de novo) ----
  await page.click("#screen-instructions .btn-back-link");
  await page.waitForSelector("#screen-tcle:not([hidden])");
  const tcleAlreadyDoneVisible = await page.locator("#tcle-already-done").isVisible();
  const tcleFormHidden = await page.locator("#tcle-form").isHidden();
  if (!tcleAlreadyDoneVisible || !tcleFormHidden) {
    throw new Error("Ao voltar já tendo aceitado o TCLE, deveria mostrar o aviso 'já aceitou', não o formulário de novo.");
  }
  await page.screenshot({ path: "shot-back-1-tcle-already-done.png" });

  // "Continuar" na tela de TCLE deve levar direto pra instruções.
  await page.click("#btn-tcle-continue");
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // ---- Tela 3 (instruções) -> Voltar -> Tela 2 (TCLE) -> Voltar -> deve
  // cair na tela de login, já no modo "Você já está conectada" ----
  await page.click("#screen-instructions .btn-back-link");
  await page.waitForSelector("#screen-tcle:not([hidden])");
  await page.click("#screen-tcle .btn-back-link");
  await page.waitForSelector("#screen-login:not([hidden])");
  const loginAlreadyDoneVisible = await page.locator("#login-already-done").isVisible();
  const registerFormHidden = await page.locator("#register-form").isHidden();
  const loginFormHidden = await page.locator("#login-form").isHidden();
  if (!loginAlreadyDoneVisible || !registerFormHidden || !loginFormHidden) {
    throw new Error("Ao voltar já logada, deveria mostrar o aviso 'já está conectada', não os formulários de cadastro/login.");
  }
  await page.screenshot({ path: "shot-back-2-login-already-done.png" });

  // "Continuar" na tela de login deve levar direto pra instruções, sem
  // logar de novo nem mostrar o TCLE outra vez (a conta já aceitou).
  await page.click("#btn-login-continue");
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // ---- Avança até envio ----
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");

  // Tela 4 (envio) -> Voltar -> deve cair em instruções.
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

  // Tela 5 (status) -> Voltar -> deve cair em envio.
  await page.click("#screen-status .btn-back-link");
  await page.waitForSelector("#screen-submit:not([hidden])");
  await page.screenshot({ path: "shot-back-3-submit.png" });

  if (errors.length) {
    throw new Error("Erros de página encontrados: " + errors.join(" | "));
  }
}
