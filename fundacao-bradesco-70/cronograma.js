// Cronograma da pós para o cliente: Agenda, Linha do tempo, Calendário e Por filme.
// Datas: a aba "Cronograma" da planilha do Controle, que o Controle preenche a partir da agenda do Notion.
// Sem ela (ou se demorar), vale cronograma-dados.js. Link direto de um filme: cronograma.html#filme/<id>
let booted = false;
function boot() {
  if (booted) return; booted = true;
  const C = window.CRONO;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ── Datas (sempre locais, sem fuso) ──
  const D = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const WDL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const dm = (s) => { const d = D(s); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const wd = (s) => WD[D(s).getDay()];
  const TODAY = iso(new Date());
  const isOff = (d) => d.getDay() === 0 || d.getDay() === 6;

  // ── Etapas (cores das bolinhas do livro) ──
  const STEP = {
    ed: { label: "Edição", c: "var(--c-ed)", bar: true, desc: "Montagem, V1 e ajustes internos" },
    v2: { label: "V2 chega para a Equipe Bradesco", short: "V2", c: "var(--c-v2)", desc: "O filme montado, para a revisão da Equipe Bradesco" },
    rev: { label: "Retorno da V2", short: "Retorno", c: "var(--c-rev)", you: true, desc: "Uma devolutiva consolidada, em 1 dia útil" },
    off: { label: "Offline aprovado", short: "Offline", c: "var(--c-off)", desc: "Montagem travada: só ajustes pontuais e o aceite" },
    fin: { label: "Finalização", short: "Cor e som", c: "var(--c-fin)", bar: true, desc: "Cor, som, grafismos e legendas" },
    on: { label: "Online para conferência", short: "Online", c: "var(--c-on)", desc: "O filme finalizado, para a Equipe Bradesco conferir" },
  };
  const ORDER = ["ed", "v2", "rev", "off", "fin", "on"];
  window.__liveI = (f) => window.__fbLive?.[f.id];

  // a entrega é por bloco: cidade + fotógrafo (visita + 3 pílulas), só as 3 pílulas, documentário ou trailer
  const nomeFilme = (f) => ({
    bloco: `${f.nome} / ${f.fot?.nome}`,
    pilula: `${f.nome} · 3 pílulas`,
    visita: `Visita · ${f.nome}${f.uf ? ` (${f.uf})` : ""}`,
    documentario: "Documentário · 15 min",
    trailer: "Trailer · 2 min",
  })[f.tipo];
  const subFilme = (f) => ({
    bloco: `Visita à escola (até 2 min) + 3 pílulas de ${f.fot?.nome} (1 min cada)`,
    pilula: "Pílulas 1, 2 e 3 · 1 min cada",
    visita: "Visita à escola · até 2 min",
    documentario: "De geração em geração · 15 min",
    trailer: "Trailer do documentário · 2 min",
  })[f.tipo];
  const grupo = (f) => (f.tipo === "documentario" || f.tipo === "trailer" ? "doc" : f.tipo);

  // eventos de cada filme
  const stepsOf = (f) => ORDER.map((k) => {
    const v = f[k];
    const [start, end] = Array.isArray(v) ? v : [v, v];
    return { k, start, end, f };
  });
  // cumprida pela data ou pelo andamento real que o Controle informa
  const status = (st) => (st.end < TODAY || (window.__liveI?.(st.f) ?? -1) >= FEITO[st.k] ? "done" : st.start <= TODAY ? "now" : "todo");

  // ── Estado ──
  const state = { view: "agenda", filtro: "" };
  const filmes = () => C.filmes.filter((f) => !state.filtro || grupo(f) === state.filtro);

  const TECNICO = (C.fechamento.find((x) => x.cliente) || {}).data;
  const SITE = "./"; // site dos filmes, na mesma pasta
  const byId = Object.fromEntries(C.filmes.map((f) => [f.id, f]));

  // ── Andamento real, vindo do Controle dos Filmes (planilha pública: coluna A = id, F = status) ──
  // Os mesmos status do Controle; o índice diz até onde o filme já andou.
  const ANDA = [
    ["edicao", "Em edição"], ["v2", "V2 com o cliente"], ["ajustes", "Ajustes do retorno"], ["offline", "Offline aprovado"],
    ["finalizacao", "Em finalização"], ["online", "Online com o cliente"], ["aprovado", "Aprovado"], ["entregue", "Entregue"],
  ];
  const ANDA_I = Object.fromEntries(ANDA.map(([k, l], i) => [l.toLowerCase(), i]));
  const ANTIGO = { "provisório": 0, "em edição": 0, "em revisão": 1, "aprovado": 6 }; // nomes antigos do Controle
  const live = (window.__fbLive = {}); // id do filme no cronograma -> índice de andamento (o menos adiantado do grupo)
  const links = {}; // id do filme no cronograma -> vídeos com link (as 3 pílulas, a visita…)
  const BLOCO_DO_FOT = Object.fromEntries(C.filmes.filter((f) => f.fot).map((f) => [f.fot.id, f.id])); // fotógrafo -> bloco da cidade
  const grupoDoVideo = (vid) => { const g = vid.startsWith("pilula-") ? vid.replace(/^pilula-/, "").replace(/-\d+$/, "") : vid.replace(/^visita-/, ""); return BLOCO_DO_FOT[g] || g; };
  window.__fbCrono = (res) => {
    (res?.table?.rows || []).forEach((r) => {
      const vid = String(r.c?.[0]?.v || "").trim(), st = String(r.c?.[5]?.v || "").trim().toLowerCase();
      const url = String(r.c?.[4]?.v || "").trim();
      if (vid && vid !== "placeholder" && url && byId[grupoDoVideo(vid)]) (links[grupoDoVideo(vid)] ||= []).push({ vid, url, titulo: String(r.c?.[2]?.v || ""), duracao: String(r.c?.[3]?.v || "") });
      if (!vid || vid === "placeholder" || !st) return;
      const i = ANDA_I[st] ?? ANTIGO[st];
      const g = grupoDoVideo(vid);
      if (i == null || !byId[g]) return;
      live[g] = live[g] == null ? i : Math.min(live[g], i);
    });
    render(); if (focusId) renderFocus(focusId);
  };
  if (window.VIDEO_SHEET_ID) {
    const sc = document.createElement("script");
    sc.src = `https://docs.google.com/spreadsheets/d/${window.VIDEO_SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:__fbCrono&headers=1&t=${Date.now()}`;
    sc.async = true; document.head.append(sc);
  }
  // etapa do cronograma -> andamento mínimo que a dá por cumprida
  const FEITO = { ed: 1, v2: 1, rev: 2, off: 3, fin: 5, on: 6 };
  const siteLink = (f) => SITE + ({ bloco: `#/escola/${f.id}`, pilula: `#/fotografo/${f.id}`, visita: `#/escola/${f.id}`, documentario: "#/filme/documentario", trailer: "#/filme/trailer" })[f.tipo];
  const AGORA = ["Em edição", "V2 com a Equipe Bradesco · aguardando o retorno", "Retorno recebido · ajustes em andamento", "Offline aprovado", "Em cor e som", "Online para a Equipe Bradesco conferir", "Aprovado", "Entregue"];
  // ── Assistir à versão atual: abre no player do projeto; link do Frame.io abre numa nova janela ──
  const VERSAO = [null, "à V2", "à V2", "ao offline aprovado", "ao offline aprovado", "ao online", "à versão aprovada", "à versão final"];
  const isFrameio = (u) => /(^|\.)(frame\.io|f\.io)\//i.test(u.replace(/^https?:\/\//, ""));
  function watchBtn(f, dark) {
    const i = live[f.id], vs = links[f.id] || [];
    if (!i || !vs.length) return ""; // antes da V2 o cliente não vê nada
    const fio = vs.find((v) => isFrameio(v.url));
    const label = `▶ Assistir ${VERSAO[i]}`;
    return fio
      ? `<a class="watch${dark ? " dark" : ""}" href="${esc(fio.url)}" target="_blank" rel="noopener">${label} <span aria-hidden="true">↗</span><small>abre no Frame.io</small></a>`
      : `<button type="button" class="watch${dark ? " dark" : ""}" data-watch="${f.id}">${label}</button>`;
  }
  function assistir(id) {
    const f = byId[id], vs = links[id] || [], i = live[id];
    if (!f || !vs.length || !window.FBPlayer) return;
    const ord = vs.slice().sort((a, b) => a.vid.localeCompare(b.vid));
    window.FBPlayer.open(ord.map((v) => ({ titulo: v.titulo || nomeFilme(f), kicker: `${f.nome} · ${VERSAO[i].replace(/^(à|ao) /, "")}`, duracao: v.duracao, url: v.url, cor: "var(--purple)" })), 0);
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-watch]"); if (b) { e.preventDefault(); assistir(b.dataset.watch); } });

  function liveBox(f, dark, comBotao = true) {
    const i = live[f.id];
    if (i == null) return "";
    const txt = i === 0 ? `Preparando a V2 · chega ${wd(f.v2)}, ${dm(f.v2)}` : AGORA[i];
    return `<div class="live${dark ? " dark" : ""}"><span class="live-dot" style="--c:${["var(--c-v2)", "var(--c-v2)", "var(--c-rev)", "var(--c-off)", "var(--c-fin)", "var(--c-on)", "var(--c-fim)", "var(--c-fim)"][i]}"></span><span><small>Agora</small>${esc(txt)}</span>${comBotao ? watchBtn(f, dark) : ""}</div>`;
  }

  // ── Topo ──
  document.querySelectorAll('[data-bind="fim"]').forEach((n) => (n.textContent = `${wd(C.fim)}, ${dm(C.fim)}`));
  document.querySelectorAll('[data-bind="feriados"]').forEach((n) => (n.textContent = Object.entries(C.feriados).map(([d, nome]) => `${dm(d)} ${nome}`).join(", ")));
  document.querySelectorAll('[data-bind="atualizado"]').forEach((n) => (n.textContent = dm(C.atualizado) + "/" + C.atualizado.slice(0, 4)));
  $(".confetti").innerHTML = "86,14,y 93,27,r 78,58,b 95,66,p 89,82,o 4,88,r 12,94,y"
    .split(" ").map((t) => { const [x, y, c] = t.split(","); return `<i style="left:${x}%;top:${y}%;--c:var(--${{ y: "yellow", r: "red", b: "blue", p: "purple", o: "orange" }[c]})"></i>`; }).join("");

  function stats() {
    const nextV2 = C.filmes.filter((f) => f.v2 >= TODAY).sort((a, b) => a.v2.localeCompare(b.v2))[0];
    const nextRev = C.filmes.filter((f) => f.rev >= TODAY).sort((a, b) => a.rev.localeCompare(b.rev))[0];
    const recebidos = C.filmes.filter((f) => f.v2 < TODAY).length;
    $("#stats").innerHTML = `
      <div><dt>Vídeos</dt><dd>41<small>33 pílulas · 6 visitas · doc · trailer</small></dd></div>
      <div><dt>Próxima V2</dt><dd>${nextV2 ? `${dm(nextV2.v2)}<small>${esc(nomeFilme(nextV2))}</small>` : "Todas entregues"}</dd></div>
      <div><dt>Próximo retorno da Equipe Bradesco</dt><dd>${nextRev ? `${dm(nextRev.rev)}<small>${esc(nomeFilme(nextRev))}</small>` : `${dm(TECNICO)}<small>Retorno técnico</small>`}</dd></div>
      <div><dt>Entrega final</dt><dd>${dm(C.fim)}<small>${recebidos} de ${C.filmes.length} filmes já na V2</small></dd></div>`;
  }
  stats();

  // como cada filme anda
  $("#steps").innerHTML = ["v2", "rev", "off", "fin", "on"].map((k) => {
    const s = STEP[k];
    return `<li class="${s.you ? "you" : ""}${s.bar ? " range" : ""}" style="--c:${s.c}"><i></i><strong>${esc(s.label)}${s.you ? '<span class="tag-you">Equipe Bradesco</span>' : ""}</strong><span>${esc(s.desc)}</span></li>`;
  }).join("") + `<li style="--c:var(--c-fim)"><i></i><strong>Entrega final</strong><span>Os 41 vídeos em ${dm(C.fim)}, depois do retorno técnico de ${dm(TECNICO)}</span></li>`;

  // ── Eventos pontuais (agenda e calendário) ──
  function eventos() {
    const ev = [];
    filmes().forEach((f) => ["v2", "rev", "off", "on"].forEach((k) => ev.push({ date: f[k], k, f })));
    C.fechamento.forEach((x) => ev.push({ date: x.data, k: "fecho", x }));
    return ev.sort((a, b) => a.date.localeCompare(b.date));
  }
  const evColor = (e) => (e.k === "fecho" ? (e.x.cliente ? "var(--c-rev)" : e.x.marco ? "var(--c-fim)" : "var(--ink-3)") : STEP[e.k].c);
  const evYou = (e) => (e.k === "fecho" ? !!e.x.cliente : !!STEP[e.k].you);
  const link = (f) => `<a href="#filme/${f.id}">${esc(nomeFilme(f))}</a>`;
  const filmTitle = (f) => (f.tipo === "pilula" || f.tipo === "visita" || f.tipo === "bloco" ? f.nome : nomeFilme(f).split(" · ")[0]);
  const filmSub = (f) => ({ bloco: `+ ${f.fot?.nome} · visita e 3 pílulas`, pilula: "3 pílulas", visita: `Visita${f.uf ? ` · ${f.uf}` : ""}`, documentario: "15 min", trailer: "2 min" })[f.tipo];
  const filmChip = (f) => `<a class="film" href="#filme/${f.id}" data-peek="${f.id}" aria-expanded="false"><b>${esc(filmTitle(f))}</b><small>${esc(filmSub(f))}</small></a>`;

  // ── Agenda: semana a semana ──
  function viewAgenda() {
    const byDay = new Map();
    eventos().forEach((e) => { if (!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e); });
    const weeks = new Map();
    [...byDay.keys()].forEach((d) => {
      const x = D(d), mon = addDays(x, -((x.getDay() + 6) % 7));
      const k = iso(mon);
      if (!weeks.has(k)) weeks.set(k, []);
      weeks.get(k).push(d);
    });
    let html = "";
    weeks.forEach((days, mon) => {
      const fri = addDays(D(mon), 4);
      const a = D(mon), same = a.getMonth() === fri.getMonth();
      const ano = fri.getFullYear() !== D(C.inicio).getFullYear() && a.getMonth() === 0 && a.getDate() <= 7 ? ` de ${fri.getFullYear()}` : "";
      html += `<section class="week"><h3>Semana de ${a.getDate()}${same ? "" : ` de ${MES[a.getMonth()].slice(0, 3)}.`} a ${fri.getDate()} de ${MES[fri.getMonth()]}${ano}</h3>`;
      days.forEach((d) => {
        const list = byDay.get(d);
        // agrupa a mesma etapa no mesmo dia
        const groups = new Map();
        list.forEach((e) => { const k = e.k === "fecho" ? "fecho:" + e.x.titulo : e.k; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
        const items = [...groups.values()].map((g) => {
          const e = g[0];
          if (e.k === "fecho") {
            return `<li class="item${e.x.cliente ? " you" : ""}" style="--c:${evColor(e)}"><i></i><div><strong>${esc(e.x.titulo)}${e.x.cliente ? '<span class="tag-you">Equipe Bradesco</span>' : ""}</strong><p>${esc(e.x.texto)}${e.x.fim ? ` Até ${dm(e.x.fim)}.` : ""}</p></div></li>`;
          }
          const s = STEP[e.k];
          // o filme em destaque; a etapa vira um rótulo pequeno em cima
          return `<li class="item${s.you ? " you" : ""}" style="--c:${s.c}"><i></i><div><span class="step-k">${esc(s.label)}${s.you ? '<span class="tag-you">Equipe Bradesco</span>' : ""}</span><div class="films">${g.map((x) => filmChip(x.f)).join("")}</div></div></li>`;
        }).join("");
        const cls = d < TODAY ? " past" : d === TODAY ? " today" : "";
        html += `<div class="day${cls}"><div class="day-date"><strong>${dm(d)}</strong><span>${WDL[D(d).getDay()]}</span></div><ul class="items">${items}</ul></div>`;
      });
      html += `</section>`;
    });
    return html || `<p>Nada neste filtro.</p>`;
  }

  // ── Linha do tempo (Gantt) ──
  function viewLinha() {
    const start = D(C.inicio), end = D(C.fim);
    const days = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
    const N = days.length, col = (s) => Math.round((D(s) - start) / 864e5); // índice da coluna
    const pos = (s) => `calc(${col(s)} * var(--col) + var(--col) / 2)`;
    const avail0 = Math.min(document.querySelector("main").clientWidth - 2 * parseFloat(getComputedStyle(document.querySelector("main")).paddingLeft || 0), 1100);
    const compact = (avail0 - 180) / N < 20 && innerWidth > 720;
    let head = `<div class="g-name g-head" style="grid-row:1 / 3">Filme</div>`;
    let m = -1;
    days.forEach((d, i) => {
      if (d.getMonth() !== m) {
        m = d.getMonth();
        const span = days.filter((x, j) => j >= i && x.getMonth() === m).length;
        head += `<div class="g-month g-head" style="grid-column:${i + 2} / span ${span}">${compact && span < 10 ? MES[m].slice(0, 3) + "." : MES[m]}</div>`;
      }
      const show = !compact || (d.getDay() === 1 && d.getDate() !== 1) || i === 0; // colunas estreitas: só as segundas
      head += `<div class="g-day g-head${isOff(d) || C.feriados[iso(d)] ? " off" : ""}" style="grid-column:${i + 2}">${show ? `${compact ? "" : `<b>${WD[d.getDay()][0]}</b>`}${d.getDate()}` : ""}</div>`;
    });
    const shades = days.map((d, i) => {
      if (C.feriados[iso(d)]) return `<div class="g-hol" style="left:calc(${i} * var(--col));width:var(--col)" title="Feriado: ${esc(C.feriados[iso(d)])}"></div>`;
      return isOff(d) ? `<div class="g-shade" style="left:calc(${i} * var(--col));width:var(--col)"></div>` : "";
    }).join("");
    const inRange = TODAY >= C.inicio && TODAY <= C.fim;
    const todayLine = inRange ? `<div class="g-today" style="left:${pos(TODAY)}"></div>` : "";
    if (inRange) head += `<div class="g-todayhead" style="grid-column:2 / -1"><div class="g-today lbl" style="left:${pos(TODAY)};top:auto;bottom:0;height:10px"><span style="top:auto;bottom:12px;left:-18px">hoje</span></div></div>`;
    const row = (name, inner) => `<div class="g-row">${name}<div class="g-track">${shades}${inner}${todayLine}</div></div>`;
    const bar = (a, b, c, tip, cls = "") => `<div class="g-bar ${cls}" style="--c:${c};left:calc(${col(a)} * var(--col) + 3px);width:calc(${col(b) - col(a) + 1} * var(--col) - 6px)" data-tip="${esc(tip)}"></div>`;
    const dot = (s, c, tip, cls = "") => `<div class="g-dot ${cls}" style="--c:${c};left:${pos(s)}" data-tip="${esc(tip)}"></div>`;
    const filmRow = (f) => row(
      `<div class="g-name"><a href="#filme/${f.id}" title="${esc(nomeFilme(f))}">${esc(f.tipo === "bloco" ? `${f.nome} + ${f.fot?.nome.split(" ")[0]}` : f.tipo === "pilula" ? f.nome : nomeFilme(f))}</a></div>`,
      bar(f.ed[0], f.ed[1], "var(--c-ed)", `Edição interna · ${dm(f.ed[0])} a ${dm(f.ed[1])}`, "ed") +
      bar(f.fin[0], f.fin[1], STEP.fin.c, `Cor e som · ${dm(f.fin[0])} a ${dm(f.fin[1])}`) +
      ["v2", "rev", "off", "on"].map((k) => dot(f[k], STEP[k].c, `${STEP[k].label} · ${wd(f[k])} ${dm(f[k])}`)).join(""));
    const gr = (t, list) => (list.length ? `<div class="g-group">${t}</div>` + list.map(filmRow).join("") : "");
    const fs = filmes();
    const body =
      gr("Cidade + fotógrafo · visita e 3 pílulas", fs.filter((f) => f.tipo === "bloco")) +
      gr("Só pílulas · pack de 3", fs.filter((f) => f.tipo === "pilula")) +
      gr("Documentário e trailer", fs.filter((f) => grupo(f) === "doc")) +
      `<div class="g-group">Fechamento</div>` +
      row(`<div class="g-name">Todos os 41</div>`,
        C.fechamento.map((x) => x.fim ? bar(x.data, x.fim, "var(--line)", `${x.titulo} · ${dm(x.data)} a ${dm(x.fim)}`)
          : dot(x.data, x.cliente ? "var(--c-rev)" : x.marco ? "var(--c-fim)" : "var(--ink-3)", `${x.titulo} · ${wd(x.data)} ${dm(x.data)}`, x.marco ? "big" : "")).join(""));
    const legend = `<div class="legend">
      <span><i class="bar ed"></i>Edição interna</span>
      ${["v2", "rev", "off"].map((k) => `<span><i style="--c:${STEP[k].c}"></i>${STEP[k].label}</span>`).join("")}
      <span><i class="bar" style="--c:${STEP.fin.c}"></i>Cor e som</span>
      <span><i style="--c:${STEP.on.c}"></i>${STEP.on.label}</span>
      <span><i style="--c:var(--c-fim)"></i>Entrega final</span></div>`;
    // no computador a linha do tempo cabe inteira na largura; no celular rola para o lado
    const avail = Math.min(document.querySelector("main").clientWidth - 2 * parseFloat(getComputedStyle(document.querySelector("main")).paddingLeft || 0), 1100);
    const nameW = innerWidth <= 720 ? 132 : 180;
    const colW = Math.max(innerWidth <= 720 ? 22 : 9, Math.floor((avail - nameW - 2) / N));
    return `${legend}<div class="gantt-wrap"><div class="gantt${compact ? " compact" : ""}" style="--days:${N};--col:${colW}px;--name:${nameW}px">${head}${body}</div></div>
      <p class="hint">Passe o mouse (ou toque) nas bolinhas para ver a data. Fins de semana listrados; feriados em rosa. Clique no nome para ver o filme.${compact ? " Os números do topo marcam as segundas-feiras." : ""}</p>`;
  }

  // ── Calendário ──
  let selDay = null;
  function viewCalendario() {
    const evs = eventos();
    const byDay = new Map();
    evs.forEach((e) => { if (!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e); });
    const label = (e) => (e.k === "fecho" ? e.x.titulo : `${STEP[e.k].short} · ${filmTitle(e.f)}`);
    // só as semanas do projeto, numa grade contínua (seg a dom; fim de semana mais estreito)
    const first = D(C.inicio), last = D(C.fim);
    // semana começando no domingo
    const mon = addDays(first, -first.getDay()), sun = addDays(last, 6 - last.getDay());
    let cells = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((w) => `<div class="wd">${w}</div>`).join("");
    for (let dt = new Date(mon); dt <= sun; dt = addDays(dt, 1)) {
      const s = iso(dt), d = dt.getDate();
      const list = byDay.get(s) || [];
      const out = s < C.inicio || s > C.fim;
      const cls = ["cell", out ? "out" : "", isOff(dt) ? "we" : "", C.feriados[s] ? "hol" : "", s === TODAY ? "today" : "", s < TODAY ? "past" : "", s === selDay ? "sel" : ""].join(" ");
      const max = 4;
      const num = d === 1 || s === iso(mon) ? `${d} <small>${MES[dt.getMonth()].slice(0, 3)}</small>` : d;
      const lis = list.slice(0, max).map((e) => `<li class="${evYou(e) ? "you" : ""}" style="--c:${evColor(e)}"><i></i><span>${esc(label(e))}</span></li>`).join("");
      const inner = `<span class="n">${num}</span>${C.feriados[s] ? `<span class="hn">${esc(C.feriados[s])}</span>` : ""}<ul>${lis}</ul>${list.length > max ? `<span class="more">+${list.length - max}</span>` : ""}<span class="dots">${list.map((e) => `<i style="--c:${evColor(e)}"></i>`).join("")}</span>`;
      cells += list.length ? `<button class="${cls}" data-day="${s}" aria-label="${d} de ${MES[dt.getMonth()]}: ${list.length} itens">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
    }
    const cap = (t) => t[0].toUpperCase() + t.slice(1);
    const anos = first.getFullYear() === last.getFullYear() ? `${cap(MES[first.getMonth()])} a ${MES[last.getMonth()]} de ${last.getFullYear()}` : `${cap(MES[first.getMonth()])} de ${first.getFullYear()} a ${MES[last.getMonth()]} de ${last.getFullYear()}`;
    const html = `<section class="month"><h3>${anos}</h3><div class="cal">${cells}</div></section>`;
    const sel = selDay && byDay.get(selDay);
    const box = sel ? `<div class="daybox"><h4>${WDL[D(selDay).getDay()]}, ${dm(selDay)}</h4><ul class="items">${sel.map((e) => e.k === "fecho"
      ? `<li class="item${e.x.cliente ? " you" : ""}" style="--c:${evColor(e)}"><i></i><div><strong>${esc(e.x.titulo)}</strong><p>${esc(e.x.texto)}</p></div></li>`
      : `<li class="item${STEP[e.k].you ? " you" : ""}" style="--c:${STEP[e.k].c}"><i></i><div><strong>${esc(STEP[e.k].label)}</strong><p>${link(e.f)}</p></div></li>`).join("")}</ul></div>` : "";
    return `<p class="hint" style="margin:0 0 14px">Clique num dia para ver tudo o que acontece nele.</p><div class="months">${html}</div><div id="daybox-anchor">${box}</div>`;
  }

  // ── Por filme ──
  function trackHTML(f) {
    const steps = stepsOf(f).filter((s) => s.k !== "ed"); // para o cliente, tudo começa na V2
    const next = steps.find((s) => status(s) !== "done");
    return `<ol class="track">${steps.map((s) => {
      const st = STEP[s.k], stt = status(s);
      const when = s.start === s.end ? `${wd(s.start)} ${dm(s.start)}` : `${dm(s.start)} a ${dm(s.end)}`;
      return `<li class="${stt === "done" ? "done" : ""}${s === next ? " next" : ""}${st.you ? " you" : ""}" style="--c:${st.c}"><i></i><span>${esc(st.label)}${st.you ? '<span class="tag-you">Equipe Bradesco</span>' : ""}</span><time>${when}</time></li>`;
    }).join("")}<li style="--c:var(--c-fim)"><i></i><span>Entrega final</span><time>${wd(C.fim)} ${dm(C.fim)}</time></li></ol>`;
  }
  function viewFilmes() {
    return `<div class="cards">${filmes().map((f) => `
      <article class="card" id="card-${f.id}">
        <button class="copy" data-copy="${f.id}" type="button">Copiar link</button>
        <h3>${esc(f.tipo === "bloco" ? nomeFilme(f) : filmTitle(f))}</h3>
        <p class="sub">${esc(subFilme(f))}${f.uf ? ` · ${f.uf}` : ""}</p>
        ${juntoHTML(f)}${liveBox(f)}
        ${trackHTML(f)}
      </article>`).join("")}</div>`;
  }

  // filmes que chegam no mesmo pacote (pílulas do fotógrafo + visita da escola dele)
  const parceiros = (f) => C.filmes.filter((x) => x !== f && (x.junto === f.id || f.junto === x.id));
  const juntoHTML = (f) => { const p = parceiros(f); return p.length ? `<p class="junto">Chega junto com ${p.map((x) => `<a href="#filme/${x.id}">${esc(nomeFilme(x))}</a>`).join(" e ")}</p>` : ""; };

  // ── Destaque de um filme (link enviado com a V2) ──
  let focusId = null;
  function renderFocus(id) {
    focusId = id;
    const box = $("#focus");
    const f = C.filmes.find((x) => x.id === id);
    if (!f) { box.hidden = true; return; }
    const chegou = f.v2 <= TODAY || (live[f.id] ?? 0) >= 1; // pela data ou pelo Controle
    box.hidden = false;
    box.innerHTML = `<div class="focus-box">
      <p class="k">${chegou ? "A V2 chegou" : `V2 em ${dm(f.v2)}`}</p>
      <h2>${esc(nomeFilme(f))}</h2>
      ${juntoHTML(f)}${liveBox(f, true)}
      <p class="s">${chegou ? `Precisamos do retorno da Equipe Bradesco até <b>${wd(f.rev)}, ${dm(f.rev)}</b>, numa devolutiva única. Depois disso a montagem trava e o filme segue para cor e som.` : `A V2 chega ${WDL[D(f.v2).getDay()]}, ${dm(f.v2)}. O retorno da Equipe Bradesco fica para ${dm(f.rev)}.`}</p>
      ${trackHTML(f)}
      <a class="all" href="#agenda">Ver o cronograma de todos os filmes →</a>
    </div>`;
  }

  // ── Ficha do filme aberta ali mesmo (agenda, calendário, linha do tempo), sem sair da visualização ──
  function peekHTML(f) {
    return `<div class="peek-in"><div class="peek-card" style="--c:${STEP.v2.c}">
      <button class="peek-x" type="button" aria-label="Fechar">×</button>
      <p class="k">${esc(subFilme(f))}${f.uf ? ` · ${f.uf}` : ""}</p>
      <h4>${esc(f.tipo === "bloco" ? nomeFilme(f) : filmTitle(f))}</h4>
      ${juntoHTML(f)}${liveBox(f, false, false)}
      ${trackHTML(f)}
      ${(() => { // o botão de assistir; sem versão para ver, só um aviso (quando o "Agora" já não diz)
        const i = live[f.id], btn = watchBtn(f);
        const aviso = btn ? "" : i >= 1 ? "O link da versão atual ainda não está no ar" : i == null ? `A V2 chega ${wd(f.v2)}, ${dm(f.v2)}` : "";
        return btn || aviso ? `<div class="peek-acts">${btn || `<span class="soon">${aviso}</span>`}</div>` : "";
      })()}
    </div></div>`;
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function closePeek(p) {
    if (!p) return;
    p.classList.remove("open");
    document.querySelectorAll(`[data-peek][aria-expanded="true"]`).forEach((c) => { c.setAttribute("aria-expanded", "false"); c.classList.remove("on"); });
    setTimeout(() => p.remove(), reduce ? 0 : 420);
  }
  function openPeek(chip, id) {
    const f = byId[id]; if (!f) return;
    const old = $("#view .peek");
    const same = old && old.dataset.for === id && old._chip === chip;
    closePeek(old);
    if (same) return;
    const p = document.createElement("div");
    p.className = "peek"; p.dataset.for = id; p._chip = chip; p.innerHTML = peekHTML(f);
    // dentro do item da agenda/calendário; na linha do tempo, logo acima do gráfico
    const host = chip.closest(".item > div") || chip.closest(".daybox");
    if (host) host.append(p); else $("#view").prepend(p);
    if (chip.matches("[data-peek]")) { chip.setAttribute("aria-expanded", "true"); chip.classList.add("on"); }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      p.classList.add("open");
      setTimeout(() => { const r = p.getBoundingClientRect(); if (r.bottom > innerHeight || r.top < 70) p.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }); }, reduce ? 0 : 380);
    }));
  }

  // ── Render e navegação ──
  const VIEWS = { agenda: viewAgenda, linha: viewLinha, calendario: viewCalendario, filmes: viewFilmes };
  function render() {
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === state.view)));
    document.querySelectorAll(".filters button").forEach((b) => b.classList.toggle("on", b.dataset.f === state.filtro));
    $("#view").innerHTML = VIEWS[state.view]();
  }
  function route() {
    let [, a, b] = (location.hash || "#agenda").split(/[#/]/);
    if (a === "filme") {
      b = BLOCO_DO_FOT[b] || b; // link antigo de uma pílula: abre o bloco da cidade
      renderFocus(b);
      state.view = "filmes"; render();
      const card = $(`#card-${CSS.escape(b || "")}`);
      if (card) card.classList.add("hl");
      $("#focus").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    $("#focus").hidden = true; focusId = null;
    state.view = VIEWS[a] ? a : "agenda";
    render();
  }
  document.querySelector(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]"); if (!b) return;
    location.hash = b.dataset.view;
  });
  document.querySelector(".filters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    state.filtro = b.dataset.f; render();
  });
  $("#view").addEventListener("click", async (e) => {
    if (e.target.closest(".peek-x")) { closePeek(e.target.closest(".peek")); return; }
    const fl = e.target.closest('a[href^="#filme/"]');
    if (fl && state.view !== "filmes" && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); openPeek(fl, fl.getAttribute("href").slice(7)); return; }
    const day = e.target.closest("[data-day]");
    if (day) { selDay = selDay === day.dataset.day ? null : day.dataset.day; render(); $("#daybox-anchor")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); return; }
    const cp = e.target.closest("[data-copy]");
    if (cp) {
      const url = `${location.origin}${location.pathname}#filme/${cp.dataset.copy}`;
      try { await navigator.clipboard.writeText(url); toast("Link copiado: é só mandar junto com a V2"); }
      catch { prompt("Copie o link:", url); }
    }
  });
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2400); }
  addEventListener("keydown", (e) => { if (e.key === "Escape") closePeek($("#view .peek")); });
  addEventListener("hashchange", route);
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => state.view === "linha" && render(), 150); });
  route();
}

// lê as datas atuais da planilha antes de desenhar; em 2,5 s sem resposta, desenha com o que tem
window.__fbCronoDatas = (res) => {
  try {
    const n = JSON.parse(res?.table?.rows?.[0]?.c?.[0]?.v || "null");
    if (!booted && n && Array.isArray(n.filmes) && n.filmes.some((f) => f.tipo === "bloco") && n.fim) { // só o formato por blocos
      const C = window.CRONO;
      C.filmes = n.filmes;
      if (Array.isArray(n.fechamento) && n.fechamento.length) C.fechamento = n.fechamento;
      C.fim = n.fim; if (n.atualizado) C.atualizado = n.atualizado;
    }
  } catch {}
  boot();
};
if (window.VIDEO_SHEET_ID) {
  const sc = document.createElement("script");
  sc.src = `https://docs.google.com/spreadsheets/d/${window.VIDEO_SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:__fbCronoDatas&sheet=Cronograma&headers=0&range=A1&t=${Date.now()}`;
  sc.onerror = boot; document.head.append(sc);
  setTimeout(boot, 2500);
} else boot();
