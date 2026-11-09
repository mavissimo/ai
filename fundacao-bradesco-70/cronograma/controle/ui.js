// Peças com comportamento da biblioteca do Controle (ui.css): tema e lista suspensa.
// Carregado no <head>, antes de tudo, para o tema escolhido valer já no primeiro desenho da página.
(() => {
  // ── tema: Automático segue o sistema; Claro e Escuro ficam guardados neste navegador ──
  const raiz = document.documentElement;
  const lido = (() => { try { return localStorage.getItem("fbc-tema") || ""; } catch { return ""; } })();
  if (lido === "light" || lido === "dark") raiz.dataset.theme = lido;
  const marcaTema = () => document.querySelectorAll("[data-tema]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tema === (raiz.dataset.theme || "")));
  function trocaTema(v) {
    if (v) raiz.dataset.theme = v; else delete raiz.dataset.theme;
    try { if (v) localStorage.setItem("fbc-tema", v); else localStorage.removeItem("fbc-tema"); } catch {}
    marcaTema();
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-tema]"); if (b) trocaTema(b.dataset.tema); });
  document.addEventListener("DOMContentLoaded", marcaTema);

  // ── lista suspensa: o <select> continua sendo o campo (valor, evento change, formulário);
  //    só a lista que abre é desenhada aqui, com cor de status, avatar de pessoa e marca no escolhido.
  //    Na tela de toque fica a lista do próprio aparelho, que é melhor no dedo. ──
  const toque = matchMedia("(pointer: coarse)");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "-");
  const CHECK = `<svg class="ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
  let menu = null, dono = null;

  function enfeite(sel, o) {
    const d = o.dataset;
    if (d.ini) return `<span class="u-av" style="--c:${esc(d.cor || "var(--muted)")}">${esc(d.ini)}</span>`;
    if (d.st || sel.matches(".u-st, [data-menu=status]")) return o.value ? `<i class="u-dot" data-st="${esc(d.st || slug(o.value))}"></i>` : `<i class="u-dot vazio"></i>`;
    if (d.cor) return `<i class="u-dot" style="--c:${esc(d.cor)}"></i>`;
    return "";
  }
  function fecha(volta) {
    if (!menu) return;
    menu.remove(); menu = null;
    const s = dono; dono = null;
    s?.removeAttribute("aria-expanded");
    if (volta) s?.focus();
  }
  function abre(sel) {
    fecha();
    dono = sel; sel.setAttribute("aria-expanded", "true");
    const opts = [...sel.options].filter((o) => !o.hidden);
    menu = document.createElement("div");
    menu.className = "u-menu"; menu.setAttribute("role", "listbox"); menu.setAttribute("aria-label", sel.getAttribute("aria-label") || "Opções");
    const longa = opts.length > 10;
    menu.innerHTML = (longa ? `<div class="u-menu-busca"><input type="search" placeholder="Filtrar…" aria-label="Filtrar opções"></div>` : "")
      + `<div class="u-menu-lista">${opts.map((o) => `<button type="button" role="option" data-v="${esc(o.value)}" aria-selected="${o.selected}"${o.disabled ? " disabled" : ""}${o.value ? "" : ' class="vazio"'}>${enfeite(sel, o)}<span>${esc(o.textContent)}</span>${CHECK}</button>`).join("")}</div>`;
    document.body.append(menu);
    // posição: logo abaixo do campo; vira para cima quando não cabe
    const r = sel.getBoundingClientRect();
    menu.style.minWidth = Math.max(r.width, 180) + "px";
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + "px";
    const cima = r.bottom + 6 + h > innerHeight - 8 && r.top - 6 - h > 8;
    menu.style.top = (cima ? r.top - 6 - h : Math.min(r.bottom + 6, innerHeight - h - 8)) + "px";
    menu.classList.toggle("cima", cima);
    const itens = () => [...menu.querySelectorAll("[role=option]:not([hidden]):not([disabled])")];
    (menu.querySelector("[aria-selected=true]") || itens()[0])?.scrollIntoView({ block: "nearest" });
    const busca = menu.querySelector("input");
    if (busca) {
      busca.focus();
      busca.addEventListener("input", () => { const q = slug(busca.value); menu.querySelectorAll("[role=option]").forEach((b) => (b.hidden = q && !slug(b.textContent).includes(q))); });
    } else (menu.querySelector("[aria-selected=true]:not([disabled])") || itens()[0])?.focus();
    menu.addEventListener("click", (e) => { const b = e.target.closest("[role=option]"); if (b && !b.disabled) escolhe(sel, b.dataset.v); });
    menu.addEventListener("keydown", (e) => {
      const lista = itens(), i = lista.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = e.key === "ArrowDown" ? (i < 0 ? 0 : Math.min(lista.length - 1, i + 1)) : Math.max(0, i - 1); lista[n]?.focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); lista[e.key === "Home" ? 0 : lista.length - 1]?.focus(); }
      else if (e.key === "Enter" && busca && document.activeElement === busca) { e.preventDefault(); if (lista[0]) escolhe(sel, lista[0].dataset.v); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fecha(true); }
      else if (e.key === "Tab") { fecha(true); }
      else if (!busca && e.key.length === 1 && /\S/.test(e.key)) { const k = slug(e.key); const prox = lista.slice(i + 1).concat(lista.slice(0, i + 1)).find((b) => slug(b.textContent.trim()).startsWith(k)); prox?.focus(); }
    });
  }
  function escolhe(sel, v) {
    fecha(true);
    if (sel.value === v) return;
    sel.value = v;
    if (sel.matches(".u-st")) sel.dataset.st = slug(v);
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const usa = (sel) => sel && sel.tagName === "SELECT" && !sel.disabled && !sel.multiple && !toque.matches && !sel.hasAttribute("data-nativo");
  document.addEventListener("mousedown", (e) => {
    if (menu && !e.target.closest(".u-menu")) { const era = dono; fecha(); if (era === e.target.closest("select")) { e.preventDefault(); return; } }
    const sel = e.target.closest("select");
    if (e.button !== 0 || !usa(sel)) return;
    e.preventDefault(); sel.focus({ preventScroll: true }); abre(sel);
  }, true);
  document.addEventListener("keydown", (e) => {
    const sel = e.target;
    if (!usa(sel) || e.metaKey || e.ctrlKey) return;
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp" || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); abre(sel); }
  }, true);
  addEventListener("scroll", (e) => { if (menu && !menu.contains(e.target)) fecha(); }, true);
  addEventListener("resize", () => fecha());
  addEventListener("blur", () => fecha());

  window.UI = { trocaTema, fechaMenu: fecha };
})();
