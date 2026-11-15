const CSV_COLUMNS = ["secao", "recorte", "item", "quantidade", "percentual", "observacao"];

function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(data) {
  const rows = [];
  const add = (secao, recorte, item, quantidade, percentual, observacao) =>
    rows.push([secao, recorte, item, quantidade, percentual, observacao]);
  const addList = (secao, recorte, list) =>
    list.forEach((entry) => add(secao, recorte, entry.label, entry.count, entry.percent, ""));

  add("Resumo", "Geral", "Registros", data.itemsColetados, "", "");
  if (data.faixaPredominante) {
    add("Resumo", "Geral", "Faixa etária mais comum", "", data.faixaPredominante.percent, data.faixaPredominante.label);
  }
  if (data.motivos.length > 0) {
    add("Resumo", "Geral", "Motivo mais apontado", data.motivos[0].count, data.motivos[0].percent, data.motivos[0].label);
  }
  add("Resumo", "Geral", "Estados com registros", data.estadosComRegistros, "", "");
  addList("Motivos para colocar Fora do Feed", "Geral", data.motivos);
  data.recorrenciaPorMotivo.forEach((entry) =>
    add(
      "Recorrência por motivo (vejo com frequência)",
      "Geral",
      entry.label,
      entry.count,
      entry.percent,
      `Registros com o motivo: ${entry.total}`
    )
  );
  addList("Costuma encontrar conteúdos parecidos", "Geral", data.recorrencia);
  addList("O que gostariam de ver no lugar", "Geral", data.desejados);
  addList("Rede social", "Geral", data.porRede);

  const addGroup = (prefix, recorte, group, lists) => {
    if (!group) {
      add(`${prefix}: resumo`, recorte, "Sem registros", "", "", "");
      return;
    }
    if (!group.liberado) {
      add(
        `${prefix}: resumo`,
        recorte,
        "Dados ocultos",
        "",
        "",
        `Poucos dados (mínimo de ${data.minimoParticipantes} participantes)`
      );
      return;
    }
    add(`${prefix}: resumo`, recorte, "Registros", group.total, "", "");
    add(`${prefix}: resumo`, recorte, "Participantes", group.participantes, "", "");
    if (group.faixaPredominante) {
      add(`${prefix}: resumo`, recorte, "Faixa etária mais comum", "", "", group.faixaPredominante);
    }
    lists.forEach(([title, key]) => addList(`${prefix}: ${title}`, recorte, group[key]));
  };

  data.faixas.forEach((band) =>
    addGroup("Faixa etária", band, data.porFaixa[band], [
      ["motivos", "motivos"],
      ["costuma encontrar conteúdos parecidos", "recorrencia"],
      ["o que gostariam de ver no lugar", "desejados"],
    ])
  );

  Object.keys(data.porEstado)
    .sort()
    .forEach((uf) =>
      addGroup("Estado", uf, data.porEstado[uf], [
        ["motivos", "motivos"],
        ["costuma encontrar conteúdos parecidos", "recorrencia"],
        ["o que gostariam de ver no lugar", "desejados"],
        ["faixa etária", "faixasEtarias"],
        ["rede social", "porRede"],
      ])
    );

  const lines = [CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

function setupCsvDownload(data) {
  const button = document.getElementById("btn-download-csv");
  button.hidden = false;
  button.addEventListener("click", () => {
    const blob = new Blob([buildCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `fora-do-feed-dados-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}
