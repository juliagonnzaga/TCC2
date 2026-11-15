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
  "reset-password": document.getElementById("screen-reset-password"),
  tcle: document.getElementById("screen-tcle"),
  instructions: document.getElementById("screen-instructions"),
  submit: document.getElementById("screen-submit"),
  status: document.getElementById("screen-status"),
};

// Tela anterior de cada tela, usada pelo botão "← Voltar". É um mapa fixo
// (não uma pilha de histórico) porque o fluxo da participante é linear e
// isso também funciona certo depois de um refresh de página (ver
// resumeSession() no final do arquivo). "Esqueci minha senha" é uma
// ramificação fora da numeração principal, mas volta pro mesmo lugar
// (login).
const BACK_TARGETS = {
  "reset-password": "login",
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
const btnForgotPassword = document.getElementById("btn-forgot-password");
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
    btnForgotPassword.hidden = true;
  } else {
    loginAlreadyDone.hidden = true;
    btnForgotPassword.hidden = false;
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

/* ---------- Esqueci minha senha (pedido da Julia) ---------- */

const resetPasswordForm = document.getElementById("reset-password-form");
const resetPasswordSuccessModal = document.getElementById("reset-password-success-modal");

btnForgotPassword.addEventListener("click", () => {
  hideError("reset-password-error");
  resetPasswordForm.reset();
  // Facilita a vida: já preenche o e-mail que a participante tiver
  // digitado no formulário de cadastro ou de login, se tiver algum.
  const typedEmail =
    document.getElementById("register-email").value.trim() ||
    document.getElementById("login-email").value.trim();
  if (typedEmail) {
    document.getElementById("reset-email").value = typedEmail;
  }
  showScreen("reset-password");
});

resetPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("reset-password-error");

  const email = document.getElementById("reset-email").value.trim();
  const newPassword = document.getElementById("reset-new-password").value;
  const confirmPassword = document.getElementById("reset-confirm-password").value;

  if (newPassword !== confirmPassword) {
    showError("reset-password-error", "As senhas não coincidem.");
    return;
  }

  const resetBtn = resetPasswordForm.querySelector("button[type=submit]");
  resetBtn.disabled = true;
  resetBtn.textContent = "Redefinindo...";

  try {
    const res = await fetch("/api/participants/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível redefinir a senha agora.");

    resetPasswordForm.reset();
    resetPasswordSuccessModal.hidden = false;
  } catch (err) {
    showError("reset-password-error", err.message);
  } finally {
    resetBtn.disabled = false;
    resetBtn.textContent = "Redefinir senha";
  }
});

document.getElementById("btn-reset-modal-login").addEventListener("click", () => {
  const resetEmail = document.getElementById("reset-email").value.trim();
  resetPasswordSuccessModal.hidden = true;
  showScreen("login");
  setAuthMode("login");
  if (resetEmail) {
    document.getElementById("login-email").value = resetEmail;
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

const ageBandSelect = document.getElementById("rec-age-band");
const linkInput = document.getElementById("rec-link");
const networkDetected = document.getElementById("rec-network-detected");
const whyOtherField = document.getElementById("rec-why-other-field");
const whyOtherInput = document.getElementById("rec-why-other");
const desiredOtherField = document.getElementById("rec-desired-other-field");
const desiredOtherInput = document.getElementById("rec-desired-other");
const OTHER_REASON = "Outro motivo";
const OTHER_DESIRED = "Outro";
const stateSelect = document.getElementById("rec-state");
const cityInput = document.getElementById("rec-city");
const cityList = document.getElementById("rec-city-list");

const NETWORK_HOSTS = [
  ["instagram.com", "Instagram"],
  ["tiktok.com", "TikTok"],
  ["facebook.com", "Facebook"],
  ["fb.com", "Facebook"],
  ["fb.watch", "Facebook"],
  ["youtube.com", "YouTube"],
  ["youtu.be", "YouTube"],
  ["twitter.com", "X"],
  ["x.com", "X"],
  ["t.co", "X"],
  ["threads.net", "Threads"],
  ["threads.com", "Threads"],
  ["pinterest.com", "Pinterest"],
  ["pin.it", "Pinterest"],
  ["kwai.com", "Kwai"],
  ["reddit.com", "Reddit"],
  ["linkedin.com", "LinkedIn"],
];

function detectNetworkName(value) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    const match = NETWORK_HOSTS.find(([domain]) => host === domain || host.endsWith(`.${domain}`));
    return match ? match[1] : host;
  } catch (err) {
    return "";
  }
}

let availableCities = [];
let activeCityIndex = -1;

let citiesByStateRequest = null;

function loadCitiesByState() {
  if (!citiesByStateRequest) {
    citiesByStateRequest = fetch("/ibge/cidades-por-estado.json").then((res) => {
      if (!res.ok) throw new Error("Falha ao carregar as cidades.");
      return res.json();
    });
    citiesByStateRequest.catch(() => {
      citiesByStateRequest = null;
    });
  }
  return citiesByStateRequest;
}

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveCity(text) {
  const key = normalizeText(text);
  if (!key) return "";
  return availableCities.find((name) => normalizeText(name) === key) || "";
}

function closeCityList() {
  cityList.hidden = true;
  cityInput.setAttribute("aria-expanded", "false");
  activeCityIndex = -1;
}

function setActiveCity(index) {
  const options = cityList.querySelectorAll(".combo-option");
  if (options.length === 0) return;
  activeCityIndex = (index + options.length) % options.length;
  options.forEach((el, i) => el.classList.toggle("active", i === activeCityIndex));
  options[activeCityIndex].scrollIntoView({ block: "nearest" });
}

function chooseCity(name) {
  cityInput.value = name;
  closeCityList();
}

function renderCityList() {
  const key = normalizeText(cityInput.value);
  const starts = [];
  const contains = [];
  availableCities.forEach((name) => {
    const normalized = normalizeText(name);
    if (!key || normalized.startsWith(key)) starts.push(name);
    else if (normalized.includes(key)) contains.push(name);
  });
  const matches = starts.concat(contains);

  cityList.innerHTML = "";
  activeCityIndex = -1;
  if (matches.length === 0) {
    const empty = document.createElement("li");
    empty.className = "combo-empty";
    empty.textContent = "Nenhuma cidade encontrada";
    cityList.appendChild(empty);
  } else {
    matches.forEach((name) => {
      const option = document.createElement("li");
      option.className = "combo-option";
      option.setAttribute("role", "option");
      option.textContent = name;
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        chooseCity(name);
      });
      cityList.appendChild(option);
    });
  }
  cityList.hidden = false;
  cityInput.setAttribute("aria-expanded", "true");
}

cityInput.addEventListener("focus", () => {
  if (!cityInput.disabled) renderCityList();
});

cityInput.addEventListener("input", renderCityList);

cityInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (cityList.hidden) renderCityList();
    setActiveCity(activeCityIndex + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    if (cityList.hidden) renderCityList();
    setActiveCity(activeCityIndex - 1);
  } else if (event.key === "Enter" && !cityList.hidden) {
    event.preventDefault();
    const options = cityList.querySelectorAll(".combo-option");
    if (activeCityIndex >= 0) chooseCity(options[activeCityIndex].textContent);
    else if (options.length === 1) chooseCity(options[0].textContent);
  } else if (event.key === "Escape") {
    closeCityList();
  }
});

cityInput.addEventListener("blur", () => {
  closeCityList();
  cityInput.value = resolveCity(cityInput.value);
});

async function fillCities(uf, selectedCity) {
  availableCities = [];
  cityInput.value = "";
  cityInput.disabled = true;
  closeCityList();
  if (!uf) {
    cityInput.placeholder = "Selecione o estado primeiro";
    return;
  }
  cityInput.placeholder = "Carregando cidades...";
  try {
    const citiesByState = await loadCitiesByState();
    if (stateSelect.value !== uf) return;
    availableCities = citiesByState[uf] || [];
    cityInput.placeholder = "Digite o nome da cidade";
    cityInput.disabled = false;
    if (selectedCity) cityInput.value = selectedCity;
  } catch (err) {
    cityInput.placeholder = "Não foi possível carregar as cidades";
  }
}

const MAX_CHOICES = 2;

function checkedValues(name) {
  return Array.from(submitForm.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (el) => el.value
  );
}

function enforceMaxChoices(name, hintId) {
  const all = submitForm.querySelectorAll(`input[name="${name}"]`);
  const full = checkedValues(name).length >= MAX_CHOICES;
  all.forEach((input) => {
    if (!input.checked) input.disabled = full;
  });
  document.getElementById(hintId).textContent = full
    ? "Máximo de 2 opções atingido."
    : "Escolha até 2 opções.";
}

function toggleOtherField(name, otherValue, field, input) {
  const show = checkedValues(name).includes(otherValue);
  field.hidden = !show;
  if (!show) input.value = "";
}

linkInput.addEventListener("input", () => {
  const name = linkInput.value.trim() ? detectNetworkName(linkInput.value.trim()) : "";
  networkDetected.hidden = !name;
  if (name) networkDetected.textContent = `Rede social identificada: ${name}`;
});

submitForm.addEventListener("change", (event) => {
  if (event.target.id === "rec-state") fillCities(event.target.value);
  if (event.target.name === "rec-why") {
    enforceMaxChoices("rec-why", "rec-why-hint");
    toggleOtherField("rec-why", OTHER_REASON, whyOtherField, whyOtherInput);
  }
  if (event.target.name === "rec-desired") {
    enforceMaxChoices("rec-desired", "rec-desired-hint");
    toggleOtherField("rec-desired", OTHER_DESIRED, desiredOtherField, desiredOtherInput);
  }
});

submitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("submit-error");

  const ageBand = ageBandSelect.value;
  const stateCode = stateSelect.value;
  const city = resolveCity(cityInput.value);
  const link = linkInput.value.trim();
  const whyReasons = checkedValues("rec-why");
  const recurrenceInput = submitForm.querySelector('input[name="rec-recurrence"]:checked');
  const desiredContent = checkedValues("rec-desired");
  const whyOther = whyOtherInput.value.trim();
  const desiredOther = desiredOtherInput.value.trim();
  const comment = document.getElementById("rec-comment").value.trim();

  if (!ageBand) {
    showError("submit-error", "Escolha sua faixa de idade.");
    return;
  }
  if (!stateCode || !city) {
    showError("submit-error", "Escolha o estado e a cidade onde você mora.");
    return;
  }
  if (!link) {
    showError("submit-error", "Cole o link do conteúdo.");
    return;
  }
  if (whyReasons.length === 0) {
    showError("submit-error", "Escolha pelo menos 1 motivo para não querer continuar vendo o conteúdo.");
    return;
  }
  if (whyReasons.includes(OTHER_REASON) && !whyOther) {
    showError("submit-error", "Escreva qual é o outro motivo.");
    return;
  }
  if (!recurrenceInput) {
    showError("submit-error", "Diga se você costuma encontrar conteúdos parecidos.");
    return;
  }
  if (desiredContent.length === 0) {
    showError("submit-error", "Escolha pelo menos 1 opção do que gostaria de ver no lugar.");
    return;
  }
  if (desiredContent.includes(OTHER_DESIRED) && !desiredOther) {
    showError("submit-error", "Escreva o que você gostaria de ver no lugar.");
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
        ageBand,
        state: stateCode,
        city,
        link,
        whyReasons,
        whyOther: whyReasons.includes(OTHER_REASON) ? whyOther : undefined,
        recurrence: recurrenceInput.value,
        desiredContent,
        desiredOther: desiredContent.includes(OTHER_DESIRED) ? desiredOther : undefined,
        comment: comment || undefined,
      }),
    });

    if (res.status === 401) {
      handleExpiredSession();
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao registrar o conteúdo.");

    submitForm.reset();
    ageBandSelect.value = ageBand;
    stateSelect.value = stateCode;
    await fillCities(stateCode, city);
    networkDetected.hidden = true;
    enforceMaxChoices("rec-why", "rec-why-hint");
    enforceMaxChoices("rec-desired", "rec-desired-hint");
    toggleOtherField("rec-why", OTHER_REASON, whyOtherField, whyOtherInput);
    toggleOtherField("rec-desired", OTHER_DESIRED, desiredOtherField, desiredOtherInput);
    showSubmitSuccessModal(data.totalForParticipant);
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

// Pedido da Julia (nov/2026): não há mais limite de envios por
// participante, então o modal só confirma o recebimento — sem falar em
// "restam X" nem travar o botão de enviar outra recomendação.
function showSubmitSuccessModal(totalForParticipant) {
  submitSuccessMessage.textContent = `Registro recebido! Você já enviou ${totalForParticipant} no total. Muito obrigada por participar!`;
  btnModalNew.hidden = false;
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

    // Pedido da Julia (nov/2026): tirou o "(0 de 3)" do título, já que não
    // há mais limite de envios por participante.
    title.textContent = "Seus envios";
    emptyMsg.hidden = data.total > 0;

    data.items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "rec-item";
      const networkLabel = item.network === "Outra" && item.networkOther ? item.networkOther : item.network;
      li.innerHTML = `
        <div class="rec-item-top">
          <span class="rec-badge">${networkLabel}</span>
          <span class="rec-status">${item.status}</span>
        </div>
        <a class="rec-link" href="${item.link}" target="_blank" rel="noopener noreferrer">${item.link}</a>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    emptyMsg.hidden = false;
    emptyMsg.textContent = "Não foi possível carregar seus envios agora.";
  }
}

document.getElementById("btn-new-submission").addEventListener("click", () => {
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
