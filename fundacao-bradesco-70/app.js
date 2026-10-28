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
    ${full ? `<dl class="creditos">${PROJETO.creditos.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}`;
  $("#about-card-body").innerHTML = aboutHTML(false);

  // Pontos coloridos do livro, espalhados de forma determinística (mesmo desenho a cada visita)
  const PALETA = ["var(--purple)", "var(--red)", "var(--yellow)", "var(--blue)", "var(--orange)", "var(--cream)"];
  function confetti(box, n, seed, area) {
    let r = seed;
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const [x0, x1, y0, y1] = area;
    for (let i = 0; i < n; i++) {
      const d = el("span", { class: "dot" });
      d.style.cssText = `left:${(x0 + rnd() * (x1 - x0)).toFixed(1)}%;top:${(y0 + rnd() * (y1 - y0)).toFixed(1)}%;` +
        `--c:${PALETA[i % PALETA.length]};--d:${(0.3 + i * 0.08).toFixed(2)}s;` + // regra da identidade: bolinhas sempre do mesmo tamanho
        `--dx:${Math.round(rnd() * 10 - 5)}px;--dy:${Math.round(rnd() * 10 - 8)}px`;
      box.append(d);
    }
  }
  confetti($('[data-confetti="splash"]'), 14, 7, [80, 95, 12, 88]);
  confetti($('[data-confetti="title"]'), 16, 3, [80, 95, 6, 94]);

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
  function zoomTo(points) {
    if (!points?.length) return zoomReset();
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const pad = 120;
    const w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    if (matchMedia("(max-width: 899px)").matches) {
      // celular: o painel cobre a parte de baixo; enquadra o foco na faixa visível entre o topo e o painel
      const S = map.offsetWidth, wrap = map.parentElement.getBoundingClientRect();
      const baseX = wrap.left + (wrap.width - S) / 2, baseY = wrap.top + (wrap.height - S) / 2;
      const top = 96, bottom = innerHeight * 0.38, visH = Math.max(120, bottom - top);
      const z = Math.max(0.9, Math.min(2.6, innerWidth / (w * S / 1000), visH / (h * S / 1000)));
      const tx = innerWidth / 2 - baseX - (cx / 1000) * S * z;
      const ty = (top + bottom) / 2 - baseY - (cy / 1000) * S * z;
      map.style.setProperty("--z", z.toFixed(3));
      map.style.setProperty("--tx", `${tx.toFixed(1)}px`);
      map.style.setProperty("--ty", `${ty.toFixed(1)}px`);
      return;
    }
    const z = Math.max(1, Math.min(2.6, 1000 / w, 1000 / h));
    const tx = Math.min(0, Math.max(100 - 100 * z, 50 - (cx / 10) * z));
    const ty = Math.min(0, Math.max(100 - 100 * z, 50 - (cy / 10) * z));
    map.style.setProperty("--z", z.toFixed(3));
    map.style.setProperty("--tx", `${tx.toFixed(2)}%`);
    map.style.setProperty("--ty", `${ty.toFixed(2)}%`);
  }
  function zoomReset() { ["--z", "--tx", "--ty"].forEach((v) => map.style.removeProperty(v)); }
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
  const PLACEHOLDER = window.VIDEO_PLACEHOLDER || "";
  // link final (página de controle) ou o vídeo provisório
  const fonte = (v) => { const final = (window.VIDEO_LINKS || {})[v.id] || v.url; return { final, url: final || PLACEHOLDER }; };

  function playerHTML(v, badge, cor, poster) {
    badge = v.badge || badge;
    const { final, url } = fonte(v);
    const ready = !!url;
    return `<div class="player${poster ? " has-poster" : ""}${ready ? " is-ready" : ""}" ${ready ? `data-start role="button" tabindex="0" aria-label="Assistir ${esc(v.titulo)}"` : ""} style="--pc:${cor || "var(--purple)"}${poster ? `;--poster:url('${poster}')` : ""}">
      <div class="player-empty">${PLAYER_DOTS}
        <span class="pe-badge">${esc(badge)} · ${esc(v.duracao)}</span>
        ${ready
          ? `<span class="pe-icon is-btn" aria-hidden="true">${ICON_PLAY}</span>`
          : `<span class="pe-icon" aria-hidden="true">${ICON_PLAY}</span>`}
        <span class="pe-title">${esc(v.titulo)}</span>
        <span class="pe-note">${!ready ? "Filme em finalização" : final ? "Toque para assistir" : "Toque para assistir · versão provisória"}</span>
      </div>
    </div>`;
  }
  function listHTML(videos, activeIdx) {
    return `<ul class="vlist">${videos.map((v, i) => `<li><button class="vitem${i === activeIdx ? " on" : ""}" type="button" data-vi="${i}">
      <span class="vi-icon">${ICON_PLAY}</span><span class="vi-title">${esc(v.titulo)}</span><span class="vi-dur">${esc(v.duracao)}</span>
    </button></li>`).join("")}</ul>`;
  }
  // liga player + lista de vídeos dentro do painel
  function wireVideos(body, videos, badge, cor, poster) {
    const slot = $("[data-player-slot]", body);
    const render = (i) => {
      slot.innerHTML = playerHTML(videos[i], badge, videos[i].cor || cor, poster);
      body.querySelectorAll(".vitem").forEach((b) => b.classList.toggle("on", +b.dataset.vi === i));
    };
    // o vídeo abre no player do projeto, por cima de tudo, com a sequência do painel
    let current = 0;
    const play = (i) => window.FBPlayer.open(videos.map((v) => ({
      titulo: v.titulo, duracao: v.duracao, kicker: v.badge || badge, cor: v.cor || cor,
      url: fonte(v).url, provisorio: !fonte(v).final,
    })), i);
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
    `, (b) => { wireVideos(b, vids, "Documentário", "var(--purple-ink)", POSTER); b.querySelector(`[data-vi="${start}"]`).click(); }); // o filme já abre no player
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
    if (name === "intro") window.scrollTo(0, 0);
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
