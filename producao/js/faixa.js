// A faixa que corre no alto da tela.
//
// Um letreiro de sala de cinema: o estado do job passando de lado, sem que
// ninguém precise abrir nada. Só entra o que muda sozinho com o tempo — o que
// é hoje, o que embarca, o que vence, o que falta. Nada de número decorativo:
// se a linha não muda de um dia para o outro, ela não merece estar correndo.
import { store, nomeMembro } from './store.js';
import { can } from './perms.js';
import { esc, fmtMoneyShort, fmtData, diasAte, hoje } from './utils.js';
import { financeiro } from './calc.js';
import { alertas } from './notify.js';
import { paraCobrar } from './views/pedidosnf.js';

const emDias = (d) => (d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`);

/** O que a faixa tem a dizer, na ordem em que importa. */
export function itensDaFaixa(u = store.user) {
  const out = [];
  const hj = hoje();
  const add = (cor, olho, txt) => txt && out.push({ cor, olho, txt });

  // O dia de hoje, se ele for alguma coisa.
  const deHoje = store.doProjeto('eventos').filter((e) => e.data === hj);
  for (const e of deHoje.slice(0, 2)) {
    add('f3', 'hoje', [e.titulo, e.hora_inicio].filter(Boolean).join(' · '));
  }

  // A próxima viagem — e a que estiver rodando agora.
  const vs = [...store.doProjeto('viagens')].sort((a, b) => String(a.ida).localeCompare(String(b.ida)));
  const curso = vs.find((v) => v.ida <= hj && (v.volta || v.ida) >= hj);
  if (curso) add('f2', 'em curso', `${curso.destino} · volta ${fmtData(curso.volta, { ano: false })}`);
  const prox = vs.find((v) => v.ida > hj);
  if (prox) add('f1', 'próxima viagem', `${prox.destino} · embarca ${emDias(diasAte(prox.ida))}`);

  // A próxima diária de filmagem, que é o que a equipe realmente conta.
  const diaria = store.doProjeto('eventos')
    .filter((e) => e.tipo === 'diaria' && e.data > hj)
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))[0];
  if (diaria) {
    add('f1', 'próxima diária', `${diaria.titulo} · ${fmtData(diaria.data, { ano: false })}`
      + (diaria.confirmado === false ? ' · a confirmar' : ''));
  }

  // O que está pegando fogo agora.
  const al = alertas();
  const urgentes = al.filter((a) => a.urg >= 3).length;
  if (urgentes) add('f3', 'urgente', `${urgentes} ${urgentes === 1 ? 'coisa' : 'coisas'} para resolver hoje`);

  // Nota fiscal que não chega trava pagamento.
  if (can(u, 'contas.ver')) {
    const nf = paraCobrar().length;
    if (nf) add('f3', 'nota fiscal', `${nf} ${nf === 1 ? 'nota atrasada' : 'notas atrasadas'} para cobrar`);
    const vencidas = store.doProjeto('contas')
      .filter((c) => c.status === 'aberto' && c.tipo === 'pagar' && (diasAte(c.venc) ?? 9) < 0);
    if (vencidas.length) {
      add('f3', 'vencido',
        `${vencidas.length} ${vencidas.length === 1 ? 'conta vencida' : 'contas vencidas'}`);
    }
  }

  // A próxima entrega ao cliente.
  const ent = store.doProjeto('entregas')
    .filter((e) => e.status !== 'entregue' && e.prazo)
    .sort((a, b) => String(a.prazo).localeCompare(String(b.prazo)))[0];
  if (ent) add('f4', 'próxima entrega', `${ent.titulo} · ${emDias(diasAte(ent.prazo))}`);

  // Onde o contrato está no tempo.
  const ctr = store.doProjeto('contratos').find((c) => c.tipo === 'cliente');
  const p = store.projeto || {};
  const de = ctr?.assinado_em || p.inicio;
  const ate = ctr?.prazo_entrega || p.entrega;
  if (de && ate) {
    const total = Math.max(1, (new Date(ate) - new Date(de)) / 86400000);
    const andado = Math.round(Math.max(0, Math.min(1, (new Date(hj) - new Date(de)) / 86400000 / total)) * 100);
    add('f5', 'contrato', `${andado}% do prazo · entrega ${fmtData(ate, { ano: false })}`);
  }

  // O dinheiro entra por último e só para quem pode ver.
  if (can(u, 'orcamento.ver')) {
    const f = financeiro();
    add('f5', 'orçamento', `${fmtMoneyShort(f.comprometido)} de ${fmtMoneyShort(f.orcado)} comprometidos`);
  }

  // Quem está de viagem marcada nos próximos dias.
  const emBreve = vs.find((v) => (diasAte(v.ida) ?? 99) >= 0 && (diasAte(v.ida) ?? 99) <= 7);
  if (emBreve && (emBreve.participantes || []).length) {
    add('f4', 'quem vai', emBreve.participantes.map(nomeMembro).join(', '));
  }

  return out;
}

/* O trilho aparece duas vezes: quando a primeira cópia termina de sair pela
   esquerda, a segunda já está no lugar dela e o laço não tem emenda. */
export function faixaHTML(u = store.user) {
  const itens = itensDaFaixa(u);
  if (!itens.length) return '';
  const bloco = itens.map((i) => `<span class="fx-i ${i.cor}">
    <i class="fx-o">${esc(i.olho)}</i>${esc(i.txt)}</span>`).join('');
  return `<div class="faixa" data-faixa aria-label="Estado do projeto">
    <div class="fx-trilho" data-fx-trilho>
      <div class="fx-copia">${bloco}</div>
      <div class="fx-copia" aria-hidden="true">${bloco}</div>
    </div>
  </div>`;
}

/**
 * Põe a faixa para correr. A duração sai da largura real do conteúdo, para a
 * velocidade ficar a mesma tenha ela três itens ou doze — senão, faixa curta
 * dispara e faixa longa se arrasta.
 */
export function ligarFaixa(raiz) {
  const faixa = raiz.querySelector('[data-faixa]');
  const trilho = raiz.querySelector('[data-fx-trilho]');
  if (!faixa || !trilho) return;

  const medir = () => {
    const copia = trilho.querySelector('.fx-copia');
    if (!copia) return;
    const larg = copia.scrollWidth;
    if (!larg) return;
    const VELOCIDADE = 42;                       // pixels por segundo
    trilho.style.setProperty('--percurso', `-${larg}px`);
    trilho.style.setProperty('--tempo', `${Math.max(18, larg / VELOCIDADE)}s`);
    faixa.classList.add('correndo');
  };
  requestAnimationFrame(medir);
  new ResizeObserver(medir).observe(faixa);

  // Segurar o dedo em cima para. É o único jeito de ler uma linha inteira num
  // letreiro que anda.
  const parar = () => faixa.classList.add('parada');
  const seguir = () => faixa.classList.remove('parada');
  faixa.addEventListener('pointerdown', parar);
  faixa.addEventListener('pointerup', seguir);
  faixa.addEventListener('pointercancel', seguir);
  faixa.addEventListener('pointerleave', seguir);
  faixa.addEventListener('mouseenter', parar);
  faixa.addEventListener('mouseleave', seguir);
}
