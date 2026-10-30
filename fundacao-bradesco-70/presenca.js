// Presença e histórico de visitas (para a produção acompanhar como o site está sendo usado).
// Uma bolinha verde discreta no canto: passando o mouse, mostra quantas pessoas estão no site agora.
// Shift + clique na bolinha abre o histórico: quem entrou, de onde, em que aparelho e o que fez.
// Grava pelo mesmo Formulário do registro (linhas que começam com "~", que o registro ignora):
//   ~|visitante|sessão|tipo|quando|detalhe
// Não guarda IP nem nome: só cidade/estado/país aproximados, aparelho e navegador.
(() => {
  const R = window.FB_REGISTRO || {};
  const SHEET = window.VIDEO_SHEET || window.VIDEO_SHEET_ID || "1dZp8HV-64v5ewc0LzdnE4A7Luu1ikMGapbtg848Mnh4";
  if (!R.form || !R.entry) return;
  const PAGINA = /cronograma/.test(location.pathname) ? "crono" : "mapa";
  const NOME_PAG = { crono: "Cronograma", mapa: "Site dos filmes" };
  const PING = 60e3, ONLINE = 3 * 60e3, OCIOSO = 30 * 60e3;

  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} };
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch {} };
  const novoId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const VIS = ls("fb-vis") || (ls("fb-vis", novoId()), ls("fb-vis")) || novoId();
  const SES = ss("fb-ses") || (ss("fb-ses", novoId()), ss("fb-ses")) || novoId();
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ── envio ──
  function envia(tipo, detalhe = "") {
    const linha = ["~", VIS, SES, tipo, new Date().toISOString(), typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe)].join("|");
    fetch(R.form, { method: "POST", mode: "no-cors", body: new URLSearchParams({ [R.entry]: linha }) }).catch(() => {});
  }

  // aparelho e navegador, em português
  function aparelho() {
    const ua = navigator.userAgent;
    const so = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "iPad"
      : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "Outro";
    const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung" : /Firefox|FxiOS/.test(ua) ? "Firefox"
      : /CriOS|Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Outro";
    const tipo = /iPhone/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua)) ? "celular" : so === "iPad" || /Android/.test(ua) ? "tablet" : "computador";
    const ver = (/OS (\d+)[_.](\d+)/.exec(ua) || /Android (\d+(?:\.\d+)?)/.exec(ua) || /Windows NT (\d+\.\d+)/.exec(ua) || /Mac OS X (\d+)[_.](\d+)/.exec(ua) || []).slice(1).filter(Boolean).join(".");
    const navVer = (/(?:Edg|OPR|SamsungBrowser|Firefox|FxiOS|CriOS|Chrome|Version)\/(\d+)/.exec(ua) || [])[1] || "";
    return { so, sover: so === "Windows" ? { "10.0": "10/11", "6.3": "8.1", "6.1": "7" }[ver] || ver : ver, nav, navver: navVer, tipo, tela: `${screen.width}×${screen.height}`,
      idioma: navigator.language, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone };
  }
  // modelo do aparelho (Android/Chrome informam; iPhone não)
  async function modelo() {
    try { const h = await navigator.userAgentData?.getHighEntropyValues?.(["model", "platformVersion"]); return h?.model ? { modelo: h.model } : {}; } catch { return {}; }
  }
  async function local() {
    const salvo = ss("fb-loc2"); if (salvo) return JSON.parse(salvo);
    // pela conexão (sem pedir permissão): cidade, CEP aproximado, provedor/empresa da rede e um ponto aproximado
    const fontes = [
      ["https://ipapi.co/json/", (j) => ({ cidade: j.city, uf: j.region_code || j.region, pais: j.country_name, cep: j.postal, rede: j.org, lat: j.latitude, lon: j.longitude })],
      ["https://ipwho.is/", (j) => ({ cidade: j.city, uf: j.region_code || j.region, pais: j.country, cep: j.postal, rede: j.connection?.org || j.connection?.isp, lat: j.latitude, lon: j.longitude })],
    ];
    for (const [url, ler] of fontes) {
      try {
        const ctl = new AbortController(); setTimeout(() => ctl.abort(), 4000);
        const j = await (await fetch(url, { signal: ctl.signal })).json();
        const l = ler(j); if (l.cidade || l.pais) { if (l.lat) { l.lat = +(+l.lat).toFixed(3); l.lon = +(+l.lon).toFixed(3); } ss("fb-loc2", JSON.stringify(l)); return l; }
      } catch {}
    }
    return {};
  }

  // entrada: uma vez por sessão e por página
  (async () => {
    if (ss("fb-entrou-" + PAGINA)) return;
    ss("fb-entrou-" + PAGINA, "1");
    const ref = document.referrer && !document.referrer.includes(location.host) ? new URL(document.referrer).host : "";
    envia("entrada", { pag: PAGINA, ...aparelho(), ...(await modelo()), ...(await local()), ref, eu: ls("fb-eu") ? 1 : 0 });
  })();

  // sinal de vida enquanto a aba está visível e a pessoa não está ociosa
  let ultimoGesto = Date.now();
  ["pointerdown", "keydown", "scroll", "pointermove"].forEach((ev) => addEventListener(ev, () => (ultimoGesto = Date.now()), { passive: true, capture: true }));
  const ping = () => { if (document.visibilityState === "visible" && Date.now() - ultimoGesto < OCIOSO) envia("ping", PAGINA); };
  setInterval(ping, PING);

  // o que a pessoa fez: cliques em botões, links e cartões; navegação; vídeos abertos
  const rotulo = (el) => (el.getAttribute("aria-label") || el.title || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70);
  addEventListener("click", (e) => {
    if (e.target.closest(".fbp-dot, .fbp-painel")) return;
    const el = e.target.closest("button, a, label, [role=button], [data-day], [data-id], .film, .pin, .marker");
    if (!el) return;
    const txt = rotulo(el); if (!txt) return;
    const check = el.matches("label") && el.querySelector("input[type=checkbox]");
    const filme = el.closest(".rc")?.querySelector(".film b")?.textContent;
    ultimoClique = Date.now();
    envia("acao", { pag: PAGINA, o: check ? (check.checked ? "desmarcou" : "marcou") : "clicou", txt: filme && !txt.includes(filme) ? `${txt} · ${filme}` : txt });
  }, true);
  // mudança de endereço sem clique logo antes (link colado, voltar do navegador)
  let ultimoClique = 0;
  addEventListener("hashchange", () => { if (Date.now() - ultimoClique > 800) envia("acao", { pag: PAGINA, o: "abriu", txt: decodeURIComponent(location.hash.slice(1)) || "início" }); });
  const embrulhaPlayer = () => {
    const P = window.FBPlayer; if (!P || P.__fbp) return;
    const abre = P.open.bind(P);
    P.open = (lista, i = 0, ...r) => { const v = (lista || [])[i] || {}; envia("acao", { pag: PAGINA, o: "assistiu", txt: [v.kicker, v.titulo].filter(Boolean).join(" · ").slice(0, 90) }); return abre(lista, i, ...r); };
    P.__fbp = 1;
  };
  embrulhaPlayer(); addEventListener("load", embrulhaPlayer);

  // ── leitura da planilha (só as linhas de visita) ──
  let nReq = 0;
  function le(limite) {
    return new Promise((ok) => {
      const cb = `__fbp${++nReq}`, s = document.createElement("script");
      const tq = encodeURIComponent(`select B where B starts with '~' order by A desc${limite ? ` limit ${limite}` : ""}`);
      window[cb] = (res) => { delete window[cb]; s.remove(); ok((res?.table?.rows || []).map((r) => String(r.c?.[0]?.v || ""))); };
      s.src = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json;responseHandler:${cb}&sheet=${encodeURIComponent(R.aba || "Registro")}&headers=1&tq=${tq}&t=${Date.now()}`;
      s.onerror = () => { delete window[cb]; s.remove(); ok([]); };
      document.head.append(s);
    });
  }
  const parse = (l) => {
    const p = l.split("|"); if (p[0] !== "~" || p.length < 5) return null;
    let d = p.slice(5).join("|"); try { d = JSON.parse(d); } catch {}
    return { vis: p[1], ses: p[2], tipo: p[3], t: p[4], d };
  };

  // ── a bolinha ──
  const css = document.createElement("style");
  css.textContent = `
.fbp-dot{position:fixed;left:12px;bottom:12px;z-index:9998;width:22px;height:22px;display:grid;place-items:center;border:0;padding:0;background:none;cursor:default}
.fbp-dot i{width:8px;height:8px;border-radius:50%;background:#2FA866;box-shadow:0 0 0 3px rgba(47,168,102,.18);opacity:.75;transition:opacity .2s,transform .2s}
.fbp-dot:hover i,.fbp-dot:focus-visible i{opacity:1;transform:scale(1.15)}
.fbp-dot span{position:absolute;left:24px;bottom:2px;white-space:nowrap;padding:4px 9px;border-radius:999px;background:rgba(30,26,40,.86);color:#fff;font:600 12px/1.3 system-ui,sans-serif;opacity:0;pointer-events:none;transform:translateX(-4px);transition:opacity .15s,transform .15s}
.fbp-dot:hover span,.fbp-dot:focus-visible span,.fbp-dot.show span{opacity:1;transform:none}
.fbp-painel{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(20,16,30,.42);padding:16px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#2B2340}
.fbp-caixa{width:min(980px,100%);max-height:min(88vh,900px);display:grid;grid-template-rows:auto auto 1fr;background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(20,16,30,.3);overflow:hidden}
.fbp-top{display:flex;align-items:center;gap:12px;padding:16px 20px 12px;border-bottom:1px solid #EEEAF4}
.fbp-top h2{margin:0;font-size:17px;font-weight:800;flex:1}
.fbp-x{border:0;background:#F4F1F8;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;color:#5B5470}
.fbp-nums{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-bottom:1px solid #EEEAF4;align-items:center}
.fbp-num{padding:7px 12px;border-radius:12px;background:#F7F5FA;font-size:12px;color:#5B5470;font-weight:600}
.fbp-num b{display:block;font-size:19px;color:#2B2340;font-weight:800;line-height:1.1}
.fbp-num.on b{color:#1E8A52}
.fbp-filtros{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
.fbp-filtros button{border:0;border-radius:999px;padding:6px 11px;background:#F4F1F8;color:#5B5470;font:600 12px system-ui,sans-serif;cursor:pointer}
.fbp-filtros button.on{background:#2B2340;color:#fff}
.fbp-lista{overflow:auto;padding:8px 12px 16px}
.fbp-pessoa{border:1px solid #EEEAF4;border-radius:14px;margin:8px 0;overflow:hidden}
.fbp-pessoa>summary{list-style:none;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:12px 14px;cursor:pointer}
.fbp-pessoa>summary::-webkit-details-marker{display:none}
.fbp-pessoa[open]>summary{background:#FAF9FC;border-bottom:1px solid #EEEAF4}
.fbp-av{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#EFEAF7;color:#613CAD;font-weight:800;font-size:13px;position:relative}
.fbp-av.on::after{content:"";position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:#2FA866;border:2px solid #fff}
.fbp-nome{font-weight:800;font-size:14.5px}
.fbp-nome small{font-weight:600;color:#8F889E;margin-left:6px;font-size:12px}
.fbp-meta{grid-column:2;font-size:12.5px;color:#5B5470}
.fbp-det{grid-column:2;display:flex;flex-wrap:wrap;gap:2px 8px;font-size:11.5px;color:#8F889E}
.fbp-det b{color:#5B5470;font-weight:700}
.fbp-det i{font-style:normal;color:#D6D0E0}
.fbp-det a{color:#613CAD;text-decoration:none;font-weight:600}
.fbp-qdo{grid-row:1/4;grid-column:3;text-align:right;font-size:12px;color:#8F889E;font-weight:600}
.fbp-qdo b{display:block;color:#2B2340;font-size:13px}
.fbp-ren{border:0;background:none;color:#613CAD;font:600 11.5px system-ui;cursor:pointer;padding:0;margin-left:8px;text-decoration:underline}
.fbp-ses{padding:10px 14px 4px 60px;border-bottom:1px solid #F3F0F7}
.fbp-ses:last-child{border-bottom:0}
.fbp-ses h4{margin:0 0 6px;font-size:13px;font-weight:800;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}
.fbp-ses h4 span{font-weight:600;color:#8F889E;font-size:12px}
.fbp-acoes{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:3px}
.fbp-acoes li{display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px;font-size:12.5px;color:#2B2340}
.fbp-acoes time{color:#8F889E;font-variant-numeric:tabular-nums}
.fbp-acoes em{font-style:normal;color:#613CAD;font-weight:700}
.fbp-vazio{padding:30px;text-align:center;color:#8F889E;font-size:14px}
.fbp-pe{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:0 4px;font-size:11.5px;color:#8F889E}
.fbp-pe button{border:0;background:none;color:#613CAD;font:600 11.5px system-ui;cursor:pointer;padding:0;text-decoration:underline}
@media (max-width:640px){.fbp-ses{padding-left:14px}.fbp-filtros{margin-left:0}}`;
  document.head.append(css);

  const dot = document.createElement("button");
  dot.type = "button"; dot.className = "fbp-dot"; dot.setAttribute("aria-label", "Pessoas no site agora");
  dot.innerHTML = "<i></i><span>…</span>";
  document.body.append(dot);
  const tip = dot.querySelector("span");

  async function contaOnline() {
    const linhas = (await le(400)).map(parse).filter(Boolean);
    const agora = Date.now(), vivos = new Set([VIS]);
    linhas.forEach((x) => { if (agora - Date.parse(x.t) < ONLINE) vivos.add(x.vis); });
    const n = vivos.size;
    tip.textContent = n === 1 ? "Só você no site agora" : `${n} pessoas no site agora`;
  }
  contaOnline(); setInterval(contaOnline, 2 * 60e3);
  dot.addEventListener("click", (e) => {
    if (e.shiftKey) { abrePainel(); return; }
    dot.classList.add("show"); setTimeout(() => dot.classList.remove("show"), 2500); // no celular: um toque mostra o número
  });

  // ── o painel ──
  let painel = null, filtro = "todos", esconderEu = ls("fb-esconde-eu") === "1";
  const nomes = () => { try { return JSON.parse(ls("fb-nomes") || "{}"); } catch { return {}; } };
  const hora = (t) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dia = (t) => {
    const d = new Date(t), hoje = new Date(); const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    const mesmo = (a, b) => a.toDateString() === b.toDateString();
    return mesmo(d, hoje) ? "hoje" : mesmo(d, ontem) ? "ontem" : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  };
  const dur = (ms) => { const m = Math.round(ms / 60e3); return m < 1 ? "menos de 1 min" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

  async function abrePainel() {
    if (!painel) {
      painel = document.createElement("div"); painel.className = "fbp-painel";
      painel.addEventListener("click", (e) => {
        if (e.target === painel || e.target.closest(".fbp-x")) { painel.remove(); return; }
        const f = e.target.closest("[data-f]"); if (f) { filtro = f.dataset.f; desenha(); return; }
        if (e.target.closest("[data-esconde]")) { esconderEu = !esconderEu; ls("fb-esconde-eu", esconderEu ? "1" : "0"); desenha(); return; }
        if (e.target.closest("[data-eu]")) { ls("fb-eu", ls("fb-eu") ? "" : "1"); desenha(); return; }
        const rn = e.target.closest("[data-ren]");
        if (rn) { e.preventDefault(); const n = nomes(), v = rn.dataset.ren; const novo = prompt("Nome para esta pessoa:", n[v] || ""); if (novo != null) { if (novo.trim()) n[v] = novo.trim(); else delete n[v]; ls("fb-nomes", JSON.stringify(n)); desenha(); } }
      });
      addEventListener("keydown", (e) => { if (e.key === "Escape" && painel?.isConnected) painel.remove(); });
    }
    document.body.append(painel);
    painel.innerHTML = `<div class="fbp-caixa"><div class="fbp-top"><h2>Visitas ao site</h2><button class="fbp-x" aria-label="Fechar">×</button></div><div class="fbp-vazio">Carregando…</div></div>`;
    dados = (await le(0)).map(parse).filter(Boolean);
    desenha();
  }
  let dados = [];

  function desenha() {
    if (!painel?.isConnected) return;
    const meus = new Set([VIS]);
    dados.forEach((x) => { if (x.tipo === "entrada" && x.d?.eu) meus.add(x.vis); });
    // sessões
    const S = new Map();
    dados.forEach((x) => {
      const s = S.get(x.ses) || { ses: x.ses, vis: x.vis, ini: x.t, fim: x.t, pags: new Set(), acoes: [], info: null };
      if (x.t < s.ini) s.ini = x.t; if (x.t > s.fim) s.fim = x.t;
      if (x.tipo === "entrada") { s.info ||= x.d; s.pags.add(x.d?.pag); }
      if (x.tipo === "ping") s.pags.add(x.d);
      if (x.tipo === "acao") { s.acoes.push(x); s.pags.add(x.d?.pag); }
      S.set(x.ses, s);
    });
    let sessoes = [...S.values()].filter((s) => filtro === "todos" || s.pags.has(filtro));
    if (esconderEu) sessoes = sessoes.filter((s) => !meus.has(s.vis));
    // pessoas
    const P = new Map();
    sessoes.forEach((s) => { const p = P.get(s.vis) || { vis: s.vis, sessoes: [], ult: s.fim, info: null }; p.sessoes.push(s); if (s.fim > p.ult) p.ult = s.fim; p.info ||= s.info; P.set(s.vis, p); });
    const pessoas = [...P.values()].sort((a, b) => b.ult.localeCompare(a.ult));
    pessoas.forEach((p) => p.sessoes.sort((a, b) => b.ini.localeCompare(a.ini)));
    const agora = Date.now(), on = (p) => agora - Date.parse(p.ult) < ONLINE;
    const hoje = new Date().toDateString(), sete = agora - 7 * 864e5;
    const N = {
      on: pessoas.filter(on).length,
      hoje: pessoas.filter((p) => new Date(p.ult).toDateString() === hoje).length,
      sete: pessoas.filter((p) => Date.parse(p.ult) > sete).length,
      ses: sessoes.length,
    };
    // numeração fixa: pela primeira vez que cada navegador apareceu (não muda com os filtros)
    const n = nomes(), primeira = new Map();
    dados.forEach((x) => { if (!primeira.has(x.vis) || x.t < primeira.get(x.vis)) primeira.set(x.vis, x.t); });
    let letra = 0;
    const ordemNome = new Map([...primeira].sort((a, b) => a[1].localeCompare(b[1])).map(([v]) => [v, `Visitante ${++letra}`]));
    const nomeDe = (p) => n[p.vis] || (meus.has(p.vis) ? "Você" : ordemNome.get(p.vis));
    const ini = (s) => s.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const lugar = (i) => [i?.cidade, i?.uf && i.uf !== i.cidade ? i.uf : "", i?.pais && i.pais !== "Brazil" && i.pais !== "Brasil" ? i.pais : ""].filter(Boolean).join(", ") || "local desconhecido";
    const disp = (i) => i ? `${i.tipo === "celular" || i.tipo === "tablet" ? "📱" : "💻"} ${i.modelo ? `${i.modelo} · ` : ""}${i.so}${i.sover ? ` ${i.sover}` : ""} · ${i.nav}` : "aparelho desconhecido";
    // a rede costuma dizer de onde a pessoa acessa (ex.: a rede de uma empresa ou o provedor de casa)
    const rede = (i) => String(i?.rede || "").replace(/^AS\d+\s*/, "");
    const detalhes = (i) => !i ? "" : [
      rede(i) && `<span title="Provedor ou empresa dona da conexão">Rede: <b>${esc(rede(i))}</b></span>`,
      i.cep && `<span>CEP aprox. ${esc(i.cep)}</span>`,
      i.lat && `<a href="https://www.google.com/maps?q=${i.lat},${i.lon}" target="_blank" rel="noopener" title="Ponto aproximado, pela conexão">ver região no mapa ↗</a>`,
      i.tela && `<span>tela ${esc(i.tela)}</span>`,
      i.idioma && i.idioma !== "pt-BR" && `<span>idioma ${esc(i.idioma)}</span>`,
      i.fuso && i.fuso !== "America/Sao_Paulo" && `<span>fuso ${esc(i.fuso)}</span>`,
    ].filter(Boolean).join("<i>·</i>");
    const acaoTxt = (a, variasPags) => {
      const d = a.d || {};
      const o = { clicou: "clicou em", marcou: "marcou", desmarcou: "desmarcou", abriu: "abriu", assistiu: "assistiu" }[d.o] || d.o;
      return `${o} <em>${esc(d.txt)}</em>${variasPags && d.pag ? ` <span style="color:#8F889E">· ${NOME_PAG[d.pag] || d.pag}</span>` : ""}`;
    };
    const lista = pessoas.length ? pessoas.map((p) => `
      <details class="fbp-pessoa"${pessoas.length <= 3 ? " open" : ""}>
        <summary>
          <span class="fbp-av${on(p) ? " on" : ""}">${esc(ini(nomeDe(p)))}</span>
          <span class="fbp-nome">${esc(nomeDe(p))}<small>${p.sessoes.length} ${p.sessoes.length === 1 ? "visita" : "visitas"}</small><button class="fbp-ren" data-ren="${esc(p.vis)}">renomear</button></span>
          <span class="fbp-qdo">${on(p) ? "<b style='color:#1E8A52'>online agora</b>" : `<b>${dia(p.ult)}</b>${hora(p.ult)}`}</span>
          <span class="fbp-meta">${esc(disp(p.info))} · ${esc(lugar(p.info))}</span>
          ${detalhes(p.info) ? `<span class="fbp-det">${detalhes(p.info)}</span>` : ""}
        </summary>
        ${p.sessoes.map((s) => `<div class="fbp-ses">
          <h4>${dia(s.ini)}, ${hora(s.ini)}<span>${dur(Date.parse(s.fim) - Date.parse(s.ini))} · ${[...s.pags].filter(Boolean).map((x) => NOME_PAG[x] || x).join(" + ")}${s.info?.ref ? ` · veio de ${esc(s.info.ref)}` : ""}${s.info && (s.info.rede !== p.info?.rede || s.info.cidade !== p.info?.cidade) ? ` · de outro lugar: ${esc(lugar(s.info))}${rede(s.info) ? `, rede ${esc(rede(s.info))}` : ""}` : ""}</span></h4>
          ${s.acoes.length ? `<ul class="fbp-acoes">${s.acoes.sort((a, b) => a.t.localeCompare(b.t)).map((a) => `<li><time>${hora(a.t)}</time><span>${acaoTxt(a, s.pags.size > 1)}</span></li>`).join("")}</ul>` : `<p class="fbp-acoes" style="color:#8F889E;font-size:12.5px;margin:0 0 8px">Só olhou, sem cliques.</p>`}
        </div>`).join("")}
      </details>`).join("") : `<div class="fbp-vazio">Nenhuma visita registrada${filtro !== "todos" ? " nesta página" : ""} ainda.</div>`;
    const F = [["todos", "Tudo"], ["crono", "Cronograma"], ["mapa", "Site dos filmes"]];
    painel.innerHTML = `<div class="fbp-caixa" role="dialog" aria-label="Visitas ao site">
      <div class="fbp-top"><h2>Visitas ao site</h2><button class="fbp-x" aria-label="Fechar">×</button></div>
      <div class="fbp-nums">
        <div class="fbp-num on"><b>${N.on}</b>online agora</div>
        <div class="fbp-num"><b>${N.hoje}</b>pessoas hoje</div>
        <div class="fbp-num"><b>${N.sete}</b>em 7 dias</div>
        <div class="fbp-num"><b>${N.ses}</b>visitas</div>
        <div class="fbp-filtros">${F.map(([k, l]) => `<button data-f="${k}" class="${filtro === k ? "on" : ""}">${l}</button>`).join("")}<button data-esconde class="${esconderEu ? "on" : ""}">Esconder as minhas</button></div>
      </div>
      <div class="fbp-lista">${lista}
        <div class="fbp-pe"><span>Local aproximado pela conexão; sem IP nem nome. "Visitante" = um navegador.</span><button data-eu>${ls("fb-eu") ? "Este navegador está marcado como seu" : "Marcar este navegador como meu"}</button></div>
      </div></div>`;
  }
})();
