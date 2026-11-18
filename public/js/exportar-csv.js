// Pedido da Julia (nov/2026): o CSV "ficava tudo desorganizado e
// misturado" ao abrir. Duas causas, as duas de locale: 1) o Excel em
// português (BR) só reconhece ";" como separador de campo ao abrir um
// .csv com duplo clique — com "," (padrão internacional), ele jogava
// a planilha inteira numa coluna só; 2) os percentuais usavam "." como
// separador decimal (42.9), que o Excel BR lê como texto, não número
// (fica desalinhado à esquerda e não ordena/soma certo). Trocado para
// ";" como separador de campo e "," como separador decimal — o padrão
// que o próprio Excel BR gera. Também foram adicionadas linhas em
// branco entre os grandes blocos (Resumo, Motivos, por Faixa etária,
// por Estado etc.), só pra dar um respiro visual ao rolar a planilha.
const CSV_DELIMITER = ";";
const CSV_COLUMNS = ["secao", "recorte", "item", "quantidade", "percentual", "observacao"];
const BLANK_ROW = CSV_COLUMNS.map(() => "");

function csvCell(value) {
  if (value === null || value === undefined || value === "") return "";
  const text =
    typeof value === "number" ? value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  const delimiterPattern = new RegExp(`["${CSV_DELIMITER}\\n\\r]`);
  return delimiterPattern.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function buildCsv(data) {
  const rows = [];
  const add = (secao, recorte, item, quantidade, percentual, observacao) =>
    rows.push([secao, recorte, item, quantidade, percentual, observacao]);
  const addList = (secao, recorte, list) =>
    list.forEach((entry) => add(secao, recorte, entry.label, entry.count, entry.percent, ""));
  const addBlankRow = () => rows.push(BLANK_ROW);

  add("Resumo", "Geral", "Registros", data.itemsColetados, "", "");
  if (data.faixaPredominante) {
    add("Resumo", "Geral", "Faixa etária mais comum", "", data.faixaPredominante.percent, data.faixaPredominante.label);
  }
  if (data.motivos.length > 0) {
    add("Resumo", "Geral", "Motivo mais apontado", data.motivos[0].count, data.motivos[0].percent, data.motivos[0].label);
  }
  add("Resumo", "Geral", "Estados com registros", data.estadosComRegistros, "", "");
  addBlankRow();

  addList("Motivos para colocar Fora do Feed", "Geral", data.motivos);
  addBlankRow();

  data.recorrenciaPorMotivo.forEach((entry) =>
    entry.recorrencia.forEach((rec) =>
      add(
        "Recorrência por motivo",
        entry.label,
        rec.label,
        rec.count,
        rec.percent,
        `Registros com o motivo: ${entry.total}`
      )
    )
  );
  addBlankRow();

  addList("Costuma encontrar conteúdos parecidos", "Geral", data.recorrencia);
  addBlankRow();

  addList("O que gostariam de ver no lugar", "Geral", data.desejados);
  addBlankRow();

  addList("Rede social", "Geral", data.porRede);

  const addGroup = (prefix, recorte, group, lists) => {
    addBlankRow();
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

  const lines = [CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(CSV_DELIMITER));
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
