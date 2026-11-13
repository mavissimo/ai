/**
 * Dropbox no Controle dos Filmes: "Colar pasta do Dropbox" lê a pasta compartilhada e devolve o link público
 * de cada vídeo, para o Controle encaixar em cada filme. Fica num arquivo à parte, ABAIXO do Code.gs:
 * assim dá para acrescentar sem mexer no Code.gs (que guarda a chave da equipe e o segredo do Notion).
 * Passo a passo: cronograma/controle/dropbox.html
 * Propriedades do script: DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_CODIGO (uma vez) -> DROPBOX_REFRESH.
 */
// ── Dropbox (API oficial). Propriedades do script: DROPBOX_APP_KEY, DROPBOX_APP_SECRET e DROPBOX_REFRESH.
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

// pasta compartilhada do Dropbox -> nome e link público de cada vídeo dela (o Controle encaixa em cada filme)
function dropboxPasta_({ url }) {
  const link = { url: String(url || "").trim() };
  let r = dbx("files/list_folder", { path: "", shared_link: link, limit: 2000 });
  if (r.code !== 200) throw erro("dropbox", "Não consegui abrir a pasta: " + String(r.j.error_summary || r.txt).slice(0, 200));
  let entradas = r.j.entries || [];
  while (r.j.has_more) { r = dbx("files/list_folder/continue", { cursor: r.j.cursor }); entradas = entradas.concat(r.j.entries || []); }
  const videos = entradas.filter((e) => e[".tag"] === "file" && /\.(mp4|m4v|mov|webm)$/i.test(e.name));
  const pasta = dbx("sharing/get_shared_link_metadata", { url: link.url }).j.path_lower; // só existe se a pasta é da conta ligada
  if (!pasta) throw erro("dropbox", "A pasta não está na conta do Dropbox ligada ao Controle.");
  return { arquivos: videos.map((v) => ({ nome: v.name, url: linkPublico(pasta + "/" + v.name) })) };
}

// registra a operação no Code.gs (este arquivo roda depois dele)
try { OPS.dropboxPasta = dropboxPasta_; } catch (e) { Logger.log("Deixe o Dropbox.gs abaixo do Code.gs na lista de arquivos."); }
