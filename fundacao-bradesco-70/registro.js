// Registro da Equipe Bradesco no cronograma: quando abriu cada versão e o check de aprovado.
// Grava num Formulário Google de uma pergunta ("Registro"), ligado à planilha do Controle; as respostas
// caem na aba "Registro" (coluna B = "filme|versão|ação|quando"), que o cronograma, o site e o Controle leem.
// Sem o formulário configurado, o registro fica só neste navegador e é enviado assim que ele existir.
window.FB_REGISTRO = Object.assign({
  form: "https://docs.google.com/forms/d/e/1FAIpQLSejkPSJC-PGmscTZfHXvpDjuFv-I-ueN87XFn1cj9OsOUmwTg/formResponse",
  entry: "entry.1784937357", // a pergunta "Registro"
  aba: "Registro",
}, window.FB_REGISTRO);

(function () {
  const R = window.FB_REGISTRO, sheet = window.VIDEO_SHEET || window.VIDEO_SHEET_ID;
  const ev = {}; // "filme|versão" -> todos os eventos, para valer só o que veio depois da versão atual
  R.desde = R.desde || {}; // filme -> quando saiu a versão atual (o cronograma lê da planilha; sem isso, vale tudo)
  const KEY = "fb-registro";
  let fila = []; try { fila = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
  const guarda = () => { try { localStorage.setItem(KEY, JSON.stringify(fila.slice(-300))); } catch {} };
  const avisa = () => document.dispatchEvent(new CustomEvent("fb:registro"));

  function aplica(e) {
    if (!e || !e.f || !e.v || !e.t) return;
    const l = (ev[`${e.f}|${e.v}`] ||= []);
    if (!l.some((x) => x.a === e.a && x.t === e.t)) l.push(e);
  }
  fila.forEach(aplica);

  function envia() {
    if (!R.form || !R.entry) return;
    fila.filter((e) => !e.ok).forEach((e) => {
      e.ok = 1;
      fetch(R.form, { method: "POST", mode: "no-cors", body: new URLSearchParams({ [R.entry]: [e.f, e.v, e.a, e.t].join("|") }) })
        .catch(() => { e.ok = 0; guarda(); });
    });
    guarda();
  }

  // aberto: vale a primeira vez desde a versão atual; aprovado: vale o último check (marcar ou desmarcar) desde a versão atual
  R.get = (f, v) => {
    const d = R.desde[f] || "", r = {};
    (ev[`${f}|${v}`] || []).filter((e) => e.t >= d).sort((a, b) => a.t.localeCompare(b.t)).forEach((e) => {
      if (e.a === "aberto") r.aberto ||= e.t;
      else if (e.a === "naoaberto") delete r.aberto; // desfeito (Shift + clique no Recebido)
      else if (e.a === "aprovado" || e.a === "desmarcado") { r.aprovado = e.a === "aprovado"; r.t = e.t; if (r.aprovado) r.quando = e.t; }
    });
    return r;
  };
  R.aprovado = (f) => !!(R.get(f, "v2").aprovado || R.get(f, "on").aprovado);
  R.registra = (f, v, a) => {
    if (a === "aberto" && R.get(f, v).aberto) return; // só a primeira vez (de cada versão)
    const e = { f, v, a, t: new Date().toISOString() };
    fila.push(e); aplica(e); guarda(); envia(); avisa();
  };

  window.__fbRegistro = (res) => {
    (res?.table?.rows || []).forEach((row) => {
      const [f, v, a, t] = String(row.c?.[1]?.v || "").split("|");
      aplica({ f, v, a, t });
    });
    R.carregado = true; avisa();
  };
  if (sheet && R.aba) {
    const s = document.createElement("script");
    s.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheet)}/gviz/tq?tqx=out:json;responseHandler:__fbRegistro&sheet=${encodeURIComponent(R.aba)}&headers=1&tq=${encodeURIComponent("select A, B where not B starts with '~'")}&t=${Date.now()}`; // sem as linhas de visita (presenca.js)
    s.async = true; s.onerror = () => { R.carregado = true; avisa(); };
    document.head.append(s);
  }
  envia();
  // teste de ponta a ponta: cronograma.html#teste-registro manda um registro "teste" (ignorado por tudo)
  if (location.hash === "#teste-registro") {
    const e = { f: "teste", v: "v2", a: "aberto", t: new Date().toISOString() };
    fila.push(e); guarda(); envia();
    addEventListener("load", () => { const n = document.createElement("p"); n.textContent = "Teste do registro enviado. Pode fechar esta página."; n.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:99;margin:0;padding:12px 16px;border-radius:12px;background:#2F7A51;color:#fff;font:700 14px system-ui;text-align:center"; document.body.append(n); });
  }
})();
