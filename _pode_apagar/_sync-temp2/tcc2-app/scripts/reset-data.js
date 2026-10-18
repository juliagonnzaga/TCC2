/**
 * Limpa os arquivos de dados locais (data/*.json) antes de rodar os
 * testes de ponta a ponta, para que cada teste comece de um estado
 * limpo e não seja afetado por dados deixados por uma rodada anterior.
 *
 * Cross-platform (não depende de `rm` do shell), para funcionar tanto
 * em Linux/Mac quanto no Windows.
 */
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");

if (fs.existsSync(dataDir)) {
  for (const file of fs.readdirSync(dataDir)) {
    if (file.endsWith(".json")) {
      fs.unlinkSync(path.join(dataDir, file));
    }
  }
}

console.log("data/ limpo.");
