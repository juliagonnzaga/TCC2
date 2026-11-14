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

function renderAgeMatrix(data) {
  const container = document.getElementById("age-matrix");
  const select = document.getElementById("matrix-metric");
  const rowsByMetric = {
    motivos: data.opcoesMapa.motivos,
    desejados: data.opcoesMapa.desejados,
    recorrencia: data.opcoesMapa.recorrencia,
  };

  function draw() {
    const metric = select.value;
    const table = document.createElement("table");
    table.className = "matrix";

    const head = document.createElement("tr");
    head.appendChild(document.createElement("th"));
    data.faixas.forEach((band) => {
      const th = document.createElement("th");
      th.textContent = shortBand(band);
      const group = data.porFaixa[band];
      const note = document.createElement("small");
      if (!group) note.textContent = "sem registros";
      else if (!group.liberado) note.textContent = "poucos dados";
      else note.textContent = `${group.participantes} participantes`;
      th.appendChild(note);
      head.appendChild(th);
    });
    table.appendChild(head);

    rowsByMetric[metric].forEach((label) => {
      const tr = document.createElement("tr");
      const rowLabel = document.createElement("th");
      rowLabel.className = "row-label";
      rowLabel.textContent = label;
      tr.appendChild(rowLabel);

      data.faixas.forEach((band) => {
        const td = document.createElement("td");
        const group = data.porFaixa[band];
        if (!group || !group.liberado) {
          td.textContent = "—";
          td.className = "no-data";
        } else {
          const item = group[metric].find((entry) => entry.label === label);
          const value = item ? item.percent : 0;
          const alpha = Math.min(0.9, value / 100 + (value > 0 ? 0.08 : 0));
          td.textContent = `${value}%`;
          td.style.background = `rgba(123, 63, 228, ${alpha})`;
          td.style.color = alpha > 0.5 ? "#ffffff" : "";
        }
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    container.replaceChildren(table);
  }

  select.addEventListener("change", draw);
  draw();
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
    renderBars("bars-categorias", data.categorias, {
      emptyMessage: "Ainda não há categorizações registradas.",
    });
    renderBars("bars-motivos", data.motivos, { emptyMessage: "Ainda não há registros." });
    renderBars(
      "bars-recorrencia-motivo",
      data.recorrenciaPorMotivo.map((item) => ({ ...item, label: `${item.label} (n=${item.total})` })),
      { emptyMessage: "Ainda não há registros." }
    );
    renderBars("bars-recorrencia", data.recorrencia, { emptyMessage: "Ainda não há registros." });
    renderBars("bars-desejados", data.desejados, { emptyMessage: "Ainda não há registros." });
    document.getElementById("matrix-min-participants").textContent = data.minimoParticipantes;
    renderAgeMatrix(data);
    renderBars("bars-tom", data.tom, { emptyMessage: "Ainda não há categorizações registradas." });
    renderBars("bars-intencao", data.intencaoComercial, {
      emptyMessage: "Ainda não há categorizações registradas.",
    });
    renderBars("bars-edicao", data.edicaoAparente, {
      emptyMessage: "Ainda não há categorizações registradas.",
    });

    renderBrazilMap(data).catch(() => {
      document.getElementById("map-error").hidden = false;
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
