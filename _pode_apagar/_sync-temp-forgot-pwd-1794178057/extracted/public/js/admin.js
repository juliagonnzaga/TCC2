/**
 * TCC2 - Painel da pesquisadora (Sprint 3)
 *
 * Login -> escolha de avaliadora (A/B) -> fila de submissões ->
 * categorização -> indicadores (concordância).
 */

const adminState = {
  token: sessionStorage.getItem("adminToken") || null,
  evaluator: sessionStorage.getItem("adminEvaluator") || null,
  taxonomy: null,
  queue: [],
  currentFilter: "todas",
  currentItemId: null,
};

function authHeaders() {
  return { Authorization: `Bearer ${adminState.token}` };
}

function showAdminScreen(name) {
  document.getElementById("admin-screen-login").hidden = name !== "login";
  document.getElementById("admin-screen-evaluator").hidden = name !== "evaluator";
  document.getElementById("admin-panel").hidden = name !== "panel";
}

function showAdminView(name) {
  document.getElementById("admin-view-queue").hidden = name !== "queue";
  document.getElementById("admin-view-categorize").hidden = name !== "categorize";
  document.getElementById("admin-view-indicators").hidden = name !== "indicators";
  document.getElementById("admin-view-usability").hidden = name !== "usability";
  document.querySelectorAll(".admin-tab[data-tab]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === name);
  });
}

function showError(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.hidden = false;
}
function hideError(elId) {
  document.getElementById(elId).hidden = true;
}

/* ---------- Login ---------- */

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("login-error");
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha no login.");

    adminState.token = data.token;
    sessionStorage.setItem("adminToken", data.token);
    showAdminScreen("evaluator");
  } catch (err) {
    showError("login-error", err.message);
  }
});

/* ---------- Escolha de avaliadora ---------- */

function chooseEvaluator(letter) {
  adminState.evaluator = letter;
  sessionStorage.setItem("adminEvaluator", letter);
  document.getElementById("current-evaluator-tag").textContent = `Avaliadora ${letter}`;
  showAdminScreen("panel");
  showAdminView("queue");
  loadQueue();
}

document.getElementById("btn-evaluator-a").addEventListener("click", () => chooseEvaluator("A"));
document.getElementById("btn-evaluator-b").addEventListener("click", () => chooseEvaluator("B"));

document.getElementById("btn-logout").addEventListener("click", () => {
  sessionStorage.removeItem("adminToken");
  sessionStorage.removeItem("adminEvaluator");
  adminState.token = null;
  adminState.evaluator = null;
  showAdminScreen("login");
});

/* ---------- Navegação entre abas ---------- */

document.getElementById("tab-queue").addEventListener("click", () => {
  showAdminView("queue");
  loadQueue();
});
document.getElementById("tab-indicators").addEventListener("click", () => {
  showAdminView("indicators");
  loadIndicators();
});
document.getElementById("tab-usability").addEventListener("click", () => {
  showAdminView("usability");
  loadUsability();
});

/* ---------- Fila de submissões ---------- */

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    adminState.currentFilter = btn.dataset.filter;
    renderQueue();
  });
});

async function loadQueue() {
  const res = await fetch("/api/queue", { headers: authHeaders() });
  if (res.status === 401) return showAdminScreen("login");
  const data = await res.json();
  adminState.queue = data.items;
  adminState.taxonomy = data.taxonomy;
  renderQueue();
}

function renderQueue() {
  const tbody = document.getElementById("queue-tbody");
  const emptyMsg = document.getElementById("queue-empty");
  tbody.innerHTML = "";

  const items =
    adminState.currentFilter === "pendentes"
      ? adminState.queue.filter((i) => i.status === "pendente" || i.status === "parcial")
      : adminState.queue;

  emptyMsg.hidden = items.length > 0;

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.code}</td>
      <td>${item.network} &middot; ${item.format}</td>
      <td>${item.appearedAt}</td>
      <td><span class="status-badge status-${item.status.replace(/\s/g, "-")}">${item.status}</span></td>
      <td><button class="btn-link" data-open="${item.id}">Categorizar</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openCategorize(btn.dataset.open));
  });
}

/* ---------- Categorização ---------- */

function renderCategoryChips() {
  const groupA = document.getElementById("cat-group-a");
  const groupB = document.getElementById("cat-group-b");
  groupA.innerHTML = "";
  groupB.innerHTML = "";

  adminState.taxonomy["Aparência idealizada"].forEach((cat) => {
    groupA.appendChild(buildCategoryChip(cat));
  });
  adminState.taxonomy["Aceitação corporal"].forEach((cat) => {
    groupB.appendChild(buildCategoryChip(cat));
  });
}

function buildCategoryChip(category) {
  const label = document.createElement("label");
  label.className = "chip";
  label.innerHTML = `<input type="checkbox" name="cat-category" value="${category}" /><span>${category}</span>`;
  return label;
}

function enforceMaxTwoCategories() {
  const checked = document.querySelectorAll('input[name="cat-category"]:checked');
  const all = document.querySelectorAll('input[name="cat-category"]');
  const hint = document.getElementById("cat-category-hint");

  if (checked.length >= 2) {
    all.forEach((c) => {
      if (!c.checked) c.disabled = true;
    });
    hint.textContent = "Máximo de 2 categorias atingido.";
  } else {
    all.forEach((c) => (c.disabled = false));
    hint.textContent = "Escolha até 2 categorias.";
  }
}

function openCategorize(id) {
  const item = adminState.queue.find((i) => i.id === id);
  if (!item) return;
  adminState.currentItemId = id;

  document.getElementById("cat-code").textContent = item.code;
  document.getElementById("cat-network-format").textContent = `${item.network} · ${item.format}`;
  document.getElementById("cat-date").textContent = item.appearedAt;
  const linkEl = document.getElementById("cat-link");
  linkEl.href = item.link;
  linkEl.textContent = item.link;
  document.getElementById("cat-reason").textContent = item.reason;

  renderCategoryChips();
  document.getElementById("categorize-form").reset();
  enforceMaxTwoCategories();
  hideError("categorize-error");

  // Mostra a categorização da outra avaliadora, se já existir (sem
  // revelar qual escolha marcar - a ideia é registrar de forma
  // independente e só comparar depois, mas exibir aqui ajuda a decidir
  // quando marcar "caso ambíguo").
  const otherBox = document.getElementById("cat-other-evaluator");
  const otherLetter = adminState.evaluator === "A" ? "B" : "A";
  const otherCategorization = item.categorizations.find((c) => c.evaluator === otherLetter);
  if (otherCategorization) {
    otherBox.hidden = false;
    document.getElementById("cat-other-evaluator-text").textContent =
      `Avaliadora ${otherLetter}: ${otherCategorization.categories.join(", ")}` +
      (otherCategorization.ambiguous ? " (marcado como ambíguo)" : "");
  } else {
    otherBox.hidden = true;
  }

  // Se a própria avaliadora já categorizou este item antes, pré-preenche.
  const mine = item.categorizations.find((c) => c.evaluator === adminState.evaluator);
  if (mine) {
    mine.categories.forEach((cat) => {
      const input = document.querySelector(`input[name="cat-category"][value="${cat}"]`);
      if (input) input.checked = true;
    });
    document.getElementById("cat-tone").value = mine.tone;
    document.querySelector(`input[name="cat-commercial"][value="${mine.commercialIntent}"]`).checked = true;
    document.querySelector(`input[name="cat-editing"][value="${mine.apparentEditing}"]`).checked = true;
    document.getElementById("cat-ambiguous").checked = mine.ambiguous;
    document.getElementById("cat-notes").value = mine.notes || "";
    enforceMaxTwoCategories();
  }

  showAdminView("categorize");
}

document.getElementById("btn-back-to-queue").addEventListener("click", () => {
  showAdminView("queue");
});

document.getElementById("categorize-form").addEventListener("change", (event) => {
  if (event.target.name === "cat-category") enforceMaxTwoCategories();
});

document.getElementById("categorize-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("categorize-error");

  const categories = Array.from(
    document.querySelectorAll('input[name="cat-category"]:checked')
  ).map((el) => el.value);
  const toneEl = document.getElementById("cat-tone");
  const commercialEl = document.querySelector('input[name="cat-commercial"]:checked');
  const editingEl = document.querySelector('input[name="cat-editing"]:checked');
  const ambiguous = document.getElementById("cat-ambiguous").checked;
  const notes = document.getElementById("cat-notes").value.trim();

  if (categories.length === 0 || !toneEl.value || !commercialEl || !editingEl) {
    showError("categorize-error", "Preencha ao menos 1 categoria, tom, intenção comercial e edição aparente.");
    return;
  }

  const submitBtn = event.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvando...";

  try {
    const res = await fetch(`/api/recommendations/${adminState.currentItemId}/categorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        evaluator: adminState.evaluator,
        categories,
        tone: toneEl.value,
        commercialIntent: commercialEl.value,
        apparentEditing: editingEl.value,
        ambiguous,
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao salvar categorização.");

    await loadQueue();
    showAdminView("queue");
  } catch (err) {
    showError("categorize-error", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar e próximo";
  }
});

/* ---------- Indicadores ---------- */

async function loadIndicators() {
  const res = await fetch("/api/agreement", { headers: authHeaders() });
  if (res.status === 401) return showAdminScreen("login");
  const data = await res.json();

  document.getElementById("stat-collected").textContent = data.itemsColetados;
  document.getElementById("stat-categorized").textContent =
    `${data.itemsCategorizados} (${data.percentCategorizados}%)`;
  document.getElementById("stat-agreement").textContent =
    data.percentConcordancia === null ? "—" : `${data.percentConcordancia}%`;
  document.getElementById("stat-time").textContent =
    data.tempoMedioMinutos === null ? "—" : data.tempoMedioMinutos;

  const list = document.getElementById("divergent-list");
  const emptyMsg = document.getElementById("divergent-empty");
  list.innerHTML = "";
  emptyMsg.hidden = data.divergentItems.length > 0;

  data.divergentItems.forEach((item) => {
    const li = document.createElement("li");
    li.className = "rec-item";
    li.innerHTML = `
      <div class="rec-item-top">
        <span class="rec-badge">${item.code}</span>
        <span class="rec-status">divergente</span>
      </div>
      <a class="rec-link" href="${item.link}" target="_blank" rel="noopener noreferrer">${item.link}</a>
      <span class="rec-date">A: ${item.categoriesA.join(", ")} &middot; B: ${item.categoriesB.join(", ")}</span>
    `;
    list.appendChild(li);
  });
}

/* ---------- Usabilidade (SUS) ---------- */

async function loadUsability() {
  const res = await fetch("/api/sus", { headers: authHeaders() });
  if (res.status === 401) return showAdminScreen("login");
  const data = await res.json();

  document.getElementById("sus-stat-count").textContent = data.count;
  document.getElementById("sus-stat-score").textContent =
    data.averageScore === null ? "—" : data.averageScore;
  document.getElementById("sus-stat-band").textContent = data.band || "—";

  const itemsBody = document.getElementById("sus-items-tbody");
  const emptyMsg = document.getElementById("sus-empty");
  itemsBody.innerHTML = "";
  emptyMsg.hidden = data.count > 0;

  data.perItemAverage.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.item}</td>
      <td>${entry.text}</td>
      <td class="susitem-score">${entry.average === null ? "—" : entry.average}</td>
    `;
    itemsBody.appendChild(tr);
  });

  const responsesBody = document.getElementById("sus-responses-tbody");
  responsesBody.innerHTML = "";
  data.responses.forEach((r) => {
    const tr = document.createElement("tr");
    const date = new Date(r.submittedAt).toLocaleString("pt-BR");
    tr.innerHTML = `
      <td>${r.testerLabel || "—"}</td>
      <td>${r.score}</td>
      <td>${r.band}</td>
      <td>${date}</td>
    `;
    responsesBody.appendChild(tr);
  });
}

/* ---------- Retomar sessão ---------- */

(function resumeAdminSession() {
  if (adminState.token && adminState.evaluator) {
    document.getElementById("current-evaluator-tag").textContent = `Avaliadora ${adminState.evaluator}`;
    showAdminScreen("panel");
    showAdminView("queue");
    loadQueue();
  } else if (adminState.token) {
    showAdminScreen("evaluator");
  } else {
    showAdminScreen("login");
  }
})();
