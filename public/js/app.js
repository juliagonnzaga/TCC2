/**
 * TCC2 - Sistema web de coleta de recomendações
 *
 * Sprint 1 - fluxo: TCLE -> código anônimo -> instruções
 * Sprint 2 - fluxo: instruções -> envio de recomendação (link) -> status
 *
 * NOTA (orientação do professor): a tela de perfil mínimo anônimo
 * (faixa etária + rede social) foi retirada por enquanto — essa parte
 * não deve ser desenvolvida agora. O código anônimo é gerado
 * automaticamente assim que o TCLE é aceito (ver handler do
 * #btn-accept-tcle abaixo), sem pedir esses dados demográficos. O
 * endpoint /api/profile no back-end continua existindo e aceitando
 * ageRange/network OPCIONALMENTE, para o caso de essa tela voltar
 * depois — mas hoje é chamado só com o consentId.
 *
 * Estado da sessão fica em memória + localStorage (para sobreviver a um
 * refresh de página durante o teste manual). Nada disso é dado
 * identificável: apenas consentId, o código anônimo e as recomendações
 * já enviadas (que também não têm dados identificáveis da participante).
 */

const state = {
  consentId: localStorage.getItem("consentId") || null,
  anonymousCode: localStorage.getItem("anonymousCode") || null,
};

const screens = {
  welcome: document.getElementById("screen-welcome"),
  code: document.getElementById("screen-code"),
  instructions: document.getElementById("screen-instructions"),
  submit: document.getElementById("screen-submit"),
  status: document.getElementById("screen-status"),
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

    // Tela de perfil mínimo anônimo retirada por enquanto (orientação do
    // professor) — o código anônimo é gerado na hora, só com o
    // consentId, sem pedir faixa etária/rede social.
    const profileRes = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentId: data.consentId }),
    });
    const profileData = await profileRes.json();
    if (!profileRes.ok) throw new Error(profileData.error || "Falha ao gerar o código anônimo.");

    state.anonymousCode = profileData.code;
    localStorage.setItem("anonymousCode", profileData.code);
    document.getElementById("anonymous-code").textContent = profileData.code;

    showScreen("code");
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

/* ---------- Tela 2 -> 3: código gerado -> instruções ---------- */

document.getElementById("btn-go-instructions").addEventListener("click", () => {
  showScreen("instructions");
});

/* ---------- Tela 3 -> 4: Instruções -> Envio ---------- */

document.getElementById("btn-start").addEventListener("click", () => {
  showScreen("submit");
});

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
  if (!state.anonymousCode) {
    showError("submit-error", "Código anônimo não encontrado. Volte ao início.");
    return;
  }

  const submitBtn = submitForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: state.anonymousCode,
        link,
        network: networkInput.value,
        format: formatInput.value,
        appearedAt,
        reason,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao enviar a recomendação.");

    submitForm.reset();

    if (data.remaining <= 0) {
      await refreshStatus();
      showScreen("status");
    } else {
      submitProgress.textContent = `Recomendação enviada! Você ainda pode enviar mais ${data.remaining} (até ${data.totalForParticipant + data.remaining} no total).`;
    }
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

/* ---------- Tela 5: Status dos envios ---------- */

async function refreshStatus() {
  const list = document.getElementById("rec-list");
  const emptyMsg = document.getElementById("status-empty");
  const title = document.getElementById("status-title");
  list.innerHTML = "";

  if (!state.anonymousCode) return;

  try {
    const res = await fetch(`/api/recommendations/${state.anonymousCode}`);
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

/* ---------- Retomar sessão em caso de refresh ---------- */

(function resumeSession() {
  if (state.anonymousCode) {
    document.getElementById("anonymous-code").textContent = state.anonymousCode;
    showScreen("instructions");
  } else {
    // Sem código ainda (ou um consentId "solto", de uma sessão
    // interrompida antes do código ser gerado): volta para o início,
    // já que a tela de perfil que existia nesse meio-tempo foi
    // retirada.
    showScreen("welcome");
  }
})();
