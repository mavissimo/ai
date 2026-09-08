// O limite das cidades — o de verdade, do IBGE.
//
// Natural Earth resolve o país e os estados, mas para no estado. Quem trabalha
// em Gravataí ou em Formoso do Araguaia quer ver a linha do município, e essa
// linha só existe no IBGE. O `geodata-br` (tbrugz) publica a malha municipal
// em GeoJSON, um arquivo por UF; isto aqui pega só as cidades que o app
// conhece, simplifica e escreve `js/municipios.js`.
//
// Não dá para baixar de dentro da página nem daqui: a pasta entra à mão.
//
//   node tools/municipios.mjs /caminho/geodata-br-master/geojson
//
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { CIDADES } from '../js/geo.js';

const dir = process.argv[2] || '/tmp/gbr/geodata-br-master/geojson';

/* Douglas-Peucker, o mesmo de tools/malhas.mjs: joga fora o ponto que não muda
   a forma. Meio centésimo de grau é bem mais fino que um pixel no zoom máximo. */
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const d2 = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (!dx && !dy) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
  };
  const marca = new Array(pts.length).fill(false);
  marca[0] = marca[pts.length - 1] = true;
  const pilha = [[0, pts.length - 1]];
  const t2 = tol * tol;
  while (pilha.length) {
    const [i, j] = pilha.pop();
    let pior = -1, dmax = 0;
    for (let k = i + 1; k < j; k++) {
      const d = d2(pts[k], pts[i], pts[j]);
      if (d > dmax) { dmax = d; pior = k; }
    }
    if (dmax > t2 && pior > 0) { marca[pior] = true; pilha.push([i, pior], [pior, j]); }
  }
  return pts.filter((_, i) => marca[i]);
}

const codificar = (pts) => {
  let x = 0, y = 0;
  const saida = [];
  for (const p of pts) {
    const px = Math.round(p[0] * 1000), py = Math.round(p[1] * 1000);
    if (saida.length && px === x && py === y) continue;
    saida.push((px - x) + ',' + (py - y));
    x = px; y = py;
  }
  return saida.join(' ');
};

const aneis = (g) => {
  if (g.type === 'Polygon') return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  return [];
};

/* Achar o município pelo nome é armadilha: existe Belém no Pará e na Paraíba,
   Bom Jesus em nove estados. O que não erra é a coordenada — o município certo
   é aquele cujo desenho contém o ponto que o app já tem. */
function contem(poligono, [x, y]) {
  // Regra par-ímpar sobre todos os anéis de uma vez: a borda conta uma
  // travessia, cada buraco conta outra, e o resultado sai certo sem tratar
  // buraco à parte.
  let dentro = false;
  for (const anel of poligono) {
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const [xi, yi] = anel[i], [xj, yj] = anel[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
  }
  return dentro;
}

const alvos = Object.entries(CIDADES);
const achados = new Map();

for (const arq of readdirSync(dir).filter((f) => /^geojs-\d+-mun\.json$/.test(f) && !f.includes('-100-'))) {
  const col = JSON.parse(readFileSync(`${dir}/${arq}`, 'utf8'));
  for (const f of col.features) {
    const polis = aneis(f.geometry);
    const guardar = () => ({ ibge: f.properties.id, mun: f.properties.name,
      rings: polis.map((p) => dp(p[0], 0.004)).filter((r) => r.length > 6) });
    for (const [nome, pt] of alvos) {
      if (achados.has(nome)) continue;
      // Só a borda de fora: buraco de município é raríssimo e some no traço.
      if (polis.some((p) => contem(p, pt))) achados.set(nome, guardar());
    }
  }
}
// Cidade sem município fica sem a linha, e pronto. Chutar o vizinho mais perto
// põe Niterói no lugar do Rio — desenho errado é pior do que desenho nenhum.

const faltando = alvos.filter(([n]) => !achados.has(n)).map(([n]) => n);
if (faltando.length) console.warn('sem município:', faltando.join(', '));
for (const [nome, m] of achados) {
  if (m.mun.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    !== nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()) {
    console.log(`  ${nome} → ${m.mun} (${m.ibge})`);
  }
}

const corpo = [...achados.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([nome, m]) => `  ${JSON.stringify(nome)}: { ibge: '${m.ibge}', mun: ${JSON.stringify(m.mun)},\n`
    + `    r: [\n${m.rings.map((r) => `      '${codificar(r)}'`).join(',\n')}\n    ] }`)
  .join(',\n');

const saida = `// O limite das cidades do job — malha municipal do IBGE.
//
// Fonte: geodata-br (tbrugz), que publica a malha municipal do IBGE em
// GeoJSON. Aqui estão só os municípios que o app conhece, simplificados por
// Douglas-Peucker e arredondados ao milésimo de grau (~110 m) — mais fino que
// um pixel mesmo no zoom máximo.
//
// Cada anel é uma linha de pares "dx,dy" em milésimos de grau, contados a
// partir do ponto anterior, como em malhas.js. A chave é o nome da cidade tal
// como o app escreve; \`mun\` guarda o nome oficial e \`ibge\` o código, para
// dar para conferir de onde a linha veio.
//
// GERADO POR tools/municipios.mjs — não edite à mão.

/** Desfaz a codificação: string de diferenças vira lista de [lon, lat]. */
export function abrirMil(t) {
  const pts = [];
  let x = 0, y = 0;
  for (const par of t.split(' ')) {
    const v = par.indexOf(',');
    x += +par.slice(0, v); y += +par.slice(v + 1);
    pts.push([x / 1000, y / 1000]);
  }
  return pts;
}

export const MUNICIPIOS = {
${corpo}
};
`;
writeFileSync(new URL('../js/municipios.js', import.meta.url), saida);
const pontos = [...achados.values()].reduce((a, m) => a + m.rings.reduce((b, r) => b + r.length, 0), 0);
console.log(`js/municipios.js — ${(Buffer.byteLength(saida) / 1024).toFixed(0)} KB · `
  + `${achados.size} municípios · ${pontos} pontos`);
