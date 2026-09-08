// Bootstrap, login e navegação.
import { store } from './store.js';
import { isRemote, APP } from './config.js';
import { can, ehEquipe, PAPEIS } from './perms.js';
import { el, toast, abrirForm, confirmar, ICO, MARCA } from './ui.js';
import { esc, iniciais, valoresOcultos, alternarValores, diasAte } from './utils.js';
import { criarProjetoBradesco, atualizarProjeto, SEED_VERSAO } from './seed-bradesco.js';
import { alertas, iniciarMonitor } from './notify.js';
import { minhasTarefas } from './views/tarefas.js';
import { autenticar, temSenha } from './pin.js';
import { aplicarTema } from './tema.js';
import { revelar, topoVivo, trocarTela } from './motion.js';

import * as vDash from './views/dash.js';
import * as vEtapas from './views/etapas.js';
import * as vAgenda from './views/agenda.js';
import * as vFin from './views/financeiro.js';
import * as vContratos from './views/contratos.js';
import * as vEquipe from './views/equipe.js';
import * as vNotas from './views/notas.js';
import * as vMeu from './views/meu.js';
import * as vAjustes from './views/ajustes.js';
import * as vLocacoes from './views/locacoes.js';
import * as vFontes from './views/fontes.js';
import * as vPedidosNF from './views/pedidosnf.js';
import * as vVersoes from './views/versoes.js';
import * as vMapa from './views/mapa.js';
import * as vFixas from './views/fixas.js';
import * as vAprov from './views/aprovacoes.js';

const ROTAS = {
  '': () => (ehEquipe(store.user) ? vMeu.render() : vDash.render()),
  '/': () => (ehEquipe(store.user) ? vMeu.render() : vDash.render()),
  '/painel': () => vDash.render(),
  '/etapas': () => vEtapas.render(),
  '/agenda': () => vAgenda.render(),
  '/viagens': () => { vAgenda.irPara('viagens'); return vAgenda.render(); },
  '/financeiro': () => vFin.render(),
  '/contas': () => { vFin.irPara('contas'); return vFin.render(); },
  '/pagamentos': () => { vFin.irPara('pagamentos'); return vFin.render(); },
  '/tarefas': () => { vEtapas.irPara('tarefas'); return vEtapas.render(); },
  '/contratos': () => vContratos.render(),
  '/equipe': () => vEquipe.render(),
  '/notas': () => vNotas.render(),
  '/meu': () => vMeu.render(),
  '/mais': () => vAjustes.render(),
  '/caixa': () => { vFin.irPara('caixa'); return vFin.render(); },
  '/locacoes': () => vLocacoes.render(),
  '/fontes': () => vFontes.render(),
  '/pedidos-nf': () => vPedidosNF.render(),
  '/versoes': () => vVersoes.render(),
  '/mapa': () => vMapa.render(),
  '/fixas': () => vFixas.render(),
  '/aprovacoes': () => vAprov.render(),
  '/historico': () => vAjustes.renderHistorico()
};

const app = () => document.getElementById('app');
const rotaAtual = () => (location.hash || '#/').slice(1).split('?')[0] || '/';

/* ---------------- login ---------------- */
function telaBoasVindas() {
  const node = el(`<div class="capa">
    <div class="capa-topo">
      <span class="marca viva">${MARCA}</span>
      <span class="olho-txt">Gestão de produção</span>
    </div>
    <div class="capa-meio">
      <div class="olho-txt">O projeto que está carregado</div>
      <h1 class="capa-tit">Doc Fundação<br>Bradesco 70 Anos</h1>
      <div class="capa-ficha">
        <div><b>11</b><span>viagens</span></div>
        <div><b>17</b><span>diárias</span></div>
        <div><b>40</b><span>peças</span></div>
        <div><b>9</b><span>cidades</span></div>
      </div>
      <p class="capa-p">Contrato, cronograma, orçamento, viagens e equipe já estão dentro.
        Você entra escolhendo o seu nome — e vê só o que é da sua alçada.</p>
    </div>
    <div class="capa-pe">
      <button class="btn pri wide" data-comecar>Entrar</button>
      <p class="olho-txt" style="margin-top:14px;text-align:center">${isRemote()
        ? 'Os dados ficam no Supabase do projeto'
        : 'Os dados ficam neste aparelho · dá para exportar um backup'}</p>
    </div>
  </div>`);
  node.querySelector('[data-comecar]').onclick = async () => {
    const b = node.querySelector('[data-comecar]');
    b.disabled = true; b.textContent = 'Montando o projeto…';
    try {
      await criarProjetoBradesco();
      location.hash = '#/';
      render();
    } catch (e) {
      console.error(e);
      toast('Não consegui montar: ' + e.message);
      b.disabled = false; b.textContent = 'Entrar';
    }
  };
  return node;
}

function telaQuemEVoce() {
  const lista = store.all('membros');
  const node = el(`<div class="capa quem">
    <div class="capa-topo">
      <span class="marca viva">${MARCA}</span>
      <span class="olho-txt">Doc Fundação Bradesco</span>
    </div>
    <div class="capa-meio">
      <div class="olho-txt">Entrar como</div>
      <h1 class="capa-tit">Quem é você?</h1>
      <div class="indice" data-lista></div>
      <button class="btn gho wide" style="margin-top:20px" data-sou-novo>Não estou na lista</button>
      <p class="olho-txt" style="margin-top:14px">Dá para trocar depois, em Mais.</p>
    </div>
  </div>`);
  const box = node.querySelector('[data-lista]');
  lista.forEach((m, i) => {
    const p = PAPEIS[m.papel] || PAPEIS.equipe;
    const b = el(`<button class="ix">
      <span class="ix-n">${String(i + 1).padStart(2, '0')}</span>
      <span class="ix-g"><span class="ix-t">${esc(m.nome)}</span>
        <span class="ix-d">${esc([m.funcao, p.curto].filter(Boolean).join(' · '))}</span></span>
      <span class="ix-v">${temSenha(m) ? '🔒' : '→'}</span></button>`);
    b.onclick = async () => {
      if (!await autenticar(m)) return;
      store.setUser(m);
      location.hash = '#/';
      render();
    };
    box.append(b);
  });
  node.querySelector('[data-sou-novo]').onclick = () => abrirForm({
    titulo: 'Entrar no projeto',
    subtitulo: 'Você entra como equipe: vê a própria agenda, lança os próprios gastos e confirma o que for seu.',
    campos: [
      { k: 'nome', label: 'Seu nome', type: 'texto', req: true },
      { k: 'funcao', label: 'Sua função', type: 'texto', ph: 'Direção de fotografia' },
      { k: 'telefone', label: 'Telefone', type: 'tel' }
    ],
    onSave: async (v) => {
      const m = await store.insert('membros', { ...v, papel: 'equipe', ativo: true, cache_cents: 0, diarias: 1 });
      store.setUser(m);
      location.hash = '#/';
      render();
    }
  });
  return node;
}

function telaLoginRemoto() {
  const node = el(`<div class="login">
    <span class="marca" style="font-size:40px;margin-bottom:18px">${MARCA}</span>
    <p>Entre com seu e-mail. A gente manda um link de acesso — sem senha.</p>
    <div class="f"><label>E-mail</label><input type="email" data-email placeholder="voce@email.com"></div>
    <button class="btn pri wide" data-enviar>Receber link de acesso</button>
    <p class="small muted" style="margin-top:14px">Se seu e-mail ainda não estiver no projeto,
      peça para a produção te cadastrar em Equipe.</p>
  </div>`);
  node.querySelector('[data-enviar]').onclick = async () => {
    const email = node.querySelector('[data-email]').value.trim();
    if (!email) return toast('Escreva seu e-mail.');
    try {
      const { getClient } = await import('./adapters/supabase.js');
      const sb = await getClient();
      const { error } = await sb.auth.signInWithOtp({
        email, options: { emailRedirectTo: location.href.split('#')[0] }
      });
      if (error) throw error;
      toast('Link enviado. Confira seu e-mail.');
    } catch (e) { toast('Falhou: ' + e.message); }
  };
  return node;
}

/* ---------------- casca ---------------- */
function tabs() {
  const u = store.user;
  const equipe = ehEquipe(u);
  const nAlertas = alertas().length;
  const nTarefas = minhasTarefas(u?.id).filter((t) => (t.prazo && (diasAte(t.prazo) ?? 9) <= 0) || t.cobrado_em).length;
  const itens = equipe ? [
    { r: '#/', i: ICO.eu, t: 'Meu', dot: nAlertas },
    { r: '#/mapa', i: ICO.mapa, t: 'Mapa' },
    { r: '#/agenda', i: ICO.agenda, t: 'Agenda' },
    { r: '#/etapas', i: ICO.etapas, t: 'Trabalho', dot: nTarefas },
    { r: '#/notas', i: ICO.nota, t: 'Notas' },
    { r: '#/mais', i: ICO.mais, t: 'Mais' }
  ] : [
    { r: '#/', i: ICO.casa, t: 'Painel', dot: nAlertas },
    { r: '#/mapa', i: ICO.mapa, t: 'Mapa' },
    { r: '#/etapas', i: ICO.etapas, t: 'Trabalho', dot: nTarefas },
    { r: '#/agenda', i: ICO.agenda, t: 'Agenda' },
    { r: '#/financeiro', i: ICO.grana, t: 'Dinheiro' },
    { r: '#/mais', i: ICO.mais, t: 'Mais' }
  ];
  const atual = '#' + rotaAtual();
  return `<nav class="tabbar"><div class="brand"><span class="marca viva">${MARCA}</span></div>${itens.map((x) => `<a href="${x.r}" class="${atual === x.r || (x.r === '#/' && atual === '#/') ? 'on' : ''}">
    ${x.i}<span>${x.t}</span>${x.dot ? '<span class="dot"></span>' : ''}</a>`).join('')}</nav>`;
}

export function render() {
  const root = app();
  if (!store.user) {
    root.innerHTML = '';
    if (isRemote()) { root.append(telaLoginRemoto()); return; }
    root.append(store.all('membros').length ? telaQuemEVoce() : telaBoasVindas());
    return;
  }
  if (!store.ocupado && !store.projeto && can(store.user, 'projeto.edit') && !store.all('projetos').length) {
    criarProjetoBradesco().then(render);
    return;
  }

  const rota = rotaAtual();
  const fn = ROTAS[rota] || ROTAS['/'];
  let v;
  try { v = fn(); } catch (e) {
    console.error(e);
    v = { titulo: 'Erro', node: el(`<div class="banner bad">Algo quebrou nesta tela: ${esc(e.message)}</div>`) };
  }

  // Tela cheia: o mapa gerencia o próprio espaço, então o main perde o padding
  // e a largura máxima e a página para de rolar por fora.
  root.classList.toggle('cheio', Boolean(v.cheio));

  root.innerHTML = `
    <header class="topbar">
      <h1>${esc(v.titulo)}${v.sub ? `<span class="sub">${esc(v.sub)}</span>` : ''}</h1>
      <a class="avatar" href="#/mais" aria-label="Perfil">${esc(iniciais(store.user.nome))}</a>
    </header>
    <main></main>
    ${tabs()}`;
  root.querySelector('main').append(v.node);
  // Os blocos aparecem conforme sobem, e o topo encolhe quando a página anda.
  revelar(v.node);
  topoVivo(root);

  if (v.fab) {
    const b = el(`<button class="fab" aria-label="Adicionar">${v.fab.label}</button>`);
    b.onclick = v.fab.onClick;
    root.append(b);
  }
  if (store.erro) {
    root.querySelector('main').prepend(el(`<div class="banner bad">Falha ao sincronizar: ${esc(store.erro)}</div>`));
  }

  // Carga antiga no aparelho: oferece atualizar sem apagar nada por conta própria.
  const proj = store.projeto;
  if (proj && proj.seed_versao !== SEED_VERSAO && can(store.user, 'projeto.edit')) {
    const aviso = el(`<div class="banner warn">
      <div><b>Tem novidade na carga do projeto.</b> Atualizar só acrescenta o que falta —
      nada que você editou, criou ou marcou aqui dentro é apagado ou sobrescrito.</div>
      <button class="btn sm" style="margin-top:9px" data-recarregar>Atualizar</button>
    </div>`);
    aviso.querySelector('[data-recarregar]').onclick = async () => {
      try {
        const r = await atualizarProjeto();
        toast([r.novos ? `${r.novos} novo(s)` : '', r.removidos ? `${r.removidos} duplicado(s) removido(s)` : '']
          .filter(Boolean).join(' · ') || 'Já estava em dia.');
        store.emit();
      } catch (e) { console.error(e); toast('Falhou: ' + e.message); }
    };
    root.querySelector('main').prepend(aviso);
  }
}

/* ---------------- start ---------------- */
async function start() {
  aplicarTema();
  window.matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', () => { aplicarTema(); render(); });
  try {
    await store.init();
  } catch (e) {
    app().innerHTML = `<div class="login"><h1>Não consegui abrir</h1>
      <p>${esc(e.message)}</p></div>`;
    return;
  }

  if (isRemote()) {
    try {
      const { getClient } = await import('./adapters/supabase.js');
      const sb = await getClient();
      const { data } = await sb.auth.getUser();
      const email = data?.user?.email;
      if (email) {
        const m = store.all('membros').find((x) => (x.email || '').toLowerCase() === email.toLowerCase());
        if (m) store.user = m;
        else toast('Seu e-mail ainda não está cadastrado no projeto.');
      }
      sb.auth.onAuthStateChange(() => location.reload());
    } catch (e) { console.warn('auth', e); }
  } else {
    store.restaurarUser();
  }

  store.sub(() => render());
  // Trocar de tela é uma transição, não um corte — onde o navegador souber.
  window.addEventListener('hashchange', () => trocarTela(render));
  // O botão de ocultar valores aparece em várias telas; um só ouvinte dá conta.
  app().addEventListener('click', (e) => {
    if (e.target.closest('[data-olho]')) { alternarValores(); render(); }
  });
  render();
  iniciarMonitor();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
}

start();
