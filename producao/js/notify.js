// Alertas do projeto + notificação do navegador (funciona com o app instalado
// na tela inicial). Sem servidor, o aviso dispara quando o app está aberto;
// no modo Supabase dá para plugar e-mail/push por Edge Function (ver README).
import { store } from './store.js';
import { can } from './perms.js';
import { diasAte, prazoTxt, fmtMoney, fmtData, hoje } from './utils.js';
import { saldoCaixa, statusFonte } from './calc.js';
import { paraCobrar, DIAS_FOLLOWUP } from './views/pedidosnf.js';

const VISTOS = 'unit0:alertas-vistos';

export function alertas() {
  const u = store.user;
  const out = [];
  const add = (o) => out.push(o);

  // Confirmações que a pessoa precisa dar (presença, passagem, hospedagem…)
  store.doProjeto('confirmacoes')
    .filter((c) => c.status === 'pendente' && (c.membro_id === u?.id || can(u, 'equipe.edit')))
    .forEach((c) => add({
      id: 'conf_' + c.id,
      urg: c.membro_id === u?.id ? 2 : 1,
      icone: c.membro_id === u?.id ? '🙋' : '⏳',
      texto: c.titulo,
      detalhe: c.membro_id === u?.id ? 'Confirme' : `${nome(c.membro_id)} ainda não confirmou`,
      rota: c.membro_id === u?.id ? '#/meu' : '#/equipe',
      ref: { t: 'confirmacoes', id: c.id },
      origem: 'A produção pediu esta confirmação quando montou a viagem. '
        + 'Ela fica aqui até alguém responder — não some sozinha.',
      porque: 'Sem a confirmação, a produção não sabe se pode contar com a pessoa. '
        + 'Passagem, hospedagem e diária ficam presas nisso.',
      como: c.membro_id === u?.id
        ? 'Abra "Meu painel" e toque em confirmar. Leva um toque.'
        : `Cobre ${nome(c.membro_id)} — em Equipe dá para ver o telefone e mandar mensagem.`
    }));

  // Contas vencendo
  if (can(u, 'contas.ver')) {
    store.doProjeto('contas').filter((c) => c.status === 'aberto').forEach((c) => {
      const d = diasAte(c.venc);
      if (d === null || d > 5) return;
      add({
        id: 'conta_' + c.id, urg: d < 0 ? 3 : 2, icone: c.tipo === 'pagar' ? '💸' : '💰',
        texto: `${c.tipo === 'pagar' ? 'Pagar' : 'Receber'} ${fmtMoney(c.valor_cents)}`,
        detalhe: `${c.descricao} · ${prazoTxt(c.venc)}`,
        rota: c.tipo === 'pagar' ? '#/pagamentos' : '#/contas',
        ref: { t: 'contas', id: c.id },
        origem: `Esta conta está em aberto e o vencimento é ${fmtData(c.venc)}. `
          + 'Toda conta a menos de cinco dias do vencimento aparece aqui.',
        porque: c.tipo === 'pagar'
          ? (d < 0 ? 'Já venceu. Atraso com fornecedor e com equipe custa caro em confiança, '
            + 'e no caso de gente que trabalhou é o que trava a próxima diária.'
            : 'Pagar no dia combinado é o que mantém a equipe e os fornecedores do lado da produção.')
          : 'É dinheiro que a produtora tem a receber. Enquanto não entra, o caixa aguenta o job sozinho.',
        como: c.tipo === 'pagar'
          ? 'Em Dinheiro → Pagamentos, abra a conta e dê baixa quando o pagamento sair.'
          : 'Em Dinheiro → Criar → Cobrar o cliente, o e-mail sai pronto com valor, vencimento e os dados da produtora.'
      });
    });
  }

  // Gastos aguardando aprovação
  if (can(u, 'lanc.aprovar')) {
    const pend = store.doProjeto('lancamentos').filter((l) => l.status === 'pendente');
    if (pend.length) add({
      id: 'aprov_' + pend.length, urg: 2, icone: '🧾',
      texto: `${pend.length} lançamento(s) para aprovar`, detalhe: 'Gastos lançados pela equipe',
      rota: '#/financeiro',
      ref: { t: 'lancamentos', id: pend[0]?.id },
      origem: 'Quem está em campo lança o gasto pelo celular e ele entra como pendente. '
        + 'Fica assim até a produção olhar.',
      porque: 'Gasto pendente não conta no orçamento. Enquanto ninguém aprova, o número de '
        + '"quanto já gastei" está mentindo para menos.',
      como: 'Em Dinheiro → Gastos, abra cada um, confira o comprovante e aprove ou rejeite.'
    });
  }

  // Entregas próximas
  store.doProjeto('entregas').filter((e) => e.status !== 'entregue').forEach((e) => {
    const d = diasAte(e.prazo);
    if (d === null || d > 5) return;
    add({ id: 'entr_' + e.id, urg: d < 0 ? 3 : 2, icone: '📦', texto: e.titulo,
      detalhe: `Entrega · ${prazoTxt(e.prazo)}`, rota: '#/agenda',
      ref: { t: 'entregas', id: e.id },
      origem: `O prazo desta entrega é ${fmtData(e.prazo)}, e ele veio do cronograma do contrato.`,
      porque: 'Entrega atrasada é a única coisa do job que o cliente enxerga de fora. '
        + 'E a segunda parcela só vence 30 dias depois da entrega final.',
      como: 'Suba a versão em Aprovações e mande para o cliente. O relógio do aceite começa aí.' });
  });

  // Rodadas de aprovação que passaram do prazo (silêncio = aceite pelo contrato)
  if (can(u, 'entregas.edit')) {
    store.doProjeto('aprovacoes').filter((a) => a.status === 'enviado').forEach((a) => {
      const d = diasAte(a.prazo);
      if (d === null) return;
      if (d < 0) add({
        id: 'apv_' + a.id, urg: 3, icone: '⏰',
        texto: a.titulo, detalhe: 'Prazo de aceite venceu sem resposta',
        rota: '#/aprovacoes',
        ref: { t: 'aprovacoes', id: a.id },
        origem: `A versão foi enviada e o prazo de resposta era ${fmtData(a.prazo)}.`,
        porque: 'Pelo contrato, silêncio depois do prazo vale como aceite. É bom registrar isso '
          + 'agora, enquanto a data está fresca — depois vira discussão.',
        como: 'Em Aprovações, marque como aceita por decurso de prazo. Fica gravado com a data.'
      });
      else if (d <= 2) add({
        id: 'apvp_' + a.id, urg: 1, icone: '👀',
        texto: a.titulo,
        detalhe: `Cliente tem ${d === 0 ? 'até hoje' : d + ' dia(s)'} para responder`,
        rota: '#/aprovacoes'
      });
    });
  }

  // Caixinha sem prestação de contas
  {
    const ids = [...new Set(store.doProjeto('caixa').map((m) => m.membro_id))];
    ids.forEach((id) => {
      if (!can(u, 'lanc.aprovar') && id !== u?.id) return;
      const c = saldoCaixa(id);
      if (c.saldo > 0) add({
        id: 'caixa_' + id, urg: id === u?.id ? 2 : 1, icone: '👛',
        texto: `${fmtMoney(c.saldo)} de caixinha em aberto`,
        detalhe: id === u?.id ? 'Comprove ou devolva' : `Com ${nome(id)}`,
        rota: '#/caixa',
        ref: { t: 'caixa', id },
        origem: 'A produção adiantou dinheiro vivo e a soma dos comprovantes ainda não fecha '
          + 'com o que saiu.',
        porque: 'Dinheiro sem comprovante não entra em rubrica nenhuma e some do orçamento. '
          + 'Na hora de prestar contas, some da contabilidade também.',
        como: 'Em Dinheiro → Caixinha, lance as notinhas que faltam ou devolva o troco.'
      });
    });
  }

  /* Tarefas: atrasadas, cobradas e as de hoje.

     Oitenta e sete das cento e onze tarefas do projeto são de viagem — o mesmo
     punhado de providências repetido nas onze. Se todas gritam no painel, o
     painel vira ruído e a pessoa para de olhar. Aqui só as das duas próximas
     viagens sobem: as outras continuam inteiras em Trabalho e na página da
     viagem, que é onde se prepara viagem. */
  const proximas = new Set([...store.doProjeto('viagens')]
    .filter((v) => (diasAte(v.volta || v.ida) ?? -1) >= 0)
    .sort((a, b) => String(a.ida).localeCompare(String(b.ida)))
    .slice(0, 2).map((v) => v.id));

  store.doProjeto('tarefas').forEach((t) => {
    const aberto = (t.status || (t.feito ? 'feita' : 'aberta')) !== 'feita';
    if (!aberto) return;
    if (t.viagem_id && !proximas.has(t.viagem_id)) return;
    const meu = t.responsavel_id === u?.id;
    if (!meu && !can(u, 'lanc.ver')) return;
    if (t.cobrado_em && meu) {
      add({ id: 'tcob_' + t.id, urg: 3, icone: '⚡', texto: t.titulo,
        detalhe: 'Cobraram você', rota: '#/tarefas',
        ref: { t: 'tarefas', id: t.id },
        origem: `Alguém da produção cobrou esta tarefa em ${fmtData(t.cobrado_em)}.`,
        porque: 'Cobrança é sinal de que outra pessoa está esperando por isto para poder tocar '
          + 'a parte dela.',
        como: 'Faça e marque como feita. Se não der, remarque com uma data — remarcar avisa '
          + 'quem cobrou, sumir não.' });
      return;
    }
    const d = diasAte(t.prazo);
    if (d === null) return;
    if (d < 0) add({
      id: 'tatr_' + t.id, urg: meu ? 3 : 2, icone: '⏱',
      texto: t.titulo,
      detalhe: meu ? `Atrasada · ${prazoTxt(t.prazo)}` : `${nome(t.responsavel_id)} · atrasada ${prazoTxt(t.prazo)}`,
      rota: '#/tarefas',
      ref: { t: 'tarefas', id: t.id },
      origem: `O prazo era ${fmtData(t.prazo)} e a tarefa continua aberta.`,
      porque: 'Tarefa de produção quase nunca está sozinha: normalmente ela é o que destrava '
        + 'a etapa ou a viagem em que está pendurada.',
      como: 'Marque como feita, ou remarque com uma data nova — o app guarda cada remarcação.'
    });
    else if (d === 0 && meu) add({
      id: 'thoje_' + t.id, urg: 2, icone: '✅', texto: t.titulo, detalhe: 'Para hoje', rota: '#/tarefas',
      ref: { t: 'tarefas', id: t.id },
      origem: 'O prazo desta tarefa é hoje.',
      porque: 'É a última janela antes de ela virar atraso e aparecer em vermelho para todo mundo.',
      como: 'Marque como feita quando terminar, ou remarque se o dia virou outra coisa.'
    });
  });

  // Etapas travadas
  store.doProjeto('etapas').filter((e) => e.status === 'travado').forEach((e) => {
    add({ id: 'trav_' + e.id, urg: 2, icone: '⛔', texto: e.nome, detalhe: 'Etapa travada', rota: '#/etapas',
      ref: { t: 'etapas', id: e.id },
      origem: 'Alguém marcou esta etapa como travada — quase sempre porque falta uma resposta '
        + 'de fora: cliente, fornecedor ou autorização.',
      porque: 'Etapa travada segura tudo que vem depois dela no cronograma, e o cronograma é o '
        + 'que sustenta a data de entrega do contrato.',
      como: 'Em Etapas, abra e escreva o que está faltando. Quem resolver destrava.' });
  });

  // Compromissos de hoje e amanhã. Viagem não entra: ela já tem o mapa, a fita
  // de viagens no painel e a aba inteira — repetir aqui só ocupa lugar.
  store.doProjeto('eventos').forEach((ev) => {
    const d = diasAte(ev.data);
    if (d !== 0 && d !== 1) return;
    if (ev.tipo === 'viagem') return;
    const meu = (ev.participantes || []).includes(u?.id);
    if (!meu && !can(u, 'agenda.ver')) return;
    add({
      id: 'ev_' + ev.id, urg: d === 0 ? 3 : 1, icone: ev.tipo === 'viagem' ? '✈️' : ev.tipo === 'diaria' ? '🎬' : '📍',
      texto: ev.titulo,
      detalhe: `${d === 0 ? 'Hoje' : 'Amanhã'}${ev.hora_inicio ? ' às ' + ev.hora_inicio : ''}`
        + (ev.confirmado === false ? ' · data a confirmar' : ''),
      rota: '#/mapa',
      ref: { t: 'eventos', id: ev.id },
      origem: `Está na agenda do projeto para ${d === 0 ? 'hoje' : 'amanhã'}`
        + (ev.confirmado === false
          ? ', mas a Fundação ainda não confirmou esta data.'
          : ', já confirmado.'),
      porque: ev.confirmado === false
        ? 'Pelo contrato (cláusula 4.3), a Fundação precisa confirmar cada diária com dez dias '
          + 'úteis de antecedência. Sem isso, a equipe pode viajar para nada.'
        : 'É o dia acontecendo. O que não estiver resolvido até agora vira problema em campo.',
      como: 'No Mapa, abra o dia: quem vai, ordem do dia, onde é, o dinheiro e o que falta '
        + 'estão todos ali, e dá para resolver de lá mesmo.'
    });
  });

  // Nota fiscal pedida e não entregue: passou de três dias, é hora de cobrar.
  if (can(u, 'contas.ver')) {
    for (const { conta, est } of paraCobrar()) {
      add({
        id: 'nfcob_' + conta.id, urg: 3, icone: '🧾',
        texto: `Cobrar a NF de ${conta.contraparte || conta.descricao}`,
        detalhe: `${fmtMoney(conta.valor_cents)} · ${est.t}`, rota: '#/pedidos-nf',
        ref: { t: 'contas', id: conta.id },
        origem: `O pedido de nota foi mandado em ${fmtData(conta.nf_pedido_em)} e passaram-se `
          + `mais de ${DIAS_FOLLOWUP} dias sem a nota chegar.`,
        porque: 'A produtora não paga sem nota. Enquanto ela não chega, quem trabalhou não '
          + 'recebe e o gasto não entra no fechamento do job.',
        como: 'Em Pedidos de NF, o texto do follow-up sai pronto — dá para mandar por e-mail '
          + 'ou WhatsApp num toque.'
      });
    }
  }

  // Fontes de fora (planilha, agenda) que ninguém reconfere há tempo demais.
  if (can(u, 'projeto.edit')) {
    store.doProjeto('fontes').forEach((f) => {
      const st = statusFonte(f);
      if (!st.vencida) return;
      add({
        id: 'fonte_' + f.id, urg: 2, icone: '🔗', texto: f.titulo,
        detalhe: `Reconferir — ${st.txt}`, rota: '#/fontes',
        ref: { t: 'fontes', id: f.id },
        origem: `Esta fonte de fora tem uma frequência de conferência combinada e a última foi `
          + `há tempo demais — ${st.txt}.`,
        porque: 'Tudo que este app mostra saiu de algum lugar: contrato, planilha, agenda, '
          + 'e-mail. Se a fonte mudou e ninguém trouxe, o número na tela está velho e as '
          + 'decisões saem em cima dele.',
        como: 'Em Fontes, abra o link, compare com o que está aqui e marque como conferida.'
      });
    });
  }

  return out.sort((a, b) => b.urg - a.urg);
}

const nome = (id) => store.get('membros', id)?.nome || 'Alguém';

export async function pedirPermissao() {
  if (!('Notification' in window)) return 'indisponivel';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function dispararNovos() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let vistos = [];
  try { vistos = JSON.parse(localStorage.getItem(VISTOS) || '[]'); } catch { vistos = []; }
  const atuais = alertas().filter((a) => a.urg >= 2);
  const novos = atuais.filter((a) => !vistos.includes(a.id));
  novos.slice(0, 3).forEach((a) => {
    try {
      new Notification('Unit0 — ' + (store.projeto?.nome || 'Produção'), {
        body: a.detalhe ? `${a.texto} — ${a.detalhe}` : a.texto, icon: 'icon.svg', tag: a.id
      });
    } catch (e) { console.warn(e); }
  });
  localStorage.setItem(VISTOS, JSON.stringify(atuais.map((a) => a.id).slice(0, 200)));
}

export function iniciarMonitor() {
  dispararNovos();
  setInterval(dispararNovos, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') dispararNovos();
  });
}

/* ---------------------------------------------------------- decisões ---
   Perguntas de sim ou não que dá para resolver na hora, sem sair do painel.
   No máximo três: se tudo é urgente, nada é. */
export function perguntas() {
  const u = store.user;
  const out = [];

  // Confirmações pendentes da própria pessoa: um toque resolve.
  store.doProjeto('confirmacoes')
    .filter((c) => c.status === 'pendente' && c.membro_id === u?.id)
    .slice(0, 2)
    .forEach((c) => out.push({
      id: 'q_conf_' + c.id, urg: 3, icone: '🙋', ref: { t: 'confirmacoes', id: c.id },
      pergunta: c.titulo,
      contexto: c.obs || 'Confirme para a produção saber que está de pé.',
      sim: 'Confirmo', nao: 'Tenho problema',
      rota: '#/meu',
      origem: 'A produção pediu esta confirmação quando montou a viagem, e ela fica '
        + 'aqui até você responder — não some sozinha nem some com o tempo.',
      porque: 'Enquanto ninguém responde, a produção não sabe se pode contar com você. '
        + 'Passagem, hospedagem e diária ficam presas nisso, e no fim quem paga a '
        + 'remarcação é o projeto.',
      como: '"Confirmo" fecha o assunto agora. "Tenho problema" marca para a produção '
        + 'conversar com você — nenhuma das duas cancela nada sozinha.',
      async aoSim() { await store.update('confirmacoes', c.id, { status: 'confirmado', respondido_em: hoje() }); },
      async aoNao() { await store.update('confirmacoes', c.id, { status: 'problema', respondido_em: hoje() }); }
    }));

  // Contas vencidas: quem pode dar baixa responde se já saiu.
  if (can(u, 'pagamento.executar')) {
    store.doProjeto('contas')
      .filter((c) => c.status === 'aberto' && (diasAte(c.venc) ?? 9) < 0)
      .slice(0, 2)
      .forEach((c) => out.push({
        id: 'q_conta_' + c.id, urg: 3, icone: c.tipo === 'pagar' ? '💸' : '💰',
        ref: { t: 'contas', id: c.id },
        pergunta: `${c.tipo === 'pagar' ? 'Já pagou' : 'Já caiu'} ${fmtMoney(c.valor_cents)}?`,
        contexto: `${c.descricao} · venceu ${prazoTxt(c.venc)}`,
        sim: c.tipo === 'pagar' ? 'Já paguei' : 'Já caiu', nao: 'Ainda não',
        rota: c.tipo === 'pagar' ? '#/pagamentos' : '#/contas',
        origem: `Esta conta venceu em ${fmtData(c.venc)} e continua marcada como aberta. `
          + 'O app não tem como saber sozinho se o dinheiro saiu — por isso pergunta.',
        porque: c.tipo === 'pagar'
          ? 'Conta paga que segue aberta faz o app achar que ainda deve, e o número de '
            + '"quanto já saiu" fica errado para menos no fechamento do job.'
          : 'Parcela recebida que segue aberta faz o caixa parecer menor do que é.',
        como: 'Se já saiu, o toque em "Já paguei" dá baixa e cria o lançamento sozinho, '
          + 'com data de hoje. Se ainda não, ela volta a perguntar amanhã.',
        async aoSim() {
          await store.update('contas', c.id, { status: 'quitado', quitado_em: hoje() });
          await store.insert('lancamentos', {
            tipo: c.tipo === 'pagar' ? 'saida' : 'entrada', descricao: c.descricao,
            valor_cents: c.valor_cents, data: hoje(), rubrica: c.rubrica || '',
            fornecedor: c.contraparte || '', membro_id: c.membro_id || null,
            status: c.tipo === 'pagar' ? 'pago' : 'recebido', conta_id: c.id,
            fonte: 'empresa', obs: 'Respondido no painel.'
          });
        }
      }));
  }

  // Nota que não chegou: um toque cobra de novo ou marca como recebida.
  if (can(u, 'contas.ver')) {
    const atrasada = paraCobrar()[0];
    if (atrasada) out.push({
      id: 'q_nf_' + atrasada.conta.id, urg: 3, icone: '🧾',
      ref: { t: 'contas', id: atrasada.conta.id },
      pergunta: `A NF de ${atrasada.conta.contraparte || atrasada.conta.descricao} já chegou?`,
      contexto: `${fmtMoney(atrasada.conta.valor_cents)} · ${atrasada.est.t}`,
      sim: 'Chegou', nao: 'Vou cobrar',
      rota: '#/pedidos-nf',
      origem: `O pedido de nota foi mandado em ${fmtData(atrasada.conta.nf_pedido_em)} e `
        + `passaram-se mais de ${DIAS_FOLLOWUP} dias sem resposta.`,
      porque: 'A produtora não paga sem nota. Enquanto ela não chega, quem trabalhou não '
        + 'recebe e o gasto não entra no fechamento.',
      como: '"Chegou" encerra a cobrança. "Vou cobrar" marca a data de hoje e o texto do '
        + 'follow-up fica pronto em Pedidos de NF, para mandar por e-mail ou WhatsApp.',
      async aoSim() { await store.update('contas', atrasada.conta.id, { nf_status: 'recebida' }); },
      async aoNao() { await store.update('contas', atrasada.conta.id, { nf_cobrado_em: hoje() }); }
    });
  }

  // Datas de filmagem ainda não confirmadas pela Fundação.
  if (can(u, 'agenda.edit')) {
    const porConfirmar = store.doProjeto('eventos')
      .filter((e) => e.confirmado === false && e.tipo === 'diaria' && (diasAte(e.data) ?? 99) <= 21)
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));
    if (porConfirmar[0]) {
      const e = porConfirmar[0];
      out.push({
        id: 'q_data_' + e.id, urg: 2, icone: '📅',
        pergunta: `O cliente confirmou ${e.titulo}?`,
        contexto: `${fmtData(e.data, { longo: true })} · o contrato pede 10 dias úteis de antecedência`,
        sim: 'Confirmou', nao: 'Ainda não',
        rota: '#/mapa', ref: { t: 'eventos', id: e.id },
        origem: 'Esta diária está na agenda mas continua marcada como não confirmada pela '
          + 'Fundação, e a data se aproxima.',
        porque: 'Pela cláusula 4.3 do contrato, cada diária precisa ser confirmada com dez '
          + 'dias úteis de antecedência. Sem isso a equipe pode viajar para nada — e a '
          + 'passagem já estará comprada.',
        como: '"Confirmou" trava a data e ela para de aparecer como prevista no mapa e na '
          + 'agenda. Se ainda não veio, vale cobrar a Fundação hoje.',
        async aoSim() { await store.update('eventos', e.id, { confirmado: true }); }
      });
    }
  }

  // Fontes que ninguém reconfere há tempo demais.
  if (can(u, 'projeto.edit')) {
    const velha = store.doProjeto('fontes').find((f) => statusFonte(f).vencida);
    if (velha) out.push({
      id: 'q_fonte_' + velha.id, urg: 2, icone: '🔗',
      pergunta: `Conferiu ${velha.titulo}?`,
      contexto: statusFonte(velha).txt + ' — o projeto depende desse link',
      rota: '#/fontes', ref: { t: 'fontes', id: velha.id },
      origem: 'Esta fonte de fora tem uma frequência de conferência combinada, e a última '
        + 'foi há tempo demais.',
      porque: 'Tudo que este app mostra saiu de algum lugar: contrato, planilha, agenda, '
        + 'e-mail. Se a fonte mudou e ninguém trouxe, o número na tela está velho e as '
        + 'decisões saem em cima dele.',
      como: 'Abra o link, compare com o que está aqui e marque como conferida. O que '
        + 'estiver diferente, corrija na tela que for dona daquele dado.',
      sim: 'Conferi agora', nao: 'Depois',
      async aoSim() { await store.update('fontes', velha.id, { conferido_em: hoje() }); }
    });
  }

  return out.sort((a, b) => b.urg - a.urg).slice(0, 3);
}
