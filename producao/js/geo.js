// O Brasil desenhado, não baixado.
//
// A página publicada não consegue buscar imagem de fora — nenhum tile de mapa
// chega aqui. Então o contorno do país é um caminho vetorial nosso e as cidades
// são coordenadas de verdade projetadas em cima dele. Custa zero de rede,
// funciona sem sinal na estrada e ainda por cima tem a cara de cartaz que o
// resto do app está tomando.

/* Contorno simplificado, em graus (longitude, latitude), no sentido horário a
   partir de Roraima. É silhueta, não cartografia: serve para reconhecer o país
   e situar a cidade, não para navegar. */
const CONTORNO = [
  [-60.7, 5.2], [-60.0, 4.6], [-59.0, 3.9], [-56.5, 2.0], [-55.2, 2.5], [-54.2, 2.2],
  [-51.6, 4.4], [-50.9, 2.2], [-50.0, 1.8], [-48.6, -0.2], [-48.5, -1.4], [-46.5, -0.8],
  [-44.3, -2.5], [-43.3, -2.4], [-41.8, -2.9], [-40.5, -2.8], [-38.5, -3.7], [-37.2, -4.9],
  [-35.2, -5.2], [-34.8, -6.9], [-34.85, -8.05], [-35.7, -9.7], [-36.4, -10.5], [-37.1, -11.3],
  [-38.5, -13.0], [-38.9, -13.9], [-39.0, -14.8], [-38.9, -16.4], [-39.2, -17.7], [-39.7, -18.6],
  [-40.3, -20.3], [-41.0, -21.6], [-41.9, -22.4], [-42.0, -23.0], [-43.2, -23.0], [-44.6, -23.4],
  [-46.3, -24.0], [-47.9, -25.0], [-48.5, -25.5], [-48.5, -26.9], [-48.5, -27.6], [-48.8, -28.6],
  [-50.0, -30.4], [-51.4, -31.9], [-52.2, -32.6], [-53.4, -33.7], [-53.5, -32.6], [-54.6, -31.5],
  [-55.6, -30.9], [-56.9, -30.1], [-57.6, -30.2], [-56.2, -28.8], [-55.6, -27.4], [-54.3, -25.7],
  [-54.6, -25.6], [-54.3, -24.1], [-54.7, -23.0], [-55.7, -22.6], [-57.6, -22.1], [-57.9, -20.9],
  [-58.2, -20.0], [-58.0, -19.4], [-57.8, -19.0], [-59.0, -16.4], [-60.4, -15.1], [-60.3, -13.5],
  [-61.9, -13.5], [-63.0, -12.6], [-64.5, -12.5], [-65.4, -10.5], [-65.3, -9.8], [-66.8, -9.8],
  [-68.6, -11.0], [-69.6, -10.9], [-70.6, -11.0], [-70.6, -9.5], [-72.2, -9.9], [-73.2, -9.4],
  [-72.9, -7.6], [-73.8, -7.3], [-72.9, -5.1], [-70.8, -4.2], [-70.0, -4.2], [-69.9, -2.2],
  [-69.4, -1.1], [-69.9, 0.6], [-69.2, 0.9], [-67.9, 1.7], [-67.3, 2.0], [-67.1, 2.8],
  [-64.5, 4.1], [-63.4, 3.9], [-61.4, 4.5], [-60.7, 5.2]
];

/* Onde ficam as cidades do job. Chave é o que aparece no cadastro. */
export const CIDADES = {
  'São Paulo': [-46.63, -23.55],
  'Osasco': [-46.79, -23.53],
  'Conceição do Araguaia': [-49.26, -8.26],
  'Formoso do Araguaia': [-49.53, -11.80],
  'Canuanã': [-49.55, -11.62],
  'Palmas': [-48.33, -10.24],
  'Jaboatão dos Guararapes': [-35.01, -8.11],
  'Recife': [-34.88, -8.05],
  'Gravataí': [-50.99, -29.94],
  'Porto Alegre': [-51.23, -30.03],
  'Bodoquena': [-56.71, -20.53],
  'Miranda': [-56.38, -20.24],
  'Campo Grande': [-54.65, -20.47],
  'Belém': [-48.50, -1.46],
  'Salvador': [-38.51, -12.97],
  'Curitiba': [-49.27, -25.43],
  'Rio de Janeiro': [-43.20, -22.91],
  'Brasília': [-47.88, -15.79],
  'Fortaleza': [-38.54, -3.73],
  'Manaus': [-60.02, -3.10],
  'Belo Horizonte': [-43.94, -19.92],
  'Natal': [-35.21, -5.79],
  'Florianópolis': [-48.55, -27.59],
  'Goiânia': [-49.25, -16.68],
  'Vitória': [-40.34, -20.32],
  'Maceió': [-35.74, -9.67],
  'João Pessoa': [-34.86, -7.12],
  'Teresina': [-42.80, -5.09],
  'São Luís': [-44.30, -2.53],
  'Aracaju': [-37.07, -10.91],
  'Cuiabá': [-56.10, -15.60],
  'Porto Velho': [-63.90, -8.76],
  'Rio Branco': [-67.81, -9.97],
  'Macapá': [-51.07, 0.03],
  'Boa Vista': [-60.67, 2.82]
};

/* O centro de cada estado. É a rede de segurança: quando a cidade não está no
   mapa acima — e sempre vai faltar alguma —, o "(PA)" do fim do nome ainda põe
   o pino no lugar certo do país. Antes disso, viagem para cidade desconhecida
   simplesmente sumia do mapa sem avisar ninguém. */
const UF = {
  AC: [-70.5, -9.0], AL: [-36.6, -9.6], AP: [-51.9, 1.4], AM: [-64.6, -4.1],
  BA: [-41.7, -12.5], CE: [-39.3, -5.2], DF: [-47.8, -15.8], ES: [-40.6, -19.6],
  GO: [-49.6, -16.0], MA: [-45.3, -5.0], MT: [-55.9, -12.9], MS: [-54.8, -20.5],
  MG: [-44.6, -18.6], PA: [-52.5, -4.3], PB: [-36.7, -7.1], PR: [-51.5, -24.6],
  PE: [-37.9, -8.4], PI: [-43.0, -7.4], RJ: [-42.6, -22.3], RN: [-36.6, -5.8],
  RS: [-53.2, -29.7], RO: [-62.8, -10.9], RR: [-61.4, 2.1], SC: [-50.5, -27.3],
  SP: [-48.6, -22.2], SE: [-37.4, -10.6], TO: [-48.3, -10.2]
};

/** Acha a coordenada pelo nome escrito de qualquer jeito no cadastro. */
export function coord(nome) {
  if (!nome) return null;
  const t = String(nome).trim();
  if (CIDADES[t]) return CIDADES[t];
  const semUF = t.replace(/\s*\([A-Z]{2}\)\s*$/, '').trim();
  if (CIDADES[semUF]) return CIDADES[semUF];
  const chave = Object.keys(CIDADES).find((c) => semUF.includes(c) || c.includes(semUF));
  if (chave) return CIDADES[chave];
  // Nada bateu: cai no centro do estado, que ainda diz em que canto do país é.
  const uf = t.match(/\(([A-Z]{2})\)\s*$/)?.[1] || t.match(/[\/-]\s*([A-Z]{2})\s*$/)?.[1];
  return (uf && UF[uf]) || null;
}

/* "Conceição do Araguaia" não cabe num mapa de celular. O nome que identifica
   é o primeiro pedaço; o resto é endereço. */
export function curto(nome) {
  if (!nome) return '';
  return String(nome)
    .replace(/\s*\([A-Z]{2}\)\s*$/, '')
    .split(/\s+d[oaei]s?\s+/i)[0]
    .trim()
    .toUpperCase();
}

const LIMITES = { o: -74.2, l: -34.0, n: 5.6, s: -34.2 };

/* Projeção equiretangular com a longitude corrigida pela latitude média: numa
   faixa do tamanho do Brasil isso já basta para o desenho não achatar. */
function projetar(lon, lat, larg, alt, caixa = LIMITES) {
  const k = Math.cos((((caixa.n + caixa.s) / 2) * Math.PI) / 180);
  const dx = (caixa.l - caixa.o) * k;
  const dy = caixa.n - caixa.s;
  const escala = Math.min(larg / dx, alt / dy);
  const cx = larg / 2 - (((caixa.o + caixa.l) / 2) * k) * escala;
  const cy = alt / 2 + (((caixa.n + caixa.s) / 2)) * escala;
  return [lon * k * escala + cx, cy - lat * escala];
}

/**
 * O país em SVG.
 *
 * @param {object} o
 * @param {number} o.larg  largura em px
 * @param {number} o.alt   altura em px
 * @param {Array}  o.pinos [{ nome, cidade, n, estado }] — estado vira classe
 * @param {string} o.rota  cidade de partida, para o arco até o pino aceso
 * @param {string} o.aceso nome do pino em destaque
 */
export function brasilSVG({ larg, alt, pinos = [], rota = '', aceso = '' }) {
  const P = (c) => projetar(c[0], c[1], larg, alt);
  // Curva que passa pelos meios dos segmentos: o polígono some e sobra uma
  // silhueta desenhada. É o que faz o país parecer traço e não gráfico.
  // Repetir um vértice faz a curva praticamente passar por ele: é assim que os
  // cantos que dão a cara do país — o bico do Rio Grande do Norte, o Chuí, a
  // ponta do Acre — não viram curva mansa.
  const CANTOS = new Set(['-35.2,-5.2', '-34.85,-8.05', '-53.4,-33.7', '-73.2,-9.4',
    '-51.6,4.4', '-60.7,5.2', '-38.5,-3.7', '-48.5,-25.5']);
  const pts = [];
  for (const c of CONTORNO) {
    const q = P(c);
    pts.push(q);
    if (CANTOS.has(c.join(','))) pts.push(q);
  }
  const md = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const n2 = (v) => v.toFixed(1);
  let d = `M${n2(md(pts[pts.length - 1], pts[0])[0])} ${n2(md(pts[pts.length - 1], pts[0])[1])}`;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const m = md(a, pts[(i + 1) % pts.length]);
    d += `Q${n2(a[0])} ${n2(a[1])} ${n2(m[0])} ${n2(m[1])}`;
  }
  d += 'Z';

  // Paralelos e meridianos: dão escala ao desenho e enchem o vazio com ordem.
  const grade = [];
  for (let lat = 0; lat >= -30; lat -= 10) {
    const [, y] = P([-60, lat]);
    grade.push(`<line class="geo-grade" x1="0" y1="${y.toFixed(1)}" x2="${larg}" y2="${y.toFixed(1)}"/>`);
  }
  for (let lon = -70; lon <= -40; lon += 10) {
    const [x] = P([lon, 0]);
    grade.push(`<line class="geo-grade" x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${alt}"/>`);
  }

  const de = rota ? coord(rota) : null;
  const arcos = [];
  const marcas = [];
  // Duas viagens para a mesma cidade dão um pino só: onze marcas empilhadas em
  // cinco lugares não dizem nada.
  const vistos = [];
  const ocupados = [];
  for (const p of pinos) {
    const c = coord(p.cidade || p.nome);
    if (!c) continue;
    const [x, y] = P(c);
    // Perto demais é o mesmo lugar: São Paulo e Osasco não merecem dois pontos.
    const perto = vistos.find((v) => Math.hypot(v.x - x, v.y - y) < 14);
    if (perto) { perto.p.vezes++; continue; }
    vistos.push({ x, y, p });
    p.vezes = 1;
    const on = aceso && (p.nome === aceso || p.cidade === aceso);
    // Um rótulo que encosta no outro não é rótulo: aqui ele desce até achar
    // lugar e, se não achar, some — o ponto sozinho já diz onde é.
    const bruto = p.rotulo === false ? '' : (p.rotulo || p.cidade || p.nome);
    let texto = curto(bruto);
    let dy = 3.4;
    if (texto) {
      const larguraTxt = texto.length * 6.4;
      const x0 = () => (x > larg * 0.62 ? x - 9 - larguraTxt : x + 9);
      let livre = false;
      for (const tentativa of [3.4, -9, 15, -20, 26]) {
        const cx0 = x0(), cy0 = y + tentativa;
        if (!ocupados.some((r) => Math.abs(r.y - cy0) < 11
          && cx0 < r.x + r.w + 4 && cx0 + larguraTxt + 4 > r.x)) {
          dy = tentativa; livre = true;
          ocupados.push({ x: cx0, y: cy0, w: larguraTxt });
          break;
        }
      }
      if (!livre) texto = '';
    }
    if (de && Math.hypot(P(de)[0] - x, P(de)[1] - y) > 6) {
      const [ax, ay] = P(de);
      // Arco alto, de rota aérea: o desvio é proporcional à distância. Todas
      // são desenhadas de uma vez e só a da cidade acesa fica visível — assim
      // trocar de cidade é acender outra linha, não redesenhar o mapa.
      const mx = (ax + x) / 2;
      const my = (ay + y) / 2 - Math.hypot(x - ax, y - ay) * 0.28;
      arcos.push(`<path class="geo-rota ${on ? 'on' : ''}"
        data-para="${esc(p.cidade || p.nome)}"
        d="M${ax.toFixed(1)} ${ay.toFixed(1)}
        Q${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}"/>`);
      if (!arcos.base) {
        arcos.base = true;
        marcas.push(`<circle class="geo-pino base" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.5"/>`);
      }
    }
    // Rótulo do lado que tiver espaço: no leste ele cai para dentro do país.
    const esq = x > larg * 0.62;
    // O pino tem duas camadas: a de fora acompanha o zoom do país, a de dentro
    // é contra-escalada por `--iz`, para que ponto e nome não inchem junto.
    marcas.push(`<g class="geo-p ${p.estado || ''} ${on ? 'on' : ''} ${esq ? 'esq' : ''}"
      transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"
      data-cidade="${esc(p.cidade || p.nome)}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}">
      <g class="geo-p-in">
        <circle class="geo-toque" r="16"/>
        <circle class="geo-halo" r="${on ? 15 : 0}"/>
        <circle class="geo-pino" r="${on ? 4.5 : 3.2}"/>
        ${texto ? `<text class="geo-n" x="${esq ? -9 : 9}" y="${dy}"
          text-anchor="${esq ? 'end' : 'start'}">${texto}</text>` : ''}
      </g>
    </g>`);
  }
  return `<svg class="geo" viewBox="0 0 ${larg} ${alt}" width="${larg}" height="${alt}"
    style="--iz:1" data-larg="${larg}" data-alt="${alt}"
    role="img" aria-label="Mapa do Brasil com as cidades do job">
    <g class="geo-mundo" data-mundo>
      ${grade.join('')}
      <path class="geo-pais" d="${d}"/>
      ${arcos.join('')}
      ${marcas.join('')}
    </g>
  </svg>`;
}

/* -------------------------------------------------------------- o zoom -----
   O país inteiro cabe na tela, mas Gravataí e Porto Alegre viram o mesmo ponto.
   Aqui o desenho aproxima de uma cidade sem redesenhar nada: o grupo de fora
   ganha uma transformação e os pinos se defendem dela pela contra-escala. Fica
   suave porque é `transform`, e continua legível porque o texto não cresce.

   @param {SVGElement} svg  o que `brasilSVG` devolveu, já no documento
   @param {string} cidade   para onde ir; vazio volta para o país inteiro
   @param {number} z        quanto aproximar (1 = país inteiro)
*/
export function zoomPara(svg, cidade, z = 2.8) {
  if (!svg) return;
  // A rota da cidade escolhida acende; as outras somem.
  svg.querySelectorAll('.geo-rota').forEach((r) => {
    r.classList.toggle('on', Boolean(cidade) && r.dataset.para === cidade);
  });
  const mundo = svg.querySelector('[data-mundo]');
  if (!mundo) return;
  const larg = Number(svg.dataset.larg) || 0;
  const alt = Number(svg.dataset.alt) || 0;

  if (!cidade || z <= 1) {
    mundo.setAttribute('transform', '');
    svg.style.setProperty('--iz', '1');
    svg.classList.remove('perto');
    return;
  }
  const alvo = svg.querySelector(`.geo-p[data-cidade="${CSS.escape(cidade)}"]`);
  if (!alvo) return;
  const px = Number(alvo.dataset.x), py = Number(alvo.dataset.y);
  // Leva o ponto para o centro da caixa e depois amplia em volta dele.
  const tx = larg / 2 - px * z;
  const ty = alt / 2 - py * z;
  mundo.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${z})`);
  svg.style.setProperty('--iz', String(1 / z));
  svg.classList.add('perto');
}

/* ---------------------------------------------------- os arredores ---------
   De perto, o mapa passa a mostrar o que interessa a quem vai: onde se pousa,
   quanto tem de estrada até a escola e quanto tempo. É desenhado só quando o
   zoom entra, porque num país inteiro isso vira sujeira.

   @param {SVGElement} svg
   @param {object} d  { cidade, aeroporto, km, tempo } — vazio limpa a camada
*/
export function detalharCidade(svg, d) {
  if (!svg) return;
  const mundo = svg.querySelector('[data-mundo]');
  if (!mundo) return;
  mundo.querySelector('.geo-arred')?.remove();
  if (!d?.cidade || !d.aeroporto) return;

  const larg = Number(svg.dataset.larg) || 0;
  const alt = Number(svg.dataset.alt) || 0;
  const a = coord(d.cidade), b = coord(d.aeroporto);
  if (!a || !b) return;
  const P = (c) => projetar(c[0], c[1], larg, alt);
  const [x1, y1] = P(a);
  const [x2, y2] = P(b);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  // Trinta quilômetros num mapa do Brasil são dois pixels: Porto Alegre cai em
  // cima de Gravataí. Quando isso acontece, o rótulo do aeroporto desce e a
  // distância sai do desenho — ela continua escrita ao lado, por extenso.
  const perto = Math.hypot(x2 - x1, y2 - y1) < 42;
  const rotulo = perto ? '' : [d.km ? `${d.km} km` : '', d.tempo].filter(Boolean).join(' · ');

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'geo-arred');
  g.innerHTML = `
    ${perto ? '' : `<line class="geo-estrada" x1="${x2.toFixed(1)}" y1="${y2.toFixed(1)}"
      x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`}
    <g class="geo-p aero" transform="translate(${x2.toFixed(1)} ${y2.toFixed(1)})">
      <g class="geo-p-in">
        <path class="geo-aero" d="M-5 1.5 L5.5 -2.5 L4 1.4 a1.7 1.7 0 0 1-1.1 1L-1 3.5 -2 4.9 -2.8 2.4z"/>
        <text class="geo-n aero" x="${perto ? 0 : 8}" y="${perto ? 16 : 3.4}"
          text-anchor="${perto ? 'middle' : 'start'}">${esc(curto(d.aeroporto))}${
          d.sigla ? ' · ' + esc(d.sigla) : ''}${
          perto && d.km ? ` · ${d.km} km` : ''}</text>
      </g>
    </g>
    ${rotulo ? `<g class="geo-p" transform="translate(${mx.toFixed(1)} ${my.toFixed(1)})">
      <g class="geo-p-in"><text class="geo-km" text-anchor="middle" y="-6">${esc(rotulo)}</text></g>
    </g>` : ''}`;
  mundo.appendChild(g);
}

/* Aspas dentro de um atributo quebram o SVG inteiro. */
const esc = (t) => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
