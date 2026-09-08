// O dossiê de uma pendência.
//
// Uma lista de alertas só diz *o quê*. Quem chega no app sem contexto — ou
// volta nele depois de duas semanas de estrada — precisa saber mais: de onde
// aquilo apareceu, por que precisa ser resolvido, como se resolve e o que está
// preso esperando. Sem isso a pessoa toca no aviso, olha, não entende o que se
// espera dela, e o aviso fica ali para sempre.
//
// Cada alerta em `notify.js` já carrega `origem`, `porque` e `como` escritos à
// mão, porque explicação genérica não explica nada. O que este módulo faz é
// montar a leitura e, a partir da `ref` do alerta, descobrir sozinho as duas
// pontas que ninguém escreve: do que aquilo depende e o que trava.
import { store, nomeMembro } from './store.js';
import { el, sheet, toast } from './ui.js';
import { esc, fmtMoney, fmtData, prazoTxt, diasAte } from './utils.js';

/* ------------------------------------------------------------- as pontas ---
   Depende = o que precisa acontecer antes desta coisa andar.
   Trava    = o que está parado esperando por ela.
   Sai do próprio registro, não de um campo que alguém teria que preencher. */
function relacoes(ref) {
  const depende = [];
  const trava = [];
  if (!ref?.t || !ref.id) return { depende, trava };
  const r = store.get(ref.t, ref.id);
  if (!r) return { depende, trava };

  const item = (t, sub, rota) => ({ t, sub, rota });
  const aberta = (x) => (x.status || (x.feito ? 'feita' : 'aberta')) !== 'feita';

  if (ref.t === 'tarefas') {
    const et = r.etapa_id && store.get('etapas', r.etapa_id);
    const vg = r.viagem_id && store.get('viagens', r.viagem_id);
    const ev = r.evento_id && store.get('eventos', r.evento_id);
    if (ev) depende.push(item(ev.titulo, `acontece em ${fmtData(ev.data)}`, '#/mapa'));
    if (vg) depende.push(item(`Viagem ${vg.numero} — ${vg.destino || ''}`,
      `${fmtData(vg.ida)} a ${fmtData(vg.volta)}`, '#/viagens'));
    if (et) trava.push(item(et.nome, 'a etapa só fecha quando as tarefas dela fecham', '#/etapas'));
    if (vg) {
      const irmas = store.doProjeto('tarefas')
        .filter((x) => x.viagem_id === vg.id && x.id !== r.id && aberta(x));
      if (irmas.length) {
        trava.push(item(`Mais ${irmas.length} tarefa(s) desta viagem`,
          'a viagem só está pronta quando todas fecham', '#/viagens'));
      }
    }
  }

  if (ref.t === 'contas') {
    const vg = r.viagem_id && store.get('viagens', r.viagem_id);
    if (r.tipo === 'pagar') {
      if (r.nf_status === 'a_receber') {
        depende.push(item('A nota fiscal de quem vai receber',
          r.nf_pedido_em ? `pedida em ${fmtData(r.nf_pedido_em)}` : 'ainda não pedida',
          '#/pedidos-nf'));
      }
      if (r.membro_id) {
        trava.push(item(nomeMembro(r.membro_id), 'está esperando este pagamento', '#/equipe'));
      }
      if (vg) trava.push(item(`Fechamento da viagem ${vg.numero}`,
        'a viagem não fecha com conta em aberto', '#/viagens'));
    } else {
      if (r.nf_status === 'a_receber' || !r.nf_numero) {
        depende.push(item('A nossa nota fiscal', 'o cliente não paga sem ela', '#/financeiro'));
      }
      trava.push(item('O caixa da produtora',
        `${fmtMoney(r.valor_cents)} que ainda não entrou`, '#/financeiro'));
      const abertas = store.doProjeto('contas')
        .filter((c) => c.tipo === 'pagar' && c.status === 'aberto');
      if (abertas.length) {
        trava.push(item(`${abertas.length} conta(s) a pagar`,
          'é deste dinheiro que elas saem', '#/pagamentos'));
      }
    }
  }

  if (ref.t === 'confirmacoes') {
    const ev = r.ref_id && store.get('eventos', r.ref_id);
    if (ev) depende.push(item(ev.titulo, `${fmtData(ev.data)} · ${ev.local || ''}`, '#/mapa'));
    if (r.membro_id) trava.push(item(nomeMembro(r.membro_id),
      'a produção não fecha a logística sem esta resposta', '#/equipe'));
  }

  if (ref.t === 'eventos') {
    const conf = store.doProjeto('confirmacoes').filter((c) => c.ref_id === r.id
      && c.status === 'pendente');
    if (r.confirmado === false) {
      depende.push(item('Confirmação da Fundação',
        'cláusula 4.3 — dez dias úteis de antecedência', '#/contratos'));
    }
    if (conf.length) depende.push(item(`${conf.length} confirmação(ões) da equipe`,
      'quem ainda não respondeu', '#/equipe'));
    const dep = store.doProjeto('entregas')
      .filter((e) => e.status !== 'entregue' && e.prazo && e.prazo > r.data);
    if (dep.length) trava.push(item(dep[0].titulo,
      `entrega marcada para ${fmtData(dep[0].prazo)}`, '#/agenda'));
  }

  if (ref.t === 'entregas') {
    const apv = store.doProjeto('aprovacoes').filter((a) => a.status === 'enviado');
    if (apv.length) depende.push(item(apv[0].titulo, 'rodada de aprovação em aberto', '#/aprovacoes'));
    const p2 = store.doProjeto('contas').find((c) => c.tipo === 'receber'
      && c.status === 'aberto' && c.parcela);
    if (p2) trava.push(item(`Parcela ${p2.parcela} — ${fmtMoney(p2.valor_cents)}`,
      'vence 30 dias depois da entrega final', '#/contas'));
  }

  if (ref.t === 'etapas') {
    const tar = store.doProjeto('tarefas').filter((t) => t.etapa_id === r.id && aberta(t));
    if (tar.length) trava.push(item(`${tar.length} tarefa(s) desta etapa`,
      'ninguém consegue tocar enquanto está travada', '#/tarefas'));
    const seguintes = store.doProjeto('etapas')
      .filter((e) => e.ordem > (r.ordem || 0) && e.status !== 'feito');
    if (seguintes.length) trava.push(item(`${seguintes.length} etapa(s) depois desta`,
      'o cronograma inteiro anda atrás', '#/etapas'));
  }

  if (ref.t === 'lancamentos') {
    trava.push(item('O quanto já foi gasto',
      'gasto pendente não entra na conta do orçamento', '#/financeiro'));
  }

  if (ref.t === 'caixa') {
    trava.push(item('O fechamento da caixinha',
      'dinheiro sem comprovante não entra em rubrica nenhuma', '#/caixa'));
  }

  if (ref.t === 'fontes') {
    trava.push(item('Todo número que veio desta fonte',
      'se ela mudou e ninguém trouxe, a tela está velha', '#/fontes'));
  }

  return { depende, trava };
}

/* --------------------------------------------------------------- a folha --- */
const bloco = (olho, txt) => txt
  ? `<section class="ds-b"><div class="ds-o">${esc(olho)}</div><p class="ds-p">${esc(txt)}</p></section>`
  : '';

const lista = (olho, itens) => !itens.length ? '' : `<section class="ds-b">
  <div class="ds-o">${esc(olho)}</div>
  <div class="ds-lista">${itens.map((i) => `
    <a class="ds-l" href="${i.rota}"><span class="ds-lg">
      <span class="ds-lt">${esc(i.t)}</span>
      <span class="ds-ls">${esc(i.sub || '')}</span></span>
      <span class="ds-lv">→</span></a>`).join('')}</div>
</section>`;

/**
 * Abre o dossiê de um alerta enriquecido.
 * @param {object} a alerta de `notify.js` — precisa de texto, e de preferência
 *   origem / porque / como / ref
 */
export function abrirDossie(a) {
  if (!a) return;
  const { depende, trava } = relacoes(a.ref);
  const urg = a.urg >= 3 ? 'Urgente' : a.urg === 2 ? 'Precisa de você' : 'Fique de olho';

  const corpo = el(`<div class="ds">
    <div class="ds-cab">
      <div class="ds-urg ${a.urg >= 3 ? 'alta' : a.urg === 2 ? 'media' : ''}">${esc(urg)}</div>
      <h3 class="ds-tit">${esc(a.texto)}</h3>
      ${a.detalhe ? `<div class="ds-sub">${esc(a.detalhe)}</div>` : ''}
    </div>
    ${bloco('Por que apareceu aqui', a.origem)}
    ${bloco('Por que precisa ser resolvida', a.porque)}
    ${bloco('Como se resolve', a.como)}
    ${lista('Depende de', depende)}
    ${lista('Trava', trava)}
    ${!a.origem && !a.porque && !a.como ? `<p class="ds-p" style="color:var(--tx3)">
      Este aviso ainda não tem explicação escrita. Abra onde ele vive para ver o que é.</p>` : ''}
  </div>`);

  const rod = el('<div style="display:flex;gap:8px;width:100%"></div>');
  const bIr = el(`<a class="btn pri" style="flex:1">${a.rota === '#/mapa' ? 'Abrir no mapa' : 'Ir resolver'}</a>`);
  bIr.href = a.rota || '#/';
  bIr.onclick = () => sh.close();
  const bFechar = el('<button class="btn gho" style="flex:0 0 34%">Depois</button>');
  bFechar.onclick = () => sh.close();
  rod.append(bFechar, bIr);

  const sh = sheet({ titulo: 'Entender', corpo, rodape: rod });
  // Ir para um destino de dentro do dossiê fecha a folha junto.
  corpo.querySelectorAll('.ds-l').forEach((n) => { n.onclick = () => sh.close(); });
  return sh;
}

/** Versão para uma tarefa qualquer, montada na hora a partir do registro. */
export function dossieDaTarefa(t) {
  if (!t) return null;
  const d = diasAte(t.prazo);
  const atrasada = d !== null && d < 0;
  return {
    texto: t.titulo,
    detalhe: [t.responsavel_id ? nomeMembro(t.responsavel_id) : 'sem dono',
      t.prazo ? prazoTxt(t.prazo) : 'sem prazo'].join(' · '),
    urg: atrasada ? 3 : d === 0 ? 2 : 1,
    rota: '#/tarefas',
    ref: { t: 'tarefas', id: t.id },
    origem: t.descricao
      || (t.viagem_id ? 'Nasceu junto com a viagem: toda viagem abre a mesma lista de '
        + 'providências, com o prazo contado a partir do embarque.'
        : t.etapa_id ? 'Faz parte de uma etapa do cronograma do projeto.'
          : 'Alguém da produção criou esta tarefa.'),
    porque: atrasada
      ? `O prazo era ${fmtData(t.prazo)}. Tarefa de produção quase nunca está sozinha — `
        + 'normalmente ela é o que destrava a etapa ou a viagem em que está pendurada.'
      : 'É o que precisa estar pronto para o que vem depois não parar.',
    como: (t.remarcacoes || []).length
      ? `Já foi remarcada ${t.remarcacoes.length} vez(es). Marque como feita, ou remarque de novo `
        + 'com uma data que você consiga cumprir — o app guarda cada mudança.'
      : 'Marque como feita quando terminar. Se a data não der, remarque: remarcar avisa quem '
        + 'está esperando, sumir não.'
  };
}
