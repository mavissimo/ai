// Meu painel: o que é meu — minha agenda, minhas confirmações, meus gastos,
// minhas notas e o que tenho a receber.
import { store } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, toast } from '../ui.js';
import { esc, fmtMoney, fmtData, prazoTxt, prazoTag, diasAte, ordenar, soma, iniciais } from '../utils.js';
import { ST_LANC, ST_CONTA, retencoes, saldoCaixa } from '../calc.js';
import { camposLancamento, salvarLancamento, abrirLancamento } from './financeiro.js';
import { tipoConf } from './equipe.js';
import { salvarArquivo, abrirArquivo } from '../files.js';
import { PAPEIS } from '../perms.js';

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!u) { node.innerHTML = '<div class="empty">Faça login.</div>'; return { titulo: 'Meu painel', node }; }

  const confs = store.doProjeto('confirmacoes').filter((c) => c.membro_id === u.id);
  const pend = confs.filter((c) => c.status === 'pendente');
  const eventos = ordenar(store.doProjeto('eventos')
    .filter((e) => (e.participantes || []).includes(u.id) && (diasAte(e.data) ?? -1) >= 0), (e) => e.data).slice(0, 6);
  const meusLanc = ordenar(store.doProjeto('lancamentos')
    .filter((l) => l.membro_id === u.id || l.criado_por === u.id), (l) => l.data, -1);
  const minhasContas = store.doProjeto('contas').filter((c) => c.membro_id === u.id);
  const receber = minhasContas.filter((c) => c.tipo === 'pagar');
  const minhasEtapas = store.doProjeto('etapas').filter((e) => e.responsavel_id === u.id && e.status !== 'feito');
  const meusDocs = store.doProjeto('documentos').filter((d) => d.membro_id === u.id);
  const p = PAPEIS[u.papel] || PAPEIS.equipe;
  const bruto = (u.cache_cents || 0) * (u.diarias || 1);
  const ret = retencoes(u, bruto);
  const caixa = saldoCaixa(u.id);

  node.innerHTML = `
    <div class="card tight" style="display:flex;gap:12px;align-items:center">
      <span class="avatar">${esc(iniciais(u.nome))}</span>
      <div style="flex:1;min-width:0"><div style="font-weight:650">${esc(u.nome)}</div>
        <div class="small muted">${esc([u.funcao, p.curto].filter(Boolean).join(' · '))}</div></div>
      ${u.cache_cents ? `<div class="right"><div class="small muted">seu cachê líquido</div>
        <div class="mono" style="font-weight:650">${fmtMoney(ret.liquido)}</div>
        ${ret.total ? `<div class="small muted">bruto ${fmtMoney(bruto)} · ret. ${fmtMoney(ret.total)}</div>` : ''}</div>` : ''}
    </div>

    ${pend.length ? `<div class="sec"><div class="sec-t">Precisa da sua confirmação</div></div>
    <div class="card">${pend.map((c) => `
      <div style="padding:10px 0;border-bottom:1px solid var(--line)">
        <div style="font-weight:650">${esc(c.titulo)}</div>
        <div class="small muted" style="margin:3px 0 9px">${esc(tipoConf(c.tipo))}${c.obs ? ' · ' + esc(c.obs) : ''}</div>
        <div class="btns">
          <button class="btn sm pri" data-conf="${c.id}" data-v="confirmado">Confirmo</button>
          <button class="btn sm gho" data-conf="${c.id}" data-v="recusado">Não posso</button>
          ${c.tipo === 'passagem' || c.tipo === 'pagamento'
        ? `<button class="btn sm gho" data-comprov="${c.id}">Anexar comprovante</button>` : ''}
        </div>
      </div>`).join('')}</div>` : ''}

    <div class="sec"><div class="sec-t">Minha agenda</div></div>
    <div class="card">${eventos.length ? eventos.map((e) => `<div class="row">
        <span class="tag ${diasAte(e.data) === 0 ? 'bad' : diasAte(e.data) <= 2 ? 'warn' : 'mut'}">
          ${esc(fmtData(e.data, { ano: false }))}</span>
        <span class="g"><span class="t">${esc(e.titulo)}</span>
          <span class="s">${esc([e.hora_inicio, e.local].filter(Boolean).join(' · ') || prazoTxt(e.data))}</span></span>
      </div>`).join('') : '<div class="empty">Nada marcado para você.</div>'}</div>

    ${minhasEtapas.length ? `<div class="sec"><div class="sec-t">Sob sua responsabilidade</div></div>
    <div class="card">${minhasEtapas.map((e) => `<div class="row">
      <span class="tag ${e.prazo ? prazoTag(e.prazo) : 'mut'}">${e.prazo ? esc(fmtData(e.prazo, { ano: false })) : '—'}</span>
      <span class="g"><span class="t">${esc(e.nome)}</span>
        <span class="s">${e.prazo ? esc(prazoTxt(e.prazo)) : 'sem prazo'}</span></span></div>`).join('')}</div>` : ''}

    ${caixa.adiantado ? `<div class="sec"><div class="sec-t">Minha caixinha</div>
      <a href="#/caixa" class="small">abrir</a></div>
    <div class="card tight">
      <div class="row"><span class="g"><span class="t">Está na sua mão</span>
        <span class="s">adiantado ${fmtMoney(caixa.adiantado)} · comprovado ${fmtMoney(caixa.gasto)}</span></span>
        <span class="r"><span class="v" style="color:${caixa.saldo > 0 ? 'var(--warn)' : 'var(--ok)'}">${fmtMoney(caixa.saldo)}</span></span></div>
    </div>` : ''}

    <div class="sec"><div class="sec-t">Meus lançamentos</div>
      <button class="btn sm pri" data-novo-gasto>+ gasto</button></div>
    <div class="card">${meusLanc.length ? meusLanc.slice(0, 12).map((l) => {
    const st = ST_LANC[l.status] || ST_LANC.pendente;
    return `<div class="row act" data-lanc="${l.id}">
        <span class="tag ${st.tag}">${esc(st.t.split(' ')[0])}</span>
        <span class="g"><span class="t">${esc(l.descricao)}</span>
          <span class="s">${esc([l.rubrica, fmtData(l.data)].filter(Boolean).join(' · '))}</span></span>
        <span class="r"><span class="v">${fmtMoney(l.valor_cents)}</span></span></div>`;
  }).join('') : '<div class="empty">Nenhum gasto lançado.</div>'}</div>

    ${receber.length ? `<div class="sec"><div class="sec-t">Tenho a receber</div></div>
    <div class="card">${receber.map((c) => `<div class="row">
      <span class="tag ${c.status === 'quitado' ? 'ok' : prazoTag(c.venc)}">${esc(ST_CONTA[c.status]?.t || '')}</span>
      <span class="g"><span class="t">${esc(c.descricao)}</span>
        <span class="s">${c.venc ? esc(fmtData(c.venc) + ' · ' + prazoTxt(c.venc)) : ''}</span></span>
      <span class="r"><span class="v">${fmtMoney(c.valor_cents)}</span></span></div>`).join('')}
      <div class="small muted" style="padding-top:8px">Total em aberto:
        ${fmtMoney(soma(receber.filter((c) => c.status === 'aberto'), (c) => c.valor_cents))}</div></div>` : ''}

    ${meusDocs.length ? `<div class="sec"><div class="sec-t">Minhas notas enviadas</div></div>
    <div class="card">${meusDocs.map((d) => `<div class="row act" data-doc="${d.id}">
      <span class="tag mut">${esc(d.tipo)}</span>
      <span class="g"><span class="t">${esc(d.titulo || d.nome)}</span>
        <span class="s">${esc(fmtData(d.data))}</span></span>
      <span class="r"><span class="v">${fmtMoney(d.valor_cents)}</span></span></div>`).join('')}</div>` : ''}`;

  node.querySelectorAll('[data-conf]').forEach((b) => {
    b.onclick = async () => {
      await store.update('confirmacoes', b.dataset.conf, {
        status: b.dataset.v, respondido_em: new Date().toISOString()
      });
      await store.log(`${u.nome} respondeu uma confirmação: ${b.dataset.v}`, 'confirmacao');
      toast('Resposta registrada.'); store.emit();
    };
  });
  node.querySelectorAll('[data-comprov]').forEach((b) => {
    b.onclick = () => abrirForm({
      titulo: 'Anexar comprovante',
      campos: [{ k: 'arquivo', label: 'Foto ou PDF', type: 'arquivo', req: true }],
      onSave: async (v) => {
        const c = store.get('confirmacoes', b.dataset.comprov);
        const meta = await salvarArquivo(v.arquivo, { pasta: 'confirmacoes' });
        await store.insert('documentos', {
          tipo: c.tipo === 'passagem' ? 'passagem' : 'comprovante', titulo: c.titulo,
          data: new Date().toISOString().slice(0, 10), membro_id: u.id, confirmacao_id: c.id,
          path: meta.path, nome: meta.nome, tamanho: meta.tamanho, mime: meta.tipo
        });
        await store.update('confirmacoes', c.id, { status: 'confirmado', respondido_em: new Date().toISOString() });
        toast('Comprovante enviado.'); store.emit();
      }
    });
  });
  node.querySelector('[data-novo-gasto]')?.addEventListener('click', () => {
    abrirForm({
      titulo: 'Lançar gasto',
      subtitulo: 'Tire foto da notinha — a produção recebe para aprovar.',
      campos: camposLancamento(u, { tipo: 'saida' }),
      onSave: async (v) => {
        await salvarLancamento({ ...v, tipo: v.tipo || 'saida' }, u);
        toast(can(u, 'lanc.aprovar') ? 'Lançado.' : 'Enviado para aprovação.');
      }
    });
  });
  node.querySelectorAll('[data-lanc]').forEach((n) => {
    n.onclick = () => abrirLancamento(store.get('lancamentos', n.dataset.lanc));
  });
  node.querySelectorAll('[data-doc]').forEach((n) => {
    n.onclick = async () => {
      try { if (!await abrirArquivo(store.get('documentos', n.dataset.doc))) toast('Arquivo não encontrado neste aparelho.'); }
      catch (e) { toast('Não consegui abrir: ' + e.message); }
    };
  });

  return { titulo: 'Meu painel', sub: store.projeto?.nome, node };
}
