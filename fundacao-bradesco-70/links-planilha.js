// Links dos filmes lidos ao vivo da planilha "Controle dos Filmes" (Google Sheets).
// Colou o link na planilha, o site já usa na próxima visita; não precisa publicar nada.
// A planilha precisa estar como "Qualquer pessoa com o link: leitor".
// Colunas: A = id do filme (ou "placeholder"), E = link. Se a planilha falhar, valem os links de videos.js.
window.VIDEO_SHEET = "1dZp8HV-64v5ewc0LzdnE4A7Luu1ikMGapbtg848Mnh4"; // ID da planilha: o trecho entre /d/ e /edit no endereço dela

(function () {
  const id = window.VIDEO_SHEET;
  if (!id) return;
  window.__fbPlanilha = (res) => {
    const links = {};
    (res?.table?.rows || []).forEach((r) => {
      const chave = String(r.c?.[0]?.v || "").trim(), link = String(r.c?.[4]?.v || "").trim();
      if (!chave || !/^https?:\/\//.test(link)) return;
      if (chave === "placeholder") window.VIDEO_PLACEHOLDER = link;
      else links[chave] = link;
    });
    window.VIDEO_LINKS = Object.assign({}, window.VIDEO_LINKS, links);
    document.dispatchEvent(new CustomEvent("fb:links"));
  };
  const s = document.createElement("script");
  s.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:json;responseHandler:__fbPlanilha&headers=1&t=${Date.now()}`;
  s.async = true;
  document.head.append(s);
})();
