// De onde vem o mapa de verdade.
//
// O contorno do Brasil era desenhado à mão — noventa e cinco pontos que davam
// para reconhecer o país e nada mais. Isto aqui troca o desenho por dado:
// Natural Earth 1:50m, o mesmo que o Plotly empacota em `sane-topojson`, com o
// país, as divisas dos estados, os rios e as lagoas. Simplifica, arredonda para
// centésimo de grau (~1,1 km) e escreve `js/malhas.js`.
//
// Roda uma vez, à mão, e o resultado é versionado — a página publicada não
// consegue buscar nada de fora:
//
//   npm install sane-topojson topojson-client   (numa pasta qualquer)
//   node tools/malhas.mjs /caminho/para/node_modules
//
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const base = process.argv[2] || '/tmp/geo/node_modules';
const require = createRequire(base + '/');
const { feature, mesh } = require(base + '/topojson-client/dist/topojson-client.js');
const topo = JSON.parse(readFileSync(base + '/sane-topojson/dist/south-america_50m.json', 'utf8'));

/* ---------------------------------------------------------- simplificação --
   Douglas-Peucker: joga fora o ponto que não muda a forma. Um litoral de mil e
   seiscentos pontos não fica melhor que um de novecentos numa tela de celular,
   e o arquivo tem de caber na página publicada. */
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const dist2 = (p, a, b) => {
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
      const d = dist2(pts[k], pts[i], pts[j]);
      if (d > dmax) { dmax = d; pior = k; }
    }
    if (dmax > t2 && pior > 0) { marca[pior] = true; pilha.push([i, pior], [pior, j]); }
  }
  return pts.filter((_, i) => marca[i]);
}

/* Cada traço vira uma linha de inteiros em centésimos de grau, guardados como
   diferença do ponto anterior. Um litoral inteiro cabe em poucos kilobytes e o
   navegador desfaz isso numa passada. */
const codificar = (pts) => {
  let x = 0, y = 0;
  const saida = [];
  for (const p of pts) {
    const px = Math.round(p[0] * 100), py = Math.round(p[1] * 100);
    if (saida.length && px === x && py === y) continue;
    saida.push((px - x) + ',' + (py - y));
    x = px; y = py;
  }
  return saida.join(' ');
};

const linhas = (g) => {
  const out = [];
  if (!g) return out;
  if (g.type === 'Polygon') g.coordinates.forEach((r) => out.push(r));
  else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => p.forEach((r) => out.push(r)));
  else if (g.type === 'LineString') out.push(g.coordinates);
  else if (g.type === 'MultiLineString') g.coordinates.forEach((l) => out.push(l));
  return out;
};

const CAIXA = { o: -74.2, l: -34.6, s: -34.0, n: 5.4 };
const dentro = (p) => p[0] >= CAIXA.o && p[0] <= CAIXA.l && p[1] >= CAIXA.s && p[1] <= CAIXA.n;

/* Um traço que entra e sai do país vira vários: só o pedaço de dentro fica. */
function recortar(pts) {
  const partes = [];
  let atual = [];
  for (const p of pts) {
    if (dentro(p)) atual.push(p);
    else { if (atual.length > 1) partes.push(atual); atual = []; }
  }
  if (atual.length > 1) partes.push(atual);
  return partes;
}

// ------------------------------------------------------------------ país ---
const brasil = { type: 'GeometryCollection',
  geometries: topo.objects.subunits.geometries.filter((g) => g.properties?.gu === 'BRA') };
const paisGeo = topo.objects.countries.geometries.find((g) => {
  const c = g.properties?.ct || [];
  return Math.abs(c[0] + 53.12) < 0.5 && Math.abs(c[1] + 10.84) < 0.5;
});
const aneis = linhas(feature(topo, paisGeo).geometry)
  .filter((r) => r.length > 8)                    // ilhas de três pontos não desenham nada
  .sort((a, b) => b.length - a.length);
const PAIS = aneis.map((r) => dp(r, 0.02)).filter((r) => r.length > 6);

// -------------------------------------------------------------- estados ---
// A malha desenha a divisa uma vez só: sem isso, cada fronteira sairia duas
// vezes, uma por estado, e o arquivo dobraria de tamanho à toa.
const ESTADOS = linhas(mesh(topo, brasil, (a, b) => a !== b))
  .map((r) => dp(r, 0.03)).filter((r) => r.length > 2);

// Cada estado tem o ponto de rótulo do Natural Earth, mas não o nome. A sigla
// sai do centro que já estava no app, pelo mais perto — e é conferida logo
// abaixo, porque errar a sigla de um estado é pior do que não ter sigla.
const UF = {
  AC: [-70.5, -9.0], AL: [-36.6, -9.6], AP: [-51.9, 1.4], AM: [-64.6, -4.1],
  BA: [-41.7, -12.5], CE: [-39.3, -5.2], DF: [-47.8, -15.8], ES: [-40.6, -19.6],
  GO: [-49.6, -16.0], MA: [-45.3, -5.0], MT: [-55.9, -12.9], MS: [-54.8, -20.5],
  MG: [-44.6, -18.6], PA: [-52.5, -4.3], PB: [-36.7, -7.1], PR: [-51.5, -24.6],
  PE: [-37.9, -8.4], PI: [-43.0, -7.4], RJ: [-42.6, -22.3], RN: [-36.6, -5.8],
  RS: [-53.2, -29.7], RO: [-62.8, -10.9], RR: [-61.4, 2.1], SC: [-50.5, -27.3],
  SP: [-48.6, -22.2], SE: [-37.4, -10.6], TO: [-48.3, -10.2]
};
const usadas = new Set();
const SIGLAS = brasil.geometries.map((g) => {
  const c = g.properties.ct;
  const par = Object.entries(UF)
    .filter(([s]) => !usadas.has(s))
    .sort((a, b) => Math.hypot(a[1][0] - c[0], a[1][1] - c[1]) - Math.hypot(b[1][0] - c[0], b[1][1] - c[1]))[0];
  usadas.add(par[0]);
  return { s: par[0], c: [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100],
    d: Math.hypot(par[1][0] - c[0], par[1][1] - c[1]) };
});
const longe = SIGLAS.filter((x) => x.d > 2.5);
if (longe.length) console.warn('sigla duvidosa:', longe.map((x) => `${x.s} (${x.d.toFixed(1)}°)`).join(', '));

// ----------------------------------------------------------------- água ---
const rio = feature(topo, topo.objects.rivers);
const RIOS = [];
for (const f of rio.features) {
  for (const l of linhas(f.geometry)) {
    for (const parte of recortar(l)) {
      const s = dp(parte, 0.05);
      if (s.length > 3) RIOS.push(s);
    }
  }
}
const lago = feature(topo, topo.objects.lakes);
const LAGOS = [];
for (const f of lago.features) {
  for (const r of linhas(f.geometry)) {
    if (!r.some(dentro)) continue;
    const s = dp(r, 0.04);
    if (s.length > 4) LAGOS.push(s);
  }
}

const bloco = (nome, lista) => `export const ${nome} = [\n`
  + lista.map((r) => `  '${codificar(r)}'`).join(',\n') + '\n];\n';

const saida = `// Malhas do Brasil — dado, não desenho.
//
// Natural Earth 1:50m (domínio público), pelo pacote \`sane-topojson\`, o mesmo
// que o Plotly usa. Simplificado por Douglas-Peucker e arredondado ao
// centésimo de grau, que dá cerca de um quilômetro — mais do que a tela mostra
// mesmo com o zoom no fim do curso.
//
// Cada traço é uma linha de pares "dx,dy" em centésimos de grau, contados a
// partir do ponto anterior. Ficou pequeno o bastante para caber na página
// publicada, que não consegue buscar nada de fora.
//
// GERADO POR tools/malhas.mjs — não edite à mão.

/** Desfaz a codificação: string de diferenças vira lista de [lon, lat]. */
export function abrir(t) {
  const pts = [];
  let x = 0, y = 0;
  for (const par of t.split(' ')) {
    const v = par.indexOf(',');
    x += +par.slice(0, v); y += +par.slice(v + 1);
    pts.push([x / 100, y / 100]);
  }
  return pts;
}

${bloco('PAIS', PAIS)}
${bloco('ESTADOS', ESTADOS)}
${bloco('RIOS', RIOS)}
${bloco('LAGOS', LAGOS)}
/** Sigla e ponto de rótulo de cada estado, do próprio Natural Earth. */
export const SIGLAS = ${JSON.stringify(SIGLAS.map(({ s, c }) => ({ s, c })))
    .replace(/\},\{/g, '},\n  {').replace(/^\[/, '[\n  ').replace(/\]$/, '\n];')}
`;
writeFileSync(new URL('../js/malhas.js', import.meta.url), saida);
const kb = (Buffer.byteLength(saida) / 1024).toFixed(0);
console.log(`js/malhas.js — ${kb} KB · país ${PAIS.length} anéis/${PAIS.reduce((a, r) => a + r.length, 0)} pontos`
  + ` · divisas ${ESTADOS.length}/${ESTADOS.reduce((a, r) => a + r.length, 0)}`
  + ` · rios ${RIOS.length}/${RIOS.reduce((a, r) => a + r.length, 0)} · lagos ${LAGOS.length}`);
