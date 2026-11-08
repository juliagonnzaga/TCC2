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
    // "Failed to load resource" é o próprio Chrome logando qualquer
    // fetch/XHR com status não-2xx como erro de console — inclusive
    // quando é a resposta ESPERADA de um teste que verifica rejeição
    // (ex.: login com senha antiga depois de redefinir, mais abaixo).
    // O app nunca chama console.error diretamente, então filtrar isso
    // não esconde bug nenhum do nosso próprio código.
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) {
      errors.push(msg.text());
    }
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.screenshot({ path: "shot-1-login.png" });

  // Screen 1: login/cadastro (Sprint 5, revisado — etapa própria, sem o
  // TCLE junto; o TCLE ganhou uma tela separada, a seguir).
  const email = `testadora-${Date.now()}@example.com`;
  await page.fill("#register-email", email);
  await page.fill("#register-password", "senha123");
  await page.click('#register-form button[type=submit]');

  // Screen 1 -> 2: cadastro leva à tela de TCLE (conta nova, ainda não aceitou)
  await page.waitForSelector("#screen-tcle:not([hidden])");
  await page.screenshot({ path: "shot-2-tcle.png" });

  const acceptBtn = page.locator("#btn-accept-tcle");
  if (!(await acceptBtn.isDisabled())) throw new Error("Aceitar deveria começar desabilitado");
  await page.check("#tcle-checkbox");
  if (await acceptBtn.isDisabled()) throw new Error("Aceitar deveria habilitar após marcar checkbox");
  await acceptBtn.click();

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

  // Confirma que o link enviado aparece na lista
  const firstLink = await page.locator(".rec-link").first().getAttribute("href");
  if (firstLink !== "https://www.instagram.com/reel/teste123") {
    throw new Error(`Link salvo não corresponde ao enviado: ${firstLink}`);
  }

  // Reload to confirm session resume (localStorage) lands back on instructions
  // (já aceitou o TCLE, então pula direto pra lá, não pra tela de TCLE de novo)
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // "Sair da conta" deve limpar a sessão e voltar pra tela de login
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");
  await page.click("#btn-view-status");
  await page.waitForSelector("#screen-status:not([hidden])");
  await page.click("#btn-logout");
  await page.waitForSelector("#screen-login:not([hidden])");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#screen-login:not([hidden])");

  // Login com a conta criada deve funcionar e levar direto às instruções
  // (pulando a tela de TCLE, porque essa conta já aceitou antes)
  await page.click("#btn-show-login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha123");
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector("#screen-instructions:not([hidden])");

  // "Esqueci minha senha" (pedido da Julia): sai de novo, clica em
  // "Esqueci minha senha" a partir da tela de login, redefine, confirma
  // o modal de feedback e entra de novo já com a senha nova.
  await page.click("#btn-start");
  await page.waitForSelector("#screen-submit:not([hidden])");
  await page.click("#btn-view-status");
  await page.waitForSelector("#screen-status:not([hidden])");
  await page.click("#btn-logout");
  await page.waitForSelector("#screen-login:not([hidden])");

  await page.click("#btn-forgot-password");
  await page.waitForSelector("#screen-reset-password:not([hidden])");
  // O e-mail já deveria vir preenchido (a participante tinha acabado de
  // tentar logar com esse e-mail antes de clicar em "Esqueci minha senha").
  const prefilledEmail = await page.locator("#reset-email").inputValue();
  if (prefilledEmail !== email) {
    throw new Error(`E-mail da redefinição deveria vir pré-preenchido com "${email}", veio "${prefilledEmail}"`);
  }
  await page.fill("#reset-new-password", "senhaNova456");
  await page.fill("#reset-confirm-password", "senhaNova456");
  await page.click('#reset-password-form button[type=submit]');

  await page.waitForSelector("#reset-password-success-modal:not([hidden])");
  await page.screenshot({ path: "shot-6-reset-password.png" });
  await page.click("#btn-reset-modal-login");
  await page.waitForSelector("#reset-password-success-modal", { state: "hidden" });
  await page.waitForSelector("#screen-login:not([hidden])");

  // A senha antiga não deve funcionar mais.
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha123");
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector("#login-error:not([hidden])");

  // A senha nova deve funcionar e, como essa conta já aceitou o TCLE
  // antes, deve pular direto pra instruções.
  await page.fill("#login-password", "senhaNova456");
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector("#screen-instructions:not([hidden])");

  if (errors.length) {
    console.error("Erros de console/página encontrados:", errors);
    process.exitCode = 1;
  } else {
    console.log("OK: fluxo completo de login/cadastro + TCLE + envio (Sprints 1-5) funcionou de ponta a ponta. E-mail usado:", email);
  }

  await browser.close();
})().catch((err) => {
  console.error("FALHA NO TESTE:", err);
  process.exitCode = 1;
});
