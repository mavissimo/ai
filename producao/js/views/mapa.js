// Mapa do job. As diárias flutuam num espaço navegável em vez de ficarem numa
// lista: o tempo corre da esquerda para a direita, cada viagem tem sua faixa, e
// o tamanho de cada corpo é o peso dele no projeto. Tocar num deles abre as
// vertentes ali mesmo — equipe, chamada, dinheiro, pendências — em vez de
// empilhar telas. Cada movimento diz uma coisa: o que é hoje pulsa, o que tem
// pendência tem anel, o que já passou perde cor.
import { store, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, sheet, toast } from '../ui.js';
import { esc, fmtMoney, fmtData, diaSemana, hoje, diasAte, iniciais, soma } from '../utils.js';
import { custoDoEvento } from '../calc.js';
import { pendencias, contaDaViagem } from './viagens.js';
import { abrirEvento } from './agenda.js';

const DIA_MS = 86400000;
const parse = (d) => new Date(`${d}T12:00:00`).getTime();
const suave = (t) => 1 - Math.pow(1 - t, 3);

/* Um corpo por diária, mais um por marco de entrega: são as duas coisas que
   têm data marcada e consequência. */
function corpos() {
  const evs = store.doProjeto('eventos')
    .filter((e) => e.tipo === 'diaria' || e.tipo === 'entrega')
    .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  if (!evs.length) return { lista: [], t0: 0, t1: 1, faixas: [] };

  const t0 = parse(evs[0].data);
  const t1 = parse(evs[evs.length - 1].data);
  const viagens = store.doProjeto('viagens');

  // Cada viagem ganha uma faixa horizontal; entregas ficam na faixa de baixo.
  const faixas = [...viagens].sort((a, b) => String(a.ida).localeCompare(String(b.ida)));
  const faixaDe = (e) => {
    if (e.tipo === 'entrega') return faixas.length;
    const i = faixas.findIndex((v) => e.data >= v.ida && e.data <= (v.volta || v.ida));
    return i >= 0 ? i : faixas.length;
  };

  // O eixo é a ordem, não o calendário: duas diárias seguidas ficariam coladas
  // e um mês parado abriria um deserto. A data continua legível no corpo.
  let x = 0, faixaAnt = -1;
  const lista = evs.map((e, i) => {
    const custo = Number(custoDoEvento(e.id)) || 0;
    const v = faixas[faixaDe(e)];
    const pend = v ? pendencias(v).filter((p) => !p.quem || true).length : 0;
    const d = diasAte(e.data);
    const f = faixaDe(e);
    // Espaço maior quando muda de viagem: o intervalo vira respiro visual.
    x += (i === 0 ? 0 : (f !== faixaAnt ? 1.7 : 1));
    faixaAnt = f;
    return {
      id: e.id, ev: e, viagem: v || null,
      faixa: f, ordem: x,
      raio: e.tipo === 'entrega' ? 27 : 23 + Math.min(13, Math.sqrt(custo / 100000) * 3),
      custo, pend,
      dias: d,
      estado: d < 0 ? 'passou' : d === 0 ? 'hoje' : e.confirmado === false ? 'previsto' : 'futuro',
      // A semente dá a cada corpo uma respiração própria, para o campo não
      // pulsar em bloco como um letreiro.
      semente: (i * 137.508) % 360
    };
  });
  // Três faixas em rodízio, não uma por viagem: onze corredores não cabem numa
  // tela de celular. A linha que liga os corpos é o que agrupa a viagem, e o
  // zigue-zague dá o movimento que uma fileira reta não teria.
  const usadas = [...new Set(lista.map((c) => c.faixa))].sort((a, b) => a - b);
  const mapaFaixa = new Map(usadas.map((f, i) => [f, i % 3]));
  for (const c of lista) c.faixa = mapaFaixa.get(c.faixa);
  return { lista, t0, t1, faixas, largura: x, nFaixas: Math.min(3, usadas.length) };
}

let camera = { x: 0, y: 0, z: 1 };
let aberto = null;      // id do corpo expandido
let camada = null;      // vertente aberta dentro dele

export function render() {
  const u = store.user;
  const node = el('<div class="mapa-tela"></div>');
  const { lista, faixas, nFaixas } = corpos();

  if (!lista.length) {
    node.innerHTML = '<div class="empty">Sem diárias para desenhar ainda.</div>';
    return { titulo: 'Mapa', node };
  }

  const PASSO = 76, ALTURA_FAIXA = 98;
  const largura = lista[lista.length - 1].ordem;
  const LARG = 200 + largura * PASSO;
  const ALT = 70 + nFaixas * ALTURA_FAIXA;

  node.innerHTML = `
    <div class="mapa-topo">
      <div>
        <div class="mapa-t">Mapa do job</div>
        <div class="mapa-s">${lista.filter((c) => c.estado !== 'passou').length} pela frente ·
          ${lista.filter((c) => c.estado === 'passou').length} já rodadas</div>
      </div>
      <button class="btn sm gho" data-centrar>Hoje</button>
    </div>
    <div class="mapa-campo" data-campo>
      <div class="mapa-mundo" data-mundo style="width:${LARG}px;height:${ALT}px">
        <svg class="mapa-linhas" width="${LARG}" height="${ALT}" aria-hidden="true"></svg>
        <div class="mapa-hoje" data-hoje></div>
      </div>
    </div>
    <div class="mapa-legenda">
      <span><i class="p-hoje"></i>hoje</span>
      <span><i class="p-futuro"></i>confirmado</span>
      <span><i class="p-previsto"></i>a confirmar</span>
      <span><i class="p-passou"></i>já rodou</span>
      <span class="mapa-dica">arraste para navegar · toque para abrir</span>
    </div>`;

  const mundo = node.querySelector('[data-mundo]');
  const campo = node.querySelector('[data-campo]');
  const svg = node.querySelector('.mapa-linhas');

  const px = (c) => 100 + c.ordem * PASSO;
  const py = (c) => 82 + c.faixa * ALTURA_FAIXA;

  // A linha de cada viagem: mostra que aquelas diárias são a mesma ida.
  const porFaixa = new Map();
  for (const c of lista) {
    const k = c.viagem?.id || 'solto';
    porFaixa.set(k, [...(porFaixa.get(k) || []), c]);
  }
  svg.innerHTML = [...porFaixa.values()].map((cs) => {
    if (cs.length < 2) return '';
    const a = cs[0], b = cs[cs.length - 1];
    return `<line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}"
      class="mapa-eixo ${a.estado === 'passou' ? 'passou' : ''}" />`;
  }).join('') + lista.filter((c, i) => i === 0 || lista[i - 1].viagem?.id !== c.viagem?.id)
    .map((c) => (c.viagem
      ? `<text x="${px(c)}" y="${py(c) - 46}" class="mapa-rot" text-anchor="middle">${
        esc(c.viagem.destino || c.viagem.titulo).slice(0, 18)}</text>`
      : '')).join('');

  // Marca de hoje, para o olho achar o presente sem procurar.
  const hj = hoje();
  const passados = lista.filter((c) => c.ev.data < hj);
  const antes = passados[passados.length - 1];
  const depois = lista.find((c) => c.ev.data >= hj);
  const xHoje = antes && depois ? (px(antes) + px(depois)) / 2
    : depois ? px(depois) - PASSO / 2 : px(lista[lista.length - 1]) + PASSO / 2;
  const marca = node.querySelector('[data-hoje]');
  marca.style.left = `${xHoje}px`;
  marca.style.height = `${ALT}px`;

  for (const c of lista) {
    const n = el(`<button class="corpo ${c.estado}" data-corpo="${c.id}"
      style="left:${px(c)}px;top:${py(c)}px;--r:${c.raio}px;--seed:${c.semente}deg">
      ${c.pend && c.estado !== 'passou' ? `<i class="anel"></i>` : ''}
      <span class="corpo-n">${esc(fmtData(c.ev.data).slice(0, 5))}</span>
      <span class="corpo-l">${esc(rotulo(c))}</span>
    </button>`);
    n.onclick = () => abrirCorpo(c, n, node);
    mundo.append(n);
  }

  ligarNavegacao(campo, mundo);
  node.querySelector('[data-centrar]').onclick = () => centrarEm(campo, xHoje);
  requestAnimationFrame(() => centrarEm(campo, xHoje, false));

  return { titulo: 'Mapa', node };
}

function rotulo(c) {
  const t = c.ev.titulo || '';
  return t.replace(/^Filmagem — /, '').replace(/^Entrega d[aeo] /i, '').slice(0, 22);
}

/* Arrastar o campo com o dedo ou o mouse. Sem biblioteca: o campo é um
   contêiner com rolagem, e o arraste move a rolagem. */
function ligarNavegacao(campo, mundo) {
  let arrastando = false, x0 = 0, y0 = 0, sx = 0, sy = 0, moveu = 0;
  const inicio = (e) => {
    const p = e.touches ? e.touches[0] : e;
    arrastando = true; moveu = 0;
    x0 = p.clientX; y0 = p.clientY; sx = campo.scrollLeft; sy = campo.scrollTop;
    campo.classList.add('arrastando');
  };
  const move = (e) => {
    if (!arrastando) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - x0, dy = p.clientY - y0;
    moveu = Math.max(moveu, Math.abs(dx) + Math.abs(dy));
    campo.scrollLeft = sx - dx;
    campo.scrollTop = sy - dy;
    if (e.cancelable && moveu > 8) e.preventDefault();
  };
  const fim = () => { arrastando = false; campo.classList.remove('arrastando'); };
  campo.addEventListener('mousedown', inicio);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', fim);
  campo.addEventListener('touchstart', inicio, { passive: true });
  campo.addEventListener('touchmove', move, { passive: false });
  campo.addEventListener('touchend', fim);
  // Um arraste não deve virar um toque no corpo que estava embaixo do dedo.
  campo.addEventListener('click', (e) => { if (moveu > 8) { e.stopPropagation(); e.preventDefault(); } }, true);
}

function centrarEm(campo, x, animado = true) {
  const alvo = Math.max(0, x - campo.clientWidth / 2);
  if (!animado || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    campo.scrollLeft = alvo;
    return;
  }
  const de = campo.scrollLeft, t0 = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / 520);
    campo.scrollLeft = de + (alvo - de) * suave(k);
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

/* ------------------------------------------------------------- camadas ---
   Tocar num corpo abre as vertentes dele em órbita. Tocar numa vertente abre o
   conteúdo dela dentro do mesmo painel, sem trocar de tela — é o "cada coisa
   dentro da coisa" sem virar uma pilha de modais. */
const VERTENTES = [
  { k: 'equipe', icone: '👥', t: 'Quem vai' },
  { k: 'chamada', icone: '⏰', t: 'Chamada' },
  { k: 'dinheiro', icone: '💸', t: 'Dinheiro' },
  { k: 'pendencias', icone: '⚠️', t: 'Pendências' },
  { k: 'local', icone: '📍', t: 'Onde' },
  { k: 'viagem', icone: '✈️', t: 'A viagem' }
];

function abrirCorpo(c, node, raiz) {
  const u = store.user;
  const e = c.ev;
  const corpo = el('<div class="orb"></div>');
  let atual = null;

  const pintar = () => {
    const conf = store.doProjeto('confirmacoes').filter((x) => x.ref_id === e.id);
    const pend = c.viagem ? pendencias(c.viagem) : [];
    corpo.innerHTML = `
      <div class="orb-cab ${c.estado}">
        <div class="orb-data">${esc(diaSemana(e.data))} · ${esc(fmtData(e.data, { longo: true }))}</div>
        <div class="orb-tit">${esc(e.titulo)}</div>
        <div class="orb-sub">${esc([e.local, c.dias === 0 ? 'é hoje'
          : c.dias > 0 ? `em ${c.dias} dias` : `${Math.abs(c.dias)} dias atrás`,
          e.confirmado === false ? 'data a confirmar' : ''].filter(Boolean).join(' · '))}</div>
      </div>

      <div class="orb-vert">${VERTENTES.map((v) => `
        <button class="vert ${atual === v.k ? 'on' : ''}" data-v="${v.k}">
          <span class="vert-i">${v.icone}</span><span class="vert-t">${v.t}</span>
          ${v.k === 'pendencias' && pend.length ? `<span class="vert-n">${pend.length}</span>` : ''}
        </button>`).join('')}</div>

      <div class="orb-conteudo">${atual ? conteudo(atual, c, conf, pend, u) : `
        <div class="orb-vazio">Toque numa das vertentes para abrir.</div>`}</div>

      <button class="btn wide gho" data-abrir-classico>Abrir na agenda clássica</button>`;

    corpo.querySelectorAll('[data-v]').forEach((b) => {
      b.onclick = () => { atual = atual === b.dataset.v ? null : b.dataset.v; pintar(); };
    });
    corpo.querySelector('[data-abrir-classico]').onclick = () => { sh.close(); abrirEvento(e); };
    corpo.querySelectorAll('[data-ok]').forEach((n) => {
      n.onclick = async () => {
        const p = pend.find((x) => x.id === n.dataset.ok);
        if (!p?.resolver) return;
        await p.resolver();
        toast('Feito.');
        pintar(); store.emit();
      };
    });
  };

  node.classList.add('aceso');
  pintar();
  const sh = sheet({ titulo: rotulo(c), corpo, aoFechar: () => node.classList.remove('aceso') });
}

function conteudo(k, c, conf, pend, u) {
  const e = c.ev;
  if (k === 'equipe') {
    const gente = e.participantes || [];
    return !gente.length ? vazio('Ninguém marcado nesta diária.') : `
      <div class="card lista">${gente.map((id) => {
        const cf = conf.find((x) => x.membro_id === id && x.tipo === 'presenca');
        return `<div class="row">
          <span class="avatar">${esc(iniciais(nomeMembro(id)))}</span>
          <span class="g"><span class="t">${esc(nomeMembro(id))}</span>
            <span class="s">${esc(store.get('membros', id)?.funcao || '')}</span></span>
          ${cf ? `<span class="r"><span class="tag ${cf.status === 'confirmado' ? 'ok' : 'warn'}">
            ${cf.status === 'confirmado' ? 'confirmou' : 'pendente'}</span></span>` : ''}
        </div>`;
      }).join('')}</div>`;
  }
  if (k === 'chamada') {
    const ch = e.chamadas || [];
    const linhas = String(e.roteiro_dia || '').split('\n').filter((l) => l.trim());
    return `${e.hora_inicio ? `<div class="orb-grande">${esc(e.hora_inicio)}${e.hora_fim
      ? ` <span>→ ${esc(e.hora_fim)}</span>` : ''}</div>` : ''}
      ${ch.length ? `<div class="card lista">${ch.map((x) => `<div class="row">
        <span class="g"><span class="t">${esc(nomeMembro(x.membro_id))}</span>
          <span class="s">${esc(x.obs || '')}</span></span>
        <span class="r"><span class="v">${esc(x.hora)}</span></span></div>`).join('')}</div>` : ''}
      ${linhas.length ? `<div class="card"><div class="tl">${linhas.map((l) => `
        <div class="n"><div class="row"><span class="g"><span class="t"
          style="white-space:normal;font-weight:500">${esc(l)}</span></span></div></div>`).join('')}</div></div>` : ''}
      ${!e.hora_inicio && !ch.length && !linhas.length ? vazio('Sem ordem do dia ainda.') : ''}`;
  }
  if (k === 'dinheiro') {
    if (!can(u, 'orcamento.ver')) return vazio('Sem acesso aos valores.');
    const lan = store.doProjeto('lancamentos').filter((l) => l.evento_id === e.id);
    return `<div class="orb-grande">${fmtMoney(c.custo)}<span>gasto neste dia</span></div>
      ${lan.length ? `<div class="card lista">${lan.map((l) => `<div class="row">
        <span class="g"><span class="t">${esc(l.descricao)}</span>
          <span class="s">${esc([l.rubrica, l.membro_id ? nomeMembro(l.membro_id) : ''].filter(Boolean).join(' · '))}</span></span>
        <span class="r"><span class="v">${fmtMoney(l.valor_cents)}</span></span></div>`).join('')}</div>`
      : vazio('Nenhum gasto lançado neste dia.')}`;
  }
  if (k === 'pendencias') {
    if (!pend.length) return vazio('Nada pendente nesta viagem.');
    return `<div class="card lista">${pend.map((p) => `
      <div class="row ${p.resolver ? 'act sem-seta' : ''}" ${p.resolver ? `data-ok="${p.id}"` : ''}>
        <span class="g"><span class="t" style="white-space:normal">${esc(p.texto)}</span>
          <span class="s">${esc(p.quem ? nomeMembro(p.quem) : 'sem dono')}</span></span>
        ${p.resolver ? '<span class="r"><span class="tag ok">feito?</span></span>' : ''}
      </div>`).join('')}</div>`;
  }
  if (k === 'local') {
    const loc = store.doProjeto('locacoes').find((l) => e.local && e.local.includes(l.cidade));
    const end = e.endereco || loc?.obs || '';
    return `${e.local ? `<div class="orb-grande" style="font-size:22px">${esc(e.local)}</div>` : ''}
      ${end ? `<div class="card tight"><div class="row"><span class="g">
        <span class="t" style="white-space:normal;font-weight:400">${esc(end)}</span></span></div></div>` : ''}
      ${e.levar ? `<div class="sec"><div class="sec-t">Levar</div></div>
        <div class="card tight"><div class="row"><span class="g"><span class="t"
          style="white-space:normal;font-weight:400">${esc(e.levar)}</span></span></div></div>` : ''}
      ${!e.local && !end ? vazio('Sem local definido.') : ''}`;
  }
  if (k === 'viagem') {
    if (!c.viagem) return vazio('Esta data não pertence a nenhuma viagem.');
    const cv = contaDaViagem(c.viagem);
    return `<div class="orb-grande" style="font-size:19px">${esc(c.viagem.titulo)}</div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Quando</span>
          <span class="t">${esc(fmtData(c.viagem.ida))} → ${esc(fmtData(c.viagem.volta))}</span></span></div>
        <div class="row"><span class="g"><span class="s">Orçado</span>
          <span class="t">${fmtMoney(cv.orcado)}</span></span>
          <span class="r"><span class="v">${fmtMoney(cv.fechado)}</span>
            <div class="small muted">fechado</div></span></div>
        ${cv.faltando.length ? `<div class="row"><span class="g"><span class="s">Falta fechar</span>
          <span class="t">${cv.faltando.map((i) => i.t).join(', ')}</span></span></div>` : ''}
      </div>`;
  }
  return '';
}

const vazio = (t) => `<div class="orb-vazio">${esc(t)}</div>`;
