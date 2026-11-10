// Relatório público (dados abertos) — sem login, só leitura.
// Busca /api/public/report (agregado e anonimizado) e renderiza.

function renderBars(containerId, items, { emptyMessage, totalForPercent } = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!items || items.length === 0) {
    const p = document.createElement("p");
    p.className = "report-empty";
    p.textContent = emptyMessage || "Ainda não há dados suficientes.";
    container.appendChild(p);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = item.label;

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max(item.percent, item.count > 0 ? 2 : 0)}%`;
    track.appendChild(fill);

    const count = document.createElement("span");
    count.className = "bar-count";
    count.textContent = `${item.count} (${item.percent}%)`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(count);
    container.appendChild(row);
  }
}

async function loadReport() {
  const loading = document.getElementById("report-loading");
  const errorBox = document.getElementById("report-error");
  const content = document.getElementById("report-content");

  try {
    const res = await fetch("/api/public/report");
    if (!res.ok) throw new Error("Não foi possível carregar o relatório.");
    const data = await res.json();

    document.getElementById("stat-items-coletados").textContent = data.itemsColetados;
    document.getElementById("stat-items-categorizados").textContent = data.itemsCategorizados;
    document.getElementById("stat-percent-concordancia").textContent =
      data.percentConcordancia === null ? "—" : `${data.percentConcordancia}%`;

    renderBars("bars-rede", data.porRede, { emptyMessage: "Ainda não há envios." });
    renderBars("bars-formato", data.porFormato, { emptyMessage: "Ainda não há envios." });
    renderBars("bars-categorias", data.categorias, {
      emptyMessage: "Ainda não há categorizações registradas.",
    });
    renderBars("bars-tom", data.tom, { emptyMessage: "Ainda não há categorizações registradas." });
    renderBars("bars-intencao", data.intencaoComercial, {
      emptyMessage: "Ainda não há categorizações registradas.",
    });
    renderBars("bars-edicao", data.edicaoAparente, {
      emptyMessage: "Ainda não há categorizações registradas.",
    });

    const categoriasHint = document.getElementById("categorias-hint");
    categoriasHint.textContent = data.totalCategorizacoes
      ? `Baseado em ${data.totalCategorizacoes} categorizações registradas (cada item pode ter até 2, uma por avaliadora).`
      : "";

    const footer = document.getElementById("report-footer-note");
    const geradoEm = new Date(data.geradoEm);
    footer.textContent = `Dados gerados em ${geradoEm.toLocaleString("pt-BR")}. Relatório agregado e anônimo — nenhum link, participante ou item individual é exibido.`;

    loading.hidden = true;
    content.hidden = false;
  } catch (err) {
    loading.hidden = true;
    errorBox.textContent = err.message || "Não foi possível carregar o relatório.";
    errorBox.hidden = false;
  }
}

loadReport();
