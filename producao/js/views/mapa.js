// Mapa do job — a tela inteira, uma viagem de cada vez.
//
// Cada viagem é uma estação que ocupa a tela toda e você desliza de lado para
// ir de uma à outra. Dentro dela as diárias ficam soltas no espaço, do tamanho
// do que custam. Tocar numa diária não abre outra tela: ela mesma cresce até
// virar a tela, e volta a encolher para o lugar de onde saiu. Dentro dela, cada
// assunto abre no próprio lugar — nada empilha, nada some.
import { store, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, toast } from '../ui.js';
import { esc, fmtMoney, fmtMoneyShort, fmtData, diaSemana, hoje, diasAte, iniciais, soma } from '../utils.js';
import { custoDoEvento, financeiro } from '../calc.js';
import { pendencias, contaDaViagem } from './viagens.js';
import { abrirEvento } from './agenda.js';
import { brasilSVG, coord } from '../geo.js';
import { camposLancamento } from './financeiro.js';
import { abrirForm, confirmar } from '../ui.js';
import { textoPedido, assuntoPedido, linkEmail, linkWhats } from '../nf.js';

const CURVA = 'cubic-bezier(.32,.72,0,1)';   // a curva de folha do iOS
const menosMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------- os dados ---
   Uma estação por viagem, mais uma no fim para o que acontece na ilha da pós,
   que não tem viagem nenhuma. Estação sem nada dentro não vira página. */
function estacoes() {
  const evs = store.doProjeto('eventos')
    .filter((e) => e.tipo === 'diaria' || e.tipo === 'entrega')
    .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const viagens = [...store.doProjeto('viagens')]
    .sort((a, b) => String(a.ida).localeCompare(String(b.ida)));

  const daViagem = (e) => viagens.find((v) => e.tipo === 'diaria'
    && e.data >= v.ida && e.data <= (v.volta || v.ida)) || null;

  const corpo = (e) => {
    const custo = Number(custoDoEvento(e.id)) || 0;
    const d = diasAte(e.data);
    return {
      id: e.id, ev: e, custo, dias: d,
      viagem: daViagem(e),
      estado: d === 0 ? 'hoje' : d < 0 ? 'passou'
        : e.confirmado === false ? 'previsto' : 'futuro'
    };
  };

  const lista = viagens.map((v) => {
    const meus = evs.filter((e) => daViagem(e) === v).map(corpo);
    return {
      tipo: 'viagem', chave: 'v' + v.id, viagem: v, corpos: meus,
      titulo: v.destino || v.titulo || 'Viagem',
      periodo: [v.ida, v.volta || v.ida]
    };
  }).filter((s) => s.corpos.length);

  const soltos = evs.filter((e) => !daViagem(e)).map(corpo);
  if (soltos.length) {
    lista.push({
      tipo: 'pos', chave: 'pos', viagem: null, corpos: soltos,
      titulo: 'Pós e entregas',
      periodo: [soltos[0].ev.data, soltos[soltos.length - 1].ev.data]
    });
  }
  for (const s of lista) {
    const d = s.corpos.map((c) => c.dias);
    s.dias = d.some((x) => x === 0) ? 0
      : d.every((x) => x < 0) ? Math.max(...d) : Math.min(...d.filter((x) => x >= 0));
    s.passou = s.corpos.every((c) => c.dias < 0);
    s.pend = s.viagem ? pendencias(s.viagem).length : 0;
  }
  return lista;
}

/* ------------------------------------------------------------- a tela ---- */
export function render() {
  const lista = estacoes();
  const node = el('<div class="mapa"></div>');
  if (!lista.length) {
    node.innerHTML = '<div class="empty">Sem diárias para desenhar ainda.</div>';
    return { titulo: 'Mapa', node, cheio: true };
  }

  // Abre já na estação de hoje — ou na próxima que ainda vai acontecer.
  let inicial = lista.findIndex((s) => s.dias === 0);
  if (inicial < 0) inicial = lista.findIndex((s) => !s.passou);
  if (inicial < 0) inicial = lista.length - 1;

  const nViagens = lista.filter((s) => s.tipo === 'viagem').length;
  node.innerHTML = `
    <div class="mapa-luz" data-luz></div>
    <div class="mapa-trilho" data-trilho>
      ${paisHTML(lista, nViagens)}
      ${lista.map((s, i) => estacaoHTML(s, i, nViagens)).join('')}
    </div>
    <div class="mapa-regua" data-regua role="tablist" aria-label="Viagens">
      <button class="tick pais" data-ir="0" role="tab" aria-label="O job inteiro"><i></i></button>
      ${lista.map((s, i) => `<button class="tick ${s.passou ? 'passou' : ''}
        ${s.dias === 0 ? 'hoje' : ''}" data-ir="${i + 1}" role="tab"
        aria-label="${esc(s.titulo)}"><i></i></button>`).join('')}
    </div>`;

  const trilho = node.querySelector('[data-trilho]');
  const luz = node.querySelector('[data-luz]');
  const ticks = [...node.querySelectorAll('[data-ir]')];

  // Cada corpo ganha seu lugar no espaço da estação depois que a tela existe:
  // a constelação é calculada com a altura real, não com um chute.
  const pintarCorpos = () => {
    node.querySelectorAll('.est-campo[data-est]').forEach((campo) => {
      const s = lista[Number(campo.dataset.est)];
      const pos = constelacao(s.corpos, campo.clientWidth, campo.clientHeight);
      campo.innerHTML = percursoSVG(pos, s.corpos, campo.clientWidth, campo.clientHeight);
      s.corpos.forEach((c, i) => {
        const p = pos[i];
        const lado = p.lado > 0
          ? `right:${campo.clientWidth - p.x}px`   // ancora pela direita: o
          : `left:${p.x}px`;                        // rótulo ganha a tela toda
        const n = el(`<button class="no ${c.estado} ${p.lado > 0 ? 'dir' : 'esq'}"
          data-no="${c.id}" style="${lado};top:${p.y}px;--d:${p.d}px;--i:${i}">
          <span class="no-bolha">
            <span class="no-dia">${String(c.ev.data).slice(8, 10)}</span>
            <span class="no-mes">${MES[Number(String(c.ev.data).slice(5, 7)) - 1]}</span>
          </span>
          <span class="no-txt">
            <span class="no-t">${esc(titulo(c, s))}</span>
            <span class="no-s">${esc(legenda(c, s))}</span>
          </span>
        </button>`);
        n.onclick = () => abrirCorpo(c, n, node);
        campo.append(n);
      });
    });
  };

  // Régua e luz de fundo acompanham o dedo: o fundo anda mais devagar que o
  // conteúdo, e é isso que dá a sensação de profundidade.
  const aoRolar = () => {
    const k = trilho.scrollLeft / Math.max(1, trilho.clientWidth);
    luz.style.transform = `translate3d(${-k * 42}px,0,0)`;
    luz.style.setProperty('--tom', String(Math.round(k * 26)));
    const at = Math.round(k);
    ticks.forEach((t, i) => t.classList.toggle('on', i === at));
  };
  trilho.addEventListener('scroll', aoRolar, { passive: true });
  ticks.forEach((t, i) => {
    t.onclick = () => trilho.scrollTo({ left: i * trilho.clientWidth,
      behavior: menosMovimento() ? 'auto' : 'smooth' });
  });

  requestAnimationFrame(() => {
    trilho.scrollLeft = (inicial + 1) * trilho.clientWidth;   // +1: o país abre a fila
    pintarPais(node, lista, trilho);
    pintarCorpos();
    aoRolar();
    node.classList.add('pronto');
  });
  // Girar o aparelho não pode embaralhar a constelação.
  const ro = new ResizeObserver(() => {
    const at = Math.round(trilho.scrollLeft / Math.max(1, trilho.clientWidth));
    pintarCorpos();
    pintarPais(node, lista, trilho);
    trilho.scrollLeft = at * trilho.clientWidth;
  });
  ro.observe(trilho);

  return { titulo: 'Mapa', node, cheio: true };
}


/* ------------------------------------------------------------- o país -----
   A primeira página é o job inteiro: o Brasil desenhado, cada destino no seu
   lugar, numerado na ordem em que acontece. É por aqui que se entende o
   tamanho da coisa antes de entrar em qualquer viagem. */
function paisHTML(lista, nViagens) {
  const u = store.user;
  const p = store.projeto || {};
  const feitas = lista.filter((s) => s.tipo === 'viagem' && s.passou).length;
  const diarias = lista.reduce((n, s) => n + s.corpos.filter((c) => c.ev.tipo === 'diaria').length, 0);
  const pend = lista.reduce((n, s) => n + s.pend, 0);
  const f = can(u, 'orcamento.ver') ? financeiro() : null;
  return `<section class="estacao pais" data-i="-1">
    <header class="est-cab">
      <div class="est-olho">O job inteiro <span class="est-ix">${nViagens} destinos</span></div>
      <h2 class="est-tit">${esc(p.nome || 'O job')}</h2>
      <div class="est-sub">${esc(p.cliente || '')} <span class="ponto"></span>
        ${feitas} de ${nViagens} rodadas</div>
    </header>
    <div class="est-campo pais-campo" data-pais></div>
    <footer class="est-pe">
      ${f ? `<div class="pe-item"><b>${fmtMoneyShort(f.contratado)}</b><span>contrato</span></div>
        <div class="pe-item"><b>${fmtMoneyShort(f.comprometido)}</b><span>comprometido</span></div>` : ''}
      <div class="pe-item ${pend ? 'atencao' : ''}"><b>${pend || '—'}</b><span>pendências</span></div>
      <div class="pe-item"><b>${diarias}</b><span>diárias</span></div>
    </footer>
  </section>`;
}

/* O desenho só existe depois que a caixa tem tamanho: aqui ele é medido e
   pintado, e cada pino leva ao seu destino com um toque. */
function pintarPais(node, lista, trilho) {
  const caixa = node.querySelector('[data-pais]');
  if (!caixa) return;
  const larg = caixa.clientWidth, alt = caixa.clientHeight;
  if (!larg || !alt) return;
  const pinos = lista.filter((s) => s.tipo === 'viagem').map((s, i) => ({
    nome: s.titulo, cidade: cidadeDe(s), n: i + 1,
    estado: s.passou ? 'passou' : s.dias === 0 ? 'hoje' : 'futuro'
  }));
  caixa.innerHTML = brasilSVG({ larg, alt, pinos });
  // Um pino é um atalho: leva para a estação daquela viagem.
  caixa.querySelectorAll('.geo-p').forEach((g, i) => {
    g.style.cursor = 'pointer';
    g.onclick = () => trilho.scrollTo({ left: (i + 1) * trilho.clientWidth,
      behavior: menosMovimento() ? 'auto' : 'smooth' });
  });
}

/* A cidade de uma estação sai do destino da viagem ou do local da diária. */
function cidadeDe(s) {
  const v = s.viagem;
  const bruto = v?.destino || s.titulo || '';
  const limpo = bruto.replace(/\s*\([A-Z]{2}\)\s*$/, '').trim();
  if (coord(limpo)) return limpo;
  for (const c of s.corpos) {
    if (coord(c.ev.local)) return c.ev.local;
  }
  return limpo;
}

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function estacaoHTML(s, i, total) {
  const u = store.user;
  const c = s.viagem ? contaDaViagem(s.viagem) : null;
  const quando = periodoTxt(s.periodo[0], s.periodo[1]);
  const estado = s.dias === 0 ? 'é hoje'
    : s.passou ? 'já rodou'
      : s.dias === 1 ? 'amanhã' : `em ${s.dias} dias`;
  return `<section class="estacao ${s.passou ? 'passou' : ''}" data-i="${i}">
    <header class="est-cab">
      <div class="est-olho">${s.tipo === 'viagem'
        ? `Viagem ${esc(s.viagem.numero || i + 1)} de ${total}` : 'Depois das viagens'}</div>
      <h2 class="est-tit">${esc(s.titulo)}</h2>
      <div class="est-sub">${esc(quando)} <span class="ponto"></span> ${esc(estado)}</div>
    </header>
    <div class="est-campo" data-est="${i}"></div>
    <footer class="est-pe">
      ${c && can(u, 'orcamento.ver') ? `
        <div class="pe-item"><b>${fmtMoneyShort(c.fechado)}</b><span>fechado</span></div>
        <div class="pe-item"><b>${fmtMoneyShort(c.orcado)}</b><span>orçado</span></div>` : ''}
      <div class="pe-item ${s.pend ? 'atencao' : ''}">
        <b>${s.pend || '—'}</b><span>${s.pend === 1 ? 'pendência' : 'pendências'}</span></div>
      <div class="pe-item"><b>${s.corpos.length}</b><span>${
        s.corpos.every((x) => x.ev.tipo === 'entrega')
          ? (s.corpos.length === 1 ? 'entrega' : 'entregas')
          : (s.corpos.length === 1 ? 'diária' : 'diárias')}</span></div>
    </footer>
  </section>`;
}

/* Onde cada corpo cai dentro da estação. Não é fileira nem grade: os dias
   descem alternando de lado, ligados por uma linha fina que é o percurso da
   viagem. O grupo fica centrado na vertical — com dois dias eles ocupam o meio
   da tela com folga, com seis eles se espalham até as bordas. O diâmetro vem
   do custo: o dia caro é maior. */
function constelacao(corpos, larg, alt) {
  const n = corpos.length;
  const custos = corpos.map((c) => c.custo);
  const teto = Math.max(1, ...custos);
  // Poucos dias, bolhas generosas; muitos dias, bolhas que ainda cabem.
  const base = Math.max(46, Math.min(n <= 2 ? 140 : n === 3 ? 112 : 88,
    (alt - 24) / (n * 1.35)));
  const ds = custos.map((v) => Math.round(base * (0.74 + 0.26 * Math.sqrt(v / teto))));
  const bolhas = ds.reduce((a, b) => a + b, 0);

  // O vão respira até o grupo ocupar boa parte do campo — a tela é para usar —
  // mas nunca tanto que os dias pareçam soltos um do outro.
  let vao = n > 1
    ? Math.min(base * 1.4, Math.max(base * 0.5, (alt * 0.68 - bolhas) / (n - 1)))
    : 0;
  let total = bolhas + vao * (n - 1);
  // Se não couber, o vão cede antes do tamanho — encostar é pior que apertar.
  if (total > alt - 8 && n > 1) {
    vao = Math.max(10, vao - (total - (alt - 8)) / (n - 1));
    total = bolhas + vao * (n - 1);
  }

  let y = (alt - total) / 2;
  return ds.map((d, i) => {
    const cy = y + d / 2;
    y += d + vao;
    const lado = n === 1 ? 0 : (i % 2 ? 1 : -1);
    const x = n === 1 ? larg / 2 : larg * (lado > 0 ? 0.72 : 0.28);
    return { x: Math.round(x), y: Math.round(cy), d, lado };
  });
}

/* A linha do percurso: liga um dia ao outro na ordem em que acontecem. Fina,
   da cor do separador, tracejada no que já passou. Não decora — diz que
   aqueles dias são a mesma ida. */
function percursoSVG(pos, corpos, larg, alt) {
  if (pos.length < 2) return '';
  const trechos = pos.slice(1).map((p, i) => {
    const a = pos[i];
    const mx = (a.x + p.x) / 2, my = (a.y + p.y) / 2;
    const passou = corpos[i + 1].dias < 0;
    return `<path d="M${a.x} ${a.y} Q${a.x} ${my} ${mx} ${my} T${p.x} ${p.y}"
      class="rota ${passou ? 'passou' : ''}" />`;
  }).join('');
  return `<svg class="est-rota" width="${larg}" height="${alt}" aria-hidden="true">${trechos}</svg>`;
}

const capitalizar = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

const rotulo = (c) => capitalizar((c.ev.titulo || '')
  .replace(/^Filmagem — /, '').replace(/^Entrega d[aeo] /i, '').trim());

/* Se o título do dia só repete o nome da estação, ele não informa nada — e aí
   o que vale mesmo é que dia da semana é, por extenso. */
const SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'];
const semanaLonga = (iso) => SEMANA[new Date(`${String(iso).slice(0, 10)}T12:00:00`).getDay()];

function titulo(c, est) {
  const t = rotulo(c);
  const igual = !t || est.titulo.includes(t) || t.includes(est.titulo);
  return igual ? semanaLonga(c.ev.data) : t;
}

/* A segunda linha diz o que a bolha e o cabeçalho ainda não disseram: a hora da
   chamada, o que o dia custa. Nunca repete o que já está na primeira. */
function legenda(c, est) {
  const p = [];
  if (c.ev.hora_inicio) p.push(c.ev.hora_inicio);
  const l = c.ev.local || '';
  if (l && !est.titulo.includes(l) && !l.includes(est.titulo)) p.push(l);
  if (c.custo && can(store.user, 'orcamento.ver')) p.push(fmtMoneyShort(c.custo));
  if (c.ev.confirmado === false) p.push('a confirmar');
  if (!p.length) p.push(c.ev.tipo === 'entrega' ? 'Entrega' : 'Diária de filmagem');
  return p.join(' · ');
}

/* "9 a 12 de setembro" em vez de "09/09 a 12 set 2026". */
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function periodoTxt(a, b) {
  const [, ma, da] = String(a).slice(0, 10).split('-');
  const [, mb, db] = String(b).slice(0, 10).split('-');
  const dia = (d) => String(Number(d));
  const mes = (m) => MESES_LONGOS[Number(m) - 1];
  if (a === b) return `${dia(da)} de ${mes(ma)}`;
  if (ma === mb) return `${dia(da)} a ${dia(db)} de ${mes(ma)}`;
  return `${dia(da)} de ${mes(ma)} a ${dia(db)} de ${mes(mb)}`;
}

/* ------------------------------------------------------ o corpo que cresce --
   O painel nasce exatamente em cima do corpo tocado, do tamanho dele, e cresce
   até a tela. Ao fechar faz o caminho de volta. É a mesma coisa se abrindo, não
   uma tela nova por cima — que é o que o usuário pediu. */
function abrirCorpo(c, noEl, raiz) {
  const painel = el(`<div class="painel" role="dialog" aria-modal="true"></div>`);
  const de = noEl.querySelector('.no-bolha').getBoundingClientRect();
  raiz.append(painel);

  let camada = null;             // assunto aberto dentro do painel
  const fechar = () => {
    const alvo = noEl.querySelector('.no-bolha').getBoundingClientRect();
    raiz.classList.remove('com-painel');
    if (menosMovimento()) { painel.remove(); return; }
    const p = painel.getBoundingClientRect();
    painel.style.transition = `transform .34s ${CURVA}, opacity .28s ease, border-radius .34s ${CURVA}`;
    painel.style.transformOrigin = 'top left';
    painel.style.borderRadius = '50%';
    painel.style.opacity = '0';
    painel.style.transform = `translate(${alvo.left - p.left}px,${alvo.top - p.top}px)
      scale(${alvo.width / p.width},${alvo.height / p.height})`;
    setTimeout(() => painel.remove(), 340);
  };

  /* Tudo o que dá para fazer com o dia sem sair do mapa. É isto que o
     transforma de painel em lugar de trabalho. */
  const acoes = {
    gasto: () => abrirForm({
      titulo: 'Gasto do dia',
      subtitulo: `${rotulo(c)} · ${fmtData(c.ev.data, { longo: true })}`,
      campos: camposLancamento(store.user, { evento_id: c.ev.id, data: c.ev.data,
        viagem_id: c.viagem?.id || null, tipo: 'saida' }),
      onSave: async (v) => {
        await store.insert('lancamentos', { ...v, tipo: 'saida', evento_id: c.ev.id,
          viagem_id: c.viagem?.id || null });
        toast('Gasto lançado.');
        pintar();
      }
    }),
    viagem: () => { fechar(); location.hash = '#/viagens'; },
    editar: () => { fechar(); abrirEvento(c.ev); }
  };

  const pintar = () => {
    const u = store.user;
    const e = c.ev;
    const conf = store.doProjeto('confirmacoes').filter((x) => x.ref_id === e.id);
    const pend = c.viagem ? pendencias(c.viagem) : [];
    const abas = ASSUNTOS.filter((a) => a.vale(c, u));

    painel.innerHTML = `
      <div class="pn-topo">
        <button class="pn-x" data-fechar aria-label="Fechar">${X}</button>
        <div class="pn-quando">${esc(diaSemana(e.data))}, ${esc(fmtData(e.data, { longo: true }))}</div>
        <h2 class="pn-tit">${esc(rotulo(c))}</h2>
        <div class="pn-sub">${esc([
          e.local, e.hora_inicio ? `chamada ${e.hora_inicio}` : '',
          c.dias === 0 ? 'é hoje' : c.dias > 0 ? `em ${c.dias} dias` : `${-c.dias} dias atrás`,
          e.confirmado === false ? 'data a confirmar' : ''
        ].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="pn-rolo">
        ${abas.map((a) => {
          const n = a.contar ? a.contar(c, { conf, pend }) : 0;
          const on = camada === a.k;
          return `<section class="assunto ${on ? 'on' : ''}">
            <button class="as-cab" data-a="${a.k}" aria-expanded="${on}">
              <span class="as-i">${a.i}</span>
              <span class="as-t">${a.t}</span>
              ${n ? `<span class="as-n ${a.k === 'pendencias' ? 'alerta' : ''}">${n}</span>` : ''}
              <span class="as-v">${CHEVRON}</span>
            </button>
            ${on ? `<div class="as-corpo">${conteudo(a.k, c, conf, pend, u)}</div>` : ''}
          </section>`;
        }).join('')}
        <div class="pn-acoes">
          ${can(u, 'lanc.edit') ? '<button class="btn sm" data-acao="gasto">Lançar gasto</button>' : ''}
          ${c.viagem && can(u, 'contas.ver') ? '<button class="btn sm" data-acao="viagem">Abrir a viagem</button>' : ''}
          ${can(u, 'agenda.edit') ? '<button class="btn sm" data-acao="editar">Editar o dia</button>' : ''}
          <button class="btn sm gho" data-classico>Ver na agenda</button>
        </div>
      </div>`;

    painel.querySelector('[data-fechar]').onclick = fechar;
    painel.querySelector('[data-classico]').onclick = () => { fechar(); abrirEvento(e); };
    painel.querySelectorAll('[data-a]').forEach((b) => {
      b.onclick = () => {
        camada = camada === b.dataset.a ? null : b.dataset.a;
        pintar();
        if (camada) {
          const alvo = painel.querySelector('.assunto.on');
          alvo?.scrollIntoView({ block: 'nearest',
            behavior: menosMovimento() ? 'auto' : 'smooth' });
        }
      };
    });
    // O mapa só pode ser desenhado depois que a caixa tem largura de verdade.
    const cx = painel.querySelector('[data-mapa]');
    if (cx) requestAnimationFrame(() => {
      const larg = cx.clientWidth;
      if (!larg) return;
      cx.innerHTML = brasilSVG({
        larg, alt: Math.round(larg * 1.02), rota: 'São Paulo',
        aceso: cx.dataset.mapa,
        pinos: [{ nome: cx.dataset.mapa, cidade: cx.dataset.mapa, estado: c.estado,
          rotulo: cx.dataset.mapa }]
      });
    });

    painel.querySelectorAll('[data-acao]').forEach((b) => {
      b.onclick = () => acoes[b.dataset.acao]?.();
    });
    painel.querySelectorAll('[data-ok]').forEach((n) => {
      n.onclick = async () => {
        const p = pend.find((x) => x.id === n.dataset.ok);
        if (!p?.resolver) return;
        await p.resolver();
        toast('Feito.');
        pintar();
        store.emit();
      };
    });
  };

  pintar();
  raiz.classList.add('com-painel');

  if (!menosMovimento()) {
    const p = painel.getBoundingClientRect();
    painel.style.transformOrigin = 'top left';
    painel.style.borderRadius = '50%';
    painel.style.opacity = '0';
    painel.style.transform = `translate(${de.left - p.left}px,${de.top - p.top}px)
      scale(${de.width / p.width},${de.height / p.height})`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      painel.style.transition = `transform .46s ${CURVA}, opacity .2s ease, border-radius .46s ${CURVA}`;
      painel.style.transform = 'none';
      painel.style.borderRadius = '';
      painel.style.opacity = '1';
    }));
  }
  painel.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fechar(); });
  painel.tabIndex = -1;
  painel.focus({ preventScroll: true });
}

/* Traços finos, do mesmo peso do resto do app — nada de emoji. */
const sv = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const X = sv('<path d="M6 6l12 12M18 6L6 18"/>');
const CHEVRON = sv('<path d="M9 5l7 7-7 7"/>');

const ASSUNTOS = [
  { k: 'equipe', t: 'Quem vai', vale: () => true,
    i: sv('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6S14 16 14.6 19"/>'
      + '<circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c2.3.2 3.9 1.8 4.4 4.4"/>'),
    contar: (c) => (c.ev.participantes || []).length },
  { k: 'chamada', t: 'Ordem do dia', vale: () => true,
    i: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3 1.8"/>') },
  { k: 'local', t: 'Onde é', vale: (c) => Boolean(c.ev.local || c.ev.endereco),
    i: sv('<path d="M12 21c4.2-4.4 6.3-7.7 6.3-10.3A6.3 6.3 0 0 0 5.7 10.7C5.7 13.3 7.8 16.6 12 21z"/>'
      + '<circle cx="12" cy="10.5" r="2.3"/>') },
  { k: 'dinheiro', t: 'Dinheiro do dia', vale: (c, u) => can(u, 'orcamento.ver'),
    i: sv('<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/>'
      + '<path d="M6.5 12h.01M17.5 12h.01"/>') },
  { k: 'pendencias', t: 'O que falta', vale: (c) => Boolean(c.viagem),
    i: sv('<path d="M12 4.5 21 19.5H3z"/><path d="M12 10v4M12 16.8h.01"/>'),
    contar: (c, x) => x.pend.length },
  { k: 'viagem', t: 'A viagem', vale: (c) => Boolean(c.viagem),
    i: sv('<path d="M3 14.5 21 8l-2.4 6.6a3 3 0 0 1-1.9 1.8L10 18.5 8.5 21 7 16.5z"/>') }
];

function conteudo(k, c, conf, pend, u) {
  const e = c.ev;
  if (k === 'equipe') {
    const gente = e.participantes || [];
    return !gente.length ? vazio('Ninguém marcado nesta diária.') : `
      <div class="pn-lista">${gente.map((id) => {
        const cf = conf.find((x) => x.membro_id === id && x.tipo === 'presenca');
        return `<div class="pn-l">
          <span class="avatar sm">${esc(iniciais(nomeMembro(id)))}</span>
          <span class="g"><span class="t">${esc(nomeMembro(id))}</span>
            <span class="s">${esc(store.get('membros', id)?.funcao || '')}</span></span>
          ${cf ? `<span class="tag ${cf.status === 'confirmado' ? 'ok' : 'warn'}">${
            cf.status === 'confirmado' ? 'confirmou' : 'pendente'}</span>` : ''}
        </div>`;
      }).join('')}</div>`;
  }
  if (k === 'chamada') {
    const ch = e.chamadas || [];
    const linhas = String(e.roteiro_dia || '').split('\n').filter((l) => l.trim());
    if (!e.hora_inicio && !ch.length && !linhas.length) return vazio('Sem ordem do dia ainda.');
    return `${e.hora_inicio ? `<div class="pn-numero">${esc(e.hora_inicio)}${
      e.hora_fim ? `<span>até ${esc(e.hora_fim)}</span>` : ''}</div>` : ''}
      ${ch.length ? `<div class="pn-lista">${ch.map((x) => `<div class="pn-l">
        <span class="g"><span class="t">${esc(nomeMembro(x.membro_id))}</span>
          <span class="s">${esc(x.obs || '')}</span></span>
        <span class="v">${esc(x.hora)}</span></div>`).join('')}</div>` : ''}
      ${linhas.length ? `<ol class="pn-roteiro">${linhas.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : ''}`;
  }
  if (k === 'local') {
    const loc = store.doProjeto('locacoes').find((l) => e.local && e.local.includes(l.cidade));
    const end = e.endereco || loc?.obs || '';
    const mapa = end || e.local;
    const cid = e.local || loc?.cidade || '';
    return `${coord(cid) ? `<div class="pn-mapa" data-mapa="${esc(cid)}"></div>` : ''}
      ${e.local ? `<div class="pn-forte">${esc(e.local)}</div>` : ''}
      ${end ? `<p class="pn-p">${esc(end)}</p>` : ''}
      ${e.levar ? `<p class="pn-p"><b>Levar:</b> ${esc(e.levar)}</p>` : ''}
      ${mapa ? `<a class="btn sm gho" target="_blank" rel="noopener"
        href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapa)}">Abrir no Google Maps</a>` : ''}`;
  }

  if (k === 'dinheiro') {
    const lan = store.doProjeto('lancamentos').filter((l) => l.evento_id === e.id);
    return `<div class="pn-numero">${fmtMoney(c.custo)}<span>gasto neste dia</span></div>
      ${lan.length ? `<div class="pn-lista">${lan.map((l) => `<div class="pn-l">
        <span class="g"><span class="t">${esc(l.descricao)}</span>
          <span class="s">${esc([l.rubrica, l.membro_id ? nomeMembro(l.membro_id) : '']
            .filter(Boolean).join(' · '))}</span></span>
        <span class="v">${fmtMoney(l.valor_cents)}</span></div>`).join('')}</div>`
      : vazio('Nenhum gasto lançado neste dia.')}`;
  }
  if (k === 'pendencias') {
    if (!pend.length) return vazio('Nada pendente nesta viagem.');
    return `<div class="pn-lista">${pend.map((p) => `
      <div class="pn-l">
        <span class="g"><span class="t solta">${esc(p.texto)}</span>
          <span class="s">${esc(p.quem ? nomeMembro(p.quem) : 'sem dono')}</span></span>
        ${p.resolver ? `<button class="btn sm" data-ok="${p.id}">feito</button>` : ''}
      </div>`).join('')}</div>`;
  }
  if (k === 'viagem') {
    const cv = contaDaViagem(c.viagem);
    return `<div class="pn-forte">${esc(c.viagem.titulo)}</div>
      <div class="pn-lista">
        <div class="pn-l"><span class="g"><span class="s">Quando</span>
          <span class="t">${esc(fmtData(c.viagem.ida))} → ${esc(fmtData(c.viagem.volta))}</span></span></div>
        ${can(u, 'orcamento.ver') ? `
        <div class="pn-l"><span class="g"><span class="s">Fechado</span>
          <span class="t">${fmtMoney(cv.fechado)}</span></span>
          <span class="v">${fmtMoney(cv.orcado)}</span></div>` : ''}
        ${cv.faltando.length ? `<div class="pn-l"><span class="g"><span class="s">Falta fechar</span>
          <span class="t solta">${esc(cv.faltando.map((i) => i.t).join(', '))}</span></span></div>` : ''}
      </div>`;
  }
  return '';
}

const vazio = (t) => `<p class="pn-vazio">${esc(t)}</p>`;
