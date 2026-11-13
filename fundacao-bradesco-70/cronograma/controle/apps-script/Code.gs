/**
 * Ponte do Controle dos Filmes (site) com a planilha e o Notion.
 * O Controle no site não tem as conexões do Claude; ele chama este script, que grava na planilha
 * (lista de filmes, links, cronograma do cliente) e no Notion (agenda e base de vídeos).
 *
 * Instalação (uma vez): siga cronograma/controle/instalar.html. A página de instalação preenche as duas
 * constantes abaixo antes de você copiar este código; aqui no repositório elas ficam vazias de propósito.
 * (Também valem as propriedades do script NOTION_TOKEN e CHAVE, se preferir guardar por lá.)
 */
const NOTION_TOKEN_COLADO = ""; // o segredo da integração do Notion (começa com "ntn_" ou "secret_")
const CHAVE_PADRAO = "";        // a senha da equipe, que o Controle pede uma vez em cada navegador
const PLANILHA = "1dZp8HV-64v5ewc0LzdnE4A7Luu1ikMGapbtg848Mnh4";
const ABA_DB = "ControleDB"; // coluna A = caminho ("videos/<id>" ou "config/site"), B = dados (JSON), C = atualizado
const NOTION_VERSAO = "2025-09-03";
const P = PropertiesService.getScriptProperties();

function doGet(e) { return responde(e.parameter.q ? JSON.parse(e.parameter.q) : { op: "ping" }); }
function doPost(e) { return responde(JSON.parse(e.postData.contents || "{}")); }

function responde(req) {
  let out;
  try {
    const chave = P.getProperty("CHAVE") || CHAVE_PADRAO;
    if (!chave) throw erro("config", "Falta a chave da equipe no script.");
    if (req.chave !== chave) throw erro("chave", "Chave da equipe incorreta.");
    const calls = req.op === "lote" ? req.args.calls : [{ op: req.op, args: req.args }];
    const r = calls.map((c) => { if (!OPS[c.op]) throw erro("op", "Operação desconhecida: " + c.op); return OPS[c.op](c.args || {}); });
    out = { ok: true, r: req.op === "lote" ? r : r[0] };
  } catch (err) {
    out = { ok: false, code: err.code || "erro", message: String(err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function erro(code, message) { const e = new Error(message); e.code = code; return e; }

const OPS = {
  // pasta compartilhada do Dropbox -> nome e link público de cada vídeo dela (o Controle encaixa em cada filme)
  dropboxPasta: ({ url }) => {
    const link = { url: String(url || "").trim() };
    let r = dbx("files/list_folder", { path: "", shared_link: link, limit: 2000 });
    if (r.code !== 200) throw erro("dropbox", "Não consegui abrir a pasta: " + String(r.j.error_summary || r.txt).slice(0, 200));
    let entradas = r.j.entries || [];
    while (r.j.has_more) { r = dbx("files/list_folder/continue", { cursor: r.j.cursor }); entradas = entradas.concat(r.j.entries || []); }
    const videos = entradas.filter((e) => e[".tag"] === "file" && /\.(mp4|m4v|mov|webm)$/i.test(e.name));
    const pasta = dbx("sharing/get_shared_link_metadata", { url: link.url }).j.path_lower; // só existe se a pasta é da conta ligada
    if (!pasta) throw erro("dropbox", "A pasta não está na conta do Dropbox ligada ao Controle.");
    return { arquivos: videos.map((v) => ({ nome: v.name, url: linkPublico(pasta + "/" + v.name) })) };
  },
  ping: () => {
    // guarda o endereço deste app na planilha: o Controle acha a ponte sozinho e a equipe só precisa da chave
    const url = ScriptApp.getService().getUrl();
    if (url && /\/exec$/.test(url)) {
      const atual = OPS.dbList().docs.find((d) => d.path === "config/ponte");
      if (!atual || atual.data.url !== url) OPS.dbWrite({ path: "config/ponte", data: { url }, merge: false });
    }
    return { ok: true, notion: !!(P.getProperty("NOTION_TOKEN") || NOTION_TOKEN_COLADO) };
  },

  // ── planilha ──
  sheetGet: ({ range }) => {
    const v = SpreadsheetApp.openById(PLANILHA).getRange(range).getDisplayValues();
    while (v.length && v[v.length - 1].every((c) => c === "")) v.pop();
    return { values: v.map((row) => { const r = row.slice(); while (r.length && r[r.length - 1] === "") r.pop(); return r; }) };
  },
  sheetSet: ({ range, values }) => {
    const rg = SpreadsheetApp.openById(PLANILHA).getRange(range);
    const h = rg.getNumRows(), w = rg.getNumColumns();
    const v = Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => (values[i] && values[i][j] != null ? values[i][j] : "")));
    rg.setValues(v);
    return { ok: true };
  },

  // ── lista compartilhada do Controle (o que no Claude era o banco da página) ──
  dbList: () => {
    const sh = abaDb(), n = sh.getLastRow();
    if (n < 2) return { docs: [] };
    return { docs: sh.getRange(2, 1, n - 1, 3).getValues().filter((r) => r[0]).map((r) => ({ path: String(r[0]), data: JSON.parse(r[1] || "{}"), t: String(r[2]) })) };
  },
  dbWrite: ({ path, data, merge }) => {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const sh = abaDb(), n = sh.getLastRow();
      const paths = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map((r) => String(r[0])) : [];
      const i = paths.indexOf(path);
      const atual = i >= 0 ? JSON.parse(sh.getRange(i + 2, 2).getValue() || "{}") : {};
      const novo = merge ? Object.assign(atual, data) : data;
      Object.keys(novo).forEach((k) => { if (novo[k] === undefined) delete novo[k]; });
      const t = new Date().toISOString();
      if (i >= 0) sh.getRange(i + 2, 2, 1, 2).setValues([[JSON.stringify(novo), t]]);
      else sh.appendRow([path, JSON.stringify(novo), t]);
      return { data: novo, t };
    } finally { lock.releaseLock(); }
  },

  // ── Notion ──
  notionQuery: ({ ds, cursor }) => {
    const r = notion("post", `/data_sources/${ds}/query`, { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
    return { results: r.results.map(plano), has_more: r.has_more, next_cursor: r.next_cursor };
  },
  notionUpdate: ({ page_id, properties }) => {
    const id = limpaId(page_id);
    const pg = notion("get", `/pages/${id}`);
    const tipos = Object.fromEntries(Object.entries(pg.properties).map(([k, v]) => [k, v.type]));
    const r = notion("patch", `/pages/${id}`, { properties: paraNotion(tipos, properties) });
    return plano(r);
  },
  notionCreate: ({ ds, properties }) => {
    const sch = notion("get", `/data_sources/${ds}`);
    const tipos = Object.fromEntries(Object.entries(sch.properties).map(([k, v]) => [k, v.type]));
    const r = notion("post", "/pages", { parent: { type: "data_source_id", data_source_id: ds }, properties: paraNotion(tipos, properties) });
    return plano(r);
  },
  notionTrash: ({ page_id }) => { notion("patch", `/pages/${limpaId(page_id)}`, { in_trash: true }); return { ok: true }; },
};

// ── Dropbox (API oficial). Propriedades do script: DROPBOX_APP_KEY, DROPBOX_APP_SECRET e DROPBOX_REFRESH.
// Para ligar: crie um app em dropbox.com/developers/apps (Scoped access, Full Dropbox; permissões
// files.metadata.read, sharing.read e sharing.write), guarde a key e o secret nas propriedades, abra
// https://www.dropbox.com/oauth2/authorize?client_id=<KEY>&response_type=code&token_access_type=offline,
// guarde o código que aparece em DROPBOX_CODIGO e rode ligarDropbox() uma vez aqui no editor.
function ligarDropbox() {
  const res = UrlFetchApp.fetch("https://api.dropbox.com/oauth2/token", { method: "post", muteHttpExceptions: true,
    payload: { grant_type: "authorization_code", code: P.getProperty("DROPBOX_CODIGO"), client_id: P.getProperty("DROPBOX_APP_KEY"), client_secret: P.getProperty("DROPBOX_APP_SECRET") } });
  const j = JSON.parse(res.getContentText() || "{}");
  if (!j.refresh_token) throw new Error("O Dropbox não devolveu o acesso: " + res.getContentText());
  P.setProperty("DROPBOX_REFRESH", j.refresh_token); P.deleteProperty("DROPBOX_CODIGO");
  Logger.log("Dropbox ligado.");
}
function dropboxToken() {
  const k = P.getProperty("DROPBOX_APP_KEY"), s = P.getProperty("DROPBOX_APP_SECRET"), r = P.getProperty("DROPBOX_REFRESH");
  if (!k || !s || !r) throw erro("dropbox_config", "O Dropbox ainda não está ligado ao Apps Script.");
  const cache = CacheService.getScriptCache(), guardado = cache.get("dbx_token");
  if (guardado) return guardado;
  const res = UrlFetchApp.fetch("https://api.dropbox.com/oauth2/token", { method: "post", muteHttpExceptions: true, payload: { grant_type: "refresh_token", refresh_token: r, client_id: k, client_secret: s } });
  const j = JSON.parse(res.getContentText() || "{}");
  if (!j.access_token) throw erro("dropbox", "O Dropbox recusou o acesso: " + (j.error_description || j.error || res.getResponseCode()));
  cache.put("dbx_token", j.access_token, Math.max(60, Math.min(3000, (j.expires_in || 3600) - 300)));
  return j.access_token;
}
function dbx(rota, body) {
  const res = UrlFetchApp.fetch("https://api.dropboxapi.com/2/" + rota, { method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + dropboxToken() }, payload: JSON.stringify(body) });
  const txt = res.getContentText(); let j = {}; try { j = JSON.parse(txt); } catch (e) {}
  return { code: res.getResponseCode(), j: j, txt: txt };
}
// link público de um arquivo (cria; se já existe, reaproveita)
function linkPublico(path) {
  const c = dbx("sharing/create_shared_link_with_settings", { path: path, settings: { audience: "public", access: "viewer" } });
  if (c.code === 200) return c.j.url;
  const ja = c.j.error && c.j.error.shared_link_already_exists;
  if (ja && ja.metadata && ja.metadata.url) return ja.metadata.url;
  const l = dbx("sharing/list_shared_links", { path: path, direct_only: true });
  return ((l.j.links || [])[0] || {}).url || "";
}

function abaDb() {
  const ss = SpreadsheetApp.openById(PLANILHA);
  let sh = ss.getSheetByName(ABA_DB);
  if (!sh) { sh = ss.insertSheet(ABA_DB); sh.appendRow(["caminho", "dados", "atualizado"]); }
  return sh;
}
const limpaId = (s) => String(s).replace(/[^0-9a-f]/gi, "").slice(-32);

function notion(method, path, body) {
  const token = P.getProperty("NOTION_TOKEN") || NOTION_TOKEN_COLADO;
  if (!token) throw erro("config", "Falta o segredo do Notion no script.");
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = UrlFetchApp.fetch("https://api.notion.com/v1" + path, {
      method, muteHttpExceptions: true, contentType: "application/json",
      headers: { Authorization: "Bearer " + token, "Notion-Version": NOTION_VERSAO },
      ...(body ? { payload: JSON.stringify(body) } : {}),
    });
    const code = r.getResponseCode();
    if (code === 429 || code >= 500) { Utilities.sleep(800 * (tentativa + 1)); continue; } // o Notion pediu calma
    const j = JSON.parse(r.getContentText() || "{}");
    if (code >= 300) throw erro(code === 404 ? "notion_acesso" : "notion", (j.message || "Notion recusou") + (code === 404 ? " (a página está conectada à integração?)" : ""));
    return j;
  }
  throw erro("notion", "O Notion está ocupado; tente de novo em instantes.");
}

// página do Notion -> linha plana, no mesmo formato que o Controle já lê
function plano(p) {
  const o = { url: p.url, id: p.id };
  Object.entries(p.properties || {}).forEach(([k, v]) => {
    switch (v.type) {
      case "title": case "rich_text": o[k] = v[v.type].map((t) => t.plain_text).join(""); break;
      case "select": o[k] = v.select ? v.select.name : null; break;
      case "status": o[k] = v.status ? v.status.name : null; break;
      case "multi_select": o[k] = JSON.stringify(v.multi_select.map((x) => x.name)); break;
      case "people": o[k] = JSON.stringify(v.people.map((x) => x.name || x.id)); break;
      case "relation": o[k] = JSON.stringify(v.relation.map((x) => "https://www.notion.so/" + x.id.replace(/-/g, ""))); break;
      case "date":
        o[`date:${k}:start`] = v.date ? v.date.start : null;
        o[`date:${k}:end`] = v.date ? v.date.end : null;
        o[`date:${k}:is_datetime`] = v.date && String(v.date.start).includes("T") ? 1 : 0; break;
      case "url": o[k] = v.url; break;
      case "number": o[k] = v.number; break;
      case "checkbox": o[k] = v.checkbox ? "__YES__" : "__NO__"; break;
      case "email": case "phone_number": o[k] = v[v.type]; break;
      default: break;
    }
  });
  return o;
}

// propriedades no formato do Controle ("Status": "x", "date:Data:start": "...") -> formato da API do Notion
function paraNotion(tipos, inp) {
  const out = {}, datas = {};
  Object.entries(inp || {}).forEach(([k, v]) => {
    const m = k.match(/^date:(.+):(start|end|is_datetime)$/);
    if (m) { (datas[m[1]] = datas[m[1]] || {})[m[2]] = v; return; }
    const nome = k.replace(/^userDefined:/, ""), t = tipos[nome];
    if (!t) throw erro("prop", "Propriedade desconhecida no Notion: " + nome);
    const lista = (x) => (Array.isArray(x) ? x : x ? JSON.parse(x) : []);
    switch (t) {
      case "title": out[nome] = { title: [{ text: { content: String(v || "") } }] }; break;
      case "rich_text": out[nome] = { rich_text: v ? [{ text: { content: String(v) } }] : [] }; break;
      case "select": out[nome] = { select: v ? { name: String(v) } : null }; break;
      case "status": out[nome] = { status: v ? { name: String(v) } : null }; break;
      case "multi_select": out[nome] = { multi_select: lista(v).map((n) => ({ name: String(n) })) }; break;
      case "relation": out[nome] = { relation: lista(v).map((u) => ({ id: limpaId(u) })) }; break;
      case "url": out[nome] = { url: v || null }; break;
      case "number": out[nome] = { number: v === null || v === "" ? null : Number(v) }; break;
      case "checkbox": out[nome] = { checkbox: v === true || v === "__YES__" }; break;
      default: throw erro("prop", "Tipo de propriedade não suportado aqui: " + nome + " (" + t + ")");
    }
  });
  Object.entries(datas).forEach(([nome, d]) => {
    if (!tipos[nome]) throw erro("prop", "Propriedade desconhecida no Notion: " + nome);
    if (!d.start) { out[nome] = { date: null }; return; }
    const comHora = d.is_datetime == 1 || (d.is_datetime == null && String(d.start).includes("T"));
    const f = (x) => (x ? (comHora ? String(x) : String(x).slice(0, 10)) : null);
    out[nome] = { date: { start: f(d.start), end: f(d.end) } };
  });
  return out;
}

// teste: no editor do Apps Script, escolha "teste" no menu de cima e clique em Executar.
// Na primeira vez o Google pede permissão (planilha e acesso ao Notion): permita.
function teste() {
  Logger.log("Planilha: %s itens na lista do Controle", OPS.dbList().docs.length);
  const r = OPS.notionQuery({ ds: "6dea10f2-8c92-42df-8831-bee18a5e2730" });
  Logger.log("Notion: %s tarefas da agenda lidas. Tudo certo!", r.results.length);
}
