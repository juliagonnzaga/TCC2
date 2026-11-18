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

function renderWordCloud(containerId, items, { emptyMessage } = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!items || items.length === 0) {
    const p = document.createElement("p");
    p.className = "report-empty";
    p.textContent = emptyMessage || "Ainda não há dados suficientes.";
    container.appendChild(p);
    return;
  }

  const maxPercent = Math.max(...items.map((item) => item.percent), 1);
  const cloud = document.createElement("div");
  cloud.className = "word-cloud";
  cloud.setAttribute("role", "list");

  for (const item of items) {
    const weight = Math.sqrt(item.percent / maxPercent);
    const word = document.createElement("span");
    word.className = "word-cloud-item";
    word.setAttribute("role", "listitem");
    word.setAttribute("tabindex", "0");
    word.style.fontSize = `${14 + weight * 34}px`;
    word.style.opacity = String(0.45 + weight * 0.55);
    word.dataset.tip = `${item.count} ${item.count === 1 ? "registro" : "registros"} · ${item.percent}%`;
    word.textContent = item.label;
    cloud.appendChild(word);
  }

  container.appendChild(cloud);
}

function renderColumns(containerId, items, { emptyMessage } = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!items || items.length === 0) {
    const p = document.createElement("p");
    p.className = "report-empty";
    p.textContent = emptyMessage || "Ainda não há dados suficientes.";
    container.appendChild(p);
    return;
  }

  const maxPercent = Math.max(...items.map((item) => item.percent), 1);

  const chart = document.createElement("div");
  chart.className = "col-chart";
  chart.setAttribute("role", "list");

  for (const item of items) {
    const col = document.createElement("div");
    col.className = "col-item";
    col.setAttribute("role", "listitem");
    col.title = `${item.label}: ${item.count} (${item.percent}%)`;

    const value = document.createElement("span");
    value.className = "col-value";
    value.textContent = `${item.percent}%`;

    const plot = document.createElement("div");
    plot.className = "col-plot";
    const bar = document.createElement("div");
    bar.className = "col-bar";
    bar.style.height = `${Math.max((item.percent / maxPercent) * 100, item.count > 0 ? 3 : 0)}%`;
    plot.appendChild(bar);

    const count = document.createElement("span");
    count.className = "col-count";
    count.textContent = `${item.count} ${item.count === 1 ? "registro" : "registros"}`;

    const label = document.createElement("span");
    label.className = "col-label";
    label.textContent = item.label;

    col.appendChild(value);
    col.appendChild(plot);
    col.appendChild(count);
    col.appendChild(label);
    chart.appendChild(col);
  }

  container.appendChild(chart);
}

// Pedido da Julia (nov/2026): a seção "Quais conteúdos são mais
// recorrentes?" mostrava só a fatia "vejo com frequência" de cada
// motivo (um valor só, no mesmo gráfico de colunas das outras seções),
// o que ficava 0%/0 registros — parecendo "sem dados" por engano —
// sempre que nenhuma participante daquele motivo tivesse marcado justo
// essa opção, mesmo havendo registros nas outras 3 opções de
// recorrência. Agora desenha uma barra segmentada por motivo com a
// distribuição completa das 4 respostas, cores fixas na mesma ordem em
// toda a lista, e uma legenda só (não repetida em cada barra).
const RECURRENCE_COLORS = ["--viz-series-1", "--viz-series-2", "--viz-series-3", "--viz-series-4"];

function renderRecurrenceByMotivo(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!items || items.length === 0) {
    const p = document.createElement("p");
    p.className = "report-empty";
    p.textContent = "Ainda não há registros.";
    container.appendChild(p);
    return;
  }

  // A ordem das opções de recorrência é fixa e igual em todas as
  // barras (recurrenceBreakdown sempre devolve as 4, mesmo com 0
  // registros), então o primeiro item já serve pra montar a legenda.
  const legend = document.createElement("div");
  legend.className = "motivo-legend";
  legend.setAttribute("role", "list");
  items[0].recorrencia.forEach((rec, i) => {
    const entry = document.createElement("span");
    entry.className = "motivo-legend-item";
    entry.setAttribute("role", "listitem");
    const swatch = document.createElement("i");
    swatch.className = "motivo-legend-swatch";
    swatch.style.background = `var(${RECURRENCE_COLORS[i]})`;
    entry.appendChild(swatch);
    entry.appendChild(document.createTextNode(rec.label));
    legend.appendChild(entry);
  });
  container.appendChild(legend);

  const list = document.createElement("div");
  list.setAttribute("role", "list");

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "motivo-row";
    row.setAttribute("role", "listitem");

    const header = document.createElement("div");
    header.className = "motivo-row-header";
    const title = document.createElement("span");
    title.textContent = item.label;
    const n = document.createElement("span");
    n.className = "motivo-row-n";
    n.textContent = `n=${item.total}`;
    header.appendChild(title);
    header.appendChild(n);

    const bar = document.createElement("div");
    bar.className = "motivo-row-bar";
    bar.setAttribute("role", "img");
    bar.setAttribute(
      "aria-label",
      item.recorrencia.map((rec) => `${rec.label}: ${rec.count} (${rec.percent}%)`).join(", ")
    );

    item.recorrencia.forEach((rec, i) => {
      if (rec.count === 0) return; // uma fatia zerada não desenha nada
      const seg = document.createElement("span");
      seg.className = "motivo-row-seg";
      seg.style.background = `var(${RECURRENCE_COLORS[i]})`;
      seg.style.flexGrow = rec.count;
      seg.title = `${rec.label}: ${rec.count} (${rec.percent}%)`;
      bar.appendChild(seg);
    });

    row.appendChild(header);
    row.appendChild(bar);
    list.appendChild(row);
  }

  container.appendChild(list);
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

    renderColumns("bars-rede", data.porRede, { emptyMessage: "Ainda não há envios." });
    renderColumns("bars-motivos", data.motivos, { emptyMessage: "Ainda não há registros." });
    renderRecurrenceByMotivo("bars-recorrencia-motivo", data.recorrenciaPorMotivo);
    renderColumns("bars-recorrencia", data.recorrencia, { emptyMessage: "Ainda não há registros." });
    renderWordCloud("desejados-wordcloud", data.desejados, { emptyMessage: "Ainda não há registros." });
    renderColumns("bars-desejados", data.desejados, { emptyMessage: "Ainda não há registros." });
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

document.getElementById("btn-toggle-desejados-view").addEventListener("click", () => {
  const wordCloud = document.getElementById("desejados-wordcloud");
  const list = document.getElementById("bars-desejados");
  const btn = document.getElementById("btn-toggle-desejados-view");
  const willShowList = wordCloud.hidden === false;
  wordCloud.hidden = willShowList;
  list.hidden = !willShowList;
  btn.textContent = willShowList ? "Ver como nuvem de palavras" : "Ver como lista";
});

loadReport();
