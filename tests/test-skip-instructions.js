const { chromium } = require("playwright");

const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

/**
 * TCC2 - Teste do checkbox "Pular as instruções na próxima vez"
 * (pedido da Julia, nov/2026, tela de instruções).
 *
 * A preferência fica salva na conta (não no navegador), então cobre:
 *  1. Por padrão o checkbox vem desmarcado e a tela de instruções
 *     aparece normalmente.
 *  2. Ao marcar o checkbox e continuar, a próxima vez que a conta loga
 *     (mesmo em outra "sessão", simulada aqui por um logout + login)
 *     pula direto para a tela de envio, sem passar pelas instruções.
 *  3. Desmarcando o checkbox e continuando de novo, a tela de
 *     instruções volta a aparecer nos próximos acessos.
 */

(async () => {
  const browser = await chromium.launch(launchOptions);
  try {
    await runFlow(browser);
    console.log('OK: "Pular as instruções na próxima vez" funcionou (marcar pula a tela, desmarcar traz de volta).');
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

  const email = `testadora-skip-${Date.now()}@example.com`;
  await page.fill("#register-email", email);
  await page.fill("#register-password", "senha123");
  await page.fill("#register-confirm-password", "senha123");
  await page.click('#register-form button[type=submit]');

  await page.waitForSelector("#screen-tcle:not([hidden])");
  await page.check("#tcle-checkbox");
  await page.click("#btn-accept-tcle");
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // Por padrão, desmarcado.
  if (await page.locator("#skip-instructions-checkbox").isChecked()) {
    throw new Error('Checkbox "Pular as instruções" deveria começar desmarcado numa conta nova.');
  }

  // Marca e continua — a primeira vez ainda passa pela tela normalmente.
  await page.check("#skip-instructions-checkbox");
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");

  // Assume que já está na tela de envio (#screen-submit visível).
  async function logoutAndLoginAgain() {
    await page.click("#btn-view-status");
    await page.waitForSelector("#screen-status:not([hidden])");
    await page.click("#btn-logout");
    await page.waitForSelector("#screen-login:not([hidden])");
    await page.click("#btn-show-login");
    await page.fill("#login-email", email);
    await page.fill("#login-password", "senha123");
    await page.click('#login-form button[type=submit]');
  }

  await logoutAndLoginAgain();

  // Com a preferência marcada, o login deve cair direto na tela de
  // envio — nunca mostrando a tela de instruções no meio do caminho.
  await page.waitForSelector("#screen-submit:not([hidden])");
  if (await page.locator("#screen-instructions").isVisible()) {
    throw new Error('Com "Pular as instruções" marcado, a tela de instruções não deveria aparecer depois do login.');
  }

  // Volta manualmente pra instruções (botão "← Voltar" continua
  // funcionando, é navegação explícita) e confirma que o checkbox
  // continua marcado (preferência persistida).
  await page.click("#screen-submit .btn-back-link");
  await page.waitForSelector("#screen-instructions:not([hidden])");
  if (!(await page.locator("#skip-instructions-checkbox").isChecked())) {
    throw new Error('Checkbox "Pular as instruções" deveria continuar marcado ao voltar pra essa tela.');
  }

  // Desmarca e continua — isso deve "desligar" a preferência salva.
  await page.uncheck("#skip-instructions-checkbox");
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");

  await logoutAndLoginAgain();

  // Agora a tela de instruções deve voltar a aparecer.
  await page.waitForSelector("#screen-instructions:not([hidden])");
  const checkboxNowChecked = await page.locator("#skip-instructions-checkbox").isChecked();
  if (checkboxNowChecked) {
    throw new Error('Checkbox "Pular as instruções" deveria vir desmarcado depois de ter sido desmarcado antes.');
  }
  await page.screenshot({ path: "shot-skip-instructions-back.png" });

  if (errors.length) {
    throw new Error("Erros de página encontrados: " + errors.join(" | "));
  }
}
