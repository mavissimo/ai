// Player do projeto: abre por cima de tudo, grande, com controles próprios na identidade do livro.
// Fontes: Vimeo (pela API oficial player.js, com os controles do Vimeo escondidos), Dropbox e .mp4
// (vídeo nativo). YouTube abre com os controles do próprio YouTube.
// Uso: FBPlayer.open([{ titulo, kicker, url, cor, provisorio }], indice)
(() => {
  const ICON = {
    play: '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>',
    back: '<path d="M11.5 6.5 5 12l6.5 5.5M18.5 6.5 12 12l6.5 5.5"/>',
    fwd: '<path d="M12.5 6.5 19 12l-6.5 5.5M5.5 6.5 12 12l-6.5 5.5"/>',
    prev: '<path d="M7 6v12M18 6l-8 6 8 6z"/>',
    next: '<path d="M17 6v12M6 6l8 6-8 6z"/>',
    vol: '<path d="M4 9v6h4l5 4V5L8 9zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 9.5l5 5M21.5 9.5l-5 5"/>',
    cc: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M10 10.5a2 2 0 1 0 0 3M16.5 10.5a2 2 0 1 0 0 3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1" class="fill"/>',
    fs: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    fsx: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (t) => {
    t = Math.max(0, Math.floor(t || 0));
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = String(t % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  };
  const RATES = [0.75, 1, 1.25, 1.5, 2];

  // ── Fontes ────────────────────────────────────────────────
  function parseVimeo(url) {
    const m = url.match(/vimeo\.com\/(?:manage\/|video\/|channels\/[^/]+\/)?(?:videos\/)?(\d{5,})(?:\/([0-9a-f]{6,}))?/i);
    if (!m) return null;
    let h = m[2];
    try { h = h || new URL(url).searchParams.get("h"); } catch {}
    return { id: m[1], h };
  }
  const parseYouTube = (url) => (url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/) || [])[1];
  function directUrl(url) {
    try {
      const u = new URL(url, location.href);
      if (/(^|\.)dropbox\.com$/i.test(u.hostname)) { u.searchParams.delete("dl"); u.searchParams.set("raw", "1"); }
      return u.toString();
    } catch { return url; }
  }

  let vimeoSdk;
  const loadVimeo = () => vimeoSdk ||= new Promise((ok, fail) => {
    if (window.Vimeo?.Player) return ok(window.Vimeo);
    const s = document.createElement("script");
    s.src = "https://player.vimeo.com/api/player.js";
    s.onload = () => ok(window.Vimeo); s.onerror = fail;
    document.head.append(s);
  });

  // Cada adaptador expõe a mesma interface para os controles.
  function nativeAdapter(box, url, emit) {
    const v = document.createElement("video");
    v.src = directUrl(url); v.playsInline = true; v.preload = "auto";
    box.append(v);
    const on = (e, f) => v.addEventListener(e, f);
    on("loadedmetadata", () => emit("ready", { duration: v.duration }));
    on("timeupdate", () => emit("time", { t: v.currentTime, d: v.duration }));
    on("progress", () => { try { emit("buffer", { p: v.buffered.length ? v.buffered.end(v.buffered.length - 1) / v.duration : 0 }); } catch {} });
    on("play", () => emit("play")); on("pause", () => emit("pause")); on("ended", () => emit("ended"));
    on("waiting", () => emit("wait", true)); on("playing", () => emit("wait", false));
    on("error", () => emit("error"));
    on("volumechange", () => emit("volume", { v: v.volume, muted: v.muted }));
    return {
      caps: { rate: true, pip: !!document.pictureInPictureEnabled, captions: false, quality: false },
      play: () => v.play(), pause: () => v.pause(), seek: (t) => { v.currentTime = t; },
      setVolume: (x) => { v.volume = x; v.muted = x === 0; }, setMuted: (m) => { v.muted = m; },
      setRate: (r) => { v.playbackRate = r; },
      pip: () => (document.pictureInPictureElement ? document.exitPictureInPicture() : v.requestPictureInPicture()),
      iosFullscreen: () => v.webkitEnterFullscreen?.(),
      destroy: () => { v.pause(); v.removeAttribute("src"); v.load(); v.remove(); },
    };
  }

  function vimeoAdapter(box, url, emit) {
    const { id, h } = parseVimeo(url);
    const f = document.createElement("iframe");
    const q = new URLSearchParams({ controls: "0", autoplay: "1", title: "0", byline: "0", portrait: "0", dnt: "1", playsinline: "1", keyboard: "0" });
    if (h) q.set("h", h);
    f.src = `https://player.vimeo.com/video/${id}?${q}`;
    f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    f.title = "Vídeo";
    box.append(f);
    let p = null, dead = false;
    const ready = loadVimeo().then((Vimeo) => {
      if (dead) return;
      p = new Vimeo.Player(f);
      p.on("loaded", async () => emit("ready", { duration: await p.getDuration() }));
      p.on("timeupdate", (d) => emit("time", { t: d.seconds, d: d.duration }));
      p.on("progress", (d) => emit("buffer", { p: d.percent }));
      p.on("play", () => emit("play")); p.on("pause", () => emit("pause")); p.on("ended", () => emit("ended"));
      p.on("bufferstart", () => emit("wait", true)); p.on("bufferend", () => emit("wait", false));
      p.on("volumechange", (d) => emit("volume", { v: d.volume, muted: d.volume === 0 }));
      p.on("error", () => emit("error"));
      p.getTextTracks().then((t) => emit("tracks", t)).catch(() => {});
      p.getQualities?.().then((qs) => emit("qualities", qs)).catch(() => {});
      return p;
    }).catch(() => emit("error"));
    const call = (fn) => ready.then((pl) => pl && fn(pl)).catch(() => {});
    return {
      caps: { rate: true, pip: true, captions: true, quality: true },
      play: () => call((pl) => pl.play()), pause: () => call((pl) => pl.pause()),
      seek: (t) => call((pl) => pl.setCurrentTime(t)),
      setVolume: (x) => call((pl) => pl.setVolume(x)), setMuted: (m) => call((pl) => pl.setMuted ? pl.setMuted(m) : pl.setVolume(m ? 0 : 1)),
      setRate: (r) => call((pl) => pl.setPlaybackRate(r)),
      setTrack: (lang) => call((pl) => (lang ? pl.enableTextTrack(lang) : pl.disableTextTrack())),
      setQuality: (q) => call((pl) => pl.setQuality(q)),
      pip: () => call((pl) => pl.requestPictureInPicture()),
      destroy: () => { dead = true; call((pl) => pl.destroy()); f.remove(); },
    };
  }

  function youtubeAdapter(box, url, emit) {
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${parseYouTube(url)}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
    f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media"; f.allowFullscreen = true; f.title = "Vídeo";
    box.append(f);
    setTimeout(() => emit("ready", { duration: 0 }), 0);
    return { caps: { external: true }, play() {}, pause() {}, seek() {}, setVolume() {}, setMuted() {}, setRate() {}, destroy: () => f.remove() };
  }

  // ── Interface ─────────────────────────────────────────────
  const lb = document.createElement("div");
  lb.className = "lb"; lb.hidden = true;
  lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Player de vídeo");
  lb.innerHTML = `
    <div class="lb-bg" data-close></div>
    <header class="lb-top">
      <div class="lb-titles"><p class="lb-kicker"></p><h2 class="lb-title"></h2></div>
      <button class="lb-btn lb-close" type="button" data-close aria-label="Fechar (Esc)">${svg("close")}</button>
    </header>
    <div class="lb-stage">
      <div class="lb-frame">
        <div class="lb-media"></div>
        <div class="lb-hit" aria-hidden="true"></div>
        <div class="lb-loading" aria-hidden="true"><i></i><i></i><i></i></div>
        <button class="lb-big" type="button" aria-label="Reproduzir">${svg("play")}</button>
        <div class="lb-end" hidden>
          <button class="lb-pill" type="button" data-act="replay">${svg("replay")}<span>Assistir de novo</span></button>
          <button class="lb-pill lb-pill-next" type="button" data-act="next">${svg("next")}<span class="lb-next-label"></span></button>
          <button class="lb-pill lb-pill-next lb-pill-final" type="button" data-act="final" hidden>${svg("next")}<span class="lb-final-label"></span></button>
        </div>
        <div class="lb-error" hidden>Não foi possível carregar este vídeo. Tente de novo em instantes.</div>
        <div class="lb-controls">
          <div class="lb-progress" role="slider" tabindex="0" aria-label="Posição do vídeo" aria-valuemin="0">
            <div class="lb-rail"><div class="lb-buffer"></div><div class="lb-played"></div></div>
            <div class="lb-thumb"></div><div class="lb-tip" hidden></div>
          </div>
          <div class="lb-row">
            <button class="lb-btn" type="button" data-act="toggle" aria-label="Reproduzir (espaço)">${svg("play")}</button>
            <button class="lb-btn lb-sm" type="button" data-act="prev" aria-label="Vídeo anterior">${svg("prev")}</button>
            <button class="lb-btn lb-sm" type="button" data-act="next" aria-label="Próximo vídeo">${svg("next")}</button>
            <button class="lb-btn lb-sm lb-skip" type="button" data-act="back" aria-label="Voltar 10 segundos">${svg("back")}<b>10</b></button>
            <button class="lb-btn lb-sm lb-skip" type="button" data-act="fwd" aria-label="Avançar 10 segundos">${svg("fwd")}<b>10</b></button>
            <span class="lb-time"><span class="lb-cur">0:00</span> / <span class="lb-dur">0:00</span></span>
            <span class="lb-flex"></span>
            <div class="lb-vol">
              <button class="lb-btn lb-sm" type="button" data-act="mute" aria-label="Som (M)">${svg("vol")}</button>
              <input class="lb-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">
            </div>
            <button class="lb-btn lb-sm" type="button" data-act="cc" aria-label="Legendas (C)" hidden>${svg("cc")}</button>
            <div class="lb-menu-wrap">
              <button class="lb-btn lb-sm" type="button" data-act="settings" aria-label="Velocidade e qualidade" aria-expanded="false">${svg("gear")}</button>
              <div class="lb-menu" hidden></div>
            </div>
            <button class="lb-btn lb-sm" type="button" data-act="pip" aria-label="Janela flutuante" hidden>${svg("pip")}</button>
            <button class="lb-btn lb-sm" type="button" data-act="fs" aria-label="Tela cheia (F)">${svg("fs")}</button>
          </div>
        </div>
      </div>
    </div>
    <nav class="lb-list" aria-label="Sequência"></nav>`;
  document.body.append(lb);

  const $ = (s) => lb.querySelector(s);
  const frame = $(".lb-frame"), media = $(".lb-media"), progress = $(".lb-progress"), tip = $(".lb-tip"), menu = $(".lb-menu");
  const state = { list: [], i: 0, ad: null, d: 0, t: 0, playing: false, rate: 1, vol: 1, muted: false, tracks: [], track: null, qualities: [], lastFocus: null, hideT: 0, opts: {} };

  function setPlaying(on) {
    state.playing = on;
    lb.classList.toggle("is-playing", on);
    $('[data-act="toggle"]').innerHTML = svg(on ? "pause" : "play");
    $('[data-act="toggle"]').setAttribute("aria-label", on ? "Pausar (espaço)" : "Reproduzir (espaço)");
    if (on) $(".lb-end").hidden = true;
    poke();
  }
  function paint() {
    const p = state.d ? Math.min(1, state.t / state.d) : 0;
    $(".lb-played").style.width = `${p * 100}%`;
    $(".lb-thumb").style.left = `${p * 100}%`;
    $(".lb-cur").textContent = fmt(state.t);
    $(".lb-dur").textContent = fmt(state.d);
    progress.setAttribute("aria-valuemax", String(Math.round(state.d)));
    progress.setAttribute("aria-valuenow", String(Math.round(state.t)));
    progress.setAttribute("aria-valuetext", `${fmt(state.t)} de ${fmt(state.d)}`);
  }
  function emit(type, data = {}) {
    if (type === "ready") { state.d = data.duration || state.d; lb.classList.remove("is-loading"); paint(); }
    else if (type === "time") { state.t = data.t; if (data.d) state.d = data.d; paint(); }
    else if (type === "buffer") $(".lb-buffer").style.width = `${Math.min(1, data.p || 0) * 100}%`;
    else if (type === "play") setPlaying(true);
    else if (type === "pause") setPlaying(false);
    else if (type === "wait") lb.classList.toggle("is-loading", !!data);
    else if (type === "ended") { setPlaying(false); showEnd(); }
    else if (type === "error") { lb.classList.remove("is-loading"); $(".lb-error").hidden = false; }
    else if (type === "volume") { state.muted = data.muted; $('[data-act="mute"]').innerHTML = svg(data.muted ? "mute" : "vol"); }
    else if (type === "tracks") { state.tracks = data || []; $('[data-act="cc"]').hidden = !state.tracks.length; }
    else if (type === "qualities") state.qualities = data || [];
  }

  function load(i) {
    state.ad?.destroy(); media.replaceChildren();
    Object.assign(state, { i, t: 0, d: 0, tracks: [], track: null, qualities: [] });
    const v = state.list[i];
    $(".lb-kicker").textContent = [v.kicker, v.duracao].filter(Boolean).join(" · ") + (v.provisorio ? " · versão provisória" : "");
    $(".lb-title").textContent = v.titulo;
    lb.style.setProperty("--lb-c", v.cor || "var(--purple)");
    $(".lb-end").hidden = true; $(".lb-error").hidden = true;
    $('[data-act="cc"]').hidden = true; $('[data-act="cc"]').classList.remove("on");
    lb.classList.add("is-loading"); setPlaying(false); paint();
    const url = v.url || "";
    const make = parseVimeo(url) ? vimeoAdapter : parseYouTube(url) ? youtubeAdapter : nativeAdapter;
    state.ad = make(media, url, emit);
    lb.classList.toggle("is-external", !!state.ad.caps.external);
    $('[data-act="pip"]').hidden = !state.ad.caps.pip;
    state.ad.setRate?.(state.rate);
    if (state.muted) state.ad.setMuted(true); else state.ad.setVolume(state.vol);
    // autoplay depende do navegador: se recusar, o botão grande fica visível
    Promise.resolve(state.ad.play()).catch(() => setPlaying(false));
    const multi = state.list.length > 1;
    $('[data-act="prev"]').hidden = !multi; $('[data-act="next"]').hidden = !multi;
    $('[data-act="prev"]').disabled = i === 0; $('[data-act="next"]').disabled = i === state.list.length - 1;
    renderList();
  }
  function renderList() {
    const nav = $(".lb-list");
    nav.hidden = state.list.length < 2;
    nav.innerHTML = state.list.map((v, k) =>
      `<button type="button" class="lb-chip${k === state.i ? " on" : ""}" data-i="${k}" style="--c:${v.cor || "var(--purple)"}"><i></i><span>${esc(v.titulo)}</span><small>${esc(v.duracao || "")}</small></button>`).join("");
  }
  function showEnd() {
    const next = state.list[state.i + 1];
    $(".lb-pill-next").hidden = !next;
    if (next) $(".lb-next-label").textContent = `Próximo: ${next.titulo}`;
    const fin = !next && state.opts.final; // fim da sequência: um convite para seguir pelo site
    $(".lb-pill-final").hidden = !fin;
    if (fin) $(".lb-final-label").textContent = fin.label;
    $(".lb-end").hidden = false;
    poke(true);
  }

  // controles somem depois de alguns segundos tocando; voltam ao mexer o mouse ou tocar
  function poke(stay) {
    lb.classList.add("show-ui");
    clearTimeout(state.hideT);
    if (!stay && state.playing) state.hideT = setTimeout(() => { if (menu.hidden) lb.classList.remove("show-ui"); }, 2600);
  }

  const toggle = () => (state.playing ? state.ad.pause() : Promise.resolve(state.ad.play()).catch(() => {}));
  const seekBy = (s) => { const t = Math.max(0, Math.min(state.d || 0, state.t + s)); state.t = t; paint(); state.ad.seek(t); poke(); };
  function setVol(x) {
    state.vol = x; state.muted = x === 0;
    state.ad.setVolume(x);
    $(".lb-volume").value = String(x);
    $('[data-act="mute"]').innerHTML = svg(state.muted ? "mute" : "vol");
  }
  function toggleMute() {
    state.muted = !state.muted;
    state.ad.setMuted(state.muted);
    if (!state.muted && state.vol === 0) setVol(1);
    $('[data-act="mute"]').innerHTML = svg(state.muted ? "mute" : "vol");
  }
  function toggleCC() {
    if (!state.tracks.length) return;
    state.track = state.track ? null : (state.tracks.find((t) => /^pt/i.test(t.language)) || state.tracks[0]).language;
    state.ad.setTrack?.(state.track);
    $('[data-act="cc"]').classList.toggle("on", !!state.track);
  }
  function isFs() { return document.fullscreenElement === lb || document.webkitFullscreenElement === lb; }
  function toggleFs() {
    if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    else if (lb.requestFullscreen || lb.webkitRequestFullscreen) (lb.requestFullscreen || lb.webkitRequestFullscreen).call(lb).catch?.(() => {});
    else state.ad.iosFullscreen?.(); // iPhone: tela cheia nativa do vídeo
  }
  document.addEventListener("fullscreenchange", () => { $('[data-act="fs"]').innerHTML = svg(isFs() ? "fsx" : "fs"); });

  function openMenu() {
    const open = menu.hidden;
    if (!open) { menu.hidden = true; $('[data-act="settings"]').setAttribute("aria-expanded", "false"); return; }
    const qs = state.qualities.filter((q) => q.id);
    menu.innerHTML = `
      <p>Velocidade</p>
      <div class="lb-opts">${RATES.map((r) => `<button type="button" data-rate="${r}" class="${r === state.rate ? "on" : ""}">${r === 1 ? "Normal" : `${String(r).replace(".", ",")}×`}</button>`).join("")}</div>
      ${qs.length ? `<p>Qualidade</p><div class="lb-opts">${qs.map((q) => `<button type="button" data-q="${esc(q.id)}" class="${q.active ? "on" : ""}">${esc(q.label)}</button>`).join("")}</div>` : ""}`;
    menu.hidden = false; $('[data-act="settings"]').setAttribute("aria-expanded", "true");
    poke(true);
  }
  menu.addEventListener("click", (e) => {
    const r = e.target.closest("[data-rate]"), q = e.target.closest("[data-q]");
    if (r) { state.rate = +r.dataset.rate; state.ad.setRate(state.rate); }
    if (q) { state.ad.setQuality?.(q.dataset.q); state.qualities.forEach((x) => (x.active = x.id === q.dataset.q)); }
    if (r || q) { menu.hidden = true; $('[data-act="settings"]').setAttribute("aria-expanded", "false"); poke(); }
  });

  // barra de progresso: clique, arraste e prévia do tempo
  const ratioAt = (x) => { const r = progress.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)); };
  let dragging = false;
  progress.addEventListener("pointerdown", (e) => { dragging = true; progress.setPointerCapture(e.pointerId); scrub(e); });
  progress.addEventListener("pointermove", (e) => {
    const p = ratioAt(e.clientX);
    tip.hidden = !state.d; tip.textContent = fmt(p * state.d); tip.style.left = `${p * 100}%`;
    if (dragging) scrub(e);
  });
  progress.addEventListener("pointerleave", () => { if (!dragging) tip.hidden = true; });
  progress.addEventListener("pointerup", () => { dragging = false; tip.hidden = true; state.ad.seek(state.t); });
  function scrub(e) { state.t = ratioAt(e.clientX) * (state.d || 0); paint(); poke(true); }
  progress.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { seekBy(-5); e.preventDefault(); }
    if (e.key === "ArrowRight") { seekBy(5); e.preventDefault(); }
  });

  $(".lb-volume").addEventListener("input", (e) => setVol(+e.target.value));

  lb.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return close();
    const chip = e.target.closest("[data-i]");
    if (chip) return load(+chip.dataset.i);
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) {
      if (!e.target.closest(".lb-menu-wrap") && !menu.hidden) { menu.hidden = true; $('[data-act="settings"]').setAttribute("aria-expanded", "false"); }
      return;
    }
    ({
      toggle, back: () => seekBy(-10), fwd: () => seekBy(10), mute: toggleMute, cc: toggleCC, settings: openMenu,
      fs: toggleFs, pip: () => Promise.resolve(state.ad.pip?.()).catch(() => {}),
      prev: () => state.i > 0 && load(state.i - 1), next: () => state.i < state.list.length - 1 && load(state.i + 1),
      replay: () => { state.ad.seek(0); state.ad.play(); },
      final: () => close(),
    })[act]?.();
  });
  $(".lb-big").addEventListener("click", toggle);
  // toque/clique no vídeo: no celular mostra os controles; no desktop pausa/toca. Duplo clique: tela cheia.
  const hit = $(".lb-hit");
  hit.addEventListener("click", (e) => {
    if (e.pointerType === "touch" || matchMedia("(hover: none)").matches) {
      if (!lb.classList.contains("show-ui")) return poke();
    }
    toggle();
  });
  hit.addEventListener("dblclick", toggleFs);
  lb.addEventListener("pointermove", () => poke());

  // atalhos de teclado (como no Vimeo/YouTube)
  window.addEventListener("keydown", (e) => {
    if (lb.hidden || e.target.matches?.("input[type=range]")) return;
    const k = e.key.toLowerCase();
    const map = { " ": toggle, k: toggle, arrowleft: () => seekBy(-5), arrowright: () => seekBy(5), j: () => seekBy(-10), l: () => seekBy(10),
      m: toggleMute, f: toggleFs, c: toggleCC, arrowup: () => setVol(Math.min(1, state.vol + 0.1)), arrowdown: () => setVol(Math.max(0, state.vol - 0.1)), escape: close };
    if (e.target.closest?.(".lb-progress") && (k === "arrowleft" || k === "arrowright")) return;
    if (map[k] && !(k === " " && e.target.closest?.("button"))) {
      e.preventDefault(); e.stopImmediatePropagation(); map[k](); poke();
    }
  }, true);

  // opts.final = { label }: botão no fim do último filme, que fecha o player; opts.onClose: o que fazer ao fechar
  function open(list, i = 0, opts = {}) {
    state.list = list; state.opts = opts; state.lastFocus = document.activeElement;
    lb.hidden = false; document.body.classList.add("lb-open");
    requestAnimationFrame(() => lb.classList.add("in"));
    load(i);
    $(".lb-close").focus({ preventScroll: true });
  }
  function close() {
    if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    state.ad?.destroy(); state.ad = null; media.replaceChildren();
    lb.classList.remove("in", "is-playing", "show-ui"); lb.hidden = true; menu.hidden = true;
    document.body.classList.remove("lb-open");
    state.lastFocus?.focus?.({ preventScroll: true });
    const done = state.opts?.onClose; state.opts = {};
    done?.();
  }

  window.FBPlayer = { open, close };
})();
