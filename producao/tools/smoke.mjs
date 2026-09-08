// Teste de fumaça do arquivo que é PUBLICADO — não do servidor de módulos.
//
// O servidor de módulos e o arquivo único não são a mesma coisa: importação
// circular, por exemplo, o navegador resolve e o empacotador não. Já publiquei
// uma página em branco por confiar só no primeiro.
//
//   node tools/build-single-file.mjs
//   (cd producao && python3 -m http.server 8123 &)
//   node tools/smoke.mjs
//
import pw from 'playwright';
const { chromium } = pw;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await b.newContext({ serviceWorkers:'block', viewport:{width:390,height:844}, deviceScaleFactor:2 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p); await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
p.on('console',m=>{if(m.type()==='error' && !/ERR_CONNECTION_RESET|404/.test(m.text())) errs.push('C:'+m.text())});
let falhou = false;
const passo = async (n, fn) => {
  try { await fn(); console.log('ok  ', n); }
  catch (e) { falhou = true; console.log('FALHA', n, '—', e.message.split('\n')[0]); }
};

await p.goto('http://localhost:8123/unit0-arquivo-unico.html'); await p.waitForTimeout(1500);
await passo('capa abre', async()=>{ if(!await p.locator('.capa-tit').count()) throw new Error('sem capa'); });
// O link publicado fica preso numa versão; sem carimbo ninguém sabe qual está
// vendo. Ele tem de existir e não pode ser "dev" num arquivo empacotado.
await passo('a build se identifica', async()=>{
  const t = await p.evaluate(() => document.body.innerText.match(/vers[ãa]o de ([^\n]+)/i)?.[1] || '');
  if (!t || /dev/.test(t)) throw new Error('carimbo ausente: "'+t+'"'); });
await p.getByText('Entrar',{exact:true}).click(); await p.waitForTimeout(4000);
await passo('projeto carrega', async()=>{ if(!await p.locator('.ix').count()) throw new Error('sem lista de gente'); });
await p.locator('.ix').first().click(); await p.waitForTimeout(800);
await p.getByText('Entrar sem senha').click(); await p.waitForTimeout(1500);
await passo('entra no painel', async()=>{ if(!await p.locator('.tabbar').count()) throw new Error('sem tabbar'); });

const rotas = ['/','/mapa','/agenda','/etapas','/financeiro','/contas','/pagamentos','/caixa','/equipe',
 '/locacoes','/contratos','/aprovacoes','/notas','/fontes','/viagens','/versoes','/fixas','/mais','/meu'];
for (const r of rotas) { await p.evaluate(x=>location.hash='#'+x, r); await p.waitForTimeout(320); }
await passo('todas as rotas', async()=>{ if(errs.length) throw new Error(errs[0]); });

await p.evaluate(()=>location.hash='#/mapa'); await p.waitForTimeout(1500);
await passo('mapa: país + nós', async()=>{
  const g = await p.locator('.geo').count(), n = await p.locator('.no').count();
  if (!g || !n) throw new Error(`geo=${g} nos=${n}`); });
await p.evaluate(()=>{const t=document.querySelector('[data-trilho]'); t.scrollLeft=3*t.clientWidth;});
await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelectorAll('.estacao')[3].querySelector('.no').click());
await p.waitForTimeout(900);
await passo('diária abre', async()=>{ if(!await p.locator('.painel').count()) throw new Error('sem painel'); });
await p.evaluate(()=>{const b=[...document.querySelectorAll('.as-cab')].find(x=>/Onde/.test(x.textContent)); b&&b.click();});
await p.waitForTimeout(900);
await passo('mapa da cidade', async()=>{ if(await p.locator('.pn-mapa .geo').count()<1) throw new Error('sem mapa dentro'); });
await p.evaluate(()=>document.querySelector('.pn-x').click()); await p.waitForTimeout(600);

await p.evaluate(()=>location.hash='#/financeiro'); await p.waitForTimeout(900);
await p.locator('[data-criar]').click(); await p.waitForTimeout(700);
await passo('porta do dinheiro', async()=>{ const n=await p.locator('.ix').count(); if(n<6) throw new Error('só '+n+' portas'); });
await p.evaluate(()=>document.querySelector('.sheet .ix').click());
await p.waitForTimeout(1400);
await passo('form de gasto (importação tardia)', async()=>{
  if(!await p.locator('.sheet .f').count()) throw new Error('form não abriu'); });
// backup sem download
await p.evaluate(()=>document.querySelector('.sheet .btn.gho').click()); await p.waitForTimeout(400);
await p.evaluate(()=>location.hash='#/mais'); await p.waitForTimeout(800);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/backup|exportar/i.test(x.textContent)); b&&b.click();});
await p.waitForTimeout(900);
await passo('backup abre para copiar', async()=>{
  if(!await p.locator('.sheet [data-json]').count()) throw new Error('sem folha de backup'); });
// o painel: capa, caminho das fases e mapa
await p.evaluate(()=>location.hash='#/'); await p.waitForTimeout(1400);
await passo('faixa do topo corre', async()=>{
  const n = await p.locator('.fx-copia').first().locator('.fx-i').count();
  if (n < 4) throw new Error('só '+n+' itens');
  if (!await p.locator('.faixa.correndo').count()) throw new Error('parada'); });
await passo('cor no topo', async()=>{
  if (await p.locator('[data-cor]').count() !== 3) throw new Error('sem os três'); });
await passo('painel: linha do contrato', async()=>{
  if(!await p.locator('.pl-hoje').count()) throw new Error('sem linha'); });
await passo('painel: caminho das fases', async()=>{
  const n = await p.locator('[data-fase]').count();
  if (n < 3) throw new Error('só '+n+' fases'); });
await p.evaluate(()=>document.querySelectorAll('[data-fase]')[1].click()); await p.waitForTimeout(700);
await passo('fase abre as etapas', async()=>{
  if(!await p.locator('[data-etapa]').count()) throw new Error('não abriu'); });
await passo('painel: mapa', async()=>{
  if(!await p.locator('.pn-mapa-caixa .geo').count()) throw new Error('sem mapa'); });
// Nenhuma cidade pode sumir em silêncio: Belém, Salvador e Curitiba sumiam por
// não estarem no mapa de coordenadas, e ninguém era avisado.
await passo('mesa: o lado mostra a viagem acesa', async()=>{
  if(!await p.locator('.mesa-lado .mesa-t').count()) throw new Error('lado vazio'); });
await passo('mesa: dá para resolver dali', async()=>{
  if(!await p.locator('.mesa-lado [data-pend]').count()) throw new Error('sem botão de resolver'); });
await passo('toda cidade tem pino', async()=>{
  const n = await p.locator('.geo-p').count();
  if (n < 9) throw new Error('só '+n+' pinos para 11 viagens'); });

// dossiê de um alerta: o que é, de onde veio, por que, como, e as duas pontas
await passo('painel tem avisos', async()=>{
  if(!await p.locator('[data-alerta]').count()) throw new Error('sem avisos'); });
await p.evaluate(()=>document.querySelectorAll('[data-alerta]')[0].click()); await p.waitForTimeout(800);
await p.evaluate(()=>document.querySelector('[data-entender]')?.click());
await p.waitForTimeout(800);
await passo('a pergunta abre e se explica', async()=>{
  const b = await p.locator('.ds-b').count();
  if (b < 3) throw new Error('só '+b+' blocos'); });
await p.evaluate(()=>{const s=document.querySelector('.scrim'); s&&s.click();});
await p.waitForTimeout(400);
await passo('dossiê do aviso', async()=>{
  const b = await p.locator('.ds-b').count();
  if (b < 3) throw new Error('só '+b+' blocos'); });
await p.evaluate(()=>{const s=document.querySelector('.scrim'); s&&s.click();}); await p.waitForTimeout(400);

// dossiê de uma tarefa
await p.evaluate(()=>location.hash='#/tarefas'); await p.waitForTimeout(900);
await p.evaluate(()=>document.querySelector('[data-tarefa]').click()); await p.waitForTimeout(800);
await p.evaluate(()=>document.querySelector('[data-entender]').click()); await p.waitForTimeout(800);
await passo('dossiê da tarefa', async()=>{
  if(await p.locator('.ds-b').count() < 3) throw new Error('sem blocos'); });
await p.evaluate(()=>{const s=document.querySelector('.scrim'); s&&s.click();}); await p.waitForTimeout(400);

// tema: três opções de verdade — automático segue o sistema, e a escolha ganha
const fundo = async () => {
  const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [r,g,b2] = bg.match(/\d+/g).map(Number);
  return { soma: r+g+b2, bg };
};
const midia = (m) => cdp.send('Emulation.setEmulatedMedia',
  { features: [{ name: 'prefers-color-scheme', value: m }] });
// O atributo é derivado do que está gravado — mexer só nele o app desfaz na
// primeira troca de mídia. Aqui a escolha é feita do mesmo jeito que na tela.
const escolher = (t) => p.evaluate((t) => {
  const r = document.documentElement;
  if (t) { localStorage.setItem('unit0:tema', t); r.setAttribute('data-tema', t); }
  else { localStorage.removeItem('unit0:tema'); r.removeAttribute('data-tema'); }
}, t);

await midia('dark'); await p.waitForTimeout(200);
await passo('automático + sistema escuro = escuro', async()=>{
  const f = await fundo(); if (f.soma > 120) throw new Error(f.bg); });

await midia('light'); await p.waitForTimeout(200);
await passo('automático + sistema claro = claro', async()=>{
  const f = await fundo(); if (f.soma < 500) throw new Error(f.bg); });

await escolher('escuro');
await p.waitForTimeout(200);
await passo('escolher escuro ganha do sistema', async()=>{
  const f = await fundo(); if (f.soma > 120) throw new Error(f.bg); });

await midia('dark');
await escolher('claro');
await p.waitForTimeout(200);
await passo('escolher claro ganha do sistema', async()=>{
  const f = await fundo(); if (f.soma < 500) throw new Error(f.bg); });
await escolher(null);

// as viagens embaixo do mapa, e o zoom que liga uma coisa na outra
await p.evaluate(()=>location.hash='#/'); await p.waitForTimeout(1200);
await passo('painel não repete o mesmo item', async()=>{
  const perg = await p.evaluate(()=>[...document.querySelectorAll('.ag-q-c')].map(n=>n.textContent.trim()));
  const linhas = await p.evaluate(()=>[...document.querySelectorAll('.ag-l-s')].map(n=>n.textContent.trim()));
  const rep = linhas.filter((l)=>perg.some((q)=>q.startsWith(l.split(' · ')[0])));
  if (rep.length) throw new Error('repetido: '+rep[0]); });
await passo('viagens abaixo do mapa', async()=>{
  const n = await p.locator('[data-viagem]').count();
  if (n < 5) throw new Error('só '+n+' viagens'); });
await p.evaluate(()=>document.querySelectorAll('[data-viagem]')[2].click());
await p.waitForTimeout(700);
await passo('tocar na viagem aproxima o mapa', async()=>{
  if(!await p.locator('.geo.perto').count()) throw new Error('não aproximou');
  if(!await p.locator('[data-volta]:not([hidden])').count()) throw new Error('sem volta'); });
await passo('de perto aparecem os arredores', async()=>{
  if(!await p.locator('.geo-arred').count()) throw new Error('sem aeroporto no mapa');
  if(!await p.locator('.mesa-arred').count()) throw new Error('sem arredores na coluna'); });
// A cidade deixou de ser um ponto: o limite do município vem do IBGE, e o do
// aeroporto vem junto, para dar para ver que são duas cidades e não uma.
await passo('a cidade tem forma, não só ponto', async()=>{
  const r = await p.evaluate(()=>({
    alvo:(document.querySelector('.geo-mun.alvo')?.getAttribute('d')||'').length,
    viz:(document.querySelector('.geo-mun.vizinho')?.getAttribute('d')||'').length }));
  if (r.alvo < 300) throw new Error('limite do município ausente ou raso: '+r.alvo);
  if (!r.viz) throw new Error('o município do aeroporto não foi desenhado'); });
await p.evaluate(()=>document.querySelector('[data-volta]').click()); await p.waitForTimeout(600);
await passo('voltar ao país', async()=>{
  if(await p.locator('.geo.perto').count()) throw new Error('continuou perto'); });


/* Folha aberta de um passo anterior fica por cima de tudo e come o arrasto:
   o mapa só se testa com a tela limpa. */
const fecharFolhas = async () => {
  await p.evaluate(()=>{ document.querySelectorAll('.sheet [data-x]').forEach(b=>b.click()); });
  await p.waitForTimeout(400);
};
await fecharFolhas();

/* O buraco preto: a queixa foi "não deixa esse espaço nunca". O desenho tem de
   cobrir a caixa inteira em qualquer zoom e depois de qualquer arrasto. */
const cobertura = () => p.evaluate(() => {
  const g = document.querySelector('.geo');
  const cx = document.querySelector('.pn-mapa-caixa');
  const rg = g.getBoundingClientRect(), rc = cx.getBoundingClientRect();
  // 1px de borda de cada lado: a caixa mede 2px a mais que o desenho, e só.
  const enquadra = Math.abs(rg.width-rc.width) < 3 && Math.abs(rg.height-rc.height) < 3;
  const t = g.querySelector('[data-mundo]').getAttribute('transform') || '';
  const m = t.match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/);
  if (!m) return { enquadra, z:1, preso:true, alt:rc.height };
  const [, tx, ty, z] = m.map(Number);
  const L = Number(g.dataset.larg), A = Number(g.dataset.alt);
  const preso = tx <= .6 && tx >= L-L*z-.6 && ty <= .6 && ty >= A-A*z-.6;
  return { enquadra, z, preso, alt:rc.height };
});
await p.evaluate(()=>document.querySelectorAll('[data-viagem]')[2].click());
await p.waitForTimeout(700);
await passo('o mapa preenche a caixa', async()=>{
  const c = await cobertura();
  if (!c.enquadra) throw new Error('sobra caixa em volta do desenho');
  if (c.alt < 200) throw new Error('caixa de '+Math.round(c.alt)+'px');
  if (!c.preso) throw new Error('o desenho saiu de quadro em z='+c.z); });
await passo('aproxima de verdade', async()=>{
  const c = await cobertura();
  if (c.z < 3) throw new Error('zoom de só '+c.z); });
await passo('os botões de zoom andam', async()=>{
  const antes = (await cobertura()).z;
  await p.evaluate(()=>document.querySelector('[data-zoom="mais"]').click());
  await p.waitForTimeout(500);
  const c = await cobertura();
  if (c.z <= antes) throw new Error('não aproximou'); 
  if (!c.preso) throw new Error('saiu de quadro depois do +'); });
await passo('o mapa se arrasta com a mão', async()=>{
  // Acender a viagem rola a lista, e o mapa pode ter saído da tela: arrastar
  // o que não está visível não testa nada.
  await p.evaluate(()=>document.querySelector('.pn-mapa-caixa').scrollIntoView({block:'center'}));
  await p.waitForTimeout(400);
  const cx = await p.locator('.pn-mapa-caixa').boundingBox();
  const t0 = await p.evaluate(()=>document.querySelector('[data-mundo]').getAttribute('transform'));
  await p.mouse.move(cx.x+cx.width/2, cx.y+cx.height/2);
  await p.mouse.down();
  await p.mouse.move(cx.x+cx.width/2-70, cx.y+cx.height/2-40, {steps:8});
  await p.mouse.up();
  await p.waitForTimeout(300);
  const t1 = await p.evaluate(()=>document.querySelector('[data-mundo]').getAttribute('transform'));
  if (t0 === t1) throw new Error('o arrasto não mexeu no mapa: '+t0);
  const c = await cobertura();
  if (!c.preso) throw new Error('o arrasto abriu um vazio'); });
await p.evaluate(()=>{ const b=document.querySelector('[data-volta]'); if(b) b.click(); });
await p.waitForTimeout(600);

/* Os degraus de detalhe: o mapa tem de ganhar informação com o zoom, não só
   tamanho. As camadas já estão desenhadas; o que muda é o que está aceso. */
const camadas = () => p.evaluate(()=>{
  const g = document.querySelector('.geo');
  const op = (sel)=>{ const e = g.querySelector(sel); return e ? Number(getComputedStyle(e).opacity) : -1; };
  return { nivel:Number(g.dataset.nivel||0), pais:(g.querySelector('.geo-pais')?.getAttribute('d')||'').length,
    div:op('.geo-div'), uf:op('.geo-uf'), rio:op('.geo-rio'),
    ufs:g.querySelectorAll('.geo-uf').length, escala:g.querySelector('.geo-esc-t')?.textContent||'' };
});
await passo('o país vem de dado, não de rascunho', async()=>{
  const c = await camadas();
  // O contorno à mão tinha 95 pontos; o Natural Earth 1:50m passa de 900.
  if (c.pais < 6000) throw new Error('contorno curto demais: '+c.pais+' caracteres');
  if (c.ufs !== 27) throw new Error(c.ufs+' estados, deviam ser 27'); });
await p.evaluate(()=>{ const b=document.querySelector('[data-volta]'); if(b) b.click(); });
await p.waitForTimeout(800);
await passo('de longe é só o país', async()=>{
  const c = await camadas();
  if (c.nivel !== 1) throw new Error('nível '+c.nivel+' com o país inteiro à vista');
  if (c.div > 0.02) throw new Error('divisa acesa de longe'); });
const reguaLonge = (await camadas()).escala;
await p.evaluate(()=>document.querySelector('.pn-mapa-caixa').scrollIntoView({block:'center'}));
await p.evaluate(()=>{ for(let i=0;i<2;i++) document.querySelector('[data-zoom="mais"]').click(); });
await p.waitForTimeout(900);
await passo('aproximando entram divisas e siglas', async()=>{
  const c = await camadas();
  if (c.nivel < 3) throw new Error('dois passos de zoom e ainda no nível '+c.nivel);
  if (c.div < 0.2) throw new Error('divisa apagada no nível '+c.nivel);
  if (c.uf < 0.9) throw new Error('sigla apagada no nível '+c.nivel); });
await p.evaluate(()=>{ for(let i=0;i<2;i++) document.querySelector('[data-zoom="mais"]').click(); });
await p.waitForTimeout(900);
await passo('mais perto ainda: rios, e a sigla recua', async()=>{
  const c = await camadas();
  if (c.nivel < 4) throw new Error('quatro passos e ainda no nível '+c.nivel);
  if (c.rio < 0.3) throw new Error('rio apagado no nível '+c.nivel);
  if (c.uf > 0.9) throw new Error('a sigla não recuou: '+c.uf);
  if (c.uf < 0.2) throw new Error('a sigla sumiu de vez: '+c.uf); });
await passo('a régua muda com o zoom', async()=>{
  const c = await camadas();
  if (!/^\d+( mil)? km$/.test(c.escala)) throw new Error('régua diz "'+c.escala+'"');
  if (c.escala === reguaLonge) throw new Error('régua não mudou: '+c.escala); });
await p.evaluate(()=>{ const b=document.querySelector('[data-volta]'); if(b) b.click(); });
await p.waitForTimeout(600);

/* A faixa: "precisam ser coisas clicáveis pra gente resolver ou ver com
   detalhes". Toda linha tem de ser botão, e a linha tem de abrir algo. */
await passo('toda linha da faixa é botão', async()=>{
  const r = await p.evaluate(()=>{
    const c = document.querySelector('.fx-copia');
    return { itens: c.querySelectorAll('.fx-i').length, botoes: c.querySelectorAll('button[data-fx]').length };
  });
  if (r.itens < 4) throw new Error('faixa com '+r.itens+' itens');
  if (r.itens !== r.botoes) throw new Error(r.itens-r.botoes+' linhas sem ação'); });
await passo('a linha da faixa abre e se explica', async()=>{
  const abriu = await p.evaluate(()=>{
    const alvos = ['próxima viagem','urgente','próxima entrega','em curso','próxima diária'];
    const bs = [...document.querySelectorAll('.fx-copia:first-child button[data-fx]')];
    const b = bs.find((x)=>alvos.includes(x.querySelector('.fx-o')?.textContent.trim()));
    if (!b) return false; b.click(); return true;
  });
  if (!abriu) throw new Error('nenhuma linha com dossiê');
  await p.waitForTimeout(500);
  if (!await p.locator('.sheet .ds-tit, .sheet .ds-lista').count()) throw new Error('não abriu nada');
  await p.evaluate(()=>document.querySelector('.sheet [data-x]')?.click());
  await p.waitForTimeout(400); });

await p.screenshot({path:'f-bundle.png'});
console.log(errs.length ? 'ERROS: ' + errs.slice(0,4).join(' | ') : 'sem erros de JS');
if (falhou || errs.length) process.exitCode = 1;
await b.close();
