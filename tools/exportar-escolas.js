// Gera escolas.csv (para conferência no Excel/Sheets) a partir de data.js.
// Uso: node tools/exportar-escolas.js
const path = require("path"), fs = require("fs");
global.window = {};
require(path.join(__dirname, "..", "data.js"));
const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const rows = [["fotografo", "escola (como é conhecida)", "nome oficial", "cidade", "uf", "inauguracao", "endereco", "cep", "visitada_making_of", "fonte_endereco", "a_confirmar"]];
for (const f of window.FOTOGRAFOS) for (const c of f.cidades) {
  const e = window.ESCOLAS.find((x) => x.id === c);
  const cidade = /^(Jardim Conceição|Osasco II)$/.test(e.cidade) ? "Osasco" : e.cidade;
  rows.push([f.nome, e.conhecida, e.nome, cidade, e.uf, e.ano ?? "", e.endereco, e.cep, e.visita ? "sim" : "", e.fonte, e.confirmar ? "sim" : ""]);
}
fs.writeFileSync(path.join(__dirname, "..", "escolas.csv"), "﻿" + rows.map((r) => r.map(q).join(",")).join("\n") + "\n");
console.log(`${rows.length - 1} escolas, ${rows.filter((r) => r[10] === "sim").length} a confirmar`);
