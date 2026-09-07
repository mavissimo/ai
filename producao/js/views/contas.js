// Contas a pagar e a receber, com vencimento, vínculo e comprovante.
import { store, membros, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast, btnOlho } from '../ui.js';
import { esc, fmtMoney, fmtMoneyShort, fmtData, prazoTxt, prazoTag, hoje, somarDias, ordenar, soma, diasAte, valoresOcultos } from '../utils.js';
import { ST_CONTA } from '../calc.js';
import { salvarArquivo, abrirArquivo } from '../files.js';
import { textoPedido, linkEmail, linkWhats, irmasSemNF } from '../nf.js';

let aba = 'receber';

const NF = [
  { v: 'na', t: 'Não se aplica' },
  { v: 'a_emitir', t: 'Preciso emitir' },
  { v: 'emitida', t: 'Emitida' },
  { v: 'a_receber', t: 'Aguardando NF do fornecedor' },
  { v: 'recebida', t: 'NF recebida' }
];
const nfTxt = (v) => NF.find((n) => n.v === v)?.t || 'Não se aplica';
const nfTag = (v) => (v === 'emitida' || v === 'recebida') ? 'ok' : (v === 'na' || !v) ? 'mut' : 'warn';

/** Tela do que entra. O que sai fica em Pagamentos, que tem plano por pessoa. */
export function render() {
  const u = store.user;
  aba = 'receber';
  const node = el('<div></div>');
  if (!can(u, 'contas.ver')) {
    node.innerHTML = '<div class="empty">Sem acesso ao contas a receber.</div>';
    return { titulo: 'A receber', node };
  }
  const editar = can(u, 'contas.edit');
  const todas = store.doProjeto('contas');
  const lista = ordenar(todas.filter((c) => c.tipo === aba), (c) => c.venc || '9999');
  const abertas = lista.filter((c) => c.status === 'aberto');
  const vencidas = abertas.filter((c) => (diasAte(c.venc) ?? 9) < 0);

  node.innerHTML = `
    <div class="sec" style="margin-top:4px"><div class="sec-t">A receber</div>
      ${btnOlho(valoresOcultos())}</div>
    <div class="grid">
      <div class="kpi"><div class="l">Em aberto</div><div class="v">${fmtMoneyShort(soma(abertas, (c) => c.valor_cents))}</div>
        <div class="h">${abertas.length} lançamento(s)</div></div>
      <div class="kpi ${vencidas.length ? 'bad' : 'ok'}"><div class="l">Vencido</div>
        <div class="v">${fmtMoneyShort(soma(vencidas, (c) => c.valor_cents))}</div>
        <div class="h">${vencidas.length} conta(s)</div></div>
    </div>
    <div class="card lista">${lista.length ? lista.map((c) => {
      const st = ST_CONTA[c.status] || ST_CONTA.aberto;
      return `<div class="row act" data-conta="${c.id}">
        <span class="tag ${c.status === 'quitado' ? 'ok' : prazoTag(c.venc)}">${c.venc ? esc(fmtData(c.venc, { ano: false })) : '—'}</span>
        <span class="g"><span class="t">${esc(c.descricao)}</span>
          <span class="s">${esc([c.contraparte, c.status === 'aberto' ? prazoTxt(c.venc) : st.t, c.parcela ? 'parcela ' + c.parcela : '']
        .filter(Boolean).join(' · '))}</span></span>
        <span class="r"><span class="v">${fmtMoney(c.valor_cents)}</span></span>
      </div>`;
    }).join('') : '<div class="empty">Nada aqui.</div>'}</div>`;

  node.querySelectorAll('[data-conta]').forEach((n) => { n.onclick = () => abrirConta(store.get('contas', n.dataset.conta), editar); });

  return { titulo: 'A receber', node, fab: editar ? { label: '+', onClick: () => novaConta('receber') } : null };
}

export function campos(c = {}, tipo) {
  return [
    {
      k: 'tipo', label: 'Tipo', type: 'select', valor: c.tipo || tipo || 'pagar',
      opts: [{ v: 'pagar', t: 'A pagar' }, { v: 'receber', t: 'A receber' }]
    },
    { k: 'descricao', label: 'Descrição', type: 'texto', req: true, valor: c.descricao, ph: 'Cachê da direção de fotografia' },
    { k: 'contraparte', label: 'Para quem / de quem', type: 'texto', valor: c.contraparte },
    { k: 'valor_cents', label: 'Valor', type: 'dinheiro', req: true, valor: c.valor_cents },
    { k: 'venc', label: 'Vencimento', type: 'data', valor: c.venc || hoje() },
    {
      k: 'status', label: 'Status', type: 'select', valor: c.status || 'aberto',
      opts: Object.entries(ST_CONTA).map(([v, o]) => ({ v, t: o.t }))
    },
    {
      k: 'membro_id', label: 'Pessoa da equipe (opcional)', type: 'select', valor: c.membro_id || '',
      opts: [{ v: '', t: '— nenhuma —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    },
    { k: 'categoria', label: 'Categoria', type: 'texto', valor: c.categoria, ph: 'cachê, fornecedor, parcela de contrato…' },
    { type: 'titulo', label: 'Nota fiscal', k: '_t_fisc' },
    { k: 'nf_status', label: 'Nota fiscal', type: 'select', valor: c.nf_status || 'na', opts: NF },
    { k: 'nf_numero', label: 'Número da NF', type: 'texto', valor: c.nf_numero },
    { k: 'nf_data', label: 'Data da NF', type: 'data', valor: c.nf_data },
    { k: 'obs', label: 'Observações', type: 'area', valor: c.obs }
  ];
}

export function novaConta(tipo) {
  abrirForm({
    titulo: tipo === 'receber' ? 'Nova conta a receber' : 'Nova conta a pagar',
    campos: campos({}, tipo),
    onSave: async (v) => { await store.insert('contas', v); toast('Conta criada.'); }
  });
}

export function abrirConta(c, editar) {
  // Montar a conta e dar baixa nela são coisas diferentes: a produção monta e
  // negocia, a direção paga e emite a nota.
  const podePagar = can(store.user, 'pagamento.executar');
  const podeNF = can(store.user, 'nf.emitir');
  if (!c) return;
  const st = ST_CONTA[c.status] || ST_CONTA.aberto;
  const corpo = el('<div></div>');
  const pintar = () => {
    const doc = store.doProjeto('documentos').find((d) => d.conta_id === c.id);
    corpo.innerHTML = `
      <div class="center" style="padding:6px 0 14px">
        <div style="font-size:30px;font-weight:700;letter-spacing:-.5px">${fmtMoney(c.valor_cents)}</div>
        <span class="tag ${c.status === 'quitado' ? 'ok' : prazoTag(c.venc)}" style="margin-top:8px">
          ${c.status === 'aberto' ? esc('vence ' + prazoTxt(c.venc)) : esc(st.t)}</span>
      </div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">${c.tipo === 'pagar' ? 'Pagar para' : 'Receber de'}</span>
          <span class="t">${esc(c.contraparte || '—')}</span></span></div>
        <div class="row"><span class="g"><span class="s">Vencimento</span>
          <span class="t">${esc(fmtData(c.venc, { longo: true }))}</span></span></div>
        ${c.categoria ? `<div class="row"><span class="g"><span class="s">Categoria</span><span class="t">${esc(c.categoria)}</span></span></div>` : ''}
        ${c.membro_id ? `<div class="row"><span class="g"><span class="s">Pessoa</span><span class="t">${esc(nomeMembro(c.membro_id))}</span></span></div>` : ''}
        <div class="row"><span class="g"><span class="s">Nota fiscal</span>
          <span class="t">${esc(nfTxt(c.nf_status))}${c.nf_numero ? ' · nº ' + esc(c.nf_numero) : ''}</span></span>
          <span class="r"><span class="tag ${nfTag(c.nf_status)}">${c.nf_status === 'a_emitir' ? 'emitir' :
            c.nf_status === 'a_receber' ? 'cobrar' : c.nf_status === 'na' || !c.nf_status ? '—' : 'ok'}</span></span></div>
        ${c.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(c.obs)}</span></span></div>` : ''}
        <div class="row"><span class="g"><span class="s">Comprovante</span>
          <span class="t">${doc ? esc(doc.nome || 'anexo') : 'sem anexo'}</span></span>
          <span class="r">${doc ? '<button class="btn sm" data-ver>abrir</button>'
        : editar ? '<button class="btn sm gho" data-anexar>anexar</button>' : ''}</span></div>
      </div>
      ${podeNF && (c.nf_status === 'a_emitir' || c.nf_status === 'a_receber') ? `<button class="btn wide" data-nf>
        ${c.nf_status === 'a_emitir' ? 'Marcar NF como emitida' : 'Marcar NF como recebida'}</button>` : ''}
      ${podePagar && c.status === 'aberto' ? `<button class="btn wide pri" style="margin-top:8px" data-quitar>
        Marcar como ${c.tipo === 'pagar' ? 'pago' : 'recebido'}</button>` : ''}
      ${!podePagar && c.status === 'aberto' ? `<div class="banner small">Quem dá baixa no pagamento é
        a direção. Você monta e negocia a conta; a baixa fica com quem paga.</div>` : ''}
      ${c.tipo === 'pagar' && c.nf_status === 'a_receber' && c.status === 'aberto' ? `
        <button class="btn wide" style="margin-top:8px" data-pedir-nf>Pedir a nota fiscal</button>` : ''}
      ${editar && c.status === 'aberto' && !c.grupo_id ? `<button class="btn wide gho" style="margin-top:8px"
        data-parcelar>Dividir em parcelas</button>` : ''}
      ${c.grupo_id ? `<div class="banner small">Parte de um parcelamento${c.parcela ? ` — ${esc(c.parcela)}` : ''}.
        ${irmas(c).length} parcela(s) no total.</div>` : ''}
      ${editar ? '<button class="btn wide gho" style="margin-top:8px" data-edit>Editar</button>' : ''}`;

    corpo.querySelector('[data-ver]')?.addEventListener('click', async () => {
      try { if (!await abrirArquivo(doc)) toast('Arquivo não encontrado neste aparelho.'); }
      catch (e) { toast('Não consegui abrir: ' + e.message); }
    });
    corpo.querySelector('[data-anexar]')?.addEventListener('click', () => abrirForm({
      titulo: 'Anexar comprovante',
      campos: [{ k: 'arquivo', label: 'Arquivo', type: 'arquivo', req: true }],
      onSave: async (v) => {
        const meta = await salvarArquivo(v.arquivo, { pasta: 'comprovantes' });
        await store.insert('documentos', {
          tipo: 'comprovante', titulo: c.descricao, valor_cents: c.valor_cents, data: c.venc,
          emissor: c.contraparte || '', conta_id: c.id, membro_id: c.membro_id || null,
          path: meta.path, nome: meta.nome, tamanho: meta.tamanho, mime: meta.tipo
        });
        toast('Comprovante anexado.'); pintar(); store.emit();
      }
    }));
    corpo.querySelector('[data-nf]')?.addEventListener('click', () => abrirForm({
      titulo: 'Nota fiscal',
      subtitulo: c.nf_status === 'a_emitir'
        ? 'A nota que a produtora emitiu.' : `A nota que ${c.contraparte || 'o fornecedor'} mandou.`,
      campos: [
        { k: 'nf_numero', label: 'Número da NF', type: 'texto', req: true, valor: c.nf_numero },
        { k: 'nf_data', label: 'Data de emissão', type: 'data', valor: c.nf_data || hoje() },
        { k: 'arquivo', label: 'PDF da nota', type: 'arquivo',
          hint: 'O que chegou por e-mail. Fica guardado em Notas e documentos.' }
      ],
      onSave: async (v) => {
        const { arquivo, ...campos } = v;
        const novo = c.nf_status === 'a_emitir' ? 'emitida' : 'recebida';
        await store.update('contas', c.id, { ...campos, nf_status: novo });
        Object.assign(c, campos, { nf_status: novo });
        if (arquivo) {
          const meta = await salvarArquivo(arquivo, { pasta: 'notas' });
          await store.insert('documentos', {
            tipo: 'nf', titulo: `NF ${campos.nf_numero} — ${c.descricao}`,
            valor_cents: c.valor_cents, data: campos.nf_data || hoje(),
            emissor: c.contraparte || '', numero: campos.nf_numero || '',
            conta_id: c.id, membro_id: c.membro_id || null, ...meta
          });
        }
        await store.log(`NF ${campos.nf_numero} ${novo} — ${c.descricao}`, 'conta');
        toast(arquivo ? 'Nota registrada com o PDF.' : 'Nota registrada.');
        pintar(); store.emit();
      }
    }));
    corpo.querySelector('[data-pedir-nf]')?.addEventListener('click', () => { sh.close(); pedirNF(c); });
    corpo.querySelector('[data-parcelar]')?.addEventListener('click', () => { sh.close(); parcelar(c); });
    corpo.querySelector('[data-quitar]')?.addEventListener('click', async () => {
      await store.update('contas', c.id, { status: 'quitado', quitado_em: hoje() });
      c.status = 'quitado';
      // espelha no fluxo de caixa
      await store.insert('lancamentos', {
        tipo: c.tipo === 'pagar' ? 'saida' : 'entrada', descricao: c.descricao,
        valor_cents: c.valor_cents, rubrica: c.categoria || 'Outros', data: hoje(),
        fornecedor: c.contraparte || '', membro_id: c.membro_id || null,
        status: c.tipo === 'pagar' ? 'pago' : 'recebido', conta_id: c.id, obs: 'Gerado ao quitar a conta.'
      });
      await store.log(`Conta "${c.descricao}" quitada (${fmtMoney(c.valor_cents)})`, 'conta');
      toast('Quitada.'); pintar(); store.emit();
    });
    corpo.querySelector('[data-edit]')?.addEventListener('click', () => {
      sh.close();
      abrirForm({
        titulo: 'Editar conta', campos: campos(c),
        onSave: async (v) => { await store.update('contas', c.id, v); toast('Atualizada.'); },
        onDelete: async () => { await store.remove('contas', c.id); toast('Excluída.'); }
      });
    });
  };
  pintar();
  const sh = sheet({ titulo: c.descricao, corpo });
}

/* ------------------------------------------------------- parcelamento ---
   Dividir uma conta é o que a produção faz o tempo todo: 60% agora, o resto
   na entrega. Cada parcela vira uma conta própria, com vencimento e baixa
   independentes — é o que faz o fluxo de caixa ficar certo. As parcelas se
   reconhecem pelo grupo_id, que é o id da conta original. */
export const irmas = (c) => store.doProjeto('contas')
  .filter((x) => c.grupo_id && x.grupo_id === c.grupo_id)
  .sort((a, b) => String(a.venc || '9999').localeCompare(String(b.venc || '9999')));

function parcelar(c) {
  if (!c) return;
  abrirForm({
    titulo: 'Dividir em parcelas',
    subtitulo: `${c.descricao} — ${fmtMoney(c.valor_cents)}`,
    campos: [
      { k: 'n', label: 'Quantas parcelas', type: 'numero', valor: 2, req: true, meia: true, step: '1' },
      {
        k: 'intervalo', label: 'De quanto em quanto', type: 'select', meia: true, valor: '30',
        opts: [
          { v: '30', t: 'Todo mês' }, { v: '15', t: 'A cada 15 dias' },
          { v: '7', t: 'Toda semana' }, { v: '0', t: 'Sem data — eu marco depois' }
        ]
      },
      { k: 'venc', label: 'Vencimento da primeira', type: 'data', valor: c.venc || hoje() },
      {
        k: 'primeira_cents', label: 'Valor da primeira', type: 'dinheiro',
        valor: Math.round(c.valor_cents / 2),
        hint: 'Deixe como está para dividir por igual. Mudando, o resto se divide entre as outras.'
      }
    ],
    onSave: async (v) => {
      const n = Math.max(2, Math.min(36, Number(v.n) || 2));
      const total = c.valor_cents;
      const primeira = Math.min(Number(v.primeira_cents) || Math.round(total / n), total);
      const resto = total - primeira;
      // O que sobra da divisão vai para a última, para a soma bater ao centavo.
      const base = Math.floor(resto / (n - 1));
      const valores = [primeira, ...Array.from({ length: n - 1 }, () => base)];
      valores[n - 1] += resto - base * (n - 1);

      const passo = Number(v.intervalo);
      for (let i = 0; i < n; i++) {
        await store.insert('contas', {
          projeto_id: c.projeto_id, tipo: c.tipo,
          descricao: `${c.descricao} (${i + 1}/${n})`,
          contraparte: c.contraparte, valor_cents: valores[i],
          venc: passo && v.venc ? somarDias(v.venc, passo * i) : (i === 0 ? v.venc || '' : ''),
          status: 'aberto', membro_id: c.membro_id || null, categoria: c.categoria,
          rubrica: c.rubrica || '', viagem_id: c.viagem_id || null,
          contrato_id: c.contrato_id || null, nf_status: c.nf_status || 'na',
          grupo_id: c.id, parcela: `${i + 1}/${n}`,
          obs: `Parcela ${i + 1} de ${n} de ${fmtMoney(total)}.${c.obs ? ' ' + c.obs : ''}`
        });
      }
      // A conta original vira só o registro do acordo, para não contar duas vezes.
      await store.update('contas', c.id, {
        status: 'cancelado',
        obs: `Dividida em ${n} parcelas.${c.obs ? ' ' + c.obs : ''}`
      });
      toast(`Dividida em ${n} parcelas.`);
    }
  });
}

/* --------------------------------------------------------- pedido de NF ---
   O texto sai pronto do cadastro: job, função, vencimento, valor e os dados
   de faturamento. Dá para copiar, mandar por e-mail ou por WhatsApp. */
function pedirNF(c) {
  if (!c) return;
  const outras = irmasSemNF(c);
  const marcadas = new Set();
  const corpo = el('<div></div>');

  const pintar = () => {
    const extras = outras.filter((x) => marcadas.has(x.id));
    const texto = textoPedido(c, extras);
    const total = c.valor_cents + extras.reduce((n, x) => n + x.valor_cents, 0);

    corpo.innerHTML = `
      ${outras.length ? `<div class="sec" style="margin-top:0"><div class="sec-t">Juntar no mesmo pedido</div>
          <span class="small muted">${extras.length + 1} de ${outras.length + 1}</span></div>
        <div class="card lista">${outras.map((x) => `
          <label class="row act sem-seta" style="cursor:pointer">
            <input type="checkbox" data-extra="${x.id}" ${marcadas.has(x.id) ? 'checked' : ''}
              style="width:22px;height:22px;flex:none">
            <span class="g"><span class="t">${esc(x.descricao)}</span>
              <span class="s">${esc(x.rubrica || x.categoria || '')}</span></span>
            <span class="r"><span class="v">${fmtMoney(x.valor_cents)}</span></span>
          </label>`).join('')}</div>
        <div class="banner small">Quem faz mais de uma linha do orçamento costuma emitir
          <b>uma nota só</b>. Marque o que entra e o pedido sai discriminado, com o total no fim.</div>`
    : ''}
      <pre class="pedido">${esc(texto)}</pre>
      <div class="btns" style="margin-top:12px">
        <button class="btn pri" style="flex:1" data-copiar>Copiar${extras.length
          ? ` — ${fmtMoney(total)}` : ''}</button>
      </div>
      <div class="btns" style="margin-top:8px">
        <a class="btn gho" style="flex:1" href="${esc(linkEmail(c, extras))}">E-mail</a>
        <a class="btn gho" style="flex:1" href="${esc(linkWhats(c, extras))}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
      <button class="btn wide gho" style="margin-top:12px" data-marcar>Marquei como pedida</button>`;

    corpo.querySelectorAll('[data-extra]').forEach((n) => {
      n.onchange = () => {
        if (n.checked) marcadas.add(n.dataset.extra); else marcadas.delete(n.dataset.extra);
        pintar();
      };
    });
    corpo.querySelector('[data-copiar]').onclick = async () => {
      try {
        await navigator.clipboard.writeText(texto);
        toast('Copiado. É só colar.');
      } catch {
        const pre = corpo.querySelector('.pedido');
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        toast('Selecionei o texto — copie com o toque longo.');
      }
    };
    corpo.querySelector('[data-marcar]').onclick = async () => {
      // Todas as contas do pedido ficam marcadas, para a cobrança valer por todas.
      for (const x of [c, ...extras]) {
        await store.update('contas', x.id, {
          nf_status: 'a_receber', nf_pedido_em: hoje(), nf_cobrado_em: '',
          obs: `${x.obs ? x.obs + ' ' : ''}Pedido de NF enviado em ${fmtData(hoje())}`
            + `${extras.length ? ` (junto com outras ${extras.length} linha(s), total ${fmtMoney(total)})` : ''}.`
        });
      }
      await store.log(`Pedido de NF enviado: ${c.descricao}`
        + (extras.length ? ` + ${extras.length} linha(s), total ${fmtMoney(total)}` : ''), 'conta');
      sh.close();
      toast('Registrado no histórico.');
    };
  };

  pintar();
  const sh = sheet({ titulo: 'Pedido de nota fiscal', corpo });
}
