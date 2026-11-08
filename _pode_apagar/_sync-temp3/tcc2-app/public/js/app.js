/**
 * TCC2 - Sistema web de coleta de recomendações
 *
 * Sprint 1-4: fluxo era TCLE -> código anônimo -> instruções -> envio ->
 * status.
 *
 * Sprint 5 (orientação do professor): o "código anônimo" foi substituído
 * por uma conta de verdade da participante (e-mail + senha). O fluxo
 * agora é: TCLE + cadastro (ou login, se já tiver conta) -> instruções
 * -> envio -> status. Isso permite à participante entrar de qualquer
 * dispositivo, em vez de depender de um código salvo só naquele
 * navegador.
 *
 * Estado da sessão fica em memória + localStorage (para sobreviver a um
 * refresh de página). Guardamos só o token de sessão e o e-mail (que a
 * própria participante digitou) — nunca a senha.
 */

const state = {
  token: localStorage.getItem("participantToken") || null,
  email: localStorage.getItem("participantEmail") || null,
};

function saveSession(token, email) {
  state.token = token;
  state.email = email;
  localStorage.setItem("participantToken", token);
  localStorage.setItem("participantEmail", email);
}

function clearSession() {
  state.token = null;
  state.email = null;
  localStorage.removeItem("participantToken");
  localStorage.removeItem("participantEmail");
}

function authHeaders() {
  return { Authorization: `Bearer ${state.token}` };
}

const screens = {
  welcome: document.getElementById("screen-welcome"),
  instructions: document.getElementById("screen-instructions"),
  submit: document.getElementById("screen-submit"),
  status: document.getElementById("screen-status"),
};

// Tela anterior de cada tela, usada pelo botão "← Voltar". É um mapa fixo
// (não uma pilha de histórico) porque o fluxo da participante é linear e
// isso também funciona certo depois de um refresh de página (ver
// resumeSession() no final do arquivo).
const BACK_TARGETS = {
  instructions: "welcome",
  submit: "instructions",
  status: "submit",
};

function showScreen(name) {
  Object.values(screens).forEach((el) => (el.hidden = true));
  screens[name].hidden = false;
  if (name === "welcome") {
    renderWelcomeScreen();
  }
}

function showError(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.hidden = false;
}

function hideError(elId) {
  const el = document.getElementById(elId);
  el.hidden = true;
}

/* ---------- Tela 1: Boas-vindas + TCLE + Login/Cadastro ---------- */

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const btnShowLogin = document.getElementById("btn-show-login");
const btnShowRegister = document.getElementById("btn-show-register");
const welcomeAlreadyDone = document.getElementById("welcome-already-done");

function setAuthMode(mode) {
  const isLogin = mode === "login";
  registerForm.hidden = isLogin;
  loginForm.hidden = !isLogin;
  btnShowLogin.hidden = isLogin;
  btnShowRegister.hidden = !isLogin;
}

btnShowLogin.addEventListener("click", () => setAuthMode("login"));
btnShowRegister.addEventListener("click", () => setAuthMode("register"));

// Se a participante volta pra essa tela (pelo "← Voltar") já estando
// logada nesta sessão, mostra um aviso + "Continuar" em vez dos
// formulários de cadastro/login de novo.
function renderWelcomeScreen() {
  if (state.token) {
    welcomeAlreadyDone.hidden = false;
    registerForm.hidden = true;
    loginForm.hidden = true;
    btnShowLogin.hidden = true;
    btnShowRegister.hidden = true;
  } else {
    welcomeAlreadyDone.hidden = true;
    setAuthMode("register");
  }
}

document.getElementById("btn-welcome-continue").addEventListener("click", () => {
  showScreen("instructions");
});

document.querySelectorAll(".btn-back-link:not(.btn-toggle-auth):not(.btn-logout)").forEach((btn) => {
  btn.addEventListener("click", () => {
    const current = btn.closest(".screen").dataset.screen;
    const target = BACK_TARGETS[current];
    if (target) showScreen(target);
  });
});

const tcleCheckbox = document.getElementById("tcle-checkbox");
const acceptBtn = document.getElementById("btn-accept-tcle");

tcleCheckbox.addEventListener("change", () => {
  acceptBtn.disabled = !tcleCheckbox.checked;
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("welcome-error");

  if (!tcleCheckbox.checked) {
    showError("welcome-error", "É preciso concordar com o TCLE para continuar.");
    return;
  }

  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  acceptBtn.disabled = true;
  acceptBtn.textContent = "Enviando...";

  try {
    const res = await fetch("/api/participants/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível criar sua conta agora.");

    saveSession(data.token, data.email);
    showScreen("instructions");
  } catch (err) {
    showError("welcome-error", err.message);
  } finally {
    acceptBtn.disabled = !tcleCheckbox.checked;
    acceptBtn.textContent = "Aceitar e criar conta";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("login-error");

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const loginBtn = loginForm.querySelector("button[type=submit]");
  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando...";

  try {
    const res = await fetch("/api/participants/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível entrar.");

    saveSession(data.token, data.email);
    showScreen("instructions");
  } catch (err) {
    showError("login-error", err.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }
});

/* ---------- Tela 2 -> 3: Instruções -> Envio ---------- */

document.getElementById("btn-start").addEventListener("click", () => {
  showScreen("submit");
});

/* ---------- Trata sessão expirada/invalidada em qualquer chamada autenticada ---------- */

function handleExpiredSession() {
  clearSession();
  showScreen("welcome");
  setAuthMode("login");
  showError("login-error", "Sua sessão expirou. Faça login novamente.");
}

/* ---------- Tela 3: Envio de recomendação ---------- */

const submitForm = document.getElementById("submit-form");
const submitProgress = document.getElementById("submit-progress");

submitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("submit-error");

  const link = document.getElementById("rec-link").value.trim();
  const networkInput = submitForm.querySelector('input[name="rec-network"]:checked');
  const formatInput = submitForm.querySelector('input[name="rec-format"]:checked');
  const appearedAt = document.getElementById("rec-date").value;
  const reason = document.getElementById("rec-reason").value.trim();

  if (!link || !networkInput || !formatInput || !appearedAt || !reason) {
    showError("submit-error", "Preencha todos os campos antes de enviar.");
    return;
  }
  if (!state.token) {
    showError("submit-error", "Sua sessão não foi encontrada. Volte ao início e entre de novo.");
    return;
  }

  const submitBtn = submitForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        link,
        network: networkInput.value,
        format: formatInput.value,
        appearedAt,
        reason,
      }),
    });

    if (res.status === 401) {
      handleExpiredSession();
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao enviar a recomendação.");

    submitForm.reset();
    submitProgress.textContent = "Cole o link do post ou Reels que apareceu para você.";
    showSubmitSuccessModal(data.remaining, data.totalForParticipant);
  } catch (err) {
    showError("submit-error", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar";
  }
});

document.getElementById("btn-view-status").addEventListener("click", async () => {
  await refreshStatus();
  showScreen("status");
});

/* ---------- Modal de confirmação de envio ---------- */

const submitSuccessModal = document.getElementById("submit-success-modal");
const submitSuccessMessage = document.getElementById("submit-success-message");
const btnModalNew = document.getElementById("btn-modal-new");

function showSubmitSuccessModal(remaining, totalForParticipant) {
  if (remaining > 0) {
    submitSuccessMessage.textContent = `Você ainda pode enviar mais ${remaining} recomendação(ões), até ${totalForParticipant + remaining} no total.`;
    btnModalNew.hidden = false;
  } else {
    submitSuccessMessage.textContent = "Você já enviou o máximo de 3 recomendações. Muito obrigada por participar!";
    btnModalNew.hidden = true;
  }
  submitSuccessModal.hidden = false;
}

function hideSubmitSuccessModal() {
  submitSuccessModal.hidden = true;
}

document.getElementById("btn-modal-close").addEventListener("click", hideSubmitSuccessModal);

btnModalNew.addEventListener("click", () => {
  hideSubmitSuccessModal();
  document.getElementById("rec-link").focus();
});

document.getElementById("btn-modal-status").addEventListener("click", async () => {
  hideSubmitSuccessModal();
  await refreshStatus();
  showScreen("status");
});

/* ---------- Tela 4: Status dos envios ---------- */

async function refreshStatus() {
  const list = document.getElementById("rec-list");
  const emptyMsg = document.getElementById("status-empty");
  const title = document.getElementById("status-title");
  list.innerHTML = "";

  if (!state.token) return;

  try {
    const res = await fetch("/api/recommendations", { headers: authHeaders() });
    if (res.status === 401) {
      handleExpiredSession();
      return;
    }
    const data = await res.json();

    title.textContent = `Seus envios (${data.total} de ${data.max})`;
    emptyMsg.hidden = data.total > 0;

    data.items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "rec-item";
      li.innerHTML = `
        <div class="rec-item-top">
          <span class="rec-badge">${item.network} &middot; ${item.format}</span>
          <span class="rec-status">${item.status}</span>
        </div>
        <a class="rec-link" href="${item.link}" target="_blank" rel="noopener noreferrer">${item.link}</a>
        <span class="rec-date">Apareceu em ${item.appearedAt}</span>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    emptyMsg.hidden = false;
    emptyMsg.textContent = "Não foi possível carregar seus envios agora.";
  }
}

document.getElementById("btn-new-submission").addEventListener("click", () => {
  submitProgress.textContent = "Cole o link do post ou Reels que apareceu para você.";
  showScreen("submit");
});

document.getElementById("btn-logout").addEventListener("click", () => {
  clearSession();
  showScreen("welcome");
});

/* ---------- Retomar sessão em caso de refresh ---------- */

(async function resumeSession() {
  if (!state.token) {
    showScreen("welcome");
    return;
  }
  try {
    const res = await fetch("/api/participants/me", { headers: authHeaders() });
    if (!res.ok) throw new Error("Sessão inválida.");
    showScreen("instructions");
  } catch (err) {
    clearSession();
    showScreen("welcome");
  }
})();
