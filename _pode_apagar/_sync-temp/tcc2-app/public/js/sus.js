/**
 * TCC2 - Questionário System Usability Scale (SUS)
 *
 * Sprint 4 - teste formativo de usabilidade: as 10 afirmações padrão do
 * SUS (BROOKE, 1996) são montadas dinamicamente a partir do que o
 * back-end já usa para pontuar (evita duplicar o texto das afirmações
 * em dois lugares). Aplicado depois que a testadora executa as tarefas
 * representativas descritas em docs/guia-teste-usabilidade.md.
 */

const SUS_ITEMS = [
  "Eu acho que gostaria de usar este sistema com frequência.",
  "Eu achei o sistema desnecessariamente complexo.",
  "Eu achei o sistema fácil de usar.",
  "Eu acho que precisaria de ajuda de uma pessoa com conhecimentos técnicos para conseguir usar este sistema.",
  "Eu achei que as várias funções deste sistema estavam bem integradas.",
  "Eu achei muita inconsistência neste sistema.",
  "Eu imagino que a maioria das pessoas aprenderia a usar este sistema rapidamente.",
  "Eu achei o sistema muito complicado de usar.",
  "Eu me senti muito confiante usando o sistema.",
  "Eu precisei aprender uma série de coisas antes de conseguir usar este sistema.",
];

const itemsContainer = document.getElementById("sus-items");

SUS_ITEMS.forEach((text, idx) => {
  const itemNumber = idx + 1;
  const fieldset = document.createElement("fieldset");
  fieldset.className = "field";
  fieldset.innerHTML = `
    <legend>${itemNumber}. ${text}</legend>
    <div class="chip-group sus-scale" data-item="${itemNumber}">
      ${[1, 2, 3, 4, 5]
        .map(
          (n) => `
        <label class="chip">
          <input type="radio" name="sus-item-${itemNumber}" value="${n}" required />
          <span>${n}</span>
        </label>`
        )
        .join("")}
    </div>
  `;
  itemsContainer.appendChild(fieldset);
});

function showError(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.hidden = false;
}
function hideError(elId) {
  document.getElementById(elId).hidden = true;
}

const susForm = document.getElementById("sus-form");

susForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError("sus-error");

  const answers = [];
  for (let itemNumber = 1; itemNumber <= SUS_ITEMS.length; itemNumber++) {
    const checked = susForm.querySelector(`input[name="sus-item-${itemNumber}"]:checked`);
    if (!checked) {
      showError("sus-error", "Responda todas as afirmações antes de enviar.");
      return;
    }
    answers.push(Number(checked.value));
  }

  const testerLabel = document.getElementById("tester-label").value.trim();
  const submitBtn = susForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const res = await fetch("/api/sus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testerLabel: testerLabel || undefined, answers }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao enviar respostas.");

    document.getElementById("screen-sus-form").hidden = true;
    document.getElementById("screen-sus-thanks").hidden = false;
  } catch (err) {
    showError("sus-error", err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar respostas";
  }
});
