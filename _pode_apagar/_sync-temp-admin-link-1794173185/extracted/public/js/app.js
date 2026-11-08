/**
 * TCC2 - Sistema web de coleta de recomendações
 *
 * Sprint 1-4: fluxo era TCLE -> código anônimo -> instruções -> envio ->
 * status.
 *
 * Sprint 5 (orientação do professor): o "código anônimo" foi substituído
 * por uma conta de verdade da participante (e-mail + senha).
 *
 * Sprint 5, revisado: login/cadastro e aceite do TCLE viraram duas
 * etapas separadas (antes ficavam juntas na mesma tela). O fluxo agora
 * é: login/cadastro -> TCLE -> instruções -> envio -> status. O aceite
 * do TCLE é registrado por conta (`tcleAccepted`, vindo do back-end), não
 * por sessão — então uma participante que já aceitou antes pula direto
 * de login pras instruções, em qualquer dispositivo.
 *
 * Estado da sessão fica em memória + localStorage (para sobreviver a um
 * refresh de página). Guardamos só o token de sessão e o e-mail (que a
 * própria participante digitou) — nunca a senha. Já o `tcleAccepted` só
 * fica em memória (não precisa sobreviver a refresh por conta própria:
 * resumeSession() busca o valor certo de novo em /api/participants/me).
 */

const state = {
  token: localStorage.getItem("participantToken") || null,
  email: localStorage.getItem("participantEmail") || null,
  tcleAccepted: false,
};

function saveSession(token, email, tcleAccepted) {
  state.token = token;
  state.email = email;
  state.tcleAccepted = !!tcleAccepted;
  localStorage.setItem("participantToken", token);
  localStorage.setItem("participantEmail", email);
}

function clearSession() {
  state.token = null;
  state.email = null;
  state.tcleAccepted = false;
  localStorage.removeItem("participantToken");
  localStorage.removeItem("participantEmail");
}

function authHeaders() {
  return { Authorization: `Bearer ${state.token}` };
}

const screens = {
  login: document.getElementById("screen-login"),
  tcle: document.getElementById("screen-tcle"),
  instructions: document.getElementById("screen-instructions"),
  submit: document.getElementById("screen-submit"),
  status: document.getElementById("screen-status"),
};

// Tela anterior de cada tela, usada pelo botão "← Voltar". É um mapa fixo
// (não uma pilha de histórico) porque o fluxo da participante é linear e
// isso também funciona certo depois de um refresh de página (ver
// resumeSession() no final do arquivo).
const BACK_TARGETS = {
  tcle: "login",
  instructions: "tcle",
  submit: "instructions",
  status: "submit",
};

function showScreen(name) {
  Object.values(screens).forEach((el) => (el.hidden = true));
  screens[name].hidden = false;
  if (name === "login") {
    renderLoginScreen();
  }
  if (name === "tcle") {
    renderTcleScreen();
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

/* ---------- Tela 1: Login / Cadastro ---------- */

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const btnShowLogin = document.getElementById("btn-show-login");
const btnShowRegister = document.getElementById("btn-show-register");
const loginAlreadyDone = document.getElementById("login-already-done");

function setAuthMode(mode) {
  const isLogin = mode === "login";
  registerForm.hidden = isLogin;
  loginForm.hidden = !isLogin;
  btnShowLogin.hidden = isLogin;
  btnShowRegister.hidden = !isLogin;
}

btnShowLogin.addEventListener("click", () => setAuthMode("login"));
btnShowRegister.addEventListener("click", () => setAuthMode("register"));

// Se a participante volta pra essa tela (pelo "← Voltar", a partir da
// tela de TCLE) já estando logada nesta sessão, mostra um aviso +
// "Continuar" em vez dos formulários de cadastro/login de novo.
function renderLoginScreen() {
  if (state.token) {
    loginAlreadyDone.hidden = false;
    registerForm.hidden = true;
    loginForm.hidden = true;
    btnShowLogin.hidden = true;
    btnShowRegister.hidden = true;
  } else {
    loginAlreadyDone.hidden = true;
    setAuthMode("register");
  }
}

// "Continuar" depende de a conta já ter aceitado o TCLE antes ou não.
document.getElementById("btn-login-continue").addEventListener("click", () => {
  showScreen(state.tcleAccepted ? "instructions" : "tcle");
});

document.querySelectorAll(".btn-back-link:not(.btn-toggle-auth):not(.btn-logout)").forEach((btn) => {
  btn.addEventListener("click", () => {
    const current = btn.closest(".screen").dataset.screen;
    const target = BACK_TARGETS[current];
    if (target) showScreen(target);
  });
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("register-error");

  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const registerBtn = registerForm.querySelector("button[type=submit]");
  registerBtn.disabled = true;
  registerBtn.textContent = "Criando...";

  try {
    const res = await fetch("/api/participants/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível criar sua conta agora.");

    saveSession(data.token, data.email, data.tcleAccepted);
    showScreen(state.tcleAccepted ? "instructions" : "tcle");
  } catch (err) {
    showError("register-error", err.message);
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = "Criar conta";
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

    saveSession(data.token, data.email, data.tcleAccepted);
    showScreen(state.tcleAccepted ? "instructions" : "tcle");
  } catch (err) {
    showError("login-error", err.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }
});

/* ---------- Tela 2: TCLE ---------- */

const tcleForm = document.getElementById("tcle-form");
const tcleCheckbox = document.getElementById("tcle-checkbox");
const acceptBtn = document.getElementById("btn-accept-tcle");
const tcleAlreadyDone = document.getElementById("tcle-already-done");

tcleCheckbox.addEventListener("change", () => {
  acceptBtn.disabled = !tcleCheckbox.checked;
});

// Segurança: se a participante voltar pra essa tela já tendo aceitado o
// TCLE nesta conta (ex.: foi pra instruções e apertou "← Voltar" duas
// vezes), mostra um aviso em vez do formulário de novo.
function renderTcleScreen() {
  if (state.tcleAccepted) {
    tcleAlreadyDone.hidden = false;
    tcleForm.hidden = true;
  } else {
    tcleAlreadyDone.hidden = true;
    tcleForm.hidden = false;
    tcleCheckbox.checked = false;
    acceptBtn.disabled = true;
  }
}

document.getElementById("btn-tcle-continue").addEventListener("click", () => {
  showScreen("instructions");
});

tcleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("tcle-error");

  if (!tcleCheckbox.checked) {
    showError("tcle-error", "É preciso concordar com o TCLE para continuar.");
    return;
  }
  if (!state.token) {
    showError("tcle-error", "Sua sessão não foi encontrada. Volte ao início e entre de novo.");
    return;
  }

  acceptBtn.disabled = true;
  acceptBtn.textContent = "Enviando...";

  try {
    const res = await fetch("/api/participants/accept-tcle", {
      method: "POST",
      headers: authHeaders(),
    });
    if (res.status === 401) {
      handleExpiredSession();
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível registrar o aceite agora.");

    state.tcleAccepted = true;
    showScreen("instructions");
  } catch (err) {
    showError("tcle-error", err.message);
  } finally {
    acceptBtn.disabled = !tcleCheckbox.checked;
    acceptBtn.textContent = "Aceitar e continuar";
  }
});

/* ---------- Tela 3 -> 4: Instruções -> Envio ---------- */

document.getElementById("btn-start").addEventListener("click", () => {
  showScreen("submit");
});

/* ---------- Trata sessão expirada/invalidada em qualquer chamada autenticada ---------- */

function handleExpiredSession() {
  clearSession();
  showScreen("login");
  setAuthMode("login");
  showError("login-error", "Sua sessão expirou. Faça login novamente.");
}

/* ---------- Tela 4: Envio de recomendação ---------- */

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

/* ---------- Tela 5: Status dos envios ---------- */

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
  showScreen("login");
});

/* ---------- Retomar sessão em caso de refresh ---------- */

(async function resumeSession() {
  if (!state.token) {
    showScreen("login");
    return;
  }
  try {
    const res = await fetch("/api/participants/me", { headers: authHeaders() });
    if (!res.ok) throw new Error("Sessão inválida.");
    const data = await res.json();
    state.tcleAccepted = !!data.tcleAccepted;
    showScreen(state.tcleAccepted ? "instructions" : "tcle");
  } catch (err) {
    clearSession();
    showScreen("login");
  }
})();
