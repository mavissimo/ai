// "Mais": atalhos, dados do projeto, notificações, conta e backup.
import { store } from '../store.js';
import { can, PAPEIS } from '../perms.js';
import { el, abrirForm, toast, confirmar, escolher } from '../ui.js';
import { esc, iniciais, ordenar } from '../utils.js';
import { criarProjetoTeste } from '../seed.js';
import { recarregarProjeto, SEED_VERSAO } from '../seed-bradesco.js';
import { pedirPermissao } from '../notify.js';
import { trocarSenha, temSenha } from '../pin.js';
import { TEMAS, temaAtual, definirTema } from '../tema.js';
import { APP, isRemote } from '../config.js';

export function render() {
  const u = store.user;
  const p = store.projeto;
  const node = el('<div></div>');
  const projetos = store.all('projetos');

  const atalho = (rota, titulo, sub) =>
    `<a class="row act" href="${rota}" style="color:inherit"><span class="g">
      <span class="t">${esc(titulo)}</span><span class="s">${esc(sub)}</span></span>
      <span class="r muted">›</span></a>`;

  node.innerHTML = `
    <div class="card tight" style="display:flex;gap:12px;align-items:center">
      <span class="avatar">${esc(iniciais(u?.nome))}</span>
      <div style="flex:1"><div style="font-weight:650">${esc(u?.nome || '—')}</div>
        <div class="small muted">${esc(PAPEIS[u?.papel]?.nome || '')}</div></div>
      <button class="btn sm gho" data-trocar>sair</button>
    </div>

    <div class="card tight" style="margin-top:-4px">
      <div class="row"><span class="g"><span class="t">Senha de 4 dígitos</span>
        <span class="s">${temSenha(u) ? 'pedida toda vez que você entra' : 'ainda não criada'}</span></span>
        <button class="btn sm gho" data-senha>${temSenha(u) ? 'trocar' : 'criar'}</button></div>
    </div>

    <div class="sec"><div class="sec-t">Produção</div></div>
    <div class="card">
      ${can(u, 'equipe.ver') ? atalho('#/equipe', 'Equipe', 'Pessoas, cachês, confirmações') : ''}
      ${can(u, 'contratos.ver') ? atalho('#/contratos', 'Contratos', 'Resumo, parcelas e prazos') : ''}
      ${atalho('#/tarefas', 'Tarefas', 'O que cada um precisa fazer')}
      ${can(u, 'contas.ver') ? atalho('#/pagamentos', 'Pagamentos', 'O que sai, por data e por pessoa') : ''}
      ${can(u, 'contas.ver') ? atalho('#/contas', 'A receber', 'Parcelas do cliente') : ''}
      ${atalho('#/caixa', 'Caixinha', 'Adiantamentos e prestação de contas')}
      ${atalho('#/fontes', 'Fontes do projeto', 'Planilha, agenda e contrato — o que precisa ser reconferido')}
      ${atalho('#/locacoes', 'Locações e contatos', 'Escolas, endereços, cliente e fornecedores')}
      ${atalho('#/aprovacoes', 'Aprovações do cliente', 'Rodadas, prazo de aceite e feedback')}
      ${atalho('#/notas', 'Notas e documentos', 'NFs, recibos, comprovantes')}
      ${atalho('#/meu', 'Meu painel', 'O que é seu')}
      ${atalho('#/historico', 'Histórico', 'O que aconteceu no projeto')}
    </div>

    <div class="sec"><div class="sec-t">Projeto</div></div>
    <div class="card">
      <div class="row"><span class="g"><span class="t">${esc(p?.nome || 'nenhum')}</span>
        <span class="s">${esc(p?.cliente || '')}</span></span>
        ${can(u, 'projeto.edit') ? '<button class="btn sm gho" data-edit-proj>editar</button>' : ''}</div>
      ${p && p.seed_versao !== SEED_VERSAO && can(u, 'projeto.edit') ? `<div class="banner warn small" style="margin-top:10px">
        Os dados deste aparelho vieram de uma carga antiga do projeto. Recarregue para
        pegar a versão mais nova — equipe, orçamento negociado, contas e perfis.</div>` : ''}
      ${can(u, 'projeto.edit') ? '<button class="btn wide gho sm" style="margin-top:10px" data-recarregar>Recarregar dados do projeto</button>' : ''}
      ${projetos.length > 1 ? '<button class="btn wide gho sm" style="margin-top:10px" data-trocar-proj>Trocar de projeto</button>' : ''}
      ${can(u, 'projeto.edit') ? '<button class="btn wide gho sm" style="margin-top:8px" data-novo-proj>Novo projeto</button>' : ''}
    </div>

    <div class="sec"><div class="sec-t">Aparência</div></div>
    <div class="card">
      <div class="seg">${TEMAS.map((t) => `<button data-tema="${t.v}"
        class="${temaAtual() === t.v ? 'on' : ''}">${esc(t.t)}</button>`).join('')}</div>
      <div class="small muted" style="padding-top:9px">No automático o app acompanha o tema do
        seu celular. A escolha vale para as próximas vezes.</div>
    </div>

    <div class="sec"><div class="sec-t">Avisos</div></div>
    <div class="card">
      <div class="row"><span class="g"><span class="t">Notificações no celular</span>
        <span class="s">${('Notification' in window)
      ? (Notification.permission === 'granted' ? 'ativadas' : 'desligadas')
      : 'não suportado neste navegador'}</span></span>
        <button class="btn sm" data-notif>ativar</button></div>
      <div class="small muted" style="padding-top:8px">Instale o app na tela de início
        (compartilhar → “Adicionar à tela de início”) para receber os avisos como um app normal.</div>
    </div>

    <div class="sec"><div class="sec-t">Dados</div></div>
    <div class="card">
      <div class="row"><span class="g"><span class="t">${store.remoto ? 'Modo nuvem (Supabase)' : 'Modo demo (só neste aparelho)'}</span>
        <span class="s">${store.remoto ? 'dados compartilhados com a equipe'
      : 'para a equipe usar junto, ligue o Supabase — veja o README'}</span></span></div>
      <button class="btn wide gho sm" style="margin-top:10px" data-export>Baixar backup (.json)</button>
      ${store.remoto ? '' : '<button class="btn wide gho sm" style="margin-top:8px" data-import>Restaurar backup</button>'}
      ${store.remoto ? '' : '<button class="btn wide danger gho sm" style="margin-top:8px" data-reset>Apagar tudo deste aparelho</button>'}
    </div>
    <div class="center small muted" style="padding:18px 0">${esc(APP.nome)} v${esc(APP.versao)} ·
      ${isRemote() ? 'nuvem' : 'demo'}</div>`;

  node.querySelector('[data-trocar]')?.addEventListener('click', () => { store.setUser(null); location.hash = '#/'; });
  node.querySelector('[data-senha]')?.addEventListener('click', async () => {
    if (await trocarSenha(u)) store.emit();
  });
  node.querySelectorAll('[data-tema]').forEach((b) => {
    b.onclick = () => { definirTema(b.dataset.tema); store.emit(); };
  });
  node.querySelector('[data-notif]')?.addEventListener('click', async () => {
    const r = await pedirPermissao();
    toast(r === 'granted' ? 'Notificações ativadas.' : 'Permissão não concedida.');
    store.emit();
  });
  node.querySelector('[data-edit-proj]')?.addEventListener('click', () => editarProjeto(p));
  node.querySelector('[data-recarregar]')?.addEventListener('click', async () => {
    const ok = await confirmar(
      'Isto apaga o projeto deste aparelho e carrega tudo de novo, na versão mais recente. '
      + 'O que você editou aqui dentro se perde. Baixe um backup antes se quiser guardar.',
      { ok: 'Recarregar', perigo: true }
    );
    if (!ok) return;
    try {
      await recarregarProjeto();
      toast('Projeto recarregado. Escolha quem você é.');
      location.hash = '#/';
      location.reload();
    } catch (e) {
      console.error(e);
      toast('Falhou: ' + e.message);
    }
  });
  node.querySelector('[data-novo-proj]')?.addEventListener('click', () => novoProjeto());
  node.querySelector('[data-trocar-proj]')?.addEventListener('click', async () => {
    const id = await escolher('Trocar de projeto', projetos.map((x) => ({ v: x.id, t: x.nome, sub: x.cliente })));
    if (id) { store.setProjeto(id); toast('Projeto trocado.'); }
  });
  node.querySelector('[data-export]')?.addEventListener('click', async () => {
    const nome = `unit0-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const json = store.adapter.exportar();
    // Quando a página roda dentro do visualizador de artifact, o download só
    // acontece pela capability; em hospedagem normal, o link basta.
    const downloads = window.claude?.use ? await window.claude.use('downloads') : null;
    if (downloads) {
      try { await downloads.save({ filename: nome, data: json }); toast('Backup salvo.'); }
      catch (e) { if (e?.code !== 'declined') toast('Não consegui salvar o backup.'); }
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
  node.querySelector('[data-import]')?.addEventListener('click', () => {
    const inp = el('<input type="file" accept="application/json" style="display:none">');
    document.body.append(inp);
    inp.onchange = async () => {
      try {
        const txt = await inp.files[0].text();
        await store.adapter.importar(txt);
        store.state = store.adapter.state;
        toast('Backup restaurado.');
        location.reload();
      } catch (e) { toast('Falhou: ' + e.message); }
      inp.remove();
    };
    inp.click();
  });
  node.querySelector('[data-reset]')?.addEventListener('click', async () => {
    if (!await confirmar('Apagar TODOS os dados deste aparelho? Baixe um backup antes.', { ok: 'Apagar', perigo: true })) return;
    await store.adapter.reset();
    localStorage.clear();
    location.reload();
  });

  return { titulo: 'Mais', node };
}

function camposProjeto(p = {}) {
  return [
    { k: 'nome', label: 'Nome do projeto', type: 'texto', req: true, valor: p.nome },
    { k: 'cliente', label: 'Cliente', type: 'texto', valor: p.cliente },
    { k: 'agencia', label: 'Agência / parceiro', type: 'texto', valor: p.agencia },
    { k: 'formato', label: 'Formato', type: 'texto', valor: p.formato, ph: 'Filme institucional 3min' },
    {
      k: 'status', label: 'Fase atual', type: 'select', valor: p.status || 'negociacao',
      opts: [{ v: 'negociacao', t: 'Negociação' }, { v: 'pre', t: 'Pré-produção' },
      { v: 'producao', t: 'Produção' }, { v: 'pos', t: 'Pós-produção' },
      { v: 'entrega', t: 'Entrega' }, { v: 'fechado', t: 'Fechado' }]
    },
    { k: 'inicio', label: 'Início', type: 'data', valor: p.inicio },
    { k: 'entrega', label: 'Entrega final', type: 'data', valor: p.entrega },
    { k: 'valor_contrato_cents', label: 'Valor contratado', type: 'dinheiro', valor: p.valor_contrato_cents },
    { k: 'imposto_aliquota', label: 'Imposto (%)', type: 'numero', step: '0.01', valor: p.imposto_aliquota },
    { k: 'aceite_dias', label: 'Prazo de aceite do cliente (dias)', type: 'numero', valor: p.aceite_dias ?? 5, meia: true },
    { k: 'rodadas_max', label: 'Rodadas de ajuste', type: 'numero', valor: p.rodadas_max ?? 3, meia: true },
    { k: 'aceite_uteis', label: 'Contar o aceite em dias úteis', type: 'check', valor: p.aceite_uteis !== false },
    { k: 'obs', label: 'Observações', type: 'area', valor: p.obs }
  ];
}

function editarProjeto(p) {
  abrirForm({
    titulo: 'Dados do projeto', campos: camposProjeto(p),
    onSave: async (v) => { await store.update('projetos', p.id, v); toast('Projeto atualizado.'); }
  });
}

function novoProjeto() {
  abrirForm({
    titulo: 'Novo projeto',
    subtitulo: 'Cria o projeto já com as etapas e rubricas padrão de produção.',
    campos: camposProjeto(),
    onSave: async (v) => {
      const p = await criarProjetoTeste();
      await store.update('projetos', p.id, v);
      toast('Projeto criado.');
      location.hash = '#/';
    }
  });
}

/* ---------------- histórico ---------------- */
export function renderHistorico() {
  const node = el('<div></div>');
  const logs = ordenar(store.doProjeto('atividades'), (a) => a.quando || a.criado_em, -1).slice(0, 120);
  node.innerHTML = `<div class="card lista">${logs.length ? logs.map((a) => `<div class="row">
      <span class="g"><span class="t" style="white-space:normal;font-weight:500">${esc(a.texto)}</span>
        <span class="s">${esc(new Date(a.quando || a.criado_em).toLocaleString('pt-BR'))}</span></span>
    </div>`).join('') : '<div class="empty">Nada registrado ainda.</div>'}</div>`;
  return { titulo: 'Histórico', node };
}
