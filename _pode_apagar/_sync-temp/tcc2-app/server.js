/**
 * TCC2 - Sistema web de coleta de recomendações
 *
 * Sprint 1: Fundação e fluxo inicial da participante
 *  - Serviço de registro do aceite do TCLE     (POST /api/consent)
 *  - Serviço de geração do código anônimo      (POST /api/profile)
 *
 * Sprint 2: Coleta de recomendações
 *  - Serviço de recebimento da recomendação    (POST /api/recommendations)
 *  - Serviço de consulta dos envios            (GET  /api/recommendations/:code)
 *
 * Sprint 3: Painel da pesquisadora
 *  - Serviço de autenticação                   (POST /api/auth/login)
 *  - Serviço de listagem das submissões        (GET  /api/queue)
 *  - Serviço de registro da categoria por item (POST /api/recommendations/:id/categorize)
 *  - Serviço de cálculo de concordância        (GET  /api/agreement)
 *
 * Sprint 4: Testes e encerramento da construção (não introduz novas User
 * Stories — ver Seção 3.5.7 da metodologia; consolida e valida o que foi
 * construído nas sprints 1-3)
 *  - Questionário System Usability Scale (SUS), aplicado às usuárias em
 *    teste formativo de usabilidade (BROOKE, 1996)
 *    - Serviço de registro de uma resposta ao SUS  (POST /api/sus)
 *    - Serviço de consulta dos resultados do SUS   (GET  /api/sus)
 *  - Testes funcionais automatizados cobrindo os critérios de aceitação
 *    de cada User Story (ver tests/test-acceptance.js)
 *
 * IMPORTANTE (mudança de protocolo combinada com a orientação): a partir
 * da Sprint 2, a coleta passou de "print anonimizado" para "link do
 * post/reels", para reduzir a fricção da participante. Isso remove a
 * etapa de anonimização de terceiros que estava no protocolo original
 * (Seção 3.3.1 da Monografia 1) — o texto da metodologia (TCC1/TCC2)
 * ainda precisa ser revisado para refletir essa mudança.
 *
 * Armazenamento: arquivos JSON locais em ./data (suficiente para o MVP).
 * Antes da coleta real com participantes, isso deve ser substituído por
 * armazenamento cifrado, conforme já indicado na metodologia (Seção
 * 3.5.2 / Trabalhos Futuros da Monografia 1).
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const CONSENTS_FILE = path.join(DATA_DIR, "consents.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles.json");
const RECOMMENDATIONS_FILE = path.join(DATA_DIR, "recommendations.json");
const CATEGORIZATIONS_FILE = path.join(DATA_DIR, "categorizations.json");
const SUS_FILE = path.join(DATA_DIR, "sus.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of [
  CONSENTS_FILE,
  PROFILES_FILE,
  RECOMMENDATIONS_FILE,
  CATEGORIZATIONS_FILE,
  SUS_FILE,
]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
}

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
 * Sub-tarefa: "Serviço de registro do aceite do TCLE (back-end)"
 * Registra o aceite com timestamp e devolve um consentId, que a tela
 * de perfil (próxima etapa) precisa apresentar para gerar o código
 * anônimo — isso é o que garante, no back-end, que ninguém chega ao
 * perfil sem antes ter aceitado o TCLE.
 */
app.post("/api/consent", (req, res) => {
  const consents = readJSON(CONSENTS_FILE);
  const consentId = crypto.randomUUID();
  const record = { consentId, acceptedAt: new Date().toISOString() };
  consents.push(record);
  writeJSON(CONSENTS_FILE, consents);
  res.status(201).json({ consentId });
});

/**
 * Sub-tarefa: "Serviço de geração do código anônimo (back-end)"
 * Recebe consentId (+ opcionalmente faixa etária e rede social), valida
 * que o TCLE foi aceito, e gera um código anônimo único (ex.: P427).
 * Nenhum dado identificável é solicitado ou armazenado.
 *
 * NOTA (orientação do professor, Sprint 3): a tela de perfil mínimo
 * anônimo (faixa etária + rede social) foi retirada do front-end por
 * enquanto — essa parte não deve ser desenvolvida agora. Por isso
 * ageRange e network passaram a ser OPCIONAIS aqui: o front (app.js)
 * chama este endpoint só com o consentId, logo após o aceite do TCLE,
 * para gerar o código sem pedir dados demográficos. Os campos
 * continuam aceitos (e validados, se enviados) para o caso de essa
 * tela voltar depois.
 */
function generateAnonymousCode(existingCodes) {
  let code;
  do {
    const n = Math.floor(Math.random() * 900) + 100; // 100-999
    code = `P${n}`;
  } while (existingCodes.includes(code));
  return code;
}

const VALID_AGE_RANGES = ["13-17", "18-24", "25-34", "35-44", "45+"];
const VALID_NETWORKS = ["Instagram", "TikTok", "Outra"];

app.post("/api/profile", (req, res) => {
  const { consentId, ageRange, network } = req.body || {};

  if (!consentId) {
    return res.status(400).json({ error: "consentId é obrigatório." });
  }
  if (ageRange && !VALID_AGE_RANGES.includes(ageRange)) {
    return res.status(400).json({ error: "Faixa etária inválida." });
  }
  if (network && !VALID_NETWORKS.includes(network)) {
    return res.status(400).json({ error: "Rede social inválida." });
  }

  const consents = readJSON(CONSENTS_FILE);
  const consentExists = consents.some((c) => c.consentId === consentId);
  if (!consentExists) {
    return res
      .status(400)
      .json({ error: "TCLE ainda não foi aceito para este consentId." });
  }

  const profiles = readJSON(PROFILES_FILE);
  const code = generateAnonymousCode(profiles.map((p) => p.code));
  const record = {
    code,
    ageRange: ageRange || null,
    network: network || null,
    consentId,
    createdAt: new Date().toISOString(),
  };
  profiles.push(record);
  writeJSON(PROFILES_FILE, profiles);

  res.status(201).json({ code });
});

/* ===================== Sprint 2: Coleta de recomendações ===================== */

const VALID_FORMATS = ["Reels", "Feed", "Explorar", "Outro"];
const MAX_RECOMMENDATIONS_PER_PARTICIPANT = 3;

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sub-tarefa: "Serviço de recebimento e armazenamento da recomendação (back-end)"
 * Recebe o código anônimo da participante, o link do conteúdo, rede,
 * formato, data em que apareceu e o motivo percebido. Limita a 3
 * recomendações por participante, conforme o protocolo (Seção 3.3.1
 * da Monografia 1: "até três recomendações elegíveis").
 */
app.post("/api/recommendations", (req, res) => {
  const { code, link, network, format, appearedAt, reason } = req.body || {};

  if (!code || !link || !network || !format || !appearedAt || !reason) {
    return res.status(400).json({
      error:
        "code, link, network, format, appearedAt e reason são obrigatórios.",
    });
  }
  if (!isValidUrl(link)) {
    return res
      .status(400)
      .json({ error: "Cole um link válido (começando com http:// ou https://)." });
  }
  if (!VALID_NETWORKS.includes(network)) {
    return res.status(400).json({ error: "Rede social inválida." });
  }
  if (!VALID_FORMATS.includes(format)) {
    return res.status(400).json({ error: "Formato inválido." });
  }
  if (String(reason).trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Conte, em poucas palavras, por que acha que isso foi recomendado." });
  }
  // Defeito encontrado na Sprint 4 (teste funcional do critério de
  // aceitação "data em que apareceu"): nada impedia enviar uma data no
  // futuro. Permite até o dia seguinte, de folga para fuso horário.
  const appearedAtDate = new Date(appearedAt);
  const oneDayAhead = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (isNaN(appearedAtDate) || appearedAtDate > oneDayAhead) {
    return res
      .status(400)
      .json({ error: "Informe uma data válida, que não seja no futuro." });
  }

  const profiles = readJSON(PROFILES_FILE);
  const participant = profiles.find((p) => p.code === code);
  if (!participant) {
    return res.status(400).json({ error: "Código anônimo não encontrado." });
  }

  const recommendations = readJSON(RECOMMENDATIONS_FILE);
  const existingForParticipant = recommendations.filter((r) => r.code === code);
  if (existingForParticipant.length >= MAX_RECOMMENDATIONS_PER_PARTICIPANT) {
    return res.status(409).json({
      error: `Você já enviou ${MAX_RECOMMENDATIONS_PER_PARTICIPANT} recomendações, o máximo previsto pelo protocolo. Obrigada pela participação!`,
    });
  }

  const record = {
    id: crypto.randomUUID(),
    code,
    link,
    network,
    format,
    appearedAt,
    reason,
    status: "recebido",
    submittedAt: new Date().toISOString(),
  };
  recommendations.push(record);
  writeJSON(RECOMMENDATIONS_FILE, recommendations);

  res.status(201).json({
    recommendation: record,
    totalForParticipant: existingForParticipant.length + 1,
    remaining: MAX_RECOMMENDATIONS_PER_PARTICIPANT - (existingForParticipant.length + 1),
  });
});

/**
 * Sub-tarefa: "Serviço de consulta dos envios (back-end)"
 * Retorna as recomendações já enviadas por um código anônimo, para a
 * tela de status dos envios.
 */
app.get("/api/recommendations/:code", (req, res) => {
  const { code } = req.params;
  const recommendations = readJSON(RECOMMENDATIONS_FILE).filter(
    (r) => r.code === code
  );
  res.json({
    items: recommendations,
    total: recommendations.length,
    max: MAX_RECOMMENDATIONS_PER_PARTICIPANT,
  });
});

/* ===================== Sprint 3: Painel da pesquisadora ===================== */

/**
 * Simplificação combinada para o MVP (ver issue "Sistema de Login da
 * Pesquisadora"): usuário único e fixo, sem cadastro de múltiplas
 * avaliadoras. A senha vem de uma variável de ambiente para não ficar
 * hard-coded em produção; em dev, cai no valor padrão abaixo.
 *
 * Duas avaliadoras (A e B) continuam existindo no protocolo — a pessoa
 * que loga escolhe, na própria tela, como qual avaliadora está
 * categorizando naquele momento (ver ADMIN_EVALUATORS). Isso permite
 * calcular concordância entre avaliadoras sem precisar de contas
 * separadas.
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pesquisa123";
const ADMIN_EVALUATORS = ["A", "B"];
const validTokens = new Set();

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  next();
}

/**
 * Sub-tarefa: "Serviço de autenticação (back-end)"
 */
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Senha incorreta." });
  }
  const token = crypto.randomUUID();
  validTokens.add(token);
  res.json({ token, evaluators: ADMIN_EVALUATORS });
});

// Taxonomia (Monografia 1, Seção 3.3.2 / Tabelas 3.1-3.3)
const TAXONOMY = {
  "Aparência idealizada": [
    "Magreza ideal",
    "Corpo fitness/definido",
    "Emagrecimento e dieta",
    "Procedimentos estéticos",
    "Beleza corretiva",
  ],
  "Aceitação corporal": [
    "Diversidade corporal",
    "Autoaceitação",
    "Neutralidade corporal",
    "Saúde mental e corpo",
  ],
};
const ALL_CATEGORIES = Object.values(TAXONOMY).flat();
const VALID_TONES = ["inspiracional", "normativo", "crítico", "humor"];
const VALID_YES_NO = ["sim", "não"];
const VALID_EDITING = ["sim", "não", "incerto"];

function sameCategorySet(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * Deriva o status de um item a partir das categorizações registradas
 * pelas avaliadoras A e B (ver Figura 3.3/3.4 da Monografia 1).
 */
function computeItemStatus(categorizationsForItem) {
  const byEvaluator = Object.fromEntries(
    categorizationsForItem.map((c) => [c.evaluator, c])
  );
  const done = ADMIN_EVALUATORS.filter((e) => byEvaluator[e]);

  if (done.length === 0) return "pendente";
  if (done.length === 1) return "parcial";

  const [a, b] = ADMIN_EVALUATORS.map((e) => byEvaluator[e]);
  const anyAmbiguous = a.ambiguous || b.ambiguous;
  const agree = sameCategorySet(a.categories, b.categories);
  return agree && !anyAmbiguous ? "categorizado" : "em dúvida";
}

/**
 * Sub-tarefa: "Serviço de listagem das submissões (back-end)"
 */
app.get("/api/queue", requireAuth, (req, res) => {
  const recommendations = readJSON(RECOMMENDATIONS_FILE);
  const categorizations = readJSON(CATEGORIZATIONS_FILE);

  const items = recommendations
    .map((r) => {
      const itemCategorizations = categorizations.filter((c) => c.recommendationId === r.id);
      return {
        ...r,
        status: computeItemStatus(itemCategorizations),
        categorizations: itemCategorizations,
      };
    })
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  res.json({ items, taxonomy: TAXONOMY, evaluators: ADMIN_EVALUATORS });
});

/**
 * Sub-tarefa: "Serviço de registro da categoria por item (back-end)"
 * Cada avaliadora pode categorizar um item uma vez; enviar de novo
 * substitui a categorização anterior dela (permite correção).
 */
app.post("/api/recommendations/:id/categorize", requireAuth, (req, res) => {
  const { id } = req.params;
  const { evaluator, categories, tone, commercialIntent, apparentEditing, ambiguous, notes } =
    req.body || {};

  const recommendations = readJSON(RECOMMENDATIONS_FILE);
  const recommendation = recommendations.find((r) => r.id === id);
  if (!recommendation) {
    return res.status(404).json({ error: "Item não encontrado." });
  }
  if (!ADMIN_EVALUATORS.includes(evaluator)) {
    return res.status(400).json({ error: "Avaliadora inválida." });
  }
  if (!Array.isArray(categories) || categories.length === 0 || categories.length > 2) {
    return res.status(400).json({ error: "Escolha 1 ou 2 categorias." });
  }
  if (!categories.every((c) => ALL_CATEGORIES.includes(c))) {
    return res.status(400).json({ error: "Categoria inválida." });
  }
  if (!VALID_TONES.includes(tone)) {
    return res.status(400).json({ error: "Tom inválido." });
  }
  if (!VALID_YES_NO.includes(commercialIntent)) {
    return res.status(400).json({ error: "Intenção comercial inválida." });
  }
  if (!VALID_EDITING.includes(apparentEditing)) {
    return res.status(400).json({ error: "Edição aparente inválida." });
  }

  const categorizations = readJSON(CATEGORIZATIONS_FILE);
  const filtered = categorizations.filter(
    (c) => !(c.recommendationId === id && c.evaluator === evaluator)
  );
  const record = {
    recommendationId: id,
    evaluator,
    categories,
    tone,
    commercialIntent,
    apparentEditing,
    ambiguous: !!ambiguous,
    notes: notes || "",
    categorizedAt: new Date().toISOString(),
  };
  filtered.push(record);
  writeJSON(CATEGORIZATIONS_FILE, filtered);

  const itemCategorizations = filtered.filter((c) => c.recommendationId === id);
  res.status(201).json({
    categorization: record,
    status: computeItemStatus(itemCategorizations),
  });
});

/**
 * Sub-tarefa: "Serviço de cálculo do percentual de concordância (back-end)"
 * Compara as categorias atribuídas pelas avaliadoras A e B ao mesmo
 * item, entre os itens já categorizados por ambas.
 */
app.get("/api/agreement", requireAuth, (req, res) => {
  const recommendations = readJSON(RECOMMENDATIONS_FILE);
  const categorizations = readJSON(CATEGORIZATIONS_FILE);

  let doubleEvaluated = 0;
  let agreements = 0;
  const divergentItems = [];
  const durationsMinutes = [];

  for (const r of recommendations) {
    const itemCategorizations = categorizations.filter((c) => c.recommendationId === r.id);
    const byEvaluator = Object.fromEntries(itemCategorizations.map((c) => [c.evaluator, c]));
    const [a, b] = ADMIN_EVALUATORS.map((e) => byEvaluator[e]);
    if (!a || !b) continue;

    doubleEvaluated += 1;
    const agree = sameCategorySet(a.categories, b.categories) && !a.ambiguous && !b.ambiguous;
    if (agree) {
      agreements += 1;
    } else {
      divergentItems.push({ id: r.id, code: r.code, link: r.link, categoriesA: a.categories, categoriesB: b.categories });
    }

    const lastCategorizedAt = new Date(Math.max(new Date(a.categorizedAt), new Date(b.categorizedAt)));
    const minutes = (lastCategorizedAt - new Date(r.submittedAt)) / 60000;
    if (minutes >= 0) durationsMinutes.push(minutes);
  }

  const categorizedCount = recommendations.filter((r) => {
    const itemCategorizations = categorizations.filter((c) => c.recommendationId === r.id);
    return computeItemStatus(itemCategorizations) === "categorizado";
  }).length;

  res.json({
    itemsColetados: recommendations.length,
    itemsCategorizados: categorizedCount,
    percentCategorizados: recommendations.length
      ? Math.round((categorizedCount / recommendations.length) * 100)
      : 0,
    doubleEvaluated,
    percentConcordancia: doubleEvaluated ? Math.round((agreements / doubleEvaluated) * 100) : null,
    tempoMedioMinutos: durationsMinutes.length
      ? Math.round((durationsMinutes.reduce((a, b) => a + b, 0) / durationsMinutes.length) * 10) / 10
      : null,
    divergentItems,
  });
});

/* ===================== Sprint 4: Testes (SUS) ===================== */

/**
 * Sub-tarefa: "Questionário System Usability Scale (SUS)"
 * As 10 afirmações padrão do SUS (BROOKE, 1996), na tradução para
 * português já usada em trabalhos acadêmicos nacionais (MARTINS et
 * al., 2015). Aplicado a usuárias em teste formativo de usabilidade,
 * após executarem tarefas representativas do protocolo de coleta
 * (ver docs/guia-teste-usabilidade.md), conforme a Seção 3.5.7 da
 * metodologia. Avalia só o app da participante — o painel da
 * pesquisadora não é usado pelas "usuárias" do protocolo.
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

/**
 * Pontuação padrão do SUS: para afirmações de número ímpar (1, 3, 5, 7,
 * 9 — de sentido positivo), a contribuição é (resposta - 1); para as de
 * número par (2, 4, 6, 8, 10 — de sentido negativo), é (5 - resposta).
 * A soma das 10 contribuições (0-4 cada) é multiplicada por 2,5,
 * resultando em uma pontuação de 0 a 100.
 */
function susItemContribution(answers) {
  return answers.map((value, idx) => {
    const itemNumber = idx + 1;
    return itemNumber % 2 === 1 ? value - 1 : 5 - value;
  });
}

function computeSusScore(answers) {
  const total = susItemContribution(answers).reduce((a, b) => a + b, 0);
  return Math.round(total * 2.5 * 10) / 10;
}

/**
 * Faixas de interpretação (BANGOR; KORTUM; MILLER, 2009), usadas aqui
 * em versão simplificada só para leitura rápida pela pesquisadora.
 */
function susBand(score) {
  if (score >= 80.3) return "Excelente";
  if (score >= 68) return "Bom";
  if (score >= 51) return "Aceitável (marginal)";
  return "Abaixo do aceitável";
}

/**
 * Sub-tarefa: "Serviço de registro de uma resposta ao SUS (back-end)"
 * Não exige nenhum dado identificável; testerLabel é só uma etiqueta
 * opcional de organização da própria pesquisadora (ex.: "Testadora 1"),
 * nunca um dado da pessoa testada.
 */
app.post("/api/sus", (req, res) => {
  const { testerLabel, answers } = req.body || {};

  if (!Array.isArray(answers) || answers.length !== SUS_ITEMS.length) {
    return res
      .status(400)
      .json({ error: `Envie uma resposta (1 a 5) para cada uma das ${SUS_ITEMS.length} afirmações.` });
  }
  const allValid = answers.every(
    (v) => Number.isInteger(v) && v >= 1 && v <= 5
  );
  if (!allValid) {
    return res.status(400).json({ error: "Cada resposta deve ser um número de 1 a 5." });
  }

  const score = computeSusScore(answers);
  const record = {
    id: crypto.randomUUID(),
    testerLabel: testerLabel ? String(testerLabel).trim().slice(0, 80) : null,
    answers,
    score,
    band: susBand(score),
    submittedAt: new Date().toISOString(),
  };

  const responses = readJSON(SUS_FILE);
  responses.push(record);
  writeJSON(SUS_FILE, responses);

  res.status(201).json({ score: record.score, band: record.band });
});

/**
 * Sub-tarefa: "Serviço de consulta dos resultados do SUS (back-end)"
 * Só a pesquisadora acessa (requireAuth): pontuação média, faixa de
 * interpretação e a contribuição média por afirmação (0-4, onde maior é
 * sempre melhor, já normalizada para pares/ímpares), para ajudar a
 * identificar pontos específicos de atrito.
 */
app.get("/api/sus", requireAuth, (req, res) => {
  const responses = readJSON(SUS_FILE);

  const averageScore = responses.length
    ? Math.round((responses.reduce((sum, r) => sum + r.score, 0) / responses.length) * 10) / 10
    : null;

  const perItemAverage = SUS_ITEMS.map((text, idx) => {
    if (responses.length === 0) return { item: idx + 1, text, average: null };
    const sum = responses.reduce((acc, r) => acc + susItemContribution(r.answers)[idx], 0);
    return { item: idx + 1, text, average: Math.round((sum / responses.length) * 10) / 10 };
  });

  res.json({
    items: SUS_ITEMS,
    responses: [...responses].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
    count: responses.length,
    averageScore,
    band: averageScore === null ? null : susBand(averageScore),
    perItemAverage,
  });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/favicon.ico", (req, res) => res.status(204).end());

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
