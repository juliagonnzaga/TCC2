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
    if (!Array.isArray(data.motivos) || !data.opcoesMapa || !("atualizadoEm" in data) || !("faixaPredominante" in data)) {
      throw new Error(
        "O servidor está com uma versão antiga. Feche o terminal do servidor e rode node server.js de novo."
      );
    }

    document.getElementById("stat-items-coletados").textContent = data.itemsColetados;
    if (data.faixaPredominante) {
      document.getElementById("stat-faixa").textContent = shortBand(data.faixaPredominante.label);
      document.getElementById("stat-faixa-label").textContent =
        `faixa etária mais comum (${data.faixaPredominante.percent}%)`;
    }
    if (data.motivos.length > 0) {
      document.getElementById("stat-motivo").textContent = data.motivos[0].label;
      document.getElementById("stat-motivo-label").textContent =
        `motivo mais apontado (${data.motivos[0].percent}%)`;
    }
    document.getElementById("stat-estados").textContent = data.estadosComRegistros;

    renderBars("bars-rede", data.porRede, { emptyMessage: "Ainda não há envios." });
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
    setupCsvDownload(data);

    renderBrazilMap(data).catch(() => {
      document.getElementById("map-error").hidden = false;
    });

    const footer = document.getElementById("report-footer-note");
    const atualizadoEm = data.atualizadoEm ? new Date(data.atualizadoEm) : null;
    const quando = atualizadoEm
      ? `Dados atualizados em ${atualizadoEm.toLocaleDateString("pt-BR")} às ${atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}, no envio mais recente.`
      : "Ainda não há envios registrados.";
    footer.textContent = `${quando} Relatório agregado e anônimo, nenhum link, participante ou item individual é exibido. O formulário é anônimo e nenhum dado exibido aqui identifica quem participou.`;

    loading.hidden = true;
    content.hidden = false;
  } catch (err) {
    loading.hidden = true;
    errorBox.textContent = err.message || "Não foi possível carregar o relatório.";
    errorBox.hidden = false;
  }
}

loadReport();
