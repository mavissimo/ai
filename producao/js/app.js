// Bootstrap, login e navegação.
import { store } from './store.js';
import { isRemote, APP } from './config.js';
import { can, ehEquipe, PAPEIS } from './perms.js';
import { el, toast, abrirForm, confirmar, ICO, MARCA } from './ui.js';
import { esc, iniciais, valoresOcultos, alternarValores } from './utils.js';
import { criarProjetoBradesco, recarregarProjeto, SEED_VERSAO } from './seed-bradesco.js';
import { alertas, iniciarMonitor } from './notify.js';
import { autenticar, temSenha } from './pin.js';
import { aplicarTema } from './tema.js';

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
import * as vAprov from './views/aprovacoes.js';

const ROTAS = {
  '': () => (ehEquipe(store.user) ? vMeu.render() : vDash.render()),
  '/': () => (ehEquipe(store.user) ? vMeu.render() : vDash.render()),
  '/painel': () => vDash.render(),
  '/etapas': () => vEtapas.render(),
  '/agenda': () => vAgenda.render(),
  '/financeiro': () => vFin.render(),
  '/contas': () => { vFin.irPara('contas'); return vFin.render(); },
  '/contratos': () => vContratos.render(),
  '/equipe': () => vEquipe.render(),
  '/notas': () => vNotas.render(),
  '/meu': () => vMeu.render(),
  '/mais': () => vAjustes.render(),
  '/caixa': () => { vFin.irPara('caixa'); return vFin.render(); },
  '/locacoes': () => vLocacoes.render(),
  '/aprovacoes': () => vAprov.render(),
  '/historico': () => vAjustes.renderHistorico()
};

const app = () => document.getElementById('app');
const rotaAtual = () => (location.hash || '#/').slice(1).split('?')[0] || '/';

/* ---------------- login ---------------- */
function telaBoasVindas() {
  const node = el(`<div class="login">
    <span class="marca" style="font-size:40px;margin-bottom:18px">${MARCA}</span>
    <p>Gestão de produção audiovisual: negociação, pré, produção, pós, dinheiro
      e equipe — tudo no celular.</p>
    <button class="btn pri wide" data-comecar>Começar</button>
    <p class="small muted" style="margin-top:12px">Carrega o projeto <b>Doc Fundação Bradesco 70 Anos</b>
      com contrato, cronograma, orçamento e equipe já cadastrados.</p>
    <p class="small muted" style="margin-top:18px">${isRemote()
      ? 'Modo nuvem: os dados ficam no Supabase do projeto.'
      : 'Modo demo: os dados ficam neste aparelho. Você pode exportar um backup a qualquer momento.'}</p>
  </div>`);
  node.querySelector('[data-comecar]').onclick = async () => {
    const b = node.querySelector('[data-comecar]');
    b.disabled = true; b.textContent = 'Montando o projeto…';
    try {
      await criarProjetoBradesco();
      toast('Projeto carregado. Escolha quem você é.');
      location.hash = '#/';
      render();
    } catch (e) {
      console.error(e);
      toast('Não consegui montar: ' + e.message);
      b.disabled = false; b.textContent = 'Começar';
    }
  };
  return node;
}

function telaQuemEVoce() {
  const lista = store.all('membros');
  const node = el(`<div class="login">
    <h1>Quem é você?</h1>
    <p>Cada pessoa vê só o que é da sua alçada.</p>
    <div data-lista></div>
    <button class="btn gho wide" style="margin-top:14px" data-sou-novo>Não estou na lista</button>
  </div>`);
  const box = node.querySelector('[data-lista]');
  lista.forEach((m) => {
    const p = PAPEIS[m.papel] || PAPEIS.equipe;
    const b = el(`<button class="who">
      <span class="avatar">${esc(iniciais(m.nome))}</span>
      <span style="flex:1"><span style="display:block;font-weight:650">${esc(m.nome)}</span>
        <span class="small muted">${esc([m.funcao, p.curto].filter(Boolean).join(' · '))}</span></span>
      <span class="tag ${temSenha(m) ? 'mut' : 'warn'}">${temSenha(m) ? '🔒' : 'criar senha'}</span></button>`);
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
  const itens = equipe ? [
    { r: '#/', i: ICO.eu, t: 'Meu', dot: nAlertas },
    { r: '#/agenda', i: ICO.agenda, t: 'Agenda' },
    { r: '#/etapas', i: ICO.etapas, t: 'Etapas' },
    { r: '#/notas', i: ICO.nota, t: 'Notas' },
    { r: '#/mais', i: ICO.mais, t: 'Mais' }
  ] : [
    { r: '#/', i: ICO.casa, t: 'Painel', dot: nAlertas },
    { r: '#/etapas', i: ICO.etapas, t: 'Etapas' },
    { r: '#/agenda', i: ICO.agenda, t: 'Agenda' },
    { r: '#/financeiro', i: ICO.grana, t: 'Dinheiro' },
    { r: '#/mais', i: ICO.mais, t: 'Mais' }
  ];
  const atual = '#' + rotaAtual();
  return `<nav class="tabbar"><div class="brand"><span class="marca">${MARCA}</span></div>${itens.map((x) => `<a href="${x.r}" class="${atual === x.r || (x.r === '#/' && atual === '#/') ? 'on' : ''}">
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

  root.innerHTML = `
    <header class="topbar">
      <h1>${esc(v.titulo)}${v.sub ? `<span class="sub">${esc(v.sub)}</span>` : ''}</h1>
      <a class="avatar" href="#/mais" aria-label="Perfil">${esc(iniciais(store.user.nome))}</a>
    </header>
    <main></main>
    ${tabs()}`;
  root.querySelector('main').append(v.node);

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
      <div>Este aparelho está com uma carga antiga do projeto — por isso a equipe e o
      orçamento aparecem diferentes do combinado.</div>
      <button class="btn sm" style="margin-top:9px" data-recarregar>Recarregar agora</button>
    </div>`);
    aviso.querySelector('[data-recarregar]').onclick = async () => {
      const ok = await confirmar(
        'Isto apaga o projeto deste aparelho e carrega tudo de novo, na versão mais recente. '
        + 'O que você editou aqui dentro se perde.',
        { ok: 'Recarregar', perigo: true }
      );
      if (!ok) return;
      try { await recarregarProjeto(); location.hash = '#/'; location.reload(); }
      catch (e) { console.error(e); toast('Falhou: ' + e.message); }
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
  window.addEventListener('hashchange', render);
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
