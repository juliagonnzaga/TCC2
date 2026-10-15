/**
 * TCC2 - Sistema web de coleta de recomendações
 * Sprint 1 - lógica de front-end (fluxo: TCLE -> perfil -> código -> instruções)
 *
 * Estado da sessão fica em memória + localStorage (para sobreviver a um
 * refresh de página durante o teste manual). Nada disso é dado
 * identificável: apenas consentId (gerado pelo back-end) e o código
 * anônimo (gerado pelo back-end).
 */

const state = {
  consentId: localStorage.getItem("consentId") || null,
  anonymousCode: localStorage.getItem("anonymousCode") || null,
};

const screens = {
  welcome: document.getElementById("screen-welcome"),
  profile: document.getElementById("screen-profile"),
  code: document.getElementById("screen-code"),
  instructions: document.getElementById("screen-instructions"),
};

function showScreen(name) {
  Object.values(screens).forEach((el) => (el.hidden = true));
  screens[name].hidden = false;
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

/* ---------- Tela 1: Boas-vindas + TCLE ---------- */

const tcleCheckbox = document.getElementById("tcle-checkbox");
const acceptBtn = document.getElementById("btn-accept-tcle");

tcleCheckbox.addEventListener("change", () => {
  acceptBtn.disabled = !tcleCheckbox.checked;
});

acceptBtn.addEventListener("click", async () => {
  hideError("welcome-error");
  acceptBtn.disabled = true;
  acceptBtn.textContent = "Enviando...";

  try {
    const res = await fetch("/api/consent", { method: "POST" });
    if (!res.ok) throw new Error("Falha ao registrar o aceite do TCLE.");
    const data = await res.json();

    state.consentId = data.consentId;
    localStorage.setItem("consentId", data.consentId);

    showScreen("profile");
  } catch (err) {
    showError(
      "welcome-error",
      "Não foi possível registrar seu aceite agora. Tente novamente."
    );
  } finally {
    acceptBtn.disabled = false;
    acceptBtn.textContent = "Aceitar e continuar";
  }
});

/* ---------- Tela 2: Perfil mínimo anônimo ---------- */

const profileForm = document.getElementById("profile-form");

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("profile-error");

  const ageRange = document.getElementById("age-range").value;
  const networkInput = profileForm.querySelector('input[name="network"]:checked');

  if (!ageRange || !networkInput) {
    showError("profile-error", "Selecione a faixa etária e a rede social.");
    return;
  }

  if (!state.consentId) {
    showError(
      "profile-error",
      "TCLE não encontrado. Volte e aceite o termo novamente."
    );
    return;
  }

  const submitBtn = profileForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentId: state.consentId,
        ageRange,
        network: networkInput.value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao gerar o perfil.");

    state.anonymousCode = data.code;
    localStorage.setItem("anonymousCode", data.code);

    document.getElementById("anonymous-code").textContent = data.code;
    showScreen("code");
  } catch (err) {
    showError("profile-error", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Continuar";
  }
});

/* ---------- Tela 2b -> 3: código gerado -> instruções ---------- */

document.getElementById("btn-go-instructions").addEventListener("click", () => {
  showScreen("instructions");
});

/* ---------- Tela 3: Instruções ---------- */

document.getElementById("btn-start").addEventListener("click", () => {
  alert(
    "Sprint 2 ainda não foi implementada: aqui a participante seguiria para a tela de envio de recomendação."
  );
});

/* ---------- Retomar sessão em caso de refresh ---------- */

(function resumeSession() {
  if (state.anonymousCode) {
    document.getElementById("anonymous-code").textContent = state.anonymousCode;
    showScreen("instructions");
  } else if (state.consentId) {
    showScreen("profile");
  } else {
    showScreen("welcome");
  }
})();
