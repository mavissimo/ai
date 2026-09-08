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
// dossiê de um alerta: o que é, de onde veio, por que, como, e as duas pontas
await p.evaluate(()=>location.hash='#/'); await p.waitForTimeout(900);
await passo('painel tem avisos', async()=>{
  if(!await p.locator('[data-alerta]').count()) throw new Error('sem avisos'); });
await p.evaluate(()=>document.querySelectorAll('[data-alerta]')[0].click()); await p.waitForTimeout(800);
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

// tema: escuro por padrão, claro só por escolha
await passo('escuro é o padrão', async()=>{
  const bg = await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  const [r,g,bl] = bg.match(/\d+/g).map(Number);
  if (r+g+bl > 120) throw new Error('fundo claro: '+bg); });
await p.evaluate(()=>document.documentElement.setAttribute('data-tema','claro'));
await p.waitForTimeout(300);
await passo('claro por escolha', async()=>{
  const bg = await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  const [r,g,bl] = bg.match(/\d+/g).map(Number);
  if (r+g+bl < 500) throw new Error('não clareou: '+bg); });
await p.evaluate(()=>document.documentElement.removeAttribute('data-tema'));

await p.screenshot({path:'f-bundle.png'});
console.log(errs.length ? 'ERROS: ' + errs.slice(0,4).join(' | ') : 'sem erros de JS');
if (falhou || errs.length) process.exitCode = 1;
await b.close();
