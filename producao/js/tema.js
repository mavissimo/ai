// Tema claro, escuro ou automático. A escolha fica gravada no aparelho.
// No automático a página segue o ambiente: primeiro o tema de quem embute a
// página, depois a preferência do sistema. Quem escolhe manda em tudo.
const K = 'unit0:tema';
export const TEMAS = [
  { v: 'auto', t: 'Automático', desc: 'Segue o sistema' },
  { v: 'claro', t: 'Claro', desc: 'Sempre claro' },
  { v: 'escuro', t: 'Escuro', desc: 'Sempre escuro' }
];

export function temaAtual() {
  try { return localStorage.getItem(K) || 'auto'; } catch { return 'auto'; }
}

export function aplicarTema(t = temaAtual()) {
  const raiz = document.documentElement;
  if (t === 'auto') raiz.removeAttribute('data-tema');
  else raiz.setAttribute('data-tema', t);
  return t;
}

export function definirTema(t) {
  try { localStorage.setItem(K, t); } catch { /* navegação privada */ }
  return aplicarTema(t);
}

/** true quando o que está na tela agora é escuro. */
export function escuroAgora() {
  const t = temaAtual();
  if (t === 'escuro') return true;
  if (t === 'claro') return false;
  // O escuro é o padrão do app, e não segue o sistema: só quem escolhe "claro"
  // em Mais é que clareia.
  return true;
}
