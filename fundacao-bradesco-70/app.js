(() => {
  const { PROJETO, ESCOLAS, FOTOGRAFOS, DOCUMENTARIO, BRASIL_PATH } = window;
  const MODO_REVISAO = window.MODO_REVISAO !== false;

  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, html = "") => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v;
      else n.setAttribute(k, v);
    }
    if (html) n.innerHTML = html;
    return n;
  };
  // escapa HTML e prende número + unidade ("2 min", "70 anos") para não sobrar palavra órfã na linha
  const esc = (s) => String(s)
    .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
    .replace(/(\d) (?=(min|anos|km|alunos|escolas|fotógrafos|regiões)\b)/g, "$1\u00a0");
  const initials = (nome) => nome.split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÀ-Ú]/.test(w)).filter((w) => !/^(de|da|do|dos|das)$/i.test(w)).map((w) => w[0]).slice(0, 2).join("");
  const escolaById = Object.fromEntries(ESCOLAS.map((e) => [e.id, e]));
  const fotoById = Object.fromEntries(FOTOGRAFOS.map((f) => [f.id, f]));
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  const VISITADAS = ESCOLAS.filter((e) => e.visita);
  const totalFilmes = FOTOGRAFOS.reduce((n, f) => n + f.pilulas.length, 0) + VISITADAS.length + 2;
  const regioes = new Set(ESCOLAS.map((e) => e.regiao)).size;

  // ── Apresentação ──────────────────────────────────────────
  $('[data-bind="kicker"]').textContent = PROJETO.kicker;
  $('[data-bind="titulo"]').textContent = PROJETO.titulo;
  $('[data-bind="subtitulo"]').textContent = PROJETO.subtitulo;

  // "O projeto": texto, números, formatos e créditos (card no mapa e painel no celular)
  const STATS = [[totalFilmes, "filmes"], [FOTOGRAFOS.length, "fotógrafos"], [ESCOLAS.length, "escolas"], [regioes, "regiões"]];
  const aboutHTML = (full) => `
    <p class="p-kicker">O projeto</p>
    ${(full ? PROJETO.intro : PROJETO.intro.slice(0, 1)).map((p) => `<p class="about-text">${esc(p)}</p>`).join("")}
    <dl class="about-stats">${STATS.map(([n, l]) => `<div><dt>${l}</dt><dd>${n}</dd></div>`).join("")}</dl>
    <ul class="about-formats">${PROJETO.formatos.map((f) =>
      `<li style="--c:${f.cor}"><i></i><strong>${esc(f.nome)}</strong><span>${esc(f.duracao)}</span>${full ? `<p>${esc(f.texto)}</p>` : ""}</li>`).join("")}</ul>
    ${full ? `<dl class="creditos">${PROJETO.creditos.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
    <p class="made-by">Produzido por <b>Têmpora</b> studio</p>`;
  $("#about-card-body").innerHTML = aboutHTML(false);

  // Pontos coloridos do livro, espalhados de forma determinística (mesmo desenho a cada visita)
  // Bolinhas como nas páginas do livro: poucas, soltas pelas margens, e um grupinho solto embaixo à direita.
  // Todas do mesmo tamanho (proporcional à tela, como no livro). Posições em % da tela: "x,y,cor".
  const P = { r: "var(--red)", y: "var(--yellow)", b: "var(--blue)", p: "var(--purple)", o: "var(--orange)", c: "var(--cream)" };
  const desenho = {
    title: "22,9,y 9,31,r 17,60,p 30,86,o 79,13,b 88,22,r 92,25,p 84,47,p 92,61,r 71,80,r 69,87,p 64,90,b 77,86,p 66,95,y",
    splash: "20,13,y 11,40,r 25,72,o 79,18,b 87,43,r 75,74,y 69,83,c 78,88,r 64,90,b",
  };
  function confetti(box, spec) {
    spec.split(" ").forEach((t, i) => {
      const [x, y, c] = t.split(",");
      const d = el("span", { class: "dot" });
      d.style.cssText = `left:${x}%;top:${y}%;--c:${P[c]};--d:${(0.3 + i * 0.09).toFixed(2)}s;` +
        `--dx:${(i % 3) * 3 - 3}px;--dy:${(i % 2 ? -1 : 1) * (3 + (i % 4))}px`;
      box.append(d);
    });
  }
  confetti($('[data-confetti="splash"]'), desenho.splash);
  confetti($('[data-confetti="title"]'), desenho.title);
  // bolinha nunca em cima de texto, logo ou botão: a que cairia em cima some (importa no celular)
  function clearDots() {
    const hit = (a, b) => a.left < b.right + 8 && b.left < a.right + 8 && a.top < b.bottom + 8 && b.top < a.bottom + 8;
    // mede o que de fato ocupa a tela: o texto (não a caixa inteira), o logo e cada botão
    const area = (n) => { if (n.matches("img, button")) return n.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(n); return r.getBoundingClientRect(); };
    [["splash", ".splash-logo"], ["title", ".title-block .kicker, .title-block .display, .title-block .display-sub, .title-actions > *, .title-page > .made-by"]].forEach(([k, sel]) => {
      const box = $(`[data-confetti="${k}"]`);
      const blocks = [...document.querySelectorAll(sel)].map(area).filter((b) => b.width);
      if (!blocks.length) return; // tela escondida: confere quando aparecer
      box.querySelectorAll(".dot").forEach((d) => {
        d.style.display = "";
        const r = d.getBoundingClientRect();
        d.style.display = blocks.some((b) => hit(r, b)) ? "none" : "";
      });
    });
  }
  clearDots();
  addEventListener("resize", clearDots);
  document.fonts?.ready.then(clearDots);

  // Imagem do fotógrafo: retrato (assets/retratos/) se houver; senão o recorte da capa do livro
  // (assets/capas/, gerada a partir do PDF). Sem nenhuma, fica a cor da lombada + iniciais.
  const capa = (f, tipo = "thumb") => f.capa?.[tipo] ?? `assets/capas/${f.id}${tipo === "thumb" ? "-thumb" : ""}.jpg`;
  const retrato = (f) => f.retrato;
  const withImage = (node, ...srcs) => {
    const [src, ...rest] = srcs.filter(Boolean);
    if (!src) return;
    const im = new Image();
    im.onload = () => { node.style.backgroundImage = `url("${src}")`; node.classList.add("has-img"); };
    im.onerror = () => withImage(node, ...rest);
    im.src = src;
  };

  // Pôster do documentário: a capa principal do livro
  const POSTER = "assets/capas/mariana-valente.jpg";
  withImage($("#doc-poster"), POSTER);

  // ── Mapa ──────────────────────────────────────────────────
  const map = $("#map");
  const scrimEl = $("#scrim");
  const layer = $("#map-layer");
  const linksG = $("#links");
  $("#land").setAttribute("d", BRASIL_PATH);

  // lat/long → viewBox 1000×1000 (Mercator, mesmos parâmetros de brasil-path.js)
  const { escala, tx, ty } = window.PROJECAO;
  const project = (lat, lon) => [
    escala * (lon * Math.PI / 180) + tx,
    -escala * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) + ty,
  ];
  ESCOLAS.forEach((e) => {
    if (e.pos) return;
    const [x, y] = project(e.lat, e.lon), [dx, dy] = e.ajuste || [0, 0];
    e.pos = [Math.round(x + dx), Math.round(y + dy)];
  });

  // Posiciona os nós dos fotógrafos: começa no centro das escolas que retratou
  // e separa os nós entre si e das escolas com uma relaxação simples (determinística).
  function layoutNodes() {
    const pts = FOTOGRAFOS.map((f, i) => {
      const cs = f.cidades.map((id) => escolaById[id].pos);
      const cx = cs.reduce((s, p) => s + p[0], 0) / cs.length;
      const cy = cs.reduce((s, p) => s + p[1], 0) / cs.length;
      const a = (i / FOTOGRAFOS.length) * Math.PI * 2;
      return { cx, cy, x: cx + Math.cos(a) * 30, y: cy + Math.sin(a) * 30 - 20 };
    });
    const cities = ESCOLAS.map((e) => e.pos);
    for (let it = 0; it < 400; it++) {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        let fx = (p.cx - p.x) * 0.02, fy = (p.cy - 30 - p.y) * 0.02;
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          const dx = p.x - pts[j].x, dy = p.y - pts[j].y, d = Math.hypot(dx, dy) || 0.01;
          if (d < 120) { fx += (dx / d) * (120 - d) * 0.12; fy += (dy / d) * (120 - d) * 0.12; }
        }
        for (const [qx, qy] of cities) {
          const dx = p.x - qx, dy = p.y - qy, d = Math.hypot(dx, dy) || 0.01;
          if (d < 60) { fx += (dx / d) * (60 - d) * 0.2; fy += (dy / d) * (60 - d) * 0.2; }
        }
        p.x = Math.min(900, Math.max(90, p.x + fx));
        p.y = Math.min(930, Math.max(70, p.y + fy));
      }
    }
    pts.forEach((p, i) => (FOTOGRAFOS[i].pos ||= [Math.round(p.x), Math.round(p.y)]));
  }
  if (FOTOGRAFOS.some((f) => !f.pos)) layoutNodes();

  const pct = ([x, y]) => `left:${x / 10}%;top:${y / 10}%`;

  ESCOLAS.forEach((e, i) => {
    const b = el("button", {
      class: `city lab-${e.rotulo || (e.pos[0] > 760 ? "l" : "r")}${e.visita ? " visitada" : ""}`,
      style: `${pct(e.pos)};--d:${(i * 0.45).toFixed(2)}s;--c:${e.cor || "var(--purple)"}`,
      type: "button",
      "data-city": e.id,
      "aria-label": `Escola de ${e.cidade}, ${e.uf}`,
    }, `<span class="city-dot"></span><span class="city-label"><b>${e.ano ? `${esc(e.ano)} · ` : ""}${esc(e.uf)}</b>${esc(e.nomeMapa || e.cidade)}</span>`);
    layer.append(b);
    e.btn = b;
  });

  FOTOGRAFOS.forEach((f, i) => {
    const b = el("button", {
      class: "node",
      style: `${pct(f.pos)};--d:${(-i * 0.7).toFixed(2)}s;--c:${f.cor}`,
      type: "button",
      "data-photo": f.id,
      "aria-label": `Fotógrafo ${f.nome}`,
    }, `<span class="node-inner">${esc(initials(f.nome))}</span><span class="node-name">${esc(f.nome)}</span>`);
    layer.append(b);
    withImage(b.firstElementChild, retrato(f), capa(f));
    f.btn = b;
    f.links = f.cidades.map((cid, k) => {
      const [x1, y1] = f.pos, [x2, y2] = escolaById[cid].pos;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const len = Math.hypot(x2 - x1, y2 - y1);
      const bend = (k % 2 ? -1 : 1) * len * 0.12;
      const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${x1},${y1} Q${mx + nx * bend},${my + ny * bend} ${x2},${y2}`);
      path.setAttribute("class", "link");
      path.dataset.photo = f.id;
      path.dataset.city = cid;
      linksG.append(path);
      return path;
    });
  });
  // comprimento das linhas para a animação de desenho (precisa do SVG visível)
  function measureLinks() {
    linksG.querySelectorAll(".link").forEach((p, i) => {
      const L = Math.ceil(p.getTotalLength());
      p.style.setProperty("--len", L);
      p.style.animationDelay = `${0.3 + i * 0.04}s`;
    });
  }

  // destaque ao passar o mouse / selecionar
  function focusOn({ photo, city } = {}) {
    const on = new Set();
    linksG.querySelectorAll(".link").forEach((p) => {
      const hit = (photo && p.dataset.photo === photo) || (city && p.dataset.city === city);
      p.classList.toggle("on", !!hit);
      if (hit) { on.add("p:" + p.dataset.photo); on.add("c:" + p.dataset.city); }
    });
    if (photo) on.add("p:" + photo);
    if (city) on.add("c:" + city);
    FOTOGRAFOS.forEach((f) => f.btn.classList.toggle("on", on.has("p:" + f.id)));
    ESCOLAS.forEach((e) => e.btn.classList.toggle("on", on.has("c:" + e.id)));
    map.classList.toggle("focus", !!(photo || city));
  }
  let selected = null;

  // Zoom dinâmico: enquadra os pontos em foco; zoom 1 = Brasil inteiro.
  // O mapa nunca muda de tamanho (isso brigava com o zoom e dava trancos): só um transform, em px,
  // que leva a seleção para a área livre da tela (ao lado do painel no desktop, acima dele no celular).
  let ultimoZoom = null; // pontos do último enquadramento pré-definido (para o botão de voltar)
  function zoomTo(points) {
    if (!points?.length) return zoomReset();
    ultimoZoom = points; livre(false);
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const pad = 120;
    const w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const S = map.offsetWidth, wrap = map.parentElement.getBoundingClientRect();
    const baseX = wrap.left + map.offsetLeft, baseY = wrap.top + map.offsetTop; // posição sem transform
    const phone = matchMedia("(max-width: 899px)").matches;
    const area = phone
      ? { l: 0, r: innerWidth, t: 96, b: innerHeight * 0.38, min: 0.9 }
      : { l: Math.max(wrap.left + 16, 370), r: innerWidth - 476, t: Math.max(wrap.top + 8, 110), b: innerHeight - 24, min: 1 }; // livre do card do documentário e da dica
    const visW = area.r - area.l, visH = Math.max(120, area.b - area.t);
    const z = Math.max(area.min, Math.min(2.6, visW / (w * S / 1000), visH / (h * S / 1000)));
    const tx = (area.l + area.r) / 2 - baseX - (cx / 1000) * S * z;
    const ty = (area.t + area.b) / 2 - baseY - (cy / 1000) * S * z;
    map.style.setProperty("--z", z.toFixed(3));
    map.style.setProperty("--tx", `${tx.toFixed(1)}px`);
    map.style.setProperty("--ty", `${ty.toFixed(1)}px`);
    labelsLater();
  }
  // volta ao Brasil inteiro com valores explícitos (apagar as variáveis deixava o Safari/iPhone preso no zoom anterior)
  function zoomReset() { ultimoZoom = null; livre(false); map.style.setProperty("--z", "1"); map.style.setProperty("--tx", "0px"); map.style.setProperty("--ty", "0px"); labelsLater(); }
  // Zoom livre no celular: pinça para aproximar, um dedo para arrastar (também por cima da ficha aberta).
  // Tocar numa escola ou num fotógrafo volta ao enquadramento pré-definido; o botão ⤢ desfaz o zoom livre.
  const resetBtn = document.createElement("button");
  resetBtn.type = "button"; resetBtn.className = "map-reset"; resetBtn.hidden = true;
  resetBtn.setAttribute("aria-label", "Voltar ao enquadramento"); resetBtn.title = "Voltar ao enquadramento";
  resetBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  resetBtn.addEventListener("click", (e) => { e.stopPropagation(); ultimoZoom ? zoomTo(ultimoZoom) : zoomReset(); });
  map.parentElement.append(resetBtn);
  function livre(on) { map.classList.toggle("livre", on); resetBtn.hidden = !on; if (on) $("#map-hint")?.classList.add("gone"); }
  (() => {
    const pts = new Map(); let g = null, arrastou = false;
    const val = (k) => parseFloat(map.style.getPropertyValue(k)) || (k === "--z" ? 1 : 0);
    const meio = () => { const [a, b] = [...pts.values()]; return b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) } : { x: a.x, y: a.y, d: 0 }; };
    const inicio = () => {
      const w = map.parentElement.getBoundingClientRect();
      g = { m: meio(), z: val("--z"), tx: val("--tx"), ty: val("--ty"), bx: w.left + map.offsetLeft, by: w.top + map.offsetTop };
    };
    const aplica = () => {
      const m = meio(), S = map.offsetWidth;
      const z = Math.max(0.8, Math.min(5, g.m.d && m.d ? g.z * (m.d / g.m.d) : g.z));
      // o ponto do mapa que estava sob os dedos continua sob os dedos
      const px = (g.m.x - g.bx - g.tx) / g.z, py = (g.m.y - g.by - g.ty) / g.z;
      let tx = m.x - g.bx - px * z, ty = m.y - g.by - py * z;
      // não deixa o mapa sumir da tela: sobra sempre um pedaço à vista
      const keep = 80;
      tx = Math.min(innerWidth - keep - g.bx, Math.max(keep - g.bx - S * z, tx));
      ty = Math.min(innerHeight - keep - g.by, Math.max(keep - g.by - S * z, ty));
      map.style.setProperty("--z", z.toFixed(3)); map.style.setProperty("--tx", `${tx.toFixed(1)}px`); map.style.setProperty("--ty", `${ty.toFixed(1)}px`);
    };
    const toque = (e) => e.pointerType !== "mouse" && matchMedia("(max-width: 899px)").matches;
    [map.parentElement, scrimEl].forEach((el) => {
      el.addEventListener("pointerdown", (e) => {
        if (!toque(e) || e.target.closest(".map-reset")) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
        if (pts.size === 1) arrastou = false;
        inicio();
      });
      el.addEventListener("pointermove", (e) => {
        const p = pts.get(e.pointerId); if (!p) return;
        p.x = e.clientX; p.y = e.clientY;
        if (!arrastou && Math.hypot(p.x - p.x0, p.y - p.y0) < 8 && pts.size < 2) return; // ainda é um toque
        if (!arrastou) { arrastou = true; map.classList.add("arrastando"); livre(true); try { el.setPointerCapture(e.pointerId); } catch {} }
        aplica();
      });
      const fim = (e) => {
        if (!pts.delete(e.pointerId)) return;
        if (pts.size) { inicio(); return; } // sobrou um dedo: segue arrastando dali
        map.classList.remove("arrastando");
        if (arrastou) { placeLabels(); setTimeout(() => (arrastou = false), 60); } // o clique logo após soltar ainda é ignorado
      };
      el.addEventListener("pointerup", fim); el.addEventListener("pointercancel", fim);
      // depois de arrastar, o dedo solto não conta como toque (não abre nem fecha nada)
      el.addEventListener("click", (e) => { if (arrastou) { e.stopPropagation(); e.preventDefault(); arrastou = false; } }, true);
    });
  })();
  // reposiciona os nomes ao fim do zoom mesmo se o navegador não avisar o fim da animação
  let labelsT; const labelsLater = () => { clearTimeout(labelsT); labelsT = setTimeout(() => placeLabels(), 1200); };
  // navegador sem @property (Safari antigo): anima o transform direto, para o zoom não pular
  if (!window.CSS?.registerProperty) map.classList.add("no-prop");
  // Rótulos sem atropelo: cada nome procura, em volta da sua bolinha, o lugar que menos cobre
  // outras bolinhas, fotógrafos e nomes já colocados. Refeito ao mudar zoom ou tamanho da tela.
  function placeLabels() {
    if (!map.offsetWidth) return;
    const box = (r, pad = 0) => ({ x1: r.left - pad, y1: r.top - pad, x2: r.right + pad, y2: r.bottom + pad });
    const hit = (a, b) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
    const view = box(map.parentElement.getBoundingClientRect());
    const dots = ESCOLAS.map((e) => ({ id: e.id, b: box(e.btn.firstElementChild.getBoundingClientRect(), 5) }));
    const fixed = [...dots.map((d) => d.b)];
    FOTOGRAFOS.forEach((f) => {
      fixed.push(box(f.btn.firstElementChild.getBoundingClientRect(), 6));
      const n = f.btn.querySelector(".node-name");
      if (getComputedStyle(n).opacity !== "0") fixed.push(box(n.getBoundingClientRect(), 2));
    });
    const placed = [];
    const rank = (e) => (e.btn.classList.contains("on") ? 2 : 0) + (e.visita ? 1 : 0);
    const order = [...ESCOLAS].sort((a, b) => rank(b) - rank(a)); // a escola em foco e as visitadas escolhem primeiro
    order.forEach((e) => {
      const lab = e.btn.querySelector(".city-label");
      const w = lab.offsetWidth, h = lab.offsetHeight, g = 13;
      const c = e.btn.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
      const pref = e.rotulo || (e.pos[0] > 760 ? "l" : "r");
      const cands = {
        r: [g, -h / 2], l: [-g - w, -h / 2], t: [-w / 2, -g - h], b: [-w / 2, g],
        tr: [g * .6, -g * .6 - h], tl: [-g * .6 - w, -g * .6 - h], br: [g * .6, g * .6], bl: [-g * .6 - w, g * .6],
      };
      let best = null;
      for (const [k, [dx, dy]] of Object.entries(cands)) {
        const r = { x1: cx + dx, y1: cy + dy, x2: cx + dx + w, y2: cy + dy + h };
        let clash = 0;
        fixed.forEach((o, i) => { if (dots[i]?.id !== e.id) clash += hit(r, o) * 3; });
        placed.forEach((o) => { clash += hit(r, o) * 3; });
        clash += (w * h - hit(r, view)) * 4; // não sair da área do mapa
        const cost = clash + (k === pref ? 0 : k.length === 1 ? 6 : 10);
        if (!best || cost < best.cost) best = { cost, clash, k, dx, dy, r };
      }
      lab.style.left = `${best.dx + c.width / 2}px`;
      lab.style.top = `${best.dy + c.height / 2}px`;
      lab.style.right = "auto"; lab.style.transform = "none";
      lab.style.textAlign = best.k.includes("l") ? "right" : best.k.length === 1 && "tb".includes(best.k) ? "center" : "left";
      // sem lugar livre (celular, mapa inteiro): o nome some e volta com o zoom ou ao tocar na escola
      const off = best.clash > 30;
      e.btn.classList.toggle("lab-off", off);
      if (!off) placed.push(best.r);
    });
  }
  let labelTimer;
  const queueLabels = () => { clearTimeout(labelTimer); labelTimer = setTimeout(placeLabels, 60); };
  map.addEventListener("transitionend", (ev) => { if (ev.target === map) queueLabels(); });
  addEventListener("resize", queueLabels);
  document.fonts?.ready.then(queueLabels);

  layer.addEventListener("pointerover", (ev) => {
    if (ev.pointerType !== "mouse") return;
    const t = ev.target.closest("[data-photo],[data-city]");
    if (t) focusOn({ photo: t.dataset.photo, city: t.dataset.city });
  });
  layer.addEventListener("pointerout", (ev) => {
    if (ev.pointerType !== "mouse") return;
    if (!ev.relatedTarget || !ev.relatedTarget.closest?.("[data-photo],[data-city]")) focusOn(selected || {});
  });
  layer.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-photo],[data-city]");
    if (!t) return;
    go(t.dataset.photo ? `#/fotografo/${t.dataset.photo}` : `#/escola/${t.dataset.city}`);
  });
  document.querySelectorAll("[data-play]").forEach((b) => b.addEventListener("click", () => go(`#/filme/${b.dataset.play}`)));

  // ── Player ────────────────────────────────────────────────
  const PLAYER_DOTS = '<span class="dot" style="--c:var(--yellow);top:18%;right:12%"></span><span class="dot" style="--c:var(--red);top:30%;right:22%"></span><span class="dot" style="--c:var(--white);top:40%;right:9%"></span>';
  // link final (planilha de controle ou videos.js) ou o vídeo provisório; lido na hora, pois a planilha chega depois
  // Só tocam os filmes aprovados (check da Equipe Bradesco no cronograma, ou o status do Controle);
  // os outros mostram em que pé estão. No lançamento, SO_APROVADOS = false em links-planilha.js libera tudo.
  const visitaDoFot = Object.fromEntries(FOTOGRAFOS.filter((f) => f.visita).map((f) => [f.id, f.visita]));
  const blocoDo = (id) => { const g = id.startsWith("pilula-") ? id.replace(/^pilula-/, "").replace(/-\d+$/, "") : id.replace(/^visita-/, ""); return visitaDoFot[g] || g; }; // id do bloco no cronograma
  const STATUS_SITE = { "v2 com o cliente": "V2 aguardando aprovação", "ajustes do retorno": "Em ajustes depois da V2", "em finalização": "Em finalização", "online com o cliente": "Online aguardando aprovação" };
  const liberado = (v) => {
    if (!window.SO_APROVADOS || window.VIDEO_STATUS === false) return true; // planilha fora do ar: não trava o site
    const st = (window.VIDEO_STATUS || {})[v.id] || "";
    return /^(aprovado|entregue)$/.test(st) || !!window.FB_REGISTRO?.aprovado?.(blocoDo(v.id));
  };
  const statusDe = (v) => (!window.VIDEO_STATUS ? "Carregando…" : STATUS_SITE[window.VIDEO_STATUS[v.id] || ""] || "Aguardando a V2");
  const fonte = (v) => {
    if (!liberado(v)) return { final: "", url: "", status: statusDe(v) };
    const final = (window.VIDEO_LINKS || {})[v.id] || v.url; return { final, url: final || window.VIDEO_PLACEHOLDER || "" };
  };

  function playerHTML(v, badge, cor, poster) {
    badge = v.badge || badge;
    const { final, url, status } = fonte(v);
    const ready = !!url;
    return `<div class="player${poster ? " has-poster" : ""}${ready ? " is-ready" : ""}" ${ready ? `data-start role="button" tabindex="0" aria-label="Assistir ${esc(v.titulo)}"` : ""} style="--pc:${cor || "var(--purple)"}${poster ? `;--poster:url('${poster}')` : ""}">
      <div class="player-empty">${PLAYER_DOTS}
        <span class="pe-badge">${esc(badge)} · ${esc(v.duracao)}</span>
        ${ready
          ? `<span class="pe-icon is-btn" aria-hidden="true">${ICON_PLAY}</span>`
          : `<span class="pe-icon" aria-hidden="true">${ICON_PLAY}</span>`}
        <span class="pe-title">${esc(v.titulo)}</span>
        <span class="pe-note">${!ready ? esc(status || "Filme em finalização") : final ? "Toque para assistir" : "Toque para assistir · versão provisória"}</span>
      </div>
    </div>`;
  }
  function listHTML(videos, activeIdx) {
    return `<ul class="vlist">${videos.map((v, i) => `<li><button class="vitem${i === activeIdx ? " on" : ""}" type="button" data-vi="${i}">
      <span class="vi-icon">${ICON_PLAY}</span><span class="vi-title">${esc(v.titulo)}</span><span class="vi-dur">${esc(v.duracao)}</span>
    </button></li>`).join("")}</ul>`;
  }
  // liga player + lista de vídeos dentro do painel
  function wireVideos(body, videos, badge, cor, poster, opts) {
    const slot = $("[data-player-slot]", body);
    const render = (i) => {
      slot.innerHTML = playerHTML(videos[i], badge, videos[i].cor || cor, poster);
      body.querySelectorAll(".vitem").forEach((b) => b.classList.toggle("on", +b.dataset.vi === i));
    };
    // o vídeo abre no player do projeto, por cima de tudo, com a sequência do painel
    let current = 0;
    // a sequência do player só tem os que podem tocar
    const play = (i) => {
      const ok = videos.filter((v) => fonte(v).url);
      if (!fonte(videos[i]).url) return;
      window.FBPlayer.open(ok.map((v) => ({
        titulo: v.titulo, duracao: v.duracao, kicker: v.badge || badge, cor: v.cor || cor,
        url: fonte(v).url, provisorio: !fonte(v).final,
      })), ok.indexOf(videos[i]), opts);
    };
    body.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-start]")) return play(current);
      const vi = ev.target.closest("[data-vi]");
      if (vi) { current = +vi.dataset.vi; render(current); play(current); }
    });
    body.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" || ev.key === " ") && ev.target.closest?.("[data-start]")) { ev.preventDefault(); play(current); }
    });
    render(0);
  }

  // ── Painel ────────────────────────────────────────────────
  const panel = $("#panel"), scrim = $("#scrim");
  let lastFocus = null;
  function openPanel(html, after) {
    if (panel.hidden) lastFocus = document.activeElement;
    const old = $("#panel-body");
    const fresh = old.cloneNode(false); // remove listeners antigos
    old.replaceWith(fresh);
    fresh.innerHTML = html;
    panel.classList.toggle("cinema", !!openPanel.cinema); openPanel.cinema = false;
    fresh.querySelectorAll("[data-bg]").forEach((n) => withImage(n, n.dataset.bg2, n.dataset.bg));
    panel.hidden = false; scrim.hidden = false;
    document.body.classList.add("panel-open");
    panel.scrollTop = 0;
    after?.(fresh);
    $("#panel-close").focus({ preventScroll: true });
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true; scrim.hidden = true;
    document.body.classList.remove("panel-open");
    $("#panel-body").innerHTML = "";
    selected = null; focusOn(); zoomReset();
    lastFocus?.focus?.({ preventScroll: true });
  }
  $("#panel-close").addEventListener("click", () => go("#/mapa"));
  scrim.addEventListener("click", () => go("#/mapa"));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) go("#/mapa"); });

  const chipFoto = (f, tbc) => `<button class="chip${tbc ? " tbc" : ""}" type="button" data-go="#/fotografo/${f.id}"><span class="ch-av" style="--c:${f.cor}" data-bg="${capa(f)}" data-bg2="${retrato(f) || ""}">${esc(initials(f.nome))}</span>${esc(f.nome)}</button>`;
  const chipCity = (e, tbc) => `<button class="chip${tbc ? " tbc" : ""}" type="button" data-go="#/escola/${e.id}"><span class="ch-dot" style="--c:${e.cor || "var(--purple)"}"></span>${esc(e.cidade)} · ${esc(e.uf)}</button>`;
  const notaRevisao = (has) => MODO_REVISAO && has ? `<p class="p-sub" style="margin-top:10px">Contorno tracejado: ligação a confirmar.</p>` : "";
  panel.addEventListener("click", (ev) => { const g = ev.target.closest("[data-go]"); if (g) go(g.dataset.go); });

  // Pílulas do fotógrafo + a Visita da escola onde o making of o acompanhou
  const videosDe = (f) => {
    const e = f.visita && escolaById[f.visita];
    return e?.visita ? [...f.pilulas, { ...e.visita, badge: "Visita", cor: "var(--green)" }] : f.pilulas;
  };

  function showFotografo(f) {
    selected = { photo: f.id }; focusOn(selected);
    zoomTo([f.pos, ...f.cidades.map((id) => escolaById[id].pos)]);
    const tbc = (id) => MODO_REVISAO && f.aConfirmar?.includes(id);
    openPanel(`
      <div class="p-head">
        <img class="p-cover" src="${capa(f, "capa")}" alt="Capa do livro com foto de ${esc(f.nome)}" onerror="this.remove()">
        <div>
          <p class="p-kicker">Fotografia</p>
          <h2 class="p-title" id="panel-title">${esc(f.nome)}</h2>
        </div>
      </div>
      <p class="p-sub">Depoimento gravado em ${esc(f.filmagem)}</p>
      <div data-player-slot></div>
      ${listHTML(videosDe(f), 0)}
      <h3 class="p-h">Escolas retratadas</h3>
      <div class="chips">${f.cidades.map((id) => chipCity(escolaById[id], tbc(id))).join("")}</div>
      ${notaRevisao(f.cidades.some(tbc))}
      <h3 class="p-h">Sobre</h3>
      <p class="p-text">${esc(f.bio)}</p>
    `, (b) => wireVideos(b, videosDe(f), "Pílula", f.cor));
  }

  function showEscola(e) {
    selected = { city: e.id }; focusOn(selected);
    const fs = FOTOGRAFOS.filter((f) => f.cidades.includes(e.id));
    zoomTo([e.pos, ...fs.map((f) => f.pos)]);
    const sub = [e.uf, e.ano && `inaugurada em ${e.ano}`].filter(Boolean).join(" · ");
    const endereco = e.endereco
      ? `${esc(e.endereco)}<br>${esc(/^(Jardim Conceição|Osasco II)$/.test(e.cidade) ? "Osasco" : e.cidade)} – ${esc(e.uf)}${e.cep ? ` · CEP ${esc(e.cep)}` : ""}`
      : "Endereço a confirmar";
    openPanel(`
      <p class="p-kicker"><span class="p-dot" style="--c:${e.cor || "var(--purple)"}"></span>${e.visita ? "Escola visitada" : "Escola retratada"} · ${esc(e.regiao)}</p>
      <h2 class="p-title" id="panel-title">${esc(e.conhecida)}</h2>
      <p class="p-sub">${esc(sub)}</p>
      ${e.visita ? `<div data-player-slot></div>` : ""}
      ${e.sobre ? `<p class="p-text" style="margin-top:${e.visita ? 0 : 18}px">${esc(e.sobre)}</p>` : ""}
      <dl class="p-info">
        <div><dt>Nome oficial</dt><dd>${esc(e.nome)}</dd></div>
        <div><dt>Endereço</dt><dd>${endereco}</dd></div>
      </dl>
      ${MODO_REVISAO && e.confirmar ? `<p class="p-sub">Endereço a confirmar${e.fonte === "diretorio" ? " (veio de cadastro público)" : ""}.</p>` : ""}
      <h3 class="p-h">Fotografada por</h3>
      <div class="chips">${fs.map((f) => chipFoto(f)).join("")}</div>
    `, (b) => e.visita && wireVideos(b, [e.visita], "Visita", "var(--green)"));
  }

  // o documentário termina (ou é fechado) levando direto ao mapa
  const DOC_PLAYER = { final: { label: "Explorar o mapa" }, onClose: () => go("#/mapa"), onMinimize: () => go("#/mapa") };
  function showDoc() {
    selected = null; focusOn(); zoomReset();
    // a página do documentário sempre abre pelo trailer; o filme completo vem em seguida
    const vids = [DOCUMENTARIO.trailer, DOCUMENTARIO.filme];
    const start = 0;
    openPanel.cinema = true;
    openPanel(`
      <p class="p-kicker">Documentário · Fundação Bradesco 70 anos</p>
      <h2 class="p-title" id="panel-title">De geração em geração</h2>
      <p class="p-sub">${ESCOLAS.length} escolas · ${FOTOGRAFOS.length} fotógrafos · ${regioes} regiões do Brasil</p>
      <div data-player-slot></div>
      ${listHTML(vids, start)}
      <p class="p-text">${esc(PROJETO.formatos.find((f) => f.tipo === "documentario").texto)}</p>
    `, (b) => { wireVideos(b, vids, "Documentário", "var(--purple-ink)", POSTER, DOC_PLAYER); b.querySelector(`[data-vi="${start}"]`).click(); }); // o filme já abre no player
  }


  function showIndex() {
    selected = null; focusOn(); zoomReset();
    const row = (href, title, dur) => `<li><button class="vitem" type="button" data-go="${href}"><span class="vi-icon">${ICON_PLAY}</span><span class="vi-title">${esc(title)}</span><span class="vi-dur">${esc(dur)}</span></button></li>`;
    openPanel(`
      <p class="p-kicker">Índice</p>
      <h2 class="p-title" id="panel-title">Todos os filmes <span class="count">${totalFilmes}</span></h2>
      <div class="idx-group"><h3 class="p-h">Documentário <span class="count">2</span></h3><ul class="vlist">
        ${row("#/filme/documentario", "Documentário", DOCUMENTARIO.filme.duracao)}
        ${row("#/filme/trailer", "Trailer", DOCUMENTARIO.trailer.duracao)}
      </ul></div>
      <div class="idx-group"><h3 class="p-h">Visitas às escolas <span class="count">${VISITADAS.length}</span></h3><ul class="vlist">
        ${VISITADAS.map((e) => row(`#/escola/${e.id}`, `${e.cidade} · ${e.uf}`, e.visita.duracao)).join("")}
      </ul></div>
      <div class="idx-group"><h3 class="p-h">Pílulas dos fotógrafos <span class="count">${FOTOGRAFOS.reduce((n, f) => n + f.pilulas.length, 0)}</span></h3><ul class="vlist">
        ${FOTOGRAFOS.map((f) => row(`#/fotografo/${f.id}`, f.nome, `${f.pilulas.length} × 1 min`)).join("")}
      </ul></div>
      <div class="idx-group"><h3 class="p-h">Escolas retratadas no livro <span class="count">${ESCOLAS.length}</span></h3>
        <div class="chips">${[...ESCOLAS].sort((a, b) => a.cidade.localeCompare(b.cidade, "pt")).map((e) => chipCity(e)).join("")}</div>
      </div>
    `);
  }

  // ── Telas e rotas ─────────────────────────────────────────
  const splash = $("#splash"), intro = $("#intro"), mapScreen = $("#map-screen");
  let measured = false;
  function showScreen(name) {
    intro.hidden = name !== "intro";
    mapScreen.hidden = name !== "map";
    if (name === "map" && !measured) { measured = true; requestAnimationFrame(measureLinks); }
    if (name === "map") requestAnimationFrame(queueLabels);
    if (name === "intro") { window.scrollTo(0, 0); requestAnimationFrame(clearDots); }
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

  function route() {
    const [, a, b] = (location.hash || "#/").split("/");
    if (!a) { closePanel(); showScreen("intro"); return; }
    showScreen("map");
    if (a === "fotografo" && fotoById[b]) showFotografo(fotoById[b]);
    else if (a === "escola" && escolaById[b]) showEscola(escolaById[b]);
    else if (a === "filme") showDoc();
    else if (a === "filmes") showIndex();
    else if (a === "projeto") { closePanel(); setAbout(true); }
    else closePanel();
  }

  $("#enter-map").addEventListener("click", () => go("#/mapa"));
  $("#to-intro").addEventListener("click", () => go("#/"));
  // "O projeto": card que abre no "?" (ou no menu) e fecha no X, ao clicar nele ou fora dele
  const aboutCard = $("#about-card"), aboutBtn = $("#about-toggle");
  const setAbout = (open) => { aboutCard.hidden = !open; aboutBtn.setAttribute("aria-expanded", String(open)); };
  aboutBtn.addEventListener("click", (e) => { e.stopPropagation(); setAbout(aboutCard.hidden); });
  aboutCard.addEventListener("click", (e) => { e.stopPropagation(); setAbout(false); });
  document.addEventListener("click", (e) => { if (!aboutCard.hidden && !aboutCard.contains(e.target)) setAbout(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !aboutCard.hidden) setAbout(false); });
  $("#open-about").addEventListener("click", (e) => {
    e.stopPropagation();
    if (!panel.hidden) go("#/mapa");
    setAbout(aboutCard.hidden);
  });
  $("#watch-doc").addEventListener("click", () => go("#/filme/documentario"));
  $("#open-index").addEventListener("click", () => go("#/filmes"));
  window.addEventListener("hashchange", route);
  // links da planilha chegaram depois da página: atualiza o painel aberto (sem interromper um filme tocando)
  document.addEventListener("fb:registro", () => { if (!document.body.classList.contains("lb-open") && /^#\/(fotografo|escola|filme)\//.test(location.hash)) route(); });
  document.addEventListener("fb:links", () => { if (!document.body.classList.contains("lb-open") && /^#\/(fotografo|escola)\//.test(location.hash)) route(); });

  // dica some depois da primeira interação
  const hint = $("#map-hint");
  const hideHint = () => hint.classList.add("gone");
  layer.addEventListener("click", hideHint, { once: true });
  setTimeout(hideHint, 7000);

  // Abertura: logo por ~2,4 s (toque pula). Links diretos (QR por página) encurtam.
  const deep = (location.hash || "#/").split("/")[1];
  const hold = deep ? 900 : 2400;
  let done = false;
  const endSplash = () => {
    if (done) return; done = true;
    splash.classList.add("out");
    route();
    setTimeout(() => (splash.hidden = true), 900);
  };
  splash.addEventListener("click", endSplash);
  setTimeout(endSplash, hold);
})();
