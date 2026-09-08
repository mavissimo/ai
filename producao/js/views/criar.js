// A boca do funil do dinheiro.
//
// Tudo que é grana nasce aqui: gasto, entrada, conta a pagar, conta a receber,
// pedido de nota, cobrança do cliente e a nossa própria NF. Antes cada um
// desses estava escondido num canto diferente — num FAB, numa aba, numa lista.
// Agora é uma porta só, e o que ela abre continua sendo a mesma tela de sempre,
// para não haver dois caminhos que fazem a mesma coisa de jeitos diferentes.
import { store, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, sheet, toast, abrirForm } from '../ui.js';
import { esc, fmtMoney, fmtData, hoje } from '../utils.js';
import { camposLancamento } from './financeiro.js';
import { novaConta } from './contas.js';
import { linkCobranca, textoCobranca, linkEmail, textoPedido, irmasSemNF } from '../nf.js';

/* Cada porta sabe quem pode abri-la e o que faz do outro lado. A ordem é a do
   dia a dia: o que se faz toda hora em cima, o que se faz uma vez por mês
   embaixo. */
function portas(u) {
  return [
    {
      k: 'gasto', t: 'Gasto', cap: 'lanc.edit',
      d: 'Uma saída que já aconteceu. Vai para a rubrica e para o dia.',
      abrir: () => lancamento(u, 'saida')
    },
    {
      k: 'entrada', t: 'Entrada', cap: 'lanc.aprovar',
      d: 'Dinheiro que caiu na conta. Serve para dar baixa numa parcela.',
      abrir: () => lancamento(u, 'entrada')
    },
    {
      k: 'caixinha', t: 'Gasto da caixinha', cap: 'lanc.edit',
      d: 'Saiu em dinheiro vivo da verba de produção.',
      abrir: () => lancamento(u, 'saida', { forma: 'dinheiro', fonte: 'caixinha' })
    },
    {
      k: 'pagar', t: 'Conta a pagar', cap: 'contas.edit',
      d: 'Um combinado com alguém: valor, vencimento e se pede nota.',
      abrir: () => novaConta('pagar')
    },
    {
      k: 'receber', t: 'Conta a receber', cap: 'contas.edit',
      d: 'Uma parcela do contrato, ou qualquer entrada combinada.',
      abrir: () => novaConta('receber')
    },
    {
      k: 'pedirnf', t: 'Pedir nota fiscal', cap: 'contas.ver',
      d: 'Monta o texto do pedido e abre o e-mail já preenchido.',
      abrir: () => escolherConta('pagar', 'Pedir nota de quem?', pedirNF)
    },
    {
      k: 'cobrar', t: 'Cobrar o cliente', cap: 'contas.ver',
      d: 'E-mail com valor, vencimento e os dados da produtora.',
      abrir: () => escolherConta('receber', 'Cobrar qual parcela?', cobrar)
    },
    {
      k: 'nossanf', t: 'Lançar a nossa NF', cap: 'nf.emitir',
      d: 'Guarda o número da nota que a produtora emitiu para o cliente.',
      abrir: () => escolherConta('receber', 'A nota é de qual parcela?', lancarNossaNF)
    }
  ].filter((x) => !x.cap || can(u, x.cap));
}

/** A porta da frente do dinheiro. */
export function abrirCriar(u = store.user) {
  const lista = portas(u);
  const corpo = el('<div class="indice"></div>');
  lista.forEach((x, i) => {
    const b = el(`<button class="ix">
      <span class="ix-n">${String(i + 1).padStart(2, '0')}</span>
      <span class="ix-g"><span class="ix-t">${esc(x.t)}</span>
        <span class="ix-d">${esc(x.d)}</span></span>
      <span class="ix-v">→</span>
    </button>`);
    b.onclick = () => { sh.close(); x.abrir(); };
    corpo.append(b);
  });
  const sh = sheet({ titulo: 'Criar', corpo });
  return sh;
}

/* ------------------------------------------------------------ lançamento --- */
function lancamento(u, tipo, fixo = {}) {
  abrirForm({
    titulo: tipo === 'entrada' ? 'Entrada de dinheiro'
      : fixo.fonte === 'caixinha' ? 'Gasto da caixinha' : 'Novo gasto',
    campos: camposLancamento(u, { tipo, ...fixo }),
    onSave: async (v) => {
      await store.insert('lancamentos', {
        ...fixo, ...v, tipo,
        status: tipo === 'entrada' ? 'recebido' : (can(u, 'lanc.aprovar') ? 'aprovado' : 'pendente')
      });
      toast(tipo === 'entrada' ? 'Entrada registrada.'
        : can(u, 'lanc.aprovar') ? 'Lançado.' : 'Enviado para aprovação.');
    }
  });
}

/* ---------------------------------------------------- escolher uma conta --- */
function escolherConta(tipo, titulo, aoEscolher) {
  const lista = store.doProjeto('contas')
    .filter((c) => c.tipo === tipo && c.status === 'aberto')
    .sort((a, b) => String(a.venc || '9').localeCompare(String(b.venc || '9')));
  if (!lista.length) {
    toast(tipo === 'pagar' ? 'Nenhuma conta a pagar em aberto.' : 'Nenhuma parcela em aberto.');
    return;
  }
  const corpo = el('<div class="indice"></div>');
  lista.forEach((c) => {
    const quem = c.membro_id ? nomeMembro(c.membro_id) : (c.contraparte || '');
    const b = el(`<button class="ix">
      <span class="ix-g"><span class="ix-t">${esc(c.descricao || quem)}</span>
        <span class="ix-d">${esc([quem !== c.descricao ? quem : '',
          c.venc ? 'vence ' + fmtData(c.venc) : 'sem data'].filter(Boolean).join(' · '))}</span></span>
      <span class="ix-v num">${fmtMoney(c.valor_cents)}</span>
    </button>`);
    b.onclick = () => { sh.close(); aoEscolher(c); };
    corpo.append(b);
  });
  const sh = sheet({ titulo, corpo });
}

/* ------------------------------------------------------------- pedir NF --- */
function pedirNF(c) {
  const extras = irmasSemNF(c);
  const corpo = el(`<div>
    ${extras.length ? `<p class="small muted" style="margin:0 0 12px">
      ${extras.length} outra(s) conta(s) da mesma pessoa entram no mesmo pedido,
      discriminadas linha a linha.</p>` : ''}
    <pre class="pedido">${esc(textoPedido(c, extras))}</pre>
  </div>`);
  const rod = el('<div style="display:flex;gap:8px;width:100%"></div>');
  const bCopiar = el('<button class="btn gho" style="flex:1">Copiar</button>');
  const bMail = el('<a class="btn pri" style="flex:1" target="_blank" rel="noopener">Abrir e-mail</a>');
  bMail.href = linkEmail(c, extras);
  bCopiar.onclick = async () => {
    try { await navigator.clipboard.writeText(textoPedido(c, extras)); toast('Copiado.'); }
    catch { toast('Não consegui copiar. Selecione o texto.'); }
  };
  bMail.onclick = async () => {
    await store.update('contas', c.id, { nf_pedido_em: hoje() });
    toast('Marquei como pedida hoje.');
  };
  rod.append(bCopiar, bMail);
  sheet({ titulo: 'Pedido de nota fiscal', corpo, rodape: rod });
}

/* -------------------------------------------------------------- cobrança --- */
function cobrar(c) {
  const corpo = el(`<div><pre class="pedido">${esc(textoCobranca(c))}</pre></div>`);
  const rod = el('<div style="display:flex;gap:8px;width:100%"></div>');
  const bCopiar = el('<button class="btn gho" style="flex:1">Copiar</button>');
  const bMail = el('<a class="btn pri" style="flex:1" target="_blank" rel="noopener">Abrir e-mail</a>');
  bMail.href = linkCobranca(c);
  bCopiar.onclick = async () => {
    try { await navigator.clipboard.writeText(textoCobranca(c)); toast('Copiado.'); }
    catch { toast('Não consegui copiar. Selecione o texto.'); }
  };
  bMail.onclick = async () => {
    await store.update('contas', c.id, { nf_cobrado_em: hoje() });
    toast('Marquei a cobrança de hoje.');
  };
  rod.append(bCopiar, bMail);
  sheet({ titulo: 'Cobrar o cliente', corpo, rodape: rod });
}

/* ---------------------------------------------------------- a nossa nota --- */
function lancarNossaNF(c) {
  abrirForm({
    titulo: 'Nota fiscal emitida',
    subtitulo: `${c.descricao} · ${fmtMoney(c.valor_cents)}`,
    campos: [
      { k: 'nf_numero', label: 'Número da NF', type: 'texto', req: true, valor: c.nf_numero || '' },
      { k: 'nf_emitida_em', label: 'Emitida em', type: 'data', valor: c.nf_emitida_em || hoje() },
      { k: 'obs', label: 'Observação', type: 'area', valor: c.obs || '' }
    ],
    onSave: async (v) => {
      await store.update('contas', c.id, { ...v, nf_status: 'emitida' });
      toast(`NF ${v.nf_numero} guardada.`);
    }
  });
}
