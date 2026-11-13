// Ponte do Controle fora do Claude: no site, a página não tem as conexões do claude.ai (banco da página,
// usuário, Notion e Google Sheets). Esta ponte oferece as mesmas peças, pelo Apps Script da equipe
// (apps-script/Code.gs), que grava na planilha e no Notion. Dentro do Claude ela não faz nada.
(() => {
  if (window.claude) return;
  const URL_PADRAO = "https://script.google.com/macros/s/AKfycbwgvFPX5G9LGH-wCejIw2k3v-k3VDrtLMdwGjVW_8qUwvNuDJ6VWBMwxqlIdgykuv2F/exec"; // app da web do Apps Script da equipe
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
  const cfg = () => ({ url: ls("fbc-url") || URL_PADRAO, chave: ls("fbc-chave") || "", nome: ls("fbc-nome") || "" });

  // ── pedido de acesso: endereço (só se não vier no código), chave da equipe e nome de quem edita ──
  let pedindo = null;
  function pedeAcesso(msg) {
    if (pedindo) return pedindo;
    pedindo = new Promise((ok) => {
      const c = Object.fromEntries(Object.entries(cfg()).map(([k, v]) => [k, String(v).replace(/[&<>"']/g, (x) => `&#${x.charCodeAt(0)};`)]));
      const d = document.createElement("div");
      d.className = "ponte-acesso";
      d.innerHTML = `<form><h2>Controle dos Filmes</h2><p>${msg || "Para ver e editar, entre com a chave da equipe."}</p>
        ${URL_PADRAO || c.url ? "" : `<label>Endereço do Apps Script<input name="url" type="url" required placeholder="https://script.google.com/macros/s/…/exec" value="${c.url}"></label>`}
        <label>Chave da equipe<input name="chave" type="password" required autocomplete="current-password" value="${c.chave}"></label>
        <label>Seu nome<input name="nome" required placeholder="Ex.: Maví" value="${c.nome}"></label>
        <button>Entrar</button><small>Fica guardado só neste navegador.${URL_PADRAO || c.url ? "" : ' <a href="instalar.html" target="_blank" rel="noopener">Como instalar o Apps Script</a>'}</small></form>`;
      document.body.append(d);
      d.querySelector("input:not([value]), input[value='']")?.focus();
      d.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        if (f.get("url")) ls("fbc-url", String(f.get("url")).trim());
        ls("fbc-chave", String(f.get("chave")).trim()); ls("fbc-nome", String(f.get("nome")).trim());
        d.remove(); pedindo = null; ok();
      });
    });
    return pedindo;
  }
  const css = document.createElement("style");
  css.textContent = `.ponte-acesso{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:rgba(20,18,16,.45)}
.ponte-acesso form{width:min(400px,100%);display:grid;gap:12px;padding:24px;border-radius:18px;background:var(--card,#fff);color:var(--fg,#1F1D1A);box-shadow:0 24px 60px rgba(0,0,0,.25);font:15px/1.45 var(--font,system-ui)}
.ponte-acesso h2{margin:0;font-size:20px}.ponte-acesso p{margin:0;color:var(--muted,#6B6862)}
.ponte-acesso label{display:grid;gap:4px;font-size:13px;font-weight:700}
.ponte-acesso input{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#E3E0DA);background:var(--bg,#F6F5F2);color:inherit}
.ponte-acesso button{font:inherit;font-weight:800;padding:11px;border:0;border-radius:12px;background:var(--accent,#1F1D1A);color:var(--accent-fg,#fff);cursor:pointer}
.ponte-acesso small{color:var(--muted,#6B6862);text-align:center}.ponte-acesso small a{color:inherit}`;
  document.head.append(css);

  // endereço da ponte publicado pelo próprio Apps Script na planilha (aba ControleDB, linha "config/ponte")
  let achou = null;
  function achaUrl() {
    if (achou) return achou;
    achou = new Promise((ok) => {
      const cb = "__fbcPonte", s = document.createElement("script");
      window[cb] = (res) => { try { const v = res.table.rows[0].c[0].v; const u = JSON.parse(v).url; if (u && !ls("fbc-url")) ls("fbc-url", u); } catch {} ok(); };
      s.src = `https://docs.google.com/spreadsheets/d/1dZp8HV-64v5ewc0LzdnE4A7Luu1ikMGapbtg848Mnh4/gviz/tq?tqx=out:json;responseHandler:${cb}&sheet=ControleDB&headers=1&tq=${encodeURIComponent("select B where A = 'config/ponte'")}&t=${Date.now()}`;
      s.onerror = () => ok(); setTimeout(ok, 6000);
      document.head.append(s);
    });
    return achou;
  }

  // ── chamada ao Apps Script (POST em texto simples: sem pré-voo de CORS) ──
  async function chama(op, args, tentou) {
    if (!cfg().url) await achaUrl();
    let c = cfg();
    if (!c.url || !c.chave || !c.nome) { await pedeAcesso(); c = cfg(); }
    let j;
    try {
      const r = await fetch(c.url, { method: "POST", body: JSON.stringify({ chave: c.chave, op, args }), redirect: "follow" });
      j = await r.json();
    } catch (e) { throw { code: "rede", message: "Sem resposta do Apps Script. Confira a internet e o endereço." }; }
    if (!j.ok && j.code === "chave" && !tentou) { await pedeAcesso("A chave não confere. Digite de novo a chave da equipe."); return chama(op, args, true); }
    if (!j.ok) throw { code: j.code === "notion" || j.code === "notion_acesso" || j.code === "prop" ? "tool_error" : j.code, message: j.message };
    return j.r;
  }

  // ── banco da página (coleção "videos" e documento "config/site") sobre a aba ControleDB ──
  const docs = new Map(); // caminho -> dados
  const ouvintes = new Set();
  let carregou = false, buscando = null;
  async function recarrega() {
    if (buscando) return buscando;
    buscando = chama("dbList", {}).then((r) => {
      docs.clear(); r.docs.forEach((d) => docs.set(d.path, d.data));
      carregou = true; ouvintes.forEach((f) => f());
    }).finally(() => { buscando = null; });
    return buscando;
  }
  setInterval(() => { if (document.visibilityState === "visible" && carregou) recarrega().catch(() => {}); }, 20000);
  const snapDoc = (path) => ({ exists: docs.has(path), data: () => ({ ...(docs.get(path) || {}) }) });
  const db = {
    doc: (path) => ({
      update: async (patch) => { docs.set(path, { ...(docs.get(path) || {}), ...patch }); ouvintes.forEach((f) => f()); const r = await chama("dbWrite", { path, data: patch, merge: true }); docs.set(path, r.data); },
      set: async (data) => { docs.set(path, { ...data }); ouvintes.forEach((f) => f()); await chama("dbWrite", { path, data, merge: false }); },
      onSnapshot: (cb, err) => { const f = () => cb(snapDoc(path)); ouvintes.add(f); (carregou ? Promise.resolve(f()) : recarrega()).catch((e) => err && err(e)); return () => ouvintes.delete(f); },
    }),
    collection: (name) => ({
      onSnapshot: (cb, err) => {
        const f = () => cb({ docs: [...docs.entries()].filter(([p]) => p.startsWith(name + "/")).map(([p, d]) => ({ id: p.slice(name.length + 1), data: () => ({ ...d }) })) });
        ouvintes.add(f); (carregou ? Promise.resolve(f()) : recarrega()).catch((e) => err && err(e)); return () => ouvintes.delete(f);
      },
    }),
  };

  // ── usuário: quem edita é o nome digitado ──
  const user = {
    id: async () => (cfg().nome ? "nome:" + cfg().nome : null),
    profiles: async (ids) => Object.fromEntries(ids.map((i) => [i, { name: String(i).startsWith("nome:") ? String(i).slice(5) : "Maví" }])),
    can: async () => true,
  };

  // ── conectores: os mesmos nomes de ferramenta que o Controle usa no Claude ──
  // visualizações do Notion que o Controle lê -> base (data source) correspondente
  const VIEW_DS = {
    "view://c004ce99-c2ce-4c90-b938-66c516d0ff5b": "6dea10f2-8c92-42df-8831-bee18a5e2730", // agenda
    "view://896c724d-c6fc-4a35-9a73-7ca272d912be": "778c4596-eb3a-4229-b3e6-533ddf47a84f", // 41 vídeos
  };
  const mcp = {
    async callTool(server, tool, a) {
      if (server === "Google Sheets" && tool === "get_values") return { payload: await chama("sheetGet", { range: a.range }) };
      if (server === "Google Sheets" && tool === "update_values") return { payload: await chama("sheetSet", { range: a.range, values: a.values }) };
      if (server === "Notion" && tool === "notion-query-data-sources") {
        const ds = VIEW_DS[a.data.view_url] || String(a.data.data_source_url || "").replace("collection://", "");
        return { payload: await chama("notionQuery", { ds, cursor: a.data.start_cursor }) };
      }
      if (server === "Notion" && tool === "notion-update-page") return { payload: await chama("notionUpdate", { page_id: a.page_id, properties: a.properties }) };
      if (server === "Notion" && tool === "notion-create-pages") {
        const ds = a.parent.data_source_id;
        const out = []; for (const p of a.pages) out.push(await chama("notionCreate", { ds, properties: p.properties }));
        return { payload: { pages: out } };
      }
      if (server === "Dropbox" && tool === "pasta") return { payload: await chama("dropboxPasta", { url: a.url }) };
      if (server === "Notion" && tool === "notion-trash-page") return { payload: await chama("notionTrash", { page_id: a.page_id }) };
      throw { code: "tool_error", message: `Ferramenta não disponível fora do Claude: ${server} · ${tool}` };
    },
  };

  window.claude = { fora: true, use: async (k) => ({ db, user, mcp })[k] || null, sair: () => { ls("fbc-chave", null); location.reload(); } };
})();
