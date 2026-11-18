const feedbackModal = document.getElementById("feedback-modal");
const feedbackAuth = document.getElementById("feedback-auth");
const feedbackCompose = document.getElementById("feedback-compose");
const feedbackComposeAs = document.getElementById("feedback-compose-as");
const feedbackList = document.getElementById("feedback-list");

const feedbackRegisterForm = document.getElementById("feedback-register-form");
const feedbackLoginForm = document.getElementById("feedback-login-form");
const feedbackForm = document.getElementById("feedback-form");
const feedbackDisplayNameInput = document.getElementById("feedback-display-name");
const feedbackAnonymousCheckbox = document.getElementById("feedback-anonymous");

const feedbackBtnShowLogin = document.getElementById("feedback-btn-show-login");
const feedbackBtnShowRegister = document.getElementById("feedback-btn-show-register");

function feedbackToken() {
  return localStorage.getItem("participantToken");
}

function feedbackEmail() {
  return localStorage.getItem("participantEmail");
}

function showFeedbackError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.hidden = false;
}

function hideFeedbackError(id) {
  document.getElementById(id).hidden = true;
}

async function refreshFeedbackAuthState() {
  const token = feedbackToken();
  if (!token) {
    feedbackAuth.hidden = false;
    feedbackCompose.hidden = true;
    return;
  }
  try {
    const res = await fetch("/api/participants/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    feedbackAuth.hidden = true;
    feedbackCompose.hidden = false;
    feedbackComposeAs.textContent = `Comentando como ${feedbackEmail() || "participante"}`;
  } catch {
    localStorage.removeItem("participantToken");
    localStorage.removeItem("participantEmail");
    feedbackAuth.hidden = false;
    feedbackCompose.hidden = true;
  }
}

async function loadFeedbackList() {
  feedbackList.innerHTML = '<p class="hint">Carregando...</p>';
  try {
    const res = await fetch("/api/feedback/public");
    const data = await res.json();
    feedbackList.innerHTML = "";
    if (!data.items || data.items.length === 0) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Ainda não há comentários. Seja a primeira a deixar um!";
      feedbackList.appendChild(p);
      return;
    }
    for (const item of data.items) {
      const row = document.createElement("div");
      row.className = "feedback-item";

      const author = document.createElement("p");
      author.className = "feedback-item-author";
      author.textContent = item.displayName || "Anônima";

      const message = document.createElement("p");
      message.className = "feedback-item-message";
      message.textContent = item.message;

      row.appendChild(author);
      row.appendChild(message);
      feedbackList.appendChild(row);
    }
  } catch {
    feedbackList.innerHTML = '<p class="hint">Não foi possível carregar os comentários agora.</p>';
  }
}

document.getElementById("btn-open-feedback").addEventListener("click", () => {
  feedbackModal.hidden = false;
  refreshFeedbackAuthState();
  loadFeedbackList();
});

document.getElementById("btn-close-feedback").addEventListener("click", () => {
  feedbackModal.hidden = true;
});

feedbackModal.addEventListener("click", (event) => {
  if (event.target === feedbackModal) feedbackModal.hidden = true;
});

feedbackAnonymousCheckbox.addEventListener("change", () => {
  if (feedbackAnonymousCheckbox.checked) {
    feedbackDisplayNameInput.value = "";
    feedbackDisplayNameInput.disabled = true;
  } else {
    feedbackDisplayNameInput.disabled = false;
  }
});

feedbackBtnShowLogin.addEventListener("click", () => {
  feedbackRegisterForm.hidden = true;
  feedbackBtnShowLogin.hidden = true;
  feedbackLoginForm.hidden = false;
  feedbackBtnShowRegister.hidden = false;
});

feedbackBtnShowRegister.addEventListener("click", () => {
  feedbackLoginForm.hidden = true;
  feedbackBtnShowRegister.hidden = true;
  feedbackRegisterForm.hidden = false;
  feedbackBtnShowLogin.hidden = false;
});

feedbackRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideFeedbackError("feedback-register-error");
  const email = document.getElementById("feedback-register-email").value.trim();
  const password = document.getElementById("feedback-register-password").value;
  const btn = feedbackRegisterForm.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const res = await fetch("/api/participants/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível criar sua conta agora.");
    localStorage.setItem("participantToken", data.token);
    localStorage.setItem("participantEmail", data.email);
    feedbackRegisterForm.reset();
    await refreshFeedbackAuthState();
  } catch (err) {
    showFeedbackError("feedback-register-error", err.message);
  } finally {
    btn.disabled = false;
  }
});

feedbackLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideFeedbackError("feedback-login-error");
  const email = document.getElementById("feedback-login-email").value.trim();
  const password = document.getElementById("feedback-login-password").value;
  const btn = feedbackLoginForm.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const res = await fetch("/api/participants/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível entrar.");
    localStorage.setItem("participantToken", data.token);
    localStorage.setItem("participantEmail", data.email);
    feedbackLoginForm.reset();
    await refreshFeedbackAuthState();
  } catch (err) {
    showFeedbackError("feedback-login-error", err.message);
  } finally {
    btn.disabled = false;
  }
});

feedbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideFeedbackError("feedback-error");
  document.getElementById("feedback-success").hidden = true;
  const isAnonymous = feedbackAnonymousCheckbox.checked;
  const displayName = isAnonymous ? "" : feedbackDisplayNameInput.value.trim();
  const message = document.getElementById("feedback-message").value.trim();
  const btn = feedbackForm.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${feedbackToken()}` },
      body: JSON.stringify({ message, displayName: displayName || null }),
    });
    if (res.status === 401) {
      await refreshFeedbackAuthState();
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível enviar seu comentário agora.");
    feedbackForm.reset();
    feedbackDisplayNameInput.disabled = false;
    document.getElementById("feedback-success").hidden = false;
    loadFeedbackList();
  } catch (err) {
    showFeedbackError("feedback-error", err.message);
  } finally {
    btn.disabled = false;
  }
});
