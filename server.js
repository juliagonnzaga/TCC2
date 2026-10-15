/**
 * TCC2 - Sistema web de coleta de recomendações
 * Sprint 1: Fundação e fluxo inicial da participante
 *
 * Implementa os dois "serviços" (back-end) do backlog da Sprint 1:
 *  - Serviço de registro do aceite do TCLE     (POST /api/consent)
 *  - Serviço de geração do código anônimo      (POST /api/profile)
 *
 * Armazenamento: arquivos JSON locais em ./data (suficiente para o MVP
 * da Sprint 1). Antes da coleta real com participantes, isso deve ser
 * substituído por armazenamento cifrado, conforme já indicado na
 * metodologia (Seção 3.5.2 / Trabalhos Futuros da Monografia 1).
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

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of [CONSENTS_FILE, PROFILES_FILE]) {
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
 * Recebe consentId + faixa etária + rede social, valida que o TCLE
 * foi aceito, e gera um código anônimo único (ex.: P427). Nenhum
 * dado identificável é solicitado ou armazenado.
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

  if (!consentId || !ageRange || !network) {
    return res
      .status(400)
      .json({ error: "consentId, ageRange e network são obrigatórios." });
  }
  if (!VALID_AGE_RANGES.includes(ageRange)) {
    return res.status(400).json({ error: "Faixa etária inválida." });
  }
  if (!VALID_NETWORKS.includes(network)) {
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
    ageRange,
    network,
    consentId,
    createdAt: new Date().toISOString(),
  };
  profiles.push(record);
  writeJSON(PROFILES_FILE, profiles);

  res.status(201).json({ code });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/favicon.ico", (req, res) => res.status(204).end());

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
