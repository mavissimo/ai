// A faixa que corre no alto da tela.
//
// Um letreiro de sala de cinema: o estado do job passando de lado, sem que
// ninguém precise abrir nada. Só entra o que muda sozinho com o tempo — o que
// é hoje, o que embarca, o que vence, o que falta. Nada de número decorativo:
// se a linha não muda de um dia para o outro, ela não merece estar correndo.
//
// E cada linha é um botão. Letreiro que só informa obriga a pessoa a caçar
// depois, no menu, a coisa que ela acabou de ler — então aqui a linha abre o
// dossiê do que ela está dizendo, ou leva direto para onde se resolve.
import { store, nomeMembro } from './store.js';
import { can } from './perms.js';
import { el, sheet } from './ui.js';
import { esc, fmtMoney, fmtMoneyShort, fmtData, diasAte, hoje } from './utils.js';
import { financeiro } from './calc.js';
import { alertas } from './notify.js';
import { abrirDossie } from './dossie.js';
import { paraCobrar } from './views/pedidosnf.js';

const emDias = (d) => (d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`);

/* ------------------------------------------------------- os dossiês -------
   Explicação genérica não explica nada, então cada tipo de linha tem a sua,
   escrita à mão. O `ref` é o que faz o dossiê descobrir sozinho do que aquilo
   depende e o que está travado esperando. */

const dossieEvento = (e, hj) => ({
  texto: e.titulo,
  detalhe: [fmtData(e.data), e.hora_inicio, e.local].filter(Boolean).join(' · '),
  urg: e.data === hj ? 3 : 2,
  rota: '#/agenda',
  ref: { t: 'eventos', id: e.id },
  origem: e.data === hj
    ? 'É o que está marcado para hoje na agenda do projeto.'
    : 'É o próximo compromisso deste tipo na agenda do projeto.',
  porque: e.confirmado === false
    ? 'Ainda não está confirmado. Diária sem confirmação é equipe parada em '
      + 'aeroporto: o contrato pede dez dias úteis de antecedência.'
    : 'É o que a equipe está contando para se organizar — passagem, diária e '
      + 'chamada saem daqui.',
  como: 'Abra na agenda para conferir hora, lugar e quem vai. Se algo mudou, '
    + 'mude aqui primeiro: é desta data que sai o resto.'
});

const dossieViagem = (v, curso) => ({
  texto: `Viagem ${v.numero || ''} — ${v.destino || ''}`.trim(),
  detalhe: `${fmtData(v.ida)} a ${fmtData(v.volta)}`,
  urg: curso ? 3 : 2,
  rota: '#/viagens',
  ref: { t: 'viagens', id: v.id },
  origem: curso
    ? 'Está acontecendo agora: a data de hoje cai entre a ida e a volta.'
    : 'É a próxima viagem a embarcar no cronograma.',
  porque: curso
    ? 'Enquanto a viagem roda, tudo que faltou vira problema em campo — '
      + 'não dá para pedir de longe o que ficou em São Paulo.'
    : 'Passagem, hospedagem, carro e equipe se resolvem antes de embarcar. '
      + 'Depois vira remarcação, e remarcação custa.',
  como: 'Abra a viagem para ver a lista de providências dela e o que ainda '
    + 'está aberto.'
});

const dossieEntrega = (e) => ({
  texto: e.titulo,
  detalhe: e.prazo ? `prazo ${fmtData(e.prazo)}` : 'sem prazo',
  urg: (diasAte(e.prazo) ?? 9) < 0 ? 3 : (diasAte(e.prazo) ?? 9) <= 7 ? 2 : 1,
  rota: '#/entregas',
  ref: { t: 'entregas', id: e.id },
  origem: 'É a próxima entrega com prazo aberto no contrato.',
  porque: 'Entrega no prazo é o que libera a próxima parcela — e atraso em '
    + 'entrega é a única coisa deste contrato que gera multa.',
  como: 'Abra a entrega, veja em que rodada de aprovação ela está e o que '
    + 'falta para fechar.'
});

const dossieConta = (c) => ({
  texto: c.titulo || c.descricao || 'Conta em aberto',
  detalhe: [fmtMoney(c.valor_cents), c.venc ? `venceu ${fmtData(c.venc)}` : ''].filter(Boolean).join(' · '),
  urg: 3,
  rota: '#/pagamentos',
  ref: { t: 'contas', id: c.id },
  origem: 'A data de vencimento já passou e a conta continua em aberto.',
  porque: 'Conta vencida é alguém da equipe esperando o dinheiro dele, e é '
    + 'juros que saem do nosso lado, não do cliente.',
  como: 'Pague e dê baixa, ou remarque o vencimento com a data real — sumir '
    + 'da lista sem baixa é o que faz o número do caixa mentir.'
});

/** O que a faixa tem a dizer, na ordem em que importa. */
export function itensDaFaixa(u = store.user) {
  const out = [];
  const hj = hoje();
  const add = (cor, olho, txt, acao) => txt && out.push({ cor, olho, txt, ...(acao || {}) });

  // O dia de hoje, se ele for alguma coisa.
  const deHoje = store.doProjeto('eventos').filter((e) => e.data === hj);
  for (const e of deHoje.slice(0, 2)) {
    add('f3', 'hoje', [e.titulo, e.hora_inicio].filter(Boolean).join(' · '),
      { dossie: dossieEvento(e, hj) });
  }

  // A próxima viagem — e a que estiver rodando agora.
  const vs = [...store.doProjeto('viagens')].sort((a, b) => String(a.ida).localeCompare(String(b.ida)));
  const curso = vs.find((v) => v.ida <= hj && (v.volta || v.ida) >= hj);
  if (curso) {
    add('f2', 'em curso', `${curso.destino} · volta ${fmtData(curso.volta, { ano: false })}`,
      { dossie: dossieViagem(curso, true) });
  }
  const prox = vs.find((v) => v.ida > hj);
  if (prox) {
    add('f1', 'próxima viagem', `${prox.destino} · embarca ${emDias(diasAte(prox.ida))}`,
      { dossie: dossieViagem(prox, false) });
  }

  // A próxima diária de filmagem, que é o que a equipe realmente conta.
  const diaria = store.doProjeto('eventos')
    .filter((e) => e.tipo === 'diaria' && e.data > hj)
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))[0];
  if (diaria) {
    add('f1', 'próxima diária', `${diaria.titulo} · ${fmtData(diaria.data, { ano: false })}`
      + (diaria.confirmado === false ? ' · a confirmar' : ''),
    { dossie: dossieEvento(diaria, hj) });
  }

  // O que está pegando fogo agora.
  const al = alertas();
  const urgentes = al.filter((a) => a.urg >= 3);
  if (urgentes.length) {
    add('f3', 'urgente', `${urgentes.length} ${urgentes.length === 1 ? 'coisa' : 'coisas'} para resolver hoje`,
      { lista: { titulo: 'Para resolver hoje', itens: urgentes } });
  }

  // Nota fiscal que não chega trava pagamento.
  if (can(u, 'contas.ver')) {
    const nf = paraCobrar().length;
    if (nf) {
      add('f3', 'nota fiscal', `${nf} ${nf === 1 ? 'nota atrasada' : 'notas atrasadas'} para cobrar`,
        { rota: '#/pedidos-nf' });
    }
    const vencidas = store.doProjeto('contas')
      .filter((c) => c.status === 'aberto' && c.tipo === 'pagar' && (diasAte(c.venc) ?? 9) < 0);
    if (vencidas.length) {
      add('f3', 'vencido',
        `${vencidas.length} ${vencidas.length === 1 ? 'conta vencida' : 'contas vencidas'}`,
        { lista: { titulo: 'Contas vencidas', itens: vencidas.map(dossieConta) } });
    }
  }

  // A próxima entrega ao cliente.
  const ent = store.doProjeto('entregas')
    .filter((e) => e.status !== 'entregue' && e.prazo)
    .sort((a, b) => String(a.prazo).localeCompare(String(b.prazo)))[0];
  if (ent) {
    add('f4', 'próxima entrega', `${ent.titulo} · ${emDias(diasAte(ent.prazo))}`,
      { dossie: dossieEntrega(ent) });
  }

  // Onde o contrato está no tempo.
  const ctr = store.doProjeto('contratos').find((c) => c.tipo === 'cliente');
  const p = store.projeto || {};
  const de = ctr?.assinado_em || p.inicio;
  const ate = ctr?.prazo_entrega || p.entrega;
  if (de && ate) {
    const total = Math.max(1, (new Date(ate) - new Date(de)) / 86400000);
    const andado = Math.round(Math.max(0, Math.min(1, (new Date(hj) - new Date(de)) / 86400000 / total)) * 100);
    add('f5', 'contrato', `${andado}% do prazo · entrega ${fmtData(ate, { ano: false })}`,
      { rota: '#/contratos' });
  }

  // O dinheiro entra por último e só para quem pode ver.
  if (can(u, 'orcamento.ver')) {
    const f = financeiro();
    add('f5', 'orçamento', `${fmtMoneyShort(f.comprometido)} de ${fmtMoneyShort(f.orcado)} comprometidos`,
      { rota: '#/financeiro' });
  }

  // Quem está de viagem marcada nos próximos dias.
  const emBreve = vs.find((v) => (diasAte(v.ida) ?? 99) >= 0 && (diasAte(v.ida) ?? 99) <= 7);
  if (emBreve && (emBreve.participantes || []).length) {
    add('f4', 'quem vai', emBreve.participantes.map(nomeMembro).join(', '),
      { dossie: dossieViagem(emBreve, false) });
  }

  return out;
}

/* A faixa desenhada e a faixa ligada são duas chamadas separadas; isto é o
   que uma deixa para a outra, para o índice do botão achar a ação certa. */
let ULTIMOS = [];

/* O trilho aparece duas vezes: quando a primeira cópia termina de sair pela
   esquerda, a segunda já está no lugar dela e o laço não tem emenda. */
export function faixaHTML(u = store.user) {
  const itens = itensDaFaixa(u);
  ULTIMOS = itens;
  if (!itens.length) return '';
  const bloco = itens.map((i, n) => `<button type="button" class="fx-i ${i.cor}" data-fx="${n}">
    <i class="fx-o">${esc(i.olho)}</i><span class="fx-t">${esc(i.txt)}</span>
    <i class="fx-v" aria-hidden="true">→</i></button>`).join('');
  return `<div class="faixa" data-faixa aria-label="Estado do projeto">
    <div class="fx-trilho" data-fx-trilho>
      <div class="fx-copia">${bloco}</div>
      <div class="fx-copia" aria-hidden="true">${bloco}</div>
    </div>
  </div>`;
}

/* Quando a linha fala de um monte de coisas, ela abre o monte — e cada uma
   dali abre o seu próprio dossiê. Um número sem a lista atrás é só susto. */
function abrirLista(titulo, itens) {
  const corpo = el(`<div class="ds"><div class="ds-lista">${itens.map((a, n) => `
    <button type="button" class="ds-l" data-n="${n}">
      <span class="ds-lg"><span class="ds-lt">${esc(a.texto)}</span>
      <span class="ds-ls">${esc(a.detalhe || '')}</span></span>
      <span class="ds-lv">→</span></button>`).join('')}</div></div>`);
  const sh = sheet({ titulo, corpo });
  corpo.querySelectorAll('[data-n]').forEach((b) => {
    b.onclick = () => { sh.close(); abrirDossie(itens[Number(b.dataset.n)]); };
  });
  return sh;
}

/** O que acontece quando se toca numa linha da faixa. */
export function abrirItemDaFaixa(i) {
  if (!i) return;
  if (i.dossie) return abrirDossie(i.dossie);
  if (i.lista) return abrirLista(i.lista.titulo, i.lista.itens);
  if (i.rota) { location.hash = i.rota; }
  return null;
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
  const itens = ULTIMOS;

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
  // letreiro que anda — e de acertar o toque naquilo que se quer abrir.
  const parar = () => faixa.classList.add('parada');
  const seguir = () => faixa.classList.remove('parada');
  faixa.addEventListener('pointerdown', parar);
  faixa.addEventListener('pointerup', seguir);
  faixa.addEventListener('pointercancel', seguir);
  faixa.addEventListener('pointerleave', seguir);
  faixa.addEventListener('mouseenter', parar);
  faixa.addEventListener('mouseleave', seguir);

  // Um alvo que anda é difícil de acertar: enquanto a folha está aberta a
  // faixa fica parada, e ela só volta a correr quando a folha fecha.
  faixa.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-fx]');
    if (!b) return;
    ev.preventDefault();
    const i = itens[Number(b.dataset.fx)];
    if (!i) return;
    faixa.classList.add('parada');
    const sh = abrirItemDaFaixa(i);
    if (!sh?.root) { faixa.classList.remove('parada'); return; }
    // A folha fecha de três jeitos — botão, fundo, tecla —, e todos acabam
    // tirando ela do documento. Vigiar isso é mais honesto do que envolver os
    // três caminhos e esquecer um.
    const olho = new MutationObserver(() => {
      if (sh.root.isConnected) return;
      faixa.classList.remove('parada');
      olho.disconnect();
    });
    olho.observe(document.body, { childList: true });
  });
}
