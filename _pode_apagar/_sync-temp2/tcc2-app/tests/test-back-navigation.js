const { chromium } = require("playwright");

const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

/**
 * TCC2 - Teste do botão "← Voltar" (pedido da Julia depois da Sprint 4)
 *
 * Cobre:
 *  1. Cada tela (código, instruções, envio, status) tem um link "← Voltar"
 *     que leva para a tela anterior do fluxo.
 *  2. Ao voltar até a tela de boas-vindas depois que o código anônimo já
 *     foi gerado, aparece o aviso "Você já concluiu essa etapa" em vez do
 *     checkbox/"Aceitar" de novo — e clicar em "Continuar" NÃO gera um
 *     segundo código (o código anônimo permanece o mesmo).
 */

(async () => {
  const browser = await chromium.launch(launchOptions);
  try {
    await runFlow(browser);
    console.log("OK: navegação com \"← Voltar\" funcionou em todas as telas, sem gerar código duplicado.");
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

  // ---- Tela 1: aceita o TCLE para gerar o código anônimo ----
  await page.check("#tcle-checkbox");
  await page.click("#btn-accept-tcle");
  await page.waitForSelector("#screen-code:not([hidden])");
  const code = await page.locator("#anonymous-code").innerText();
  if (!/^P\d{3}$/.test(code)) throw new Error(`Código anônimo inesperado: "${code}"`);

  // ---- Tela 2 (código) -> Voltar -> deve cair na tela de boas-vindas,
  // já no modo "Você já concluiu essa etapa" (sem checkbox/Aceitar) ----
  await page.click("#screen-code .btn-back-link");
  await page.waitForSelector("#screen-welcome:not([hidden])");
  const tcleFlowHidden = await page.locator("#welcome-tcle-flow").isHidden();
  const alreadyDoneVisible = await page.locator("#welcome-already-done").isVisible();
  if (!tcleFlowHidden || !alreadyDoneVisible) {
    throw new Error("Ao voltar com código já gerado, deveria mostrar o aviso 'já concluiu essa etapa', não o checkbox/Aceitar de novo.");
  }
  await page.screenshot({ path: "shot-back-1-welcome-already-done.png" });

  // "Continuar" deve levar de volta à tela de código, com o MESMO código
  // (não pode gerar um segundo / sobrescrever o anterior).
  await page.click("#btn-welcome-continue");
  await page.waitForSelector("#screen-code:not([hidden])");
  const codeAfterBack = await page.locator("#anonymous-code").innerText();
  if (codeAfterBack !== code) {
    throw new Error(`Voltar e continuar gerou um código diferente! Antes: ${code}, depois: ${codeAfterBack}`);
  }

  // ---- Avança o fluxo normalmente até instruções ----
  await page.click("#btn-go-instructions");
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // Tela 3 (instruções) -> Voltar -> deve cair na tela de código.
  await page.click("#screen-instructions .btn-back-link");
  await page.waitForSelector("#screen-code:not([hidden])");

  // Segue de novo até envio.
  await page.click("#btn-go-instructions");
  await page.waitForSelector("#screen-instructions:not([hidden])");
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
  await page.screenshot({ path: "shot-back-2-submit.png" });

  if (errors.length) {
    throw new Error("Erros de página encontrados: " + errors.join(" | "));
  }
}
