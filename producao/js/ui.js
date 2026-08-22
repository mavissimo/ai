// Kit de interface: bottom-sheet, formulários gerados por spec, toast, confirmação.
import { esc, moneyInput, parseMoney } from './utils.js';

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let toastT = null;
export function toast(msg, ms = 2600) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastT);
  const n = el(`<div class="toast">${esc(msg)}</div>`);
  document.body.appendChild(n);
  toastT = setTimeout(() => n.remove(), ms);
}

/* ---------------- bottom sheet ---------------- */
export function sheet({ titulo, corpo, rodape, aoFechar }) {
  const scrim = el('<div class="scrim"></div>');
  const s = el(`<div class="sheet" role="dialog" aria-modal="true">
    <div class="grab"></div>
    <div class="sheet-h"><h3>${esc(titulo || '')}</h3>
      <button class="btn sm gho" data-x aria-label="Fechar">Fechar</button></div>
    <div class="sheet-b"></div>
  </div>`);
  s.querySelector('.sheet-b').append(typeof corpo === 'string' ? el(`<div>${corpo}</div>`) : corpo);
  if (rodape) {
    const f = el('<div class="sheet-f"></div>');
    f.append(rodape);
    s.append(f);
  }
  document.body.append(scrim, s);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { scrim.classList.add('in'); s.classList.add('in'); });

  const close = () => {
    scrim.classList.remove('in'); s.classList.remove('in');
    document.body.style.overflow = '';
    setTimeout(() => { scrim.remove(); s.remove(); aoFechar && aoFechar(); }, 200);
  };
  scrim.onclick = close;
  s.querySelector('[data-x]').onclick = close;
  return { close, root: s, corpo: s.querySelector('.sheet-b') };
}

export function confirmar(msg, { ok = 'Confirmar', perigo = false } = {}) {
  return new Promise((res) => {
    let done = false;
    const rod = el('<div style="display:flex;gap:8px;width:100%"></div>');
    const bN = el('<button class="btn gho" style="flex:1">Cancelar</button>');
    const bS = el(`<button class="btn ${perigo ? 'danger' : 'pri'}" style="flex:1">${esc(ok)}</button>`);
    rod.append(bN, bS);
    const sh = sheet({
      titulo: 'Confirmar',
      corpo: `<p style="margin:6px 0 4px;font-size:15px">${esc(msg)}</p>`,
      rodape: rod,
      aoFechar: () => { if (!done) res(false); }
    });
    bN.onclick = () => { done = true; sh.close(); res(false); };
    bS.onclick = () => { done = true; sh.close(); res(true); };
  });
}

/** Menu de ações rápido. opcoes: [{v, t, sub, perigo}] */
export function escolher(titulo, opcoes) {
  return new Promise((res) => {
    let done = false;
    const box = el('<div class="stack"></div>');
    opcoes.forEach((o) => {
      const b = el(`<button class="who" style="margin:0">
        <div style="flex:1">
          <div style="font-weight:650${o.perigo ? ';color:var(--bad)' : ''}">${esc(o.t)}</div>
          ${o.sub ? `<div class="small muted" style="margin-top:2px">${esc(o.sub)}</div>` : ''}
        </div></button>`);
      b.onclick = () => { done = true; sh.close(); res(o.v); };
      box.append(b);
    });
    const sh = sheet({ titulo, corpo: box, aoFechar: () => { if (!done) res(null); } });
  });
}

/* ---------------- formulário por spec ----------------
 campo: { k, label, type, valor, opts:[{v,t}], req, hint, meia, quando }
 tipos: texto, area, numero, dinheiro, data, hora, select, multi, check, arquivo, titulo
-------------------------------------------------------*/
function campoHTML(c) {
  const v = c.valor ?? '';
  const id = 'f_' + c.k;
  const label = `<label for="${id}">${esc(c.label || '')}${c.req ? ' *' : ''}</label>`;
  const hint = c.hint ? `<div class="hint">${esc(c.hint)}</div>` : '';
  let inner = '';
  switch (c.type) {
    case 'titulo':
      return `<div class="sec" style="margin:18px 0 6px"><div class="sec-t">${esc(c.label)}</div></div>`;
    case 'area':
      inner = `<textarea id="${id}" data-k="${c.k}" placeholder="${esc(c.ph || '')}">${esc(v)}</textarea>`;
      break;
    case 'select':
      inner = `<select id="${id}" data-k="${c.k}">${(c.opts || []).map((o) =>
        `<option value="${esc(o.v)}"${String(o.v) === String(v) ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`;
      break;
    case 'multi': {
      const sel = Array.isArray(v) ? v.map(String) : [];
      inner = `<div data-multi="${c.k}" class="stack" style="max-height:210px;overflow:auto">${(c.opts || []).map((o) =>
        `<label class="check" style="padding:7px 0;margin:0">
          <input type="checkbox" value="${esc(o.v)}"${sel.includes(String(o.v)) ? ' checked' : ''}>
          <span>${esc(o.t)}</span></label>`).join('')}</div>`;
      break;
    }
    case 'check':
      return `<div class="f"><label class="check" style="margin:0">
        <input type="checkbox" data-k="${c.k}"${v ? ' checked' : ''}>
        <span style="font-weight:600">${esc(c.label)}</span></label>${hint}</div>`;
    case 'dinheiro':
      inner = `<input id="${id}" data-k="${c.k}" data-money="1" inputmode="decimal"
        placeholder="0,00" value="${esc(moneyInput(v))}">`;
      break;
    case 'numero':
      inner = `<input id="${id}" data-k="${c.k}" type="number" inputmode="decimal" step="${c.step || 'any'}"
        value="${esc(v)}" placeholder="${esc(c.ph || '')}">`;
      break;
    case 'data':
      inner = `<input id="${id}" data-k="${c.k}" type="date" value="${esc(String(v).slice(0, 10))}">`;
      break;
    case 'hora':
      inner = `<input id="${id}" data-k="${c.k}" type="time" value="${esc(v)}">`;
      break;
    case 'arquivo':
      inner = `<label class="filebox" for="${id}">
          <span data-fname>${v ? esc(v) : 'Tocar para escolher arquivo ou tirar foto'}</span>
          <input id="${id}" data-k="${c.k}" type="file" accept="${c.accept || 'image/*,application/pdf'}"
            style="display:none">
        </label>`;
      break;
    default:
      inner = `<input id="${id}" data-k="${c.k}" type="${c.type === 'email' ? 'email' : c.type === 'tel' ? 'tel' : 'text'}"
        value="${esc(v)}" placeholder="${esc(c.ph || '')}">`;
  }
  return `<div class="f${c.meia ? ' meia' : ''}" data-f="${c.k}">${label}${inner}${hint}</div>`;
}

export function abrirForm({ titulo, subtitulo, campos, onSave, onDelete, onArquivo, salvar = 'Salvar' }) {
  const visiveis = campos.filter(Boolean);
  const corpo = el(`<form>${subtitulo ? `<p class="small muted" style="margin:0 0 12px">${esc(subtitulo)}</p>` : ''}
    ${visiveis.map(campoHTML).join('')}</form>`);

  // API que o chamador usa para preencher campos sozinho (ex.: leitura da nota).
  const api = {
    set(k, valor) {
      const inp = corpo.querySelector(`[data-k="${k}"]`);
      if (!inp || valor === null || valor === undefined || valor === '') return;
      const campo = visiveis.find((c) => c.k === k);
      inp.value = campo?.type === 'dinheiro' && typeof valor === 'number'
        ? moneyInput(valor) : String(valor);
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    },
    valor(k) { return corpo.querySelector(`[data-k="${k}"]`)?.value || ''; },
    aviso(texto, tom = 'ok', depoisDe = null) {
      corpo.querySelector('[data-aviso]')?.remove();
      if (!texto) return;
      const n = el(`<div class="banner ${tom === 'bad' ? 'bad' : tom === 'warn' ? 'warn' : ''}"
        data-aviso style="margin:0 0 12px">${esc(texto)}</div>`);
      const alvo = depoisDe ? corpo.querySelector(`[data-f="${depoisDe}"]`) : null;
      if (alvo) alvo.after(n); else corpo.prepend(n);
    },
    /** Abre o seletor de arquivo de um campo, como se a pessoa tivesse tocado nele. */
    escolherArquivo(k) { corpo.querySelector(`[data-k="${k}"]`)?.click(); }
  };

  corpo.querySelectorAll('input[type=file]').forEach((inp) => {
    inp.onchange = async () => {
      const n = inp.closest('.filebox');
      const arquivo = inp.files[0];
      if (n) {
        n.classList.add('has');
        n.querySelector('[data-fname]').textContent = arquivo?.name || 'Arquivo selecionado';
      }
      if (arquivo && onArquivo) {
        try { await onArquivo(arquivo, api); } catch (e) { console.warn('onArquivo', e); }
      }
    };
  });

  const rod = el('<div style="display:flex;gap:8px;width:100%"></div>');
  if (onDelete) {
    const bD = el('<button type="button" class="btn danger" style="flex:0 0 auto">Excluir</button>');
    bD.onclick = async () => {
      if (await confirmar('Excluir este registro? Não dá para desfazer.', { ok: 'Excluir', perigo: true })) {
        await onDelete(); sh.close();
      }
    };
    rod.append(bD);
  }
  const bS = el(`<button type="button" class="btn pri" style="flex:1">${esc(salvar)}</button>`);
  rod.append(bS);

  const sh = sheet({ titulo, corpo, rodape: rod });

  bS.onclick = async () => {
    const vals = {};
    let erro = null;
    corpo.querySelectorAll('.f').forEach((f) => f.classList.remove('err'));
    for (const c of visiveis) {
      if (c.type === 'titulo') continue;
      if (c.type === 'multi') {
        vals[c.k] = [...corpo.querySelectorAll(`[data-multi="${c.k}"] input:checked`)].map((i) => i.value);
      } else {
        const inp = corpo.querySelector(`[data-k="${c.k}"]`);
        if (!inp) continue;
        if (c.type === 'check') vals[c.k] = inp.checked;
        else if (c.type === 'arquivo') vals[c.k] = inp.files[0] || null;
        else if (c.type === 'dinheiro') vals[c.k] = parseMoney(inp.value);
        else if (c.type === 'numero') vals[c.k] = inp.value === '' ? null : Number(inp.value);
        else vals[c.k] = inp.value.trim();
      }
      const vazio = c.type === 'multi' ? !vals[c.k].length
        : c.type === 'dinheiro' ? !vals[c.k]
          : vals[c.k] === '' || vals[c.k] === null || vals[c.k] === undefined;
      if (c.req && vazio) {
        corpo.querySelector(`[data-f="${c.k}"]`)?.classList.add('err');
        erro = erro || `Preencha: ${c.label}`;
      }
    }
    if (erro) { toast(erro); return; }
    bS.disabled = true; bS.textContent = 'Salvando…';
    try {
      await onSave(vals, api);
      sh.close();
    } catch (e) {
      // O formulário pode pedir para continuar aberto (ex.: falta o comprovante).
      if (e && e.message === '__continuar') {
        bS.disabled = false; bS.textContent = salvar;
        return;
      }
      console.error(e);
      toast(e.message || 'Não consegui salvar.');
      bS.disabled = false; bS.textContent = salvar;
    }
  };
  return sh;
}

/** Botãozinho de ocultar/mostrar valores, para ficar ao lado do dinheiro. */
export function btnOlho(oculto) {
  return `<button class="olho sm" data-olho type="button"
    aria-label="${oculto ? 'Mostrar valores' : 'Ocultar valores'}"
    title="${oculto ? 'Mostrar valores' : 'Ocultar valores'}">${oculto ? ICO.olhoOff : ICO.olho}</button>`;
}

/* ---------------- ícones ---------------- */
export const ICO = {
  casa: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>',
  etapas: '<svg viewBox="0 0 24 24"><path d="M4 6h10M4 12h16M4 18h7"/><circle cx="18" cy="6" r="2"/><circle cx="14" cy="18" r="2"/></svg>',
  agenda: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  grana: '<svg viewBox="0 0 24 24"><path d="M3 7h18v10H3z"/><circle cx="12" cy="12" r="2.5"/><path d="M7 12h.01M17 12h.01"/></svg>',
  mais: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  eu: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
  nota: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/></svg>',
  olho: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  olhoOff: '<svg viewBox="0 0 24 24"><path d="M4 4l16 16"/><path d="M9.9 5.7A10.6 10.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3.4 4.2"/><path d="M6.5 7.8A17.4 17.4 0 0 0 2 12s3.6 6.5 10 6.5c1.5 0 2.8-.3 4-.8"/><path d="M9.6 9.9a2.8 2.8 0 0 0 3.9 3.9"/></svg>'
};
