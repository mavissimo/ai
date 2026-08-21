// Helpers gerais: dinheiro em centavos, datas, ids, escape de HTML.

export const uid = (p = 'id') =>
  p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- dinheiro (sempre em centavos, inteiro) ---------- */
export function parseMoney(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Math.round(v * 100);
  let s = String(v).trim().replace(/[R$\s]/gi, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
export const fmtMoney = (cents, opts = {}) => {
  const n = (Number(cents) || 0) / 100;
  return n.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: opts.compact ? 0 : 2
  });
};
export const fmtMoneyShort = (cents) => {
  const n = Math.abs(Number(cents) || 0) / 100;
  const sig = (Number(cents) || 0) < 0 ? '-' : '';
  if (n >= 1000000) return sig + 'R$ ' + (n / 1000000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1000) return sig + 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return fmtMoney(cents);
};
export const moneyInput = (cents) => cents ? ((Number(cents) || 0) / 100).toFixed(2).replace('.', ',') : '';
export const pct = (a, b) => (!b ? 0 : Math.round((a / b) * 100));

/* ---------- datas (ISO yyyy-mm-dd) ---------- */
export const hoje = () => new Date().toISOString().slice(0, 10);
export const isoDia = (d) => new Date(d).toISOString().slice(0, 10);
export function fmtData(iso, opts = {}) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  if (opts.longo) {
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${d} ${meses[Number(m) - 1]} ${y}`;
  }
  return `${d}/${m}` + (opts.ano === false ? '' : `/${y.slice(2)}`);
}
export function diasAte(iso) {
  if (!iso) return null;
  const a = new Date(hoje() + 'T00:00:00');
  const b = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
export function prazoTxt(iso) {
  const d = diasAte(iso);
  if (d === null) return '';
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d === -1) return 'ontem';
  if (d < 0) return `${-d} dias atrás`;
  return `em ${d} dias`;
}
export function prazoTag(iso, feito) {
  if (feito) return 'ok';
  const d = diasAte(iso);
  if (d === null) return 'mut';
  if (d < 0) return 'bad';
  if (d <= 3) return 'warn';
  return 'mut';
}
export const diaSemana = (iso) =>
  ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(String(iso).slice(0, 10) + 'T12:00:00').getDay()] || '';

/* ---------- diversos ---------- */
export const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2)
  .map((p) => p[0]).join('').toUpperCase();
export const soma = (arr, f) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);
export const porId = (arr, id) => arr.find((x) => x.id === id) || null;
export const groupBy = (arr, f) => arr.reduce((m, x) => {
  const k = f(x); (m[k] = m[k] || []).push(x); return m;
}, {});
export const ordenar = (arr, f, dir = 1) => [...arr].sort((a, b) => {
  const x = f(a), y = f(b);
  return x === y ? 0 : (x > y ? dir : -dir);
});
export const bytes = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB'
  : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
