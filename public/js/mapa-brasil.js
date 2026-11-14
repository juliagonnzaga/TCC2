const MAP_MIN_OPACITY = 0.18;

const MAP_LISTS = { reason: "motivos", desired: "desejados", recurrence: "recorrencia" };

function shortBand(label) {
  return label.replace(" anos ou mais", "+").replace(" a ", "–").replace(" anos", "");
}

function mapMetricValue(metric, state) {
  if (!state || !state.liberado) return null;
  if (metric === "total") return state.total;
  const separator = metric.indexOf(":");
  const kind = metric.slice(0, separator);
  const label = metric.slice(separator + 1);
  const found = state[MAP_LISTS[kind]].find((item) => item.label === label);
  return found ? found.percent : 0;
}

function formatMapValue(metric, value) {
  if (metric === "total") return String(Math.round(value));
  return `${Math.round(value * 10) / 10}%`;
}

function buildMetricOptions(select, options) {
  select.innerHTML = "";

  const addGroup = (groupLabel, kind, labels) => {
    const group = document.createElement("optgroup");
    group.label = groupLabel;
    labels.forEach((label) => {
      const option = document.createElement("option");
      option.value = kind === "total" ? "total" : `${kind}:${label}`;
      option.textContent = label;
      group.appendChild(option);
    });
    select.appendChild(group);
  };

  addGroup("Geral", "total", ["Total de registros"]);
  addGroup("% que apontou o motivo", "reason", options.motivos);
  addGroup("% que gostaria de ver", "desired", options.desejados);
  addGroup("% por recorrência", "recurrence", options.recorrencia);
}

async function renderBrazilMap(report) {
  const svg = document.getElementById("brazil-map");
  const metricSelect = document.getElementById("map-metric");
  const panelEmpty = document.getElementById("map-panel-empty");
  const panelDetail = document.getElementById("map-panel-detail");
  const stateName = document.getElementById("map-state-name");
  const stateNote = document.getElementById("map-state-note");
  const stateData = document.getElementById("map-state-data");
  const legendMin = document.getElementById("map-legend-min");
  const legendMax = document.getElementById("map-legend-max");

  const res = await fetch("/ibge/mapa-brasil.json");
  if (!res.ok) throw new Error("Falha ao carregar o mapa.");
  const map = await res.json();

  const states = report.porEstado || {};
  const minParticipants = report.minimoParticipantes;
  document.getElementById("map-min-participants").textContent = minParticipants;

  svg.setAttribute("viewBox", map.viewBox);
  buildMetricOptions(metricSelect, report.opcoesMapa);

  const paths = new Map();
  let selectedUf = null;

  function showState(uf) {
    if (!uf) {
      panelDetail.hidden = true;
      panelEmpty.hidden = false;
      return;
    }
    const location = map.locations.find((item) => item.id === uf);
    const state = states[uf];
    panelEmpty.hidden = true;
    panelDetail.hidden = false;
    stateName.textContent = `${location.name} (${uf})`;
    stateData.hidden = true;
    stateNote.hidden = false;

    if (!state) {
      stateNote.textContent = "Ainda não há envios deste estado.";
      return;
    }
    if (!state.liberado) {
      stateNote.textContent = `Ainda há poucas participantes neste estado para exibir detalhes sem risco de identificação (mínimo de ${minParticipants}).`;
      return;
    }

    stateNote.hidden = true;
    stateData.hidden = false;
    document.getElementById("map-stat-total").textContent = state.total;
    document.getElementById("map-stat-participantes").textContent = state.participantes;
    document.getElementById("map-stat-faixa").textContent = state.faixaPredominante
      ? shortBand(state.faixaPredominante)
      : "—";
    renderBars("map-bars-idade", state.faixasEtarias, { emptyMessage: "Sem dados de idade." });
    renderBars("map-bars-motivos", state.motivos.slice(0, 5));
    renderBars("map-bars-recorrencia", state.recorrencia);
    renderBars("map-bars-desejados", state.desejados.slice(0, 5));
    renderBars("map-bars-rede", state.porRede);
  }

  function paintMap() {
    const metric = metricSelect.value;
    const values = [];
    map.locations.forEach((location) => {
      const value = mapMetricValue(metric, states[location.id]);
      if (value !== null) values.push(value);
    });
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;

    map.locations.forEach((location) => {
      const path = paths.get(location.id);
      const state = states[location.id];
      const value = mapMetricValue(metric, state);
      const title = path.querySelector("title");

      path.classList.toggle("no-data", !state);
      path.classList.toggle("few", !!state && !state.liberado);
      path.style.fillOpacity = "";

      if (value === null) {
        title.textContent = state
          ? `${location.name}: poucos dados`
          : `${location.name}: sem envios`;
        return;
      }
      const t = max === min ? 1 : (value - min) / (max - min);
      path.style.fillOpacity = String(MAP_MIN_OPACITY + (1 - MAP_MIN_OPACITY) * t);
      title.textContent = `${location.name}: ${formatMapValue(metric, value)}`;
    });

    legendMin.textContent = values.length ? formatMapValue(metric, min) : "—";
    legendMax.textContent = values.length ? formatMapValue(metric, max) : "—";
  }

  function selectState(uf) {
    selectedUf = uf;
    paths.forEach((path, id) => path.classList.toggle("selected", id === uf));
    showState(uf);
  }

  map.locations.forEach((location) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", location.path);
    path.setAttribute("class", "map-state");
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-label", location.name);
    path.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "title"));

    path.addEventListener("mouseenter", () => showState(location.id));
    path.addEventListener("mouseleave", () => showState(selectedUf));
    path.addEventListener("focus", () => showState(location.id));
    path.addEventListener("blur", () => showState(selectedUf));
    path.addEventListener("click", () => selectState(location.id));
    path.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectState(location.id);
      }
    });

    svg.appendChild(path);
    paths.set(location.id, path);
  });

  metricSelect.addEventListener("change", paintMap);
  paintMap();
}
