// O movimento do app, num lugar só.
//
// Três regras: serve para alguma coisa, é rápido (nada passa de 440ms) e some
// inteiro quando o sistema pede menos movimento — o que aqui não é um `if` em
// cada lugar, e sim as durações de `:root` zeradas no CSS. Este módulo só liga
// os gatilhos; quem descreve o movimento é a folha de estilo.

const parado = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- revelar ---
   O que entra na tela ao rolar sobe um pouco e aparece, em cascata de 40ms.
   Só uma vez por elemento: lista que pisca a cada rolagem cansa. */
let observador = null;
function olho() {
  if (observador) return observador;
  observador = new IntersectionObserver((linhas) => {
    for (const l of linhas) {
      if (!l.isIntersecting) continue;
      l.target.classList.add('vis');
      observador.unobserve(l.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
  return observador;
}

/** Marca os blocos de uma tela para aparecerem conforme sobem. */
export function revelar(raiz) {
  if (!raiz || parado()) return;
  const alvos = raiz.querySelectorAll(
    ':scope > .card, :scope > .sec, :scope > .grid, :scope > .grid3, '
    + ':scope > .banner, :scope > .bloco, :scope > .kpi, '
    + ':scope > .bloco > .card, :scope > .bloco > .sec, :scope > .bloco > .grid, '
    + ':scope > .bloco > .grid3, :scope > .tabela-caixa, :scope > .criar-faixa'
  );
  let i = 0;
  for (const n of alvos) {
    if (n.dataset.rev) continue;
    n.dataset.rev = '1';
    // A cascata só vale para os primeiros: depois do sexto ela vira espera.
    n.style.setProperty('--atraso', `${Math.min(i++, 6) * 40}ms`);
    // O que já está visível na abertura não espera rolagem nenhuma.
    const r = n.getBoundingClientRect();
    if (r.top < innerHeight) { n.classList.add('vis'); continue; }
    olho().observe(n);
  }
}

/* ------------------------------------------------------------- transição ---
   Troca de tela: a antiga sai um pouco para cima, a nova chega de baixo. Onde
   o navegador tem View Transitions, ele faz; onde não tem, é uma classe. */
export function trocarTela(pintar) {
  if (parado() || !document.startViewTransition) { pintar(); return; }
  document.startViewTransition(pintar);
}

/* ------------------------------------------------------- topo que encolhe ---
   Ao rolar, o cabeçalho perde altura e ganha um fio: dá espaço ao conteúdo e
   avisa que a página andou. */
export function topoVivo(raiz) {
  const topo = raiz.querySelector('.topbar');
  if (!topo) return;
  const alvo = raiz.querySelector('main') || document.scrollingElement;
  const ler = () => {
    const y = alvo === document.scrollingElement ? scrollY : alvo.scrollTop;
    topo.classList.toggle('rolou', y > 8);
  };
  (alvo === document.scrollingElement ? window : alvo)
    .addEventListener('scroll', ler, { passive: true });
  ler();
}
