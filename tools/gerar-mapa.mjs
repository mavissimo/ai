// Gera brasil-path.js e as coordenadas (pos) das escolas a partir de lat/long.
// Uso: npm i world-atlas@2 topojson-client d3-geo && node tools/gerar-mapa.mjs
// (cole o conteúdo de brazil-path.txt em brasil-path.js e os valores impressos em data.js)
import fs from 'fs';
import * as topo from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
const world = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const countries = topo.feature(world, world.objects.countries);
const br = countries.features.find(f => f.id === '076');
const W = 1000, H = 1000;
const proj = geoMercator().fitExtent([[30, 30], [W - 30, H - 30]], br);
const path = geoPath(proj).digits(1);
const d = path(br);
const cities = {
  'conceicao-do-araguaia': [-49.2647, -8.2578],
  'jaboatao': [-34.99, -8.13],
  'gravatai': [-50.9919, -29.944],
  'bodoquena': [-56.45, -20.2],
  'canuana': [-49.95, -11.5],
  'osasco': [-46.7917, -23.5329],
};
const out = {};
for (const [k, ll] of Object.entries(cities)) { const [x, y] = proj(ll); out[k] = [Math.round(x), Math.round(y)]; }
const b = path.bounds(br);
console.log(JSON.stringify(out), b, d.length);
fs.writeFileSync('brazil-path.txt', d);
