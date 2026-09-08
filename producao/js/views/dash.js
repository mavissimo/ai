// Painel: onde o job está, não quanto ele custa.
//
// A versão antiga abria com o dinheiro em quatro números grandes. Mas quem abre
// o app de manhã não precisa saber quanto sobrou — precisa saber onde a coisa
// está, o que trava o quê e para onde a equipe vai. Então o dinheiro desceu
// para uma faixa fina no fim (ele tem uma aba inteira só dele) e o alto da tela
// virou três desenhos: a linha do contrato, o caminho das etapas com as
// dependências, e o mapa do país.
import { store } from '../store.js';
import { can } from '../perms.js';
import { el, toast } from '../ui.js';
import { esc, fmtMoneyShort, pct, fmtData, prazoTxt, diasAte, hoje, valoresOcultos } from '../utils.js';
import { financeiro } from '../calc.js';
import { FASES } from '../seed.js';
import { alertas, perguntas } from '../notify.js';
import { abrirDossie } from '../dossie.js';
import { brasilSVG, coord } from '../geo.js';

const dias = (a, b) => Math.round(
  (new Date(String(b).slice(0, 10)) - new Date(String(a).slice(0, 10))) / 86400000);

export function render() {
  const u = store.user;
  const p = store.projeto;
  const node = el('<div class="dash"></div>');
  if (!p) {
    node.innerHTML = '<div class="empty">Nenhum projeto ativo. Crie um em Ajustes.</div>';
    return { titulo: 'Painel', node };
  }

  const al = alertas();
  const qs = perguntas();
  const etapas = [...store.doProjeto('etapas')].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  node.innerHTML = `
    ${capaHTML(p, etapas)}
    ${caminhoHTML(etapas)}
    ${mapaHTML()}
    ${perguntasHTML(qs)}
    ${alertasHTML(al)}
    ${dinheiroHTML(u)}`;

  // Os desenhos precisam do tamanho real da caixa, que só existe depois de
  // estar na tela.
  requestAnimationFrame(() => { pintarLinha(node, p); pintarMapa(node); });

  ligar(node, { al, qs, etapas });
  return { titulo: 'Painel', sub: p.nome, node };
}

/* ------------------------------------------------------------------ capa ---
   O job como cartaz: nome grande e, embaixo, a linha do contrato com a
   assinatura de um lado, a entrega do outro e hoje no meio. */
function capaHTML(p, etapas) {
  const feitas = etapas.filter((e) => e.status === 'feito').length;
  return `<section class="bloco largo pn-capa">
    <div class="est-olho">O job <span>${feitas} de ${etapas.length} etapas</span></div>
    <h2 class="capa-tit pn-capa-t">${esc(p.nome)}</h2>
    <div class="pn-linha" data-linha></div>
  </section>`;
}

/* A linha do contrato: assinatura → hoje → entrega, com as viagens marcadas. */
function pintarLinha(node, p) {
  const caixa = node.querySelector('[data-linha]');
  if (!caixa) return;
  const larg = caixa.clientWidth;
  if (!larg) return;
  const ctr = store.doProjeto('contratos').find((c) => c.tipo === 'cliente');
  const de = ctr?.assinado_em || p.inicio;
  const ate = ctr?.prazo_entrega || p.entrega;
  if (!de || !ate) { caixa.remove(); return; }

  const total = Math.max(1, dias(de, ate));
  const x = (d) => 2 + (Math.min(1, Math.max(0, dias(de, d) / total)) * (larg - 4));
  const h = 62;
  const y = 30;
  const hj = hoje();
  const andado = Math.min(1, Math.max(0, dias(de, hj) / total));

  const viagens = store.doProjeto('viagens')
    .filter((v) => v.ida >= de && v.ida <= ate)
    .map((v) => `<line class="pl-v ${v.ida < hj ? 'passou' : ''}"
      x1="${x(v.ida).toFixed(1)}" y1="${y - 7}" x2="${x(v.ida).toFixed(1)}" y2="${y + 7}"/>`).join('');

  caixa.innerHTML = `<svg viewBox="0 0 ${larg} ${h}" width="${larg}" height="${h}" class="pl">
    <line class="pl-base" x1="2" y1="${y}" x2="${larg - 2}" y2="${y}"/>
    <line class="pl-feito" x1="2" y1="${y}" x2="${x(hj).toFixed(1)}" y2="${y}"
      style="--fim:${(x(hj) - 2).toFixed(1)}px"/>
    ${viagens}
    <circle class="pl-hoje" cx="${x(hj).toFixed(1)}" cy="${y}" r="5"/>
    <text class="pl-r esq" x="2" y="14">${esc(fmtData(de, { ano: false }))} · assinatura</text>
    <text class="pl-r dir" x="${larg - 2}" y="14" text-anchor="end">entrega · ${esc(fmtData(ate, { ano: false }))}</text>
    <text class="pl-r hoje" x="${x(hj).toFixed(1)}" y="${y + 22}"
      text-anchor="${andado > 0.8 ? 'end' : andado < 0.2 ? 'start' : 'middle'}">hoje · ${Math.round(andado * 100)}%</text>
  </svg>`;
}

/* --------------------------------------------------------------- caminho ---
   As cinco fases como um trilho: cada uma é um anel que se preenche com o que
   já foi feito, e o fio entre elas é a dependência — nenhuma fase anda de
   verdade antes da anterior fechar. Tocar numa abre as etapas dela. */
function caminhoHTML(etapas) {
  const fases = FASES.map((f) => {
    const lista = etapas.filter((e) => e.fase === f.k);
    const ok = lista.filter((e) => e.status === 'feito').length;
    const fazendo = lista.filter((e) => e.status === 'fazendo').length;
    const travado = lista.filter((e) => e.status === 'travado').length;
    return { ...f, lista, ok, fazendo, travado, p: lista.length ? ok / lista.length : 0 };
  }).filter((f) => f.lista.length);
  // "Em curso" em três fases ao mesmo tempo não diz onde o job está. A marca
  // fica só na primeira que ainda não fechou.
  const atual = fases.findIndex((f) => f.p < 1);
  fases.forEach((f, i) => { f.atual = i === atual; });

  const R = 21, C = 2 * Math.PI * R;
  return `<section class="bloco largo">
    <div class="sec"><div class="sec-t">O caminho</div>
      <a href="#/etapas" class="small">todas as etapas</a></div>
    <div class="cam-caixa"><div class="cam" data-cam>
      ${fases.map((f, i) => `
        <button class="cam-f ${f.travado ? 'travado' : f.p === 1 ? 'feito' : f.atual ? 'agora' : ''}"
          data-fase="${f.k}" style="--i:${i}">
          ${i ? `<span class="cam-fio ${fases[i - 1].p === 1 ? 'aberto' : ''}"></span>` : ''}
          <span class="cam-anel">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle class="cam-t" cx="24" cy="24" r="${R}"/>
              <circle class="cam-p" cx="24" cy="24" r="${R}"
                stroke-dasharray="${C.toFixed(1)}"
                style="--vazio:${(C * (1 - f.p)).toFixed(1)}"/>
            </svg>
            <span class="cam-n">${f.ok}<i>/${f.lista.length}</i></span>
          </span>
          <span class="cam-t2">${esc(f.nome)}</span>
          ${f.travado ? `<span class="cam-tag">${f.travado} travado${f.travado > 1 ? 's' : ''}</span>`
            : f.atual ? '<span class="cam-tag agora">aqui</span>' : ''}
        </button>`).join('')}
    </div></div>
    <div class="cam-abre" data-cam-abre hidden></div>
  </section>`;
}

/* O que aparece quando se toca numa fase: as etapas dela, com as tarefas
   penduradas e o que cada uma segura depois. */
function etapasDaFase(k, etapas) {
  const lista = etapas.filter((e) => e.fase === k);
  const tarefas = store.doProjeto('tarefas');
  const aberta = (t) => (t.status || (t.feito ? 'feita' : 'aberta')) !== 'feita';
  const idx = FASES.findIndex((f) => f.k === k);
  const depois = FASES.slice(idx + 1).map((f) => f.nome);

  return `<div class="cam-lista">
    ${lista.map((e) => {
      const t = tarefas.filter((x) => x.etapa_id === e.id);
      const ab = t.filter(aberta).length;
      const st = e.status === 'feito' ? 'feito' : e.status === 'travado' ? 'travado'
        : e.status === 'fazendo' ? 'agora' : '';
      return `<button class="cam-e ${st}" data-etapa="${e.id}">
        <span class="cam-e-m"></span>
        <span class="cam-e-g">
          <span class="cam-e-t">${esc(e.nome)}</span>
          <span class="cam-e-s">${esc([
            // Etapa fechada não precisa mostrar prazo vencido: ela cumpriu.
            e.status === 'feito' ? 'concluída' : e.prazo ? prazoTxt(e.prazo) : '',
            t.length ? (ab ? `${ab} de ${t.length} tarefas em aberto` : `${t.length} tarefas, todas feitas`) : '',
            e.status === 'travado' && depois.length ? `trava ${depois.length} fase(s) depois` : ''
          ].filter(Boolean).join(' · '))}</span>
        </span>
      </button>`;
    }).join('')}
  </div>`;
}

/* ------------------------------------------------------------------ mapa --- */
function mapaHTML() {
  return `<section class="bloco largo">
    <div class="sec"><div class="sec-t">Onde</div><a href="#/mapa" class="small">abrir o mapa</a></div>
    <a class="pn-mapa-caixa" href="#/mapa" data-mapinha></a>
  </section>`;
}

function pintarMapa(node) {
  const caixa = node.querySelector('[data-mapinha]');
  if (!caixa) return;
  const larg = caixa.clientWidth;
  if (!larg) return;
  const hj = hoje();
  const vs = [...store.doProjeto('viagens')].sort((a, b) => String(a.ida).localeCompare(String(b.ida)));
  const prox = vs.find((v) => (v.volta || v.ida) >= hj) || vs[vs.length - 1];
  const limpo = (v) => String(v?.destino || '').replace(/\s*\([A-Z]{2}\)\s*$/, '').trim();
  const pinos = vs.map((v) => ({
    nome: v.destino, cidade: limpo(v) || v.destino,
    estado: (v.volta || v.ida) < hj ? 'passou' : 'futuro',
    rotulo: v === prox ? undefined : false        // só o próximo leva nome
  })).filter((x) => coord(x.cidade));
  caixa.innerHTML = brasilSVG({
    larg, alt: Math.round(larg * 0.86), pinos,
    rota: 'São Paulo', aceso: limpo(prox) || prox?.destino
  }) + `<div class="pn-mapa-pe">
    <b>${esc(prox?.destino || '—')}</b>
    <span>${esc(quandoTxt(prox, hj))} · ${esc(fmtData(prox?.ida, { ano: false }))}</span>
  </div>`;
}

/* "em 1 dias" não é português, e "em 0 dias" muito menos. */
function quandoTxt(v, hj) {
  if (!v) return 'sem viagem';
  const d = dias(hj, v.ida);
  if (d < 0) return (v.volta || v.ida) >= hj ? 'em curso' : 'já rodou';
  if (d === 0) return 'embarca hoje';
  if (d === 1) return 'embarca amanhã';
  return `em ${d} dias`;
}

/* ------------------------------------------------------- decisões rápidas --- */
function perguntasHTML(qs) {
  if (!qs.length) return '';
  return `<section class="bloco largo perguntas">
    <div class="sec"><div class="sec-t">Resolve agora</div>
      <span class="small muted">${qs.length === 1 ? '1 pergunta' : qs.length + ' perguntas'}</span></div>
    <div class="grid3">${qs.map((q) => `
      <div class="pergunta" data-q="${q.id}">
        <div class="p-cab">
          <span class="ico ${q.urg >= 3 ? 'urg' : 'med'}">${q.icone}</span>
          <span class="p-txt">${esc(q.pergunta)}</span>
        </div>
        <div class="p-ctx">${esc(q.contexto || '')}</div>
        <div class="btns" style="margin-top:auto;padding-top:var(--s3)">
          <button class="btn sm pri" style="flex:1" data-sim>${esc(q.sim || 'Sim')}</button>
          <button class="btn sm gho" data-nao>${esc(q.nao || 'Agora não')}</button>
        </div>
      </div>`).join('')}</div>
  </section>`;
}

function alertasHTML(al) {
  if (!al.length) return '';
  return `<section class="bloco largo">
    <div class="sec"><div class="sec-t">Precisa de você</div>
      <span class="small muted">${al.length}</span></div>
    <div class="card lista">
      ${al.slice(0, 6).map((a, i) => `
        <button class="row act alto" data-alerta="${i}" style="width:100%;text-align:left;
          background:none;border:0;border-bottom:1px solid var(--line);color:inherit">
          <span class="ico ${a.urg >= 3 ? 'urg' : a.urg === 2 ? 'med' : ''}">${a.icone || '•'}</span>
          <span class="g"><span class="t">${esc(a.texto)}</span>
            ${a.detalhe ? `<span class="s">${esc(a.detalhe)}</span>` : ''}</span>
        </button>`).join('')}
      ${al.length > 6 ? `<a class="row act" href="#/tarefas" style="text-decoration:none;color:inherit">
        <span class="g"><span class="t" style="color:var(--ac2)">Ver os outros ${al.length - 6}</span></span></a>` : ''}
    </div>
  </section>`;
}

/* O dinheiro em uma linha. O resto está na aba dele. */
function dinheiroHTML(u) {
  if (!can(u, 'orcamento.ver') || valoresOcultos()) return '';
  const f = financeiro();
  const usado = pct(f.comprometido, f.orcado || 1);
  return `<section class="bloco largo">
    <a class="pn-grana" href="#/financeiro">
      <span class="pn-g-b"><i style="width:${Math.min(100, usado)}%"></i></span>
      <span class="pn-g-l">
        <b>${fmtMoneyShort(f.comprometido)}</b>
        <span>de ${fmtMoneyShort(f.orcado)} orçados · ${usado}%</span>
      </span>
      <span class="pn-g-v">→</span>
    </a>
  </section>`;
}

/* ------------------------------------------------------------------ ligar --- */
function ligar(node, { al, qs, etapas }) {
  let faseAberta = null;
  const abre = node.querySelector('[data-cam-abre]');

  node.querySelectorAll('[data-fase]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.fase;
      faseAberta = faseAberta === k ? null : k;
      node.querySelectorAll('[data-fase]').forEach((x) => {
        x.classList.toggle('on', x.dataset.fase === faseAberta);
      });
      if (!faseAberta) { abre.hidden = true; abre.innerHTML = ''; return; }
      abre.innerHTML = etapasDaFase(faseAberta, etapas);
      abre.hidden = false;
      abre.querySelectorAll('[data-etapa]').forEach((n) => {
        n.onclick = () => { location.hash = '#/etapas'; };
      });
    };
  });

  node.querySelectorAll('[data-alerta]').forEach((b) => {
    b.onclick = () => abrirDossie(al[Number(b.dataset.alerta)]);
  });

  node.querySelectorAll('[data-q]').forEach((n) => {
    const q = qs.find((x) => x.id === n.dataset.q);
    if (!q) return;
    const some = async (fn) => {
      n.classList.add('indo');
      try { await fn(); } catch (e) { toast('Falhou: ' + e.message); }
      setTimeout(() => store.emit(), 200);
    };
    n.querySelector('[data-sim]').onclick = () => some(q.aoSim);
    n.querySelector('[data-nao]').onclick = () => some(q.aoNao || (async () => {}));
  });
}
