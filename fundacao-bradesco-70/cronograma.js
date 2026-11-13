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

  // selo de quem faz a etapa: o símbolo do Bradesco e "Equipe" (vem do selo de 70 anos do livro)
  const TAG_EQUIPE = `<span class="tag-you" title="Equipe Bradesco"><svg class="bd" viewBox="94 1550 250 247" aria-hidden="true"><path fill="currentColor" d="M 204 1555.995 C 186.943 1560.145, 170.838 1569.141, 158.533 1581.390 C 151.279 1588.612, 142.475 1600.856, 140.307 1606.737 C 137.792 1613.559, 133.210 1618.872, 129.231 1619.581 C 127.179 1619.946, 123.925 1621.071, 122 1622.081 C 120.075 1623.090, 116.894 1624.553, 114.930 1625.332 C 112.967 1626.110, 109.479 1627.935, 107.180 1629.386 C 98.001 1635.181, 104.666 1641.962, 115.210 1637.557 C 117.110 1636.763, 120.946 1635.811, 123.735 1635.441 C 130.482 1634.546, 131 1635.635, 131 1650.724 C 131 1658.478, 131.556 1664.642, 132.608 1668.540 C 133.492 1671.818, 134.630 1676.234, 135.136 1678.354 C 136.759 1685.149, 144.995 1700.722, 150.979 1708.311 C 158.182 1717.447, 171.223 1729, 174.332 1729 C 180.776 1729, 180.417 1723.735, 173.433 1715.814 C 157.937 1698.239, 151.206 1671.776, 155.499 1645.309 C 157.366 1633.796, 158.488 1631.324, 162.439 1630.020 C 168.084 1628.157, 189.083 1627.099, 200.597 1628.098 C 220.723 1629.843, 237.715 1631.941, 240.596 1633.036 C 242.167 1633.634, 246.511 1634.766, 250.248 1635.552 C 253.984 1636.338, 258.045 1637.616, 259.271 1638.392 C 260.497 1639.169, 263.075 1640.121, 265 1640.510 C 266.925 1640.898, 269.850 1642.016, 271.500 1642.994 C 273.150 1643.972, 275.589 1645.103, 276.921 1645.507 C 290.487 1649.630, 305.443 1667.439, 305.467 1679.500 C 305.489 1691.053, 292.493 1706.991, 276.250 1715.331 C 274.462 1716.249, 271.537 1717.741, 269.750 1718.646 C 262.551 1722.293, 260.649 1726.972, 265.474 1729.170 C 267.535 1730.109, 268.929 1729.856, 273.849 1727.648 C 277.094 1726.192, 280.144 1724.998, 280.625 1724.995 C 281.455 1724.990, 288.766 1721.346, 299.269 1715.702 C 314.819 1707.344, 327.870 1693.551, 332.627 1680.447 C 340.373 1659.108, 326.471 1636.031, 297.500 1622.137 C 293.650 1620.290, 289.375 1618.222, 288 1617.540 C 281.433 1614.285, 261.778 1609.375, 241 1605.799 C 236.388 1605.005, 193.147 1605.312, 179.593 1606.234 C 174.039 1606.612, 173.961 1604.653, 179.326 1599.512 C 194.676 1584.804, 212.916 1577.078, 233.007 1576.773 C 247.664 1576.551, 267.106 1582.854, 278.435 1591.502 C 285.080 1596.575, 287.283 1597.454, 289.874 1596.068 C 293.111 1594.335, 292.519 1590.588, 288.250 1585.798 C 277.003 1573.178, 262.427 1563.879, 244.500 1557.886 C 236.927 1555.354, 211.513 1554.168, 204 1555.995 M 229.500 1711.966 C 220.398 1717.566, 218.004 1720.956, 218.002 1728.250 C 218.001 1730.862, 217.550 1733, 217 1733 C 216.450 1733, 216 1731.907, 216 1730.571 C 216 1724.366, 210.342 1723.431, 203.662 1728.532 C 196.907 1733.690, 197 1733.236, 197 1760.934 C 197 1784.667, 197.106 1786.106, 199 1788 C 201.586 1790.586, 209.933 1790.744, 214.096 1788.284 C 216.864 1786.649, 217.152 1786.659, 220.250 1788.490 C 222.870 1790.039, 225.147 1790.369, 232 1790.197 C 244.910 1789.873, 244 1793.027, 244 1748.612 C 244 1701.811, 244.393 1702.803, 229.500 1711.966"/></svg><span>Equipe</span></span>`;
  // ── Etapas (cores das bolinhas do livro) ──
  const STEP = {
    ed: { label: "Edição", c: "var(--c-ed)", bar: true, desc: "Montagem, V1 e ajustes internos" },
    v2: { label: "Offline chega para a Equipe Bradesco", short: "Offline", c: "var(--c-v2)", desc: "O filme montado, ainda sem cor e som, para a revisão da Equipe Bradesco" },
    rev: { label: "Retorno do offline", short: "Retorno", c: "var(--c-rev)", you: true, desc: "Uma devolutiva consolidada, até a data indicada" },
    fin: { label: "Som, cor e finalização", short: "Som e cor", c: "var(--c-fin)", bar: true, desc: "Som, cor, grafismos e legendas" },
    on: { label: "Online para conferência", short: "Online", c: "var(--c-on)", desc: "O filme finalizado, para a Equipe Bradesco conferir" },
    ret: { label: "Retorno do online", short: "Retorno do online", c: "var(--c-rev)", you: true, desc: "Um retorno sobre o filme finalizado, até a data indicada" },
    ent: { label: "Filme entregue", short: "Entrega", c: "var(--c-fim)", desc: "A versão final, com os ajustes do retorno" },
  };
  const ORDER = ["ed", "v2", "rev", "fin", "on", "ret", "ent"]; // a liberação para a cor é passagem interna: o cliente não vê
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
  const stepsOf = (f) => ORDER.filter((k) => f[k]).map((k) => {
    const v = f[k];
    const [start, end] = Array.isArray(v) ? v : [v, v];
    return { k, start, end, f };
  });
  // cumprida pela data ou pelo andamento real que o Controle informa
  const status = (st) => (st.end < TODAY || (window.__liveI?.(st.f) ?? -1) >= FEITO[st.k] ? "done" : st.start <= TODAY ? "now" : "todo");

  // ── Estado ──
  const state = { view: "agenda", filtro: "" };
  const filmes = () => C.filmes.filter((f) => !state.filtro || grupo(f) === state.filtro);

  // fechamento: só o que envolve o cliente (correções, masters e margem são trabalho interno)
  const INTERNO = /^(Correções finais|Masters fechados|Margem para imprevistos)$/i;
  C.fechamento = C.fechamento.filter((x) => !INTERNO.test(x.titulo || ""));
  const SITE = "./"; // site dos filmes, na mesma pasta
  const byId = Object.fromEntries(C.filmes.map((f) => [f.id, f]));

  // ── Andamento real, vindo do Controle dos Filmes (planilha pública: coluna A = id, F = status) ──
  // Os mesmos status do Controle; o índice diz até onde o filme já andou.
  const ANDA = [
    ["edicao", "Em edição"], ["v2", "Offline com o cliente"], ["ajustes", "Ajustes do retorno"], ["offline", "Offline aprovado"],
    ["finalizacao", "Em finalização"], ["online", "Online com o cliente"], ["aprovado", "Aprovado"], ["entregue", "Entregue"],
  ];
  const ANDA_I = Object.fromEntries(ANDA.map(([k, l], i) => [l.toLowerCase(), i]));
  const ANTIGO = { "provisório": 0, "em edição": 0, "em revisão": 1, "aprovado": 6 }; // nomes antigos do Controle
  const live = (window.__fbLive = {}); // id do filme no cronograma -> índice de andamento (o menos adiantado do grupo)
  const links = {}; // id do filme no cronograma -> vídeos que já foram para o cliente, com link (as 3 pílulas, a visita…)
  const rel = {}; // id do filme no cronograma -> andamento dos vídeos que já foram para o cliente (o menos adiantado deles)
  const nVer = {}; // id do filme no cronograma -> número da versão mais nova entre os vídeos liberados
  const vez = (id) => rel[id] ?? live[id]; // o que vale para o cliente: o que já foi para ele; antes disso, o andamento do grupo
  const BLOCO_DO_FOT = Object.fromEntries(C.filmes.filter((f) => f.fot).map((f) => [f.fot.id, f.id])); // fotógrafo -> bloco da cidade
  const grupoDoVideo = (vid) => { const g = vid.startsWith("pilula-") ? vid.replace(/^pilula-/, "").replace(/-\d+$/, "") : vid.replace(/^visita-/, ""); return BLOCO_DO_FOT[g] || g; };
  window.__fbCrono = (res) => {
    (res?.table?.rows || []).forEach((r) => {
      const vid = String(r.c?.[0]?.v || "").trim(), st = String(r.c?.[5]?.v || "").trim().toLowerCase();
      const url = String(r.c?.[4]?.v || "").trim();
      const [n, desde] = String(r.c?.[7]?.v || "").split("|"); // coluna H: versão do vídeo e quando ela saiu (o Controle grava)
      if (!vid || vid === "placeholder" || !st) return;
      const i = ANDA_I[st] ?? ANTIGO[st];
      const g = grupoDoVideo(vid);
      if (i == null || !byId[g]) return;
      live[g] = live[g] == null ? i : Math.min(live[g], i);
      // cada vídeo vai para o player do cliente quando o status dele já é de cliente (offline em diante) e tem link
      if (url && i >= 1) {
        (links[g] ||= []).push({ vid, url, titulo: String(r.c?.[2]?.v || ""), duracao: String(r.c?.[3]?.v || "") });
        rel[g] = rel[g] == null ? i : Math.min(rel[g], i);
        if (desde && desde > (REG.desde[g] || "")) REG.desde[g] = desde; // versão nova: o que o cliente fez antes dela não conta
        if (+n > (nVer[g] || 0)) nVer[g] = +n;
      }
    });
    render(); if (focusId) renderFocus(focusId);
    if (pendAssistir) tentaAssistir();
  };
  if (window.VIDEO_SHEET_ID) {
    const sc = document.createElement("script");
    sc.src = `https://docs.google.com/spreadsheets/d/${window.VIDEO_SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:__fbCrono&headers=1&gid=1505415139&t=${Date.now()}`;
    sc.async = true; document.head.append(sc);
  }
  // etapa do cronograma -> andamento mínimo que a dá por cumprida
  const FEITO = { ed: 1, v2: 1, rev: 2, fin: 5, on: 6, ret: 6, ent: 7 };
  const siteLink = (f) => SITE + ({ bloco: `#/escola/${f.id}`, pilula: `#/fotografo/${f.id}`, visita: `#/escola/${f.id}`, documentario: "#/filme/documentario", trailer: "#/filme/trailer" })[f.tipo];
  const AGORA = ["Em edição", "Offline com a Equipe Bradesco · aguardando o retorno", "Retorno recebido · ajustes em andamento", "Ajustes feitos · indo para cor e som", "Em cor e som", "Online para a Equipe Bradesco conferir", "Aprovado", "Entregue"];
  // ── Assistir à versão atual: abre no player do projeto; link do Frame.io abre numa nova janela ──
  const VERSAO = [null, "ao offline", "ao offline", "à versão com os ajustes", "à versão com os ajustes", "ao online", "à versão aprovada", "à versão final"];
  const isFrameio = (u) => /(^|\.)(frame\.io|f\.io)\//i.test(u.replace(/^https?:\/\//, ""));
  function watchBtn(f, dark) {
    const i = rel[f.id], vs = links[f.id] || [];
    const v = (i ?? 0) >= 5 || (!linkBloco(f, "v2") && linkBloco(f, "on")) ? "on" : "v2", lb = linkBloco(f, v);
    if (lb && !(i && vs.length) && tocaNoPlayer(lb)) return `<button type="button" class="watch${dark ? " dark" : ""}${REG.get(f.id, v).aberto ? " ok" : ""}" data-watch="${f.id}" data-url="${esc(lb)}" data-v="${v}" data-abre="${f.id}|${v}"${REG.get(f.id, v).aberto ? TIT_REC : ""}>${REG.get(f.id, v).aberto ? recebidoHTML(f.id, v) : `▶ Assistir ${v === "on" ? "ao online" : "ao offline"}`}</button>`;
    if (lb && !(i && vs.length)) return `<a class="watch${dark ? " dark" : ""}" href="${esc(lb)}" target="_blank" rel="noopener" data-abre="${f.id}|${v}">▶ Assistir ${v === "on" ? "ao online" : "ao offline"} <span aria-hidden="true">↗</span>${isFrameio(lb) ? "<small>abre no Frame.io</small>" : ""}</a>`;
    if (!i || !vs.length) return ""; // antes do offline o cliente não vê nada
    const fio = vs.find((v) => isFrameio(v.url));
    const label = REG.get(f.id, versaoAtual(f)).aberto ? recebidoHTML(f.id, versaoAtual(f)) : `▶ Assistir ${VERSAO[i]}`;
    return fio
      ? `<a class="watch${dark ? " dark" : ""}" href="${esc(fio.url)}" target="_blank" rel="noopener" data-abre="${f.id}|${versaoAtual(f)}">${label} <span aria-hidden="true">↗</span><small>abre no Frame.io</small></a>`
      : `<button type="button" class="watch${dark ? " dark" : ""}${REG.get(f.id, versaoAtual(f)).aberto ? " ok" : ""}" data-watch="${f.id}" data-abre="${f.id}|${versaoAtual(f)}"${REG.get(f.id, versaoAtual(f)).aberto ? TIT_REC : ""}>${label}</button>`;
  }

  // ── Recebimento e aprovação: a Equipe Bradesco abre a versão por aqui (fica registrado que abriu)
  // e, no retorno, marca "Aprovado". Só isso: os comentários continuam pela devolutiva de sempre.
  const REG = window.FB_REGISTRO;
  const tocaNoPlayer = (u) => /vimeo\.com|youtu\.?be|dropbox\.com|\.(mp4|m4v|mov|webm)(\?|#|$)/i.test(u);
  const versaoAtual = (f) => ((vez(f.id) ?? 0) >= 5 ? "on" : "v2");
  const NOME_V = { v2: "o offline", on: "o online" };
  // recebido: o botão diz tudo (a data e que dá para assistir de novo); Shift + clique desfaz
  const recebidoHTML = (id, v) => { const t = REG.get(id, v).aberto; return `<span class="ck" aria-hidden="true"></span>Recebido <small>${t ? dmIso(t) + " · " : ""}assistir de novo</small>`; };
  const TIT_REC = ' title="Assistir de novo (Shift + clique desfaz o recebido)"';
  const dmIso = (t) => dm(iso(new Date(t)));
  const chegou = (f, v) => (vez(f.id) ?? -1) >= (v === "v2" ? 1 : 5) || f[v] <= TODAY || !!f.links?.[v]; // pelo Controle, pela data ou pelo link na agenda
  // link colado pela equipe na agenda (Enviar offline, online, entrega): vale sozinho, sem esperar o andamento do Controle
  const linkBloco = (f, v) => f.links?.[v] || "";
  const disponivel = (f, v) => { if (linkBloco(f, v)) return true; const i = rel[f.id] ?? -1; return !!(links[f.id] || []).length && (v === "v2" ? i >= 1 && i <= 4 : i >= 5); };
  const txtAberto = () => ""; // o estado mora no botão (Assistir / Recebido em dd/mm), sem repetir ao lado
  function recebHTML(f, v, comChip = true, noDia = false) { // noDia: já está no dia da chegada, sem repetir a data
    let acao;
    const lb = linkBloco(f, v);
    const ok = REG.get(f.id, v).aberto;
    if (lb && tocaNoPlayer(lb)) acao = `<button type="button" class="watch sm${ok ? " ok" : ""}" data-watch="${f.id}" data-url="${esc(lb)}" data-v="${v}" data-abre="${f.id}|${v}"${ok ? TIT_REC : ""}>${ok ? recebidoHTML(f.id, v) : `▶ Assistir ${NOME_V[v].replace(/^o /, "ao ")}`}</button>`;
    else if (lb) acao = `<a class="watch sm" href="${esc(lb)}" target="_blank" rel="noopener" data-abre="${f.id}|${v}">${isFrameio(lb) ? "Abrir no Frame.io" : `Abrir ${NOME_V[v]}`} <span aria-hidden="true">↗</span></a>`;
    else if (disponivel(f, v)) {
      const vs = links[f.id], fora = vs.find((x) => isFrameio(x.url)) || vs.find((x) => !tocaNoPlayer(x.url)); // fora do player: abre o link
      acao = fora
        ? `<a class="watch sm" href="${esc(fora.url)}" target="_blank" rel="noopener" data-abre="${f.id}|${v}">${isFrameio(fora.url) ? "Abrir no Frame.io" : `Abrir ${NOME_V[v]}`} <span aria-hidden="true">↗</span></a>`
        : `<button type="button" class="watch sm${ok ? " ok" : ""}" data-watch="${f.id}" data-abre="${f.id}|${v}"${ok ? TIT_REC : ""}>${ok ? recebidoHTML(f.id, v) : `▶ Assistir ${v === "v2" ? "ao offline" : "ao online"}`}</button>`;
    } else acao = `<span class="rc-soon">${chegou(f, v) ? (REG.get(f.id, v).aberto ? "" : "O link chega em breve") : noDia ? "" : `Chega ${wd(f[v])}, ${dm(f[v])}`}</span>`;
    const r = REG.get(f.id, v);
    return `<div class="rc">${comChip ? filmChip(f) : ""}<div class="rc-a">${acao}<span class="rc-st${r.aberto ? " ok" : ""}" data-aberto="${f.id}|${v}">${txtAberto(f, v)}</span></div></div>`;
  }
  // o check de aprovado só aparece quando há uma versão com o cliente para aprovar
  const txtAprova = (v, r) => (r.aprovado ? `Aprovado em ${dmIso(r.quando)}` : `Aprovar ${NOME_V[v]}`);
  function checkHTML(f, v, comChip = true) {
    const r = REG.get(f.id, v);
    if (!r.aprovado && !disponivel(f, v)) return comChip ? `<div class="rc">${filmChip(f)}<span class="rc-soon">A aprovação aparece quando ${NOME_V[v]} chegar</span></div>` : "";
    return `<div class="rc">${comChip ? filmChip(f) : ""}<label class="aprova${r.aprovado ? " on" : ""}"><input type="checkbox" data-aprova="${f.id}|${v}"${r.aprovado ? " checked" : ""}><span class="box" aria-hidden="true"></span><span class="txt">${txtAprova(v, r)}</span></label></div>`;
  }
  // a versão da vez, com o check logo abaixo (ficha, destaque e cartões)
  function acaoHTML(f, dark) {
    const v = versaoAtual(f);
    if (!chegou(f, v)) return "";
    const n = nVer[f.id], ap = checkHTML(f, v, false);
    const share = disponivel(f, v) ? `<button type="button" class="share" data-share="${f.id}|${v}"><span aria-hidden="true">↗</span> Compartilhar com a equipe</button>` : "";
    return `<div class="acao${dark ? " dark" : ""}"><p class="acao-k">${v === "v2" ? "Offline" : "Online"} para a Equipe Bradesco${n > 1 ? ` <span class="nova-v">Versão ${n}</span>` : ""}</p>${recebHTML(f, v, false)}${share}`
      + (ap ? `<div class="acao-ap">${ap}<small>Assistiu e está tudo certo? Aprove aqui. Ajustes seguem pela devolutiva de sempre.</small></div>` : "") + `</div>`;
  }
  // atualiza o que já está na tela, sem redesenhar (a ficha aberta continua aberta)
  function pintaRegistro() {
    document.querySelectorAll("[data-aprova]").forEach((c) => {
      const [id, v] = c.dataset.aprova.split("|"), r = REG.get(id, v), l = c.closest(".aprova");
      c.checked = !!r.aprovado; l.classList.toggle("on", !!r.aprovado);
      l.querySelector(".txt").textContent = txtAprova(v, r);
    });
    document.querySelectorAll("[data-aberto]").forEach((n) => {
      const [id, v] = n.dataset.aberto.split("|"); if (!byId[id]) return;
      n.textContent = txtAberto(byId[id], v); n.classList.toggle("ok", !!REG.get(id, v).aberto);
    });
  }
  // ── Avisos em todas as visualizações: o estado de cada etapa e a bandeja "pra resolver" embaixo ──
  // ok = feito · todo = pra fazer agora · late = passou do prazo · new = versão nova ainda não aberta
  function estadoEv(e) {
    const f = e.f; if (!f) return "";
    if (e.k === "rev") { const r = REG.get(f.id, "v2"); return r.aprovado ? "ok" : enviado(f, "v2") ? (f.rev < TODAY ? "late" : "todo") : ""; }
    if (e.k === "ret") { const r = REG.get(f.id, "on"); return r.aprovado ? "ok" : enviado(f, "on") ? (f.ret < TODAY ? "late" : "todo") : ""; }
    if (e.k === "ent") return (live[f.id] ?? -1) >= 7 ? "ok" : "";
    if (e.k === "v2" || e.k === "on") return REG.get(f.id, e.k).aberto ? "ok" : disponivel(f, e.k) ? "new" : "";
    return "";
  }
  // enviada de fato: pelo Controle (a data sozinha não conta; se passou e não foi, o atraso é nosso)
  const enviado = (f, v) => (vez(f.id) ?? -1) >= (v === "v2" ? 1 : 5);
  const ROT_EST = { ok: "Feito", todo: "Pra fazer", late: "Atrasado", new: "Novo" };
  function pendencias() {
    const assistir = [], aprovar = [], chegando = [];
    C.filmes.forEach((f) => {
      ["v2", "on"].forEach((v) => {
        const r = REG.get(f.id, v);
        if (disponivel(f, v) && !r.aberto) assistir.push({ f, v });
        if (enviado(f, v) && !r.aprovado && (v === "on" || versaoAtual(f) === "v2")) {
          const prazo = v === "v2" ? f.rev : f.ret || C.fim;
          aprovar.push({ f, v, prazo, late: prazo < TODAY });
        }
      });
      const prox = !enviado(f, "v2") ? ["v2", f.v2] : !enviado(f, "on") ? ["on", f.on] : null; // o próximo recebimento
      if (prox && (D(prox[1]) - D(TODAY)) / 864e5 <= 7) chegando.push({ f, v: prox[0], quando: prox[1], tarde: prox[1] < TODAY });
    });
    aprovar.sort((a, b) => a.prazo.localeCompare(b.prazo));
    chegando.sort((a, b) => a.quando.localeCompare(b.quando));
    return { aprovar, assistir, chegando };
  }
  const tray = document.createElement("div"); tray.className = "tray"; document.body.append(tray);
  let trayAba = null;
  const TRAY = { aprovar: "Para aprovar", assistir: "Para assistir", chegando: "Chegando nos próximos 7 dias" };
  function renderTray() {
    const P = pendencias();
    if (trayAba && !P[trayAba].length) trayAba = null;
    // itens com o mesmo prazo (ou a mesma chegada) ficam juntos, com o texto uma vez só
    const grupos = (lista, chave) => { const m = new Map(); lista.forEach((x) => { const k = chave(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return [...m.entries()]; };
    const V = (v) => (v === "v2" ? "Offline" : "Online");
    const rows = !trayAba ? ""
      : trayAba === "aprovar" ? grupos(P.aprovar, (x) => `${V(x.v)} · ${x.late ? "atrasado, era até" : "até"} ${wd(x.prazo)}, ${dm(x.prazo)}|${x.late ? 1 : 0}`).map(([k, g]) =>
          `<div class="tr-row${k.endsWith("|1") ? " late" : ""}"><span class="tr-prazo">${k.split("|")[0]}</span><div class="rcs">${g.map((x) => checkHTML(x.f, x.v)).join("")}</div></div>`).join("")
      : trayAba === "assistir" ? P.assistir.map((x) => `<div class="tr-row">${recebHTML(x.f, x.v)}</div>`).join("")
      : grupos(P.chegando, (x) => `${V(x.v)} ${x.tarde ? `prevista para ${dm(x.quando)} · chega em breve` : `chega ${wd(x.quando)}, ${dm(x.quando)}`}`).map(([k, g]) =>
          `<div class="tr-row"><span class="tr-prazo">${k}</span><div class="films">${g.map((x) => filmChip(x.f)).join("")}</div></div>`).join("");
    const abas = [["aprovar", "Para aprovar", P.aprovar.some((x) => x.late)], ["assistir", "Para assistir"], ["chegando", "Chegando"]];
    tray.innerHTML = (trayAba ? `<div class="tray-sheet" role="region" aria-label="${TRAY[trayAba]}"><div class="tray-h"><b>${TRAY[trayAba]}</b><button type="button" class="tray-x" aria-label="Fechar">×</button></div><div class="tray-list">${rows}</div></div>` : "")
      + (abas.some(([k]) => P[k].length) ? `<div class="tray-bar">${abas.filter(([k]) => P[k].length).map(([k, l, late]) => `<button type="button" class="tray-tab${trayAba === k ? " on" : ""}${late ? " late" : ""}" data-aba="${k}" aria-expanded="${trayAba === k}"><span class="tray-n">${P[k].length}</span>${l}</button>`).join("")}</div>` : "");
  }
  tray.addEventListener("click", (e) => {
    const t = e.target.closest("[data-aba]");
    if (t) { trayAba = trayAba === t.dataset.aba ? null : t.dataset.aba; renderTray(); return; }
    if (e.target.closest(".tray-x") || e.target.closest('a[href^="#filme/"]')) { trayAba = null; renderTray(); }
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && trayAba) { trayAba = null; renderTray(); } });
  // registro novo: atualiza a bandeja e as marcas (sem redesenhar se houver uma ficha aberta)
  document.addEventListener("fb:registro", () => { pintaRegistro(); renderTray(); if (!$(".peek") && !focusId) render(); repintaPeek(); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-abre]"); if (!a) return;
    const [id, v] = a.dataset.abre.split("|"), novo = !REG.get(id, v).aberto;
    if (e.shiftKey && !novo) { // Shift + clique no Recebido: volta a ser como se não tivesse recebido
      e.preventDefault(); e.stopImmediatePropagation();
      REG.registra(id, v, "naoaberto");
      requestAnimationFrame(() => { render(); if (focusId) renderFocus(focusId); repintaPeek(); toast("Recebido desfeito"); });
      return;
    }
    REG.registra(id, v, "aberto");
    if (novo) requestAnimationFrame(() => document.querySelectorAll(`.watch[data-abre="${CSS.escape(a.dataset.abre)}"]`).forEach((b) => { b.classList.add("ok", "vira"); b.innerHTML = recebidoHTML(id, v); b.title = "Assistir de novo (Shift + clique desfaz o recebido)"; }));
  }, true);
  // compartilhar com a equipe: link que abre este filme já com o player
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-share]"); if (!b) return;
    const [id, v] = b.dataset.share.split("|"), f = byId[id]; if (!f) return;
    const prazo = v === "v2" ? f.rev : f.ret, url = `${location.origin}${location.pathname}#filme/${id}/assistir`;
    const text = `${v === "v2" ? "Offline" : "Online"} de ${nomeFilme(f)} para conferência${prazo ? `. Retorno até ${wd(prazo)}, ${dm(prazo)}` : ""}.`;
    if (navigator.share) { try { await navigator.share({ title: `Fundação Bradesco 70 anos · ${nomeFilme(f)}`, text, url }); return; } catch (err) { if (err?.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); toast("Link copiado: é só mandar para a equipe"); }
    catch { prompt("Copie o link:", url); }
  });
  // link direto para assistir (#filme/<id>/assistir): abre o player assim que os links chegam
  let pendAssistir = null;
  function tentaAssistir() {
    const id = pendAssistir, f = byId[id]; if (!f || !window.FBPlayer) return;
    const v = versaoAtual(f), lb = linkBloco(f, v);
    if ((links[id] || []).length) { pendAssistir = null; REG.registra(id, v, "aberto"); assistir(id); }
    else if (lb && tocaNoPlayer(lb)) { pendAssistir = null; REG.registra(id, v, "aberto"); assistir(id, lb, v); }
  }
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-aprova]"); if (!c) return;
    const [id, v] = c.dataset.aprova.split("|");
    REG.registra(id, v, c.checked ? "aprovado" : "desmarcado");
    toast(c.checked ? `${v === "v2" ? "Offline" : "Online"} aprovado. Obrigado!` : "Aprovação desmarcada");
  });
  const CROP = /[?&]4x3\b/.test(location.search) ? { crop: "4:3" } : {}; // teste: com ?4x3 no endereço, o player mostra só o miolo 4:3 do 16:9
  function assistir(id, url, v) {
    const f = byId[id], vs = links[id] || [], i = rel[id];
    if (!f || !window.FBPlayer) return;
    if (url) return window.FBPlayer.open([{ titulo: nomeFilme(f), kicker: `${f.nome} · ${v === "on" ? "online" : "offline"}`, url, cor: "var(--purple)" }], 0, CROP); // link colado na agenda
    if (!vs.length) return;
    const ord = vs.slice().sort((a, b) => a.vid.localeCompare(b.vid));
    window.FBPlayer.open(ord.map((v) => ({ titulo: v.titulo || nomeFilme(f), kicker: `${f.nome} · ${VERSAO[i].replace(/^(à|ao) /, "")}`, duracao: v.duracao, url: v.url, cor: "var(--purple)" })), 0, CROP);
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-watch]"); if (b) { e.preventDefault(); assistir(b.dataset.watch, b.dataset.url, b.dataset.v); } });

  function liveBox(f, dark, comBotao = true) {
    const i = vez(f.id); // o que já foi para o cliente vale (uma pílula ainda em edição não esconde a visita entregue)
    if (i == null) return "";
    const txt = i === 0 ? `Preparando o offline · chega ${wd(f.v2)}, ${dm(f.v2)}` : AGORA[i];
    return `<div class="live${dark ? " dark" : ""}"><span class="live-dot" style="--c:${["var(--c-v2)", "var(--c-v2)", "var(--c-rev)", "var(--c-fin)", "var(--c-fin)", "var(--c-on)", "var(--c-fim)", "var(--c-fim)"][i]}"></span><span><small>Agora</small>${esc(txt)}</span>${comBotao ? watchBtn(f, dark) : ""}</div>`;
  }

  // ── Topo ──
  document.querySelectorAll('[data-bind="fim"]').forEach((n) => (n.textContent = `${wd(C.fim)}, ${dm(C.fim)}`));
  document.querySelectorAll('[data-bind="feriados"]').forEach((n) => (n.textContent = Object.entries(C.feriados).map(([d, nome]) => `${dm(d)} ${nome}`).join(", ")));
  document.querySelectorAll('[data-bind="atualizado"]').forEach((n) => (n.textContent = dm(C.atualizado) + "/" + C.atualizado.slice(0, 4)));
  $(".confetti").innerHTML = "86,14,y 93,27,r 78,58,b 95,66,p 89,82,o 4,88,r 12,94,y"
    .split(" ").map((t) => { const [x, y, c] = t.split(","); return `<i style="left:${x}%;top:${y}%;--c:var(--${{ y: "yellow", r: "red", b: "blue", p: "purple", o: "orange" }[c]})"></i>`; }).join("");

  function stats() {
    const nextV2 = C.filmes.filter((f) => f.v2 >= TODAY).sort((a, b) => a.v2.localeCompare(b.v2))[0];
    // o próximo retorno da Equipe Bradesco: do offline ou do online, o que vier antes
    const nextRev = C.filmes.flatMap((f) => ["rev", "ret"].filter((k) => f[k] >= TODAY).map((k) => ({ ...f, rev: f[k] }))).sort((a, b) => a.rev.localeCompare(b.rev))[0];
    const recebidos = C.filmes.filter((f) => f.v2 < TODAY).length;
    const entregues = C.filmes.filter((f) => (live[f.id] ?? -1) >= 7).length;
    $("#stats").innerHTML = `
      <div><dt>Vídeos</dt><dd>41<small>33 pílulas · 6 visitas · doc · trailer</small></dd></div>
      <div><dt>Próximo offline</dt><dd>${nextV2 ? `${dm(nextV2.v2)}<small>${esc(nomeFilme(nextV2))}</small>` : "Todos entregues"}</dd></div>
      <div><dt>Próximo retorno da Equipe Bradesco</dt><dd>${nextRev ? `${dm(nextRev.rev)}<small>${esc(nomeFilme(nextRev))}</small>` : "—"}</dd></div>
      <div><dt>Prazo final</dt><dd>${dm(C.fim)}<small>${entregues ? `${entregues} de ${C.filmes.length} entregas feitas` : `${recebidos} de ${C.filmes.length} filmes já no offline`}</small></dd></div>`;
  }
  stats();

  // como cada filme anda
  $("#steps").innerHTML = ["v2", "rev", "fin", "on", "ret", "ent"].map((k) => {
    const s = STEP[k];
    const desc = k === "ent" ? `${s.desc}. Todos os 41 até ${dm(C.fim)}` : s.desc; // o prazo final vai junto da entrega: um card a menos
    return `<li class="${s.you ? "you" : ""}${s.bar ? " range" : ""}" style="--c:${s.c}"><i></i><strong>${esc(s.label)}${s.you ? TAG_EQUIPE : ""}</strong><span>${esc(desc)}</span></li>`;
  }).join("");

  // ── Eventos pontuais (agenda e calendário) ──
  function eventos() {
    const ev = [];
    filmes().forEach((f) => ["v2", "rev", "on", "ret", "ent"].forEach((k) => f[k] && ev.push({ date: f[k], k, f })));
    C.fechamento.forEach((x) => ev.push({ date: x.data, k: "fecho", x }));
    const ordem = (e) => (e.k === "fecho" ? 99 : ORDER.indexOf(e.k)); // no mesmo dia, na ordem do fluxo
    return ev.sort((a, b) => a.date.localeCompare(b.date) || ordem(a) - ordem(b));
  }
  const evColor = (e) => (e.k === "fecho" ? (e.x.cliente ? "var(--c-rev)" : e.x.marco ? "var(--c-fim)" : "var(--ink-3)") : STEP[e.k].c);
  const evYou = (e) => (e.k === "fecho" ? !!e.x.cliente : !!STEP[e.k].you);
  const link = (f) => `<a href="#filme/${f.id}">${esc(nomeFilme(f))}</a>`;
  const curto = (f) => (f.tipo === "bloco" || f.tipo === "visita" ? f.nome.replace(/^Fazenda /, "").split(/ dos? /)[0] : f.tipo === "pilula" ? f.nome : f.tipo === "trailer" ? "Trailer" : "Documentário");
  const filmTitle = (f) => (f.tipo === "pilula" || f.tipo === "visita" || f.tipo === "bloco" ? f.nome : nomeFilme(f).split(" · ")[0]);
  const filmSub = (f) => ({ bloco: `+ ${f.fot?.nome} · visita e 3 pílulas`, pilula: "3 pílulas", visita: `Visita${f.uf ? ` · ${f.uf}` : ""}`, documentario: "15 min", trailer: "2 min" })[f.tipo];
  const filmChip = (f) => `<a class="film" href="#filme/${f.id}" data-peek="${f.id}" aria-expanded="false"><b>${esc(filmTitle(f))}</b><small>${esc(filmSub(f))}</small></a>`;

  // ── Agenda: semana a semana ──
  // um dia: a mesma etapa vira um item só, com o rótulo uma vez e os filmes embaixo (agenda e calendário)
  function itensDoDia(list) {
    const groups = new Map();
    list.forEach((e) => { const k = e.k === "fecho" ? "fecho:" + e.x.titulo : e.k; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
    const items = [...groups.values()].map((g) => {
      const e = g[0];
      if (e.k === "fecho") {
        const checks = e.x.cliente ? `<div class="rcs duas">${filmes().map((f) => checkHTML(f, "on")).join("")}</div>` : ""; // retorno técnico: o check de cada online
        return `<li class="item${e.x.cliente ? " you" : ""}" style="--c:${evColor(e)}"><i></i><div><strong>${esc(e.x.titulo)}${e.x.cliente ? TAG_EQUIPE : ""}</strong><p>${esc(e.x.texto)}${e.x.fim ? ` Até ${dm(e.x.fim)}.` : ""}</p>${checks}</div></li>`;
      }
      const s = STEP[e.k];
      // o filme em destaque; a etapa vira um rótulo pequeno em cima.
      // offline e online são recebimentos (abrir a versão); o retorno do offline tem o check de aprovado.
      const receb = e.k === "v2" || e.k === "on";
      const rcs = "rcs"; // um filme por linha, a ação na ponta
      const corpo = receb ? `<div class="${rcs}">${g.map((x) => recebHTML(x.f, e.k, true, true)).join("")}</div>`
        : e.k === "rev" ? `<div class="${rcs}">${g.map((x) => checkHTML(x.f, "v2")).join("")}</div>`
        : e.k === "ret" ? `<div class="${rcs}">${g.map((x) => checkHTML(x.f, "on")).join("")}</div>`
        : e.k === "ent" && g.some((x) => linkBloco(x.f, "ent")) ? `<div class="${rcs}">${g.map((x) => `<div class="rc">${filmChip(x.f)}<div class="rc-a">${linkBloco(x.f, "ent") ? `<a class="watch sm" href="${esc(linkBloco(x.f, "ent"))}" target="_blank" rel="noopener">Abrir a versão final <span aria-hidden="true">↗</span></a>` : ""}</div></div>`).join("")}</div>`
        : `<div class="films">${g.map((x) => filmChip(x.f)).join("")}</div>`;
      return `<li class="item${s.you ? " you" : ""}${receb ? " receb" : ""}" style="--c:${s.c}"><i></i><div><span class="step-k">${esc(s.label)}${s.you ? TAG_EQUIPE : ""}${g.some((x) => estadoEv(x) === "late") ? '<span class="st-tag st-late">Atrasado</span>' : ""}</span>${corpo}</div></li>`;
    }).join("");
    return items;
  }
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
        const items = itensDoDia(byDay.get(d));
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
      bar(f.fin[0], f.fin[1], STEP.fin.c, `Som, cor e finalização · ${dm(f.fin[0])} a ${dm(f.fin[1])}`) +
      ["v2", "rev", "on", "ret", "ent"].filter((k) => f[k]).map((k) => { const st = estadoEv({ k, f }); return dot(f[k], STEP[k].c, `${STEP[k].label} · ${wd(f[k])} ${dm(f[k])}${st ? ` · ${ROT_EST[st]}` : ""}`, st ? `st-${st}` : ""); }).join(""));
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
      ${["v2", "rev"].map((k) => `<span><i style="--c:${STEP[k].c}"></i>${STEP[k].label}</span>`).join("")}
      <span><i class="bar" style="--c:${STEP.fin.c}"></i>${STEP.fin.label}</span>
      <span><i style="--c:${STEP.on.c}"></i>${STEP.on.label}</span>
      <span><i style="--c:${STEP.ret.c}"></i>${STEP.ret.label}</span>
      <span><i style="--c:var(--c-fim)"></i>${STEP.ent.label}</span></div>`;
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
    const label = (e) => (e.k === "fecho" ? e.x.titulo : `${STEP[e.k].short} · ${curto(e.f)}`);
    const longo = (e) => (e.k === "fecho" ? e.x.titulo : `${STEP[e.k].label} · ${nomeFilme(e.f)}`);
    // só as semanas do projeto, numa grade contínua (seg a dom; fim de semana mais estreito)
    const first = D(C.inicio), last = D(C.fim);
    // semana começando no domingo
    const mon = addDays(first, -first.getDay()), sun = addDays(last, 6 - last.getDay());
    let cells = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((w) => `<div class="wd">${w}</div>`).join("");
    for (let dt = new Date(mon); dt <= sun; dt = addDays(dt, 1)) {
      const s = iso(dt), d = dt.getDate();
      const list = byDay.get(s) || [];
      const out = s < C.inicio || s > C.fim;
      const max = 4;
      const num = d === 1 || s === iso(mon) ? `${d} <small>${MES[dt.getMonth()].slice(0, 3)}</small>` : d;
      const sts = list.map(estadoEv);
      const lis = list.slice(0, max).map((e, i) => `<li class="${evYou(e) ? "you" : ""}${sts[i] ? ` st-${sts[i]}` : ""}" style="--c:${evColor(e)}"${sts[i] ? ` title="${ROT_EST[sts[i]]}"` : ""}><i></i><span title="${esc(longo(e))}">${esc(label(e))}</span></li>`).join("");
      const marca = sts.includes("late") ? " has-late" : sts.includes("todo") || sts.includes("new") ? " has-todo" : "";
      const cls = ["cell" + marca, out ? "out" : "", isOff(dt) ? "we" : "", C.feriados[s] ? "hol" : "", s === TODAY ? "today" : "", s < TODAY ? "past" : "", s === selDay ? "sel" : ""].join(" ");
      const inner = `<span class="n">${num}</span>${C.feriados[s] ? `<span class="hn">${esc(C.feriados[s])}</span>` : ""}<ul>${lis}</ul>${list.length > max ? `<span class="more">+${list.length - max}</span>` : ""}<span class="dots">${list.map((e) => `<i style="--c:${evColor(e)}"></i>`).join("")}</span>`;
      cells += list.length ? `<button class="${cls}" data-day="${s}" aria-label="${d} de ${MES[dt.getMonth()]}: ${list.length} itens">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
    }
    const cap = (t) => t[0].toUpperCase() + t.slice(1);
    const anos = first.getFullYear() === last.getFullYear() ? `${cap(MES[first.getMonth()])} a ${MES[last.getMonth()]} de ${last.getFullYear()}` : `${cap(MES[first.getMonth()])} de ${first.getFullYear()} a ${MES[last.getMonth()]} de ${last.getFullYear()}`;
    const html = `<section class="month"><h3>${anos}</h3><div class="cal">${cells}</div></section>`;
    return `<p class="hint" style="margin:0 0 14px">Clique num dia para ver tudo o que acontece nele.</p><div class="months">${html}</div>`;
  }

  // ── Por filme ──
  function trackHTML(f) {
    const steps = stepsOf(f).filter((s) => s.k !== "ed"); // para o cliente, tudo começa no offline
    const next = steps.find((s) => status(s) !== "done");
    return `<ol class="track">${steps.map((s) => {
      const st = STEP[s.k], stt = status(s);
      const when = s.start === s.end ? `${wd(s.start)} ${dm(s.start)}` : `${dm(s.start)} a ${dm(s.end)}`;
      return `<li class="${stt === "done" ? "done" : ""}${s === next ? " next" : ""}${st.you ? " you" : ""}" style="--c:${st.c}"><i></i><span>${esc(st.label)}${st.you ? TAG_EQUIPE : ""}</span><time>${when}</time></li>`;
    }).join("")}${f.ent ? "" : `<li style="--c:var(--c-fim)"><i></i><span>Prazo final</span><time>${wd(C.fim)} ${dm(C.fim)}</time></li>`}</ol>`;
  }
  // ── Por entrega: um filme por linha (nome, onde está, a próxima data e a ação); a ficha abre no painel ──
  const AGORA_CURTO = ["Em edição", "Offline com a equipe", "Ajustes do retorno", "Indo para cor e som", "Em cor e som", "Online com a equipe", "Aprovado", "Entregue"];
  const COR_I = ["var(--c-ed)", "var(--c-v2)", "var(--c-rev)", "var(--c-fin)", "var(--c-fin)", "var(--c-on)", "var(--c-fim)", "var(--c-fim)"];
  function proxima(f) { // a próxima coisa que importa para a Equipe Bradesco
    const late = (d) => d < TODAY;
    if (!enviado(f, "v2")) return { t: f.v2 <= TODAY ? "Offline chega em breve" : `Offline chega ${wd(f.v2)}, ${dm(f.v2)}` }; // a data sozinha não conta
    if (!REG.get(f.id, "v2").aprovado && versaoAtual(f) === "v2") return { t: `${late(f.rev) ? "Retorno atrasado, era" : "Retorno até"} ${wd(f.rev)}, ${dm(f.rev)}`, late: late(f.rev), you: 1 };
    if (!enviado(f, "on")) return { t: f.on <= TODAY ? "Online chega em breve" : `Online ${wd(f.on)}, ${dm(f.on)}` };
    if (!REG.get(f.id, "on").aprovado) return { t: `${late(f.ret) ? "Retorno atrasado, era" : "Retorno até"} ${wd(f.ret)}, ${dm(f.ret)}`, late: late(f.ret), you: 1 };
    return f.ent ? { t: `Entrega ${wd(f.ent)}, ${dm(f.ent)}` } : { t: "Aprovado" };
  }
  function viewFilmes() {
    const grupos = [["Cidade + fotógrafo · visita e 3 pílulas", (f) => f.tipo === "bloco" || f.tipo === "visita"], ["Só pílulas · pack de 3", (f) => f.tipo === "pilula"], ["Documentário e trailer", (f) => f.tipo === "documentario" || f.tipo === "trailer"]];
    return grupos.map(([titulo, ok]) => {
      const L = filmes().filter(ok); if (!L.length) return "";
      return `<section class="frows"><h3 class="frows-h">${titulo}</h3><ul>${L.map((f) => {
        const i = vez(f.id), p = proxima(f), v = versaoAtual(f), acao = disponivel(f, v) ? recebHTML(f, v, false, true) : "";
        return `<li class="frow" id="row-${f.id}" style="--c:${COR_I[i ?? 0]}">
          <a class="fr-n" href="#filme/${f.id}" data-peek="${f.id}"><b>${esc(f.tipo === "bloco" ? f.nome : filmTitle(f))}</b><small>${esc(filmSub(f))}</small></a>
          <span class="fr-st"><i></i>${esc(AGORA_CURTO[i ?? 0])}${nVer[f.id] > 1 ? ` <em>v${nVer[f.id]}</em>` : ""}</span>
          <span class="fr-p${p.late ? " late" : ""}${p.you ? " you" : ""}">${esc(p.t)}</span>
          <span class="fr-a">${acao}</span></li>`;
      }).join("")}</ul></section>`;
    }).join("");
  }

  // filmes que chegam no mesmo pacote (pílulas do fotógrafo + visita da escola dele)
  const parceiros = (f) => C.filmes.filter((x) => x !== f && (x.junto === f.id || f.junto === x.id));
  const juntoHTML = (f) => { const p = parceiros(f); return p.length ? `<p class="junto">Chega junto com ${p.map((x) => `<a href="#filme/${x.id}">${esc(nomeFilme(x))}</a>`).join(" e ")}</p>` : ""; };

  // ── Destaque de um filme (link enviado com o offline) ──
  let focusId = null;
  function renderFocus(id) {
    focusId = id;
    const box = $("#focus");
    const f = C.filmes.find((x) => x.id === id);
    if (!f) { box.hidden = true; return; }
    const chegou = f.v2 <= TODAY || (vez(f.id) ?? 0) >= 1; // pela data ou pelo Controle
    box.hidden = false;
    box.innerHTML = `<div class="focus-box">
      <p class="k">${chegou ? "O offline chegou" : `Offline em ${dm(f.v2)}`}</p>
      <h2>${esc(nomeFilme(f))}</h2>
      ${juntoHTML(f)}${liveBox(f, true, false)}${acaoHTML(f, true)}
      <p class="s">${chegou ? `Precisamos do retorno da Equipe Bradesco até <b>${wd(f.rev)}, ${dm(f.rev)}</b>, numa devolutiva única. Depois disso o filme segue para som, cor e finalização.` : `O offline chega ${WDL[D(f.v2).getDay()]}, ${dm(f.v2)}. O retorno da Equipe Bradesco fica para ${dm(f.rev)}.`}</p>
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
      ${acaoHTML(f) || `<div class="peek-acts"><span class="soon">O offline chega ${wd(f.v2)}, ${dm(f.v2)}</span></div>`}
      <div class="peek-acts"><button class="copy" data-copy="${f.id}" type="button">Copiar o link deste filme</button></div>
    </div></div>`;
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ficha em painel lateral (no celular, uma folha de baixo): a lista continua atrás, e sai pelo ×, Esc ou clique fora
  function closePeek(p) {
    if (!p) return;
    p.classList.remove("open"); document.documentElement.classList.remove("peek-aberta");
    document.querySelectorAll(`[data-peek][aria-expanded="true"]`).forEach((c) => { c.setAttribute("aria-expanded", "false"); c.classList.remove("on"); });
    document.querySelectorAll(".cell.sel").forEach((c) => c.classList.remove("sel"));
    const volta = p._chip; setTimeout(() => p.remove(), reduce ? 0 : 380);
    if (volta?.isConnected) volta.focus({ preventScroll: true });
  }
  // um dia do calendário no mesmo painel: o que acontece nele, em lista
  function abreDia(btn) {
    const s = btn.dataset.day, evs = eventos().filter((e) => e.date === s);
    const old = $(".peek"); const same = old && old.dataset.dia === s; closePeek(old); if (same || !evs.length) return;
    const p = document.createElement("div"); p.className = "peek"; p.dataset.dia = s; p._chip = btn;
    p.setAttribute("role", "dialog"); p.setAttribute("aria-modal", "true"); p.setAttribute("aria-label", `${WDL[D(s).getDay()]}, ${dm(s)}`);
    p.innerHTML = `<div class="peek-in"><div class="peek-card"><button class="peek-x" type="button" aria-label="Fechar">×</button><p class="k">${s === TODAY ? "Hoje" : s < TODAY ? "Já passou" : "Próximo"}</p><h4>${WDL[D(s).getDay()]}, ${dm(s)}</h4><ul class="items">${itensDoDia(evs)}</ul></div></div>`;
    p.addEventListener("click", (e) => { if (e.target === p || e.target.closest(".peek-x")) closePeek(p); });
    document.body.append(p); btn.classList.add("sel");
    requestAnimationFrame(() => requestAnimationFrame(() => { p.classList.add("open"); document.documentElement.classList.add("peek-aberta"); p.querySelector(".peek-x")?.focus({ preventScroll: true }); }));
  }
  function repintaPeek() {
    const p = $(".peek.open"); if (!p) return;
    if (byId[p.dataset.for]) p.querySelector(".peek-in").outerHTML = peekHTML(byId[p.dataset.for]);
    else if (p.dataset.dia) p.querySelector(".items").innerHTML = itensDoDia(eventos().filter((e) => e.date === p.dataset.dia));
  }
  function openPeek(chip, id) {
    const f = byId[id]; if (!f) return;
    const old = $(".peek");
    const same = old && old.dataset.for === id;
    closePeek(old);
    if (same) return;
    const p = document.createElement("div");
    p.className = "peek"; p.dataset.for = id; p._chip = chip; p.innerHTML = peekHTML(f);
    p.setAttribute("role", "dialog"); p.setAttribute("aria-modal", "true"); p.setAttribute("aria-label", nomeFilme(f));
    p.addEventListener("click", (e) => { if (e.target === p || e.target.closest(".peek-x")) closePeek(p); });
    document.body.append(p);
    if (chip.matches("[data-peek]")) { chip.setAttribute("aria-expanded", "true"); chip.classList.add("on"); }
    requestAnimationFrame(() => requestAnimationFrame(() => { p.classList.add("open"); document.documentElement.classList.add("peek-aberta"); p.querySelector(".peek-x")?.focus({ preventScroll: true }); }));
  }

  // ── Render e navegação ──
  const VIEWS = { agenda: viewAgenda, linha: viewLinha, calendario: viewCalendario, filmes: viewFilmes };
  function render() {
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === state.view)));
    document.querySelectorAll(".filters button").forEach((b) => b.classList.toggle("on", b.dataset.f === state.filtro));
    $("#view").innerHTML = VIEWS[state.view]();
    renderTray();
  }
  function route() {
    closePeek($(".peek"));
    let [, a, b, c] = (location.hash || "#agenda").split(/[#/]/);
    if (a === "filme") {
      b = BLOCO_DO_FOT[b] || b; // link antigo de uma pílula: abre o bloco da cidade
      renderFocus(b);
      if (c === "assistir") { pendAssistir = b; setTimeout(tentaAssistir, 0); }
      state.view = "filmes"; render();
      const card = $(`#row-${CSS.escape(b || "")}`);
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
  document.addEventListener("click", async (e) => {
    if (!e.target.closest?.("#view, .peek")) return;
    const fl = e.target.closest('a[href^="#filme/"]');
    if (fl && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); openPeek(fl, fl.getAttribute("href").slice(7).split("/")[0]); return; }
    const day = e.target.closest("[data-day]");
    if (day) { abreDia(day); return; }
    const cp = e.target.closest("[data-copy]");
    if (cp) {
      const url = `${location.origin}${location.pathname}#filme/${cp.dataset.copy}`;
      try { await navigator.clipboard.writeText(url); toast("Link copiado: é só mandar junto com o offline"); }
      catch { prompt("Copie o link:", url); }
    }
  });
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2400); }
  addEventListener("keydown", (e) => { if (e.key === "Escape") closePeek($(".peek")); });
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
      if (Array.isArray(n.fechamento) && n.fechamento.length) C.fechamento = n.fechamento; // os cards internos saem no boot()
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
