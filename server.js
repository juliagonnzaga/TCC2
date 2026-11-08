/**
 * TCC2 - Sistema web de coleta de recomendações
 *
<<<<<<< HEAD
 * Sprint 1: Fundação e fluxo inicial da participante
 *  - Serviço de registro do aceite do TCLE     (POST /api/consent)
 *  - Serviço de geração do código anônimo      (POST /api/profile)
 *
 * Sprint 2: Coleta de recomendações
 *  - Serviço de recebimento da recomendação    (POST /api/recommendations)
 *  - Serviço de consulta dos envios            (GET  /api/recommendations/:code)
=======
 * Sprint 1 (substituída na Sprint 5 — ver nota abaixo): Fundação e fluxo
 * inicial da participante, com TCLE + código anônimo.
 *
 * Sprint 2: Coleta de recomendações
 *  - Serviço de recebimento da recomendação    (POST /api/recommendations)
 *  - Serviço de consulta dos envios            (GET  /api/recommendations)
>>>>>>> Sprint1
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
<<<<<<< HEAD
=======
 * Sprint 5 (orientação do professor): o fluxo de "aceitar TCLE -> gerar
 * código anônimo" (POST /api/consent + POST /api/profile) foi SUBSTITUÍDO
 * por um cadastro/login de verdade da participante, com e-mail e senha
 * (POST /api/participants/register e POST /api/participants/login). A
 * participante agora tem uma conta persistente (pode entrar de qualquer
 * dispositivo), em vez de um código gerado a cada sessão.
 *
 * IMPORTANTE (impacto na anonimização, para refletir no texto do TCLE e
 * da metodologia antes de qualquer submissão ao Comitê de Ética): a
 * coleta deixa de ser 100% anônima (a participante agora é identificável
 * pelo e-mail) e passa a ser CONFIDENCIAL — o e-mail fica só no cadastro
 * da participante; o painel da pesquisadora e as telas de categorização
 * continuam mostrando só o código interno (`code`, nunca o e-mail), para
 * que as avaliadoras continuem sem acesso à identidade de quem enviou
 * cada conteúdo (ver "Limitações conhecidas" no README).
 *
>>>>>>> Sprint1
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
<<<<<<< HEAD
 * 3.5.2 / Trabalhos Futuros da Monografia 1).
=======
 * 3.5.2 / Trabalhos Futuros da Monografia 1) — isso vale especialmente
 * agora que o cadastro guarda e-mail (mesmo com a senha com hash, nunca
 * em texto puro).
>>>>>>> Sprint1
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
<<<<<<< HEAD
const CONSENTS_FILE = path.join(DATA_DIR, "consents.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles.json");
=======
const PARTICIPANTS_FILE = path.join(DATA_DIR, "participants.json");
>>>>>>> Sprint1
const RECOMMENDATIONS_FILE = path.join(DATA_DIR, "recommendations.json");
const CATEGORIZATIONS_FILE = path.join(DATA_DIR, "categorizations.json");
const SUS_FILE = path.join(DATA_DIR, "sus.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of [
<<<<<<< HEAD
  CONSENTS_FILE,
  PROFILES_FILE,
=======
  PARTICIPANTS_FILE,
>>>>>>> Sprint1
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
<<<<<<< HEAD
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
=======
 * Sub-tarefa (Sprint 5): "Sistema de login da participante"
 *
 * Substitui o fluxo "aceitar TCLE -> gerar código anônimo" por uma
 * conta de verdade (e-mail + senha).
 *
 * Login e aceite do TCLE viraram duas etapas separadas (ajuste pedido
 * pela Julia depois da primeira versão): primeiro a pessoa cria a conta
 * ou entra numa já existente, DEPOIS aceita o TCLE. O aceite é
 * registrado por conta (`tcleAcceptedAt`), não por sessão — então uma
 * participante que já aceitou antes não precisa aceitar de novo da
 * próxima vez que entrar (em qualquer dispositivo).
 *
 * A senha NUNCA é armazenada em texto puro: é gerada com crypto.scrypt
 * (função de hash lenta, resistente a força bruta) com um salt
 * aleatório por participante. Não usamos uma biblioteca externa
 * (bcrypt) de propósito, para não depender de módulos nativos — o
 * crypto do próprio Node já é suficiente para o MVP.
 *
 * Cada participante continua tendo um código interno (ex.: P427),
 * igual ao da Sprint 1 — só que agora ele não é mais mostrado para a
 * própria participante. Ele existe só para o painel da pesquisadora
 * continuar identificando os envios sem expor o e-mail às avaliadoras
 * (ver nota no topo do arquivo e "Limitações conhecidas" no README).
>>>>>>> Sprint1
 */
function generateAnonymousCode(existingCodes) {
  let code;
  do {
    const n = Math.floor(Math.random() * 900) + 100; // 100-999
    code = `P${n}`;
  } while (existingCodes.includes(code));
  return code;
}

<<<<<<< HEAD
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
=======
const VALID_NETWORKS = ["Instagram", "TikTok", "Outra"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const testHash = crypto.scryptSync(password, salt, 64);
  return hashBuffer.length === testHash.length && crypto.timingSafeEqual(hashBuffer, testHash);
}

// Tokens de sessão da participante em memória (mesmo padrão já usado
// para a pesquisadora, ver validTokens mais abaixo): simples o
// suficiente para o MVP, mas significa que reiniciar o servidor
// invalida as sessões abertas (a participante precisa entrar de novo).
const validParticipantTokens = new Map(); // token -> participantId

function requireParticipantAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const participantId = token && validParticipantTokens.get(token);
  if (!participantId) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  req.participantId = participantId;
  next();
}

/**
 * Sub-tarefa: "Serviço de cadastro da participante (back-end)"
 */
app.post("/api/participants/register", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !EMAIL_REGEX.test(String(email).trim())) {
    return res.status(400).json({ error: "Informe um e-mail válido." });
  }
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const participants = readJSON(PARTICIPANTS_FILE);
  if (participants.some((p) => p.email === normalizedEmail)) {
    return res
      .status(409)
      .json({ error: "Este e-mail já tem cadastro. Faça login." });
  }

  const record = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: hashPassword(String(password)),
    code: generateAnonymousCode(participants.map((p) => p.code)),
    // O TCLE é aceito numa etapa própria, depois do cadastro (ver POST
    // /api/participants/accept-tcle) — null até lá.
    tcleAcceptedAt: null,
    createdAt: new Date().toISOString(),
  };
  participants.push(record);
  writeJSON(PARTICIPANTS_FILE, participants);

  const token = crypto.randomUUID();
  validParticipantTokens.set(token, record.id);
  res.status(201).json({ token, email: record.email, tcleAccepted: false });
});

/**
 * Sub-tarefa: "Serviço de login da participante (back-end)"
 */
app.post("/api/participants/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Informe e-mail e senha." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const participants = readJSON(PARTICIPANTS_FILE);
  const participant = participants.find((p) => p.email === normalizedEmail);
  if (!participant || !verifyPassword(String(password), participant.passwordHash)) {
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  }

  const token = crypto.randomUUID();
  validParticipantTokens.set(token, participant.id);
  res.json({ token, email: participant.email, tcleAccepted: !!participant.tcleAcceptedAt });
});

/**
 * Sub-tarefa: "Esqueci minha senha" (pedido da Julia). Não exige a senha
 * antiga (é justamente pra quem não lembra dela) — só o e-mail da conta,
 * pra identificar quem está redefinindo.
 *
 * Limitação conhecida (igual às outras já documentadas no README): como
 * o sistema não tem envio de e-mail configurado, não dá pra confirmar
 * que quem está pedindo a troca é dona daquele e-mail (não existe link
 * de verificação por e-mail). Pra um MVP acadêmico com participantes
 * conhecidas isso é aceitável, mas precisa virar um fluxo com
 * verificação por e-mail antes de uma coleta real com estranhas na
 * internet — ver "Limitações conhecidas" no README.
 *
 * Ao redefinir, invalida qualquer sessão aberta dessa conta (se a senha
 * vazou e alguém mais estava logado, essa sessão para de funcionar).
 */
app.post("/api/participants/forgot-password", (req, res) => {
  const { email, newPassword } = req.body || {};

  if (!email || !EMAIL_REGEX.test(String(email).trim())) {
    return res.status(400).json({ error: "Informe um e-mail válido." });
  }
  if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const participants = readJSON(PARTICIPANTS_FILE);
  const idx = participants.findIndex((p) => p.email === normalizedEmail);
  if (idx === -1) {
    return res.status(404).json({ error: "Não encontramos uma conta com esse e-mail." });
  }

  participants[idx].passwordHash = hashPassword(String(newPassword));
  writeJSON(PARTICIPANTS_FILE, participants);

  // Derruba sessões antigas dessa conta — a pessoa precisa entrar de
  // novo com a senha nova, em qualquer dispositivo onde estivesse logada.
  const participantId = participants[idx].id;
  for (const [tok, pid] of validParticipantTokens.entries()) {
    if (pid === participantId) validParticipantTokens.delete(tok);
  }

  res.status(200).json({ message: "Senha redefinida com sucesso.", email: participants[idx].email });
});

/**
 * Sub-tarefa: "Serviço de verificação de sessão da participante
 * (back-end)" — usado pelo front para saber se o token salvo no
 * navegador ainda é válido (ex.: depois de um refresh de página) e se
 * o TCLE já foi aceito por essa conta, pra decidir se mostra a etapa do
 * TCLE de novo ou pula direto pras instruções.
 */
app.get("/api/participants/me", requireParticipantAuth, (req, res) => {
  const participants = readJSON(PARTICIPANTS_FILE);
  const participant = participants.find((p) => p.id === req.participantId);
  if (!participant) {
    return res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
  }
  res.json({ email: participant.email, tcleAccepted: !!participant.tcleAcceptedAt });
});

/**
 * Sub-tarefa: "Serviço de aceite do TCLE (back-end)" — etapa separada
 * do login/cadastro (ver nota no topo do bloco Sprint 5). Idempotente:
 * chamar de novo depois de já ter aceitado não faz nada de errado, só
 * não altera a data do primeiro aceite.
 */
app.post("/api/participants/accept-tcle", requireParticipantAuth, (req, res) => {
  const participants = readJSON(PARTICIPANTS_FILE);
  const idx = participants.findIndex((p) => p.id === req.participantId);
  if (idx === -1) {
    return res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
  }
  if (!participants[idx].tcleAcceptedAt) {
    participants[idx].tcleAcceptedAt = new Date().toISOString();
    writeJSON(PARTICIPANTS_FILE, participants);
  }
  res.status(201).json({ tcleAccepted: true, acceptedAt: participants[idx].tcleAcceptedAt });
>>>>>>> Sprint1
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
<<<<<<< HEAD
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
=======
 * Identifica a participante pelo token de login (Sprint 5 — antes era
 * pelo código anônimo enviado no corpo da requisição) e recebe o link
 * do conteúdo, rede, formato, data em que apareceu e o motivo
 * percebido. Limita a 3 recomendações por participante, conforme o
 * protocolo (Seção 3.3.1 da Monografia 1: "até três recomendações
 * elegíveis").
 */
app.post("/api/recommendations", requireParticipantAuth, (req, res) => {
  const { link, network, format, appearedAt, reason } = req.body || {};

  if (!link || !network || !format || !appearedAt || !reason) {
    return res.status(400).json({
      error: "link, network, format, appearedAt e reason são obrigatórios.",
>>>>>>> Sprint1
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

<<<<<<< HEAD
  const profiles = readJSON(PROFILES_FILE);
  const participant = profiles.find((p) => p.code === code);
  if (!participant) {
    return res.status(400).json({ error: "Código anônimo não encontrado." });
  }

  const recommendations = readJSON(RECOMMENDATIONS_FILE);
  const existingForParticipant = recommendations.filter((r) => r.code === code);
=======
  const participants = readJSON(PARTICIPANTS_FILE);
  const participant = participants.find((p) => p.id === req.participantId);
  if (!participant) {
    return res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
  }
  if (!participant.tcleAcceptedAt) {
    return res
      .status(403)
      .json({ error: "É necessário aceitar o TCLE antes de enviar recomendações." });
  }

  const recommendations = readJSON(RECOMMENDATIONS_FILE);
  const existingForParticipant = recommendations.filter(
    (r) => r.participantId === participant.id
  );
>>>>>>> Sprint1
  if (existingForParticipant.length >= MAX_RECOMMENDATIONS_PER_PARTICIPANT) {
    return res.status(409).json({
      error: `Você já enviou ${MAX_RECOMMENDATIONS_PER_PARTICIPANT} recomendações, o máximo previsto pelo protocolo. Obrigada pela participação!`,
    });
  }

  const record = {
    id: crypto.randomUUID(),
<<<<<<< HEAD
    code,
=======
    participantId: participant.id,
    // Código interno (não é mais mostrado à participante, ver Sprint 5
    // no topo do arquivo) — é o que o painel da pesquisadora exibe, pra
    // avaliadora nunca ver o e-mail de quem enviou.
    code: participant.code,
>>>>>>> Sprint1
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
<<<<<<< HEAD
 * Retorna as recomendações já enviadas por um código anônimo, para a
 * tela de status dos envios.
 */
app.get("/api/recommendations/:code", (req, res) => {
  const { code } = req.params;
  const recommendations = readJSON(RECOMMENDATIONS_FILE).filter(
    (r) => r.code === code
=======
 * Retorna as recomendações já enviadas pela participante autenticada
 * (Sprint 5 — antes era por código anônimo na URL), para a tela de
 * status dos envios.
 */
app.get("/api/recommendations", requireParticipantAuth, (req, res) => {
  const recommendations = readJSON(RECOMMENDATIONS_FILE).filter(
    (r) => r.participantId === req.participantId
>>>>>>> Sprint1
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
<<<<<<< HEAD
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pesquisa123";
=======
// `let`, não `const`: pode ser trocada em tempo de execução pelo
// "esqueci minha senha" do painel (ver POST /api/auth/forgot-password,
// logo abaixo). A troca vale só até o servidor reiniciar — depois disso
// volta a valer o que estiver em ADMIN_PASSWORD (ou o padrão de
// desenvolvimento), igual ao resto das sessões, que também são em
// memória (ver "Limitações conhecidas" no README).
let adminPassword = process.env.ADMIN_PASSWORD || "pesquisa123";
>>>>>>> Sprint1
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
<<<<<<< HEAD
  if (password !== ADMIN_PASSWORD) {
=======
  if (password !== adminPassword) {
>>>>>>> Sprint1
    return res.status(401).json({ error: "Senha incorreta." });
  }
  const token = crypto.randomUUID();
  validTokens.add(token);
  res.json({ token, evaluators: ADMIN_EVALUATORS });
});

<<<<<<< HEAD
=======
/**
 * Sub-tarefa: "Esqueci minha senha" no painel da pesquisadora (pedido da
 * Julia, mesmo padrão do lado da participante: só pede a senha nova +
 * confirmação no front, sem pedir a senha atual).
 *
 * Limitação conhecida, diferente do lado da participante: aqui não
 * existe uma "conta" por pessoa, é uma senha única compartilhada entre
 * as avaliadoras. Sem pedir a senha atual, qualquer pessoa que encontre
 * o endereço do painel consegue trocar essa senha compartilhada sem
 * provar que já a conhecia — ao contrário do "esqueci minha senha" da
 * participante, que exige saber o e-mail de uma conta que já existe.
 * Julia optou por manter igual ao fluxo da participante por enquanto;
 * ver "Limitações conhecidas" no README.
 */
app.post("/api/auth/forgot-password", (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `A senha nova precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  }

  adminPassword = String(newPassword);
  // Derruba todas as sessões abertas do painel — depois de trocar a
  // senha, qualquer pessoa logada precisa entrar de novo com a senha
  // nova (mesmo comportamento do "esqueci minha senha" da participante).
  validTokens.clear();

  res.status(200).json({ message: "Senha redefinida com sucesso." });
});

>>>>>>> Sprint1
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
