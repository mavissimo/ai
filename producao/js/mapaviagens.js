// O mapa das viagens e a lista, conversando.
//
// O desenho diz onde, a lista diz quando e com o quê. Separados, o mapa vira
// enfeite e a lista vira tabela; juntos, tocar num pino acende a viagem e tocar
// na viagem aproxima o mapa. Como isso vale no painel e na aba de viagens, mora
// aqui em vez de existir duas vezes.
import { store } from './store.js';
import { brasilSVG, coord, zoomPara, zoomPasso, ligarNavegacaoMapa, detalharCidade, curto } from './geo.js';
import { hoje } from './utils.js';

/* A cidade de uma viagem, com o estado no fim. O "(PA)" fica: é ele que salva
   quando a cidade não está no mapa de coordenadas — e era exatamente isso que
   fazia Belém, Salvador e Curitiba sumirem do desenho sem avisar. Quem desenha
   o rótulo encurta na hora. */
export const cidadeDaViagem = (v) => String(v?.destino || v?.titulo || '').trim();

/* Quanto o mapa aproxima quando uma cidade acende. Caixa grande pede mais
   zoom: no desktop a mesma aproximação do celular deixaria a cidade perdida no
   meio de um estado inteiro. */
const zDaCaixa = (alt) => Math.min(11, Math.max(6.4, 6.4 * Math.sqrt((alt || 255) / 255)));

/** A caixa vazia. O desenho entra depois, quando ela tiver tamanho. */
export const caixaMapaHTML = () => `<div class="pn-mapa-caixa" data-mapinha>
  <div class="pn-mapa-ctrl">
    <button class="pn-mapa-b" data-zoom="mais" aria-label="Aproximar">+</button>
    <button class="pn-mapa-b" data-zoom="menos" aria-label="Afastar">−</button>
  </div>
  <button class="pn-mapa-volta" data-volta hidden>ver o país</button>
</div>`;

/**
 * Desenha o mapa e amarra os dois lados.
 *
 * @param {HTMLElement} node       a tela inteira
 * @param {number} alturaMax       teto de altura do desenho
 * @param {Function} aoAbrir       chamada quando a mesma viagem é tocada de novo
 */
export function ligarMapaViagens(node, { alturaMax = 340, aoAbrir = null, aoAcender = null } = {}) {
  const caixa = node.querySelector('[data-mapinha]');
  if (!caixa) return;
  caixa.style.setProperty('--mapa-alt', `${alturaMax}px`);

  const hj = hoje();
  const vs = [...store.doProjeto('viagens')].sort((a, b) => String(a.ida).localeCompare(String(b.ida)));
  const prox = vs.find((v) => (v.volta || v.ida) >= hj) || vs[vs.length - 1];

  let acesa = null;
  let medida = { larg: 0, alt: 0 };

  /* O desenho ocupa a caixa inteira, largura e altura. Antes ele tinha altura
     própria e, no desktop, a coluna esticava até a altura do painel ao lado —
     sobrava um retângulo preto embaixo do país. Caixa e desenho agora são a
     mesma coisa. */
  const desenhar = () => {
    const larg = caixa.clientWidth;
    const alt = caixa.clientHeight;
    if (!larg || !alt) return;
    if (Math.abs(larg - medida.larg) < 2 && Math.abs(alt - medida.alt) < 2) return;
    medida = { larg, alt };
    const pinos = vs.map((v) => ({
      nome: v.destino, cidade: cidadeDaViagem(v),
      estado: (v.volta || v.ida) < hj ? 'passou' : 'futuro'
    })).filter((x) => coord(x.cidade));
    caixa.querySelector('.geo')?.remove();
    caixa.insertAdjacentHTML('afterbegin', brasilSVG({
      larg, alt, pinos, rota: 'São Paulo', aceso: acesa || cidadeDaViagem(prox)
    }));
    ligarPinos();
    ligarNavegacaoMapa(svg());
    if (acesa) aproximar();
  };

  const svg = () => caixa.querySelector('.geo');
  const botao = () => caixa.querySelector('[data-volta]');

  /* De perto o mapa mostra os arredores: onde se pousa, quanta estrada falta
     até a locação, que cidades existem em volta e a que distância. Sai do
     cadastro, não de um palpite. */
  const aproximar = () => {
    zoomPara(svg(), acesa, zDaCaixa(medida.alt));
    detalharCidade(svg(), acesa ? arredoresDe(acesa) : null);
  };

  const acender = (cidade, viagemId) => {
    acesa = acesa === cidade ? null : cidade;
    aproximar();
    node.querySelectorAll('[data-viagem]').forEach((n) => {
      n.classList.toggle('on', Boolean(acesa) && n.dataset.cidade === acesa);
    });
    svg()?.querySelectorAll('.geo-p').forEach((g) => {
      g.classList.toggle('on', Boolean(acesa) && g.dataset.cidade === acesa);
    });
    if (acesa && viagemId) {
      node.querySelector(`[data-viagem="${viagemId}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    // Quem chamou decide o que mostrar ao lado do mapa.
    if (aoAcender) aoAcender(acesa, acesa ? (viagemId || idPorCidade(acesa)) : null);
  };

  const idPorCidade = (c) => vs.find((v) => cidadeDaViagem(v) === c)?.id || null;

  /* A locação daquela cidade, que é quem sabe o aeroporto, a distância e onde
     a equipe dorme. */
  const arredoresDe = (cidade) => {
    const nu = curto(cidade);
    const l = store.doProjeto('locacoes')
      .find((x) => curto(x.cidade) === nu || nu.includes(curto(x.cidade)));
    return {
      cidade,
      aeroporto: l?.aeroporto || '',
      sigla: l?.aeroporto_sigla || '',
      km: l?.km || '',
      tempo: l?.tempo || '',
      local: l?.nome || '',
      hospedagem: l?.hospedagem || ''
    };
  };

  function ligarPinos() {
    svg()?.querySelectorAll('.geo-p[data-cidade]').forEach((g) => {
      g.onclick = () => {
        const alvo = node.querySelector(`[data-viagem][data-cidade="${CSS.escape(g.dataset.cidade)}"]`);
        acender(g.dataset.cidade, alvo?.dataset.viagem);
      };
    });
  }

  // Os botões nascem com a caixa, mas o ouvinte fica nela para valer também
  // depois do desenho entrar.
  caixa.addEventListener('click', (ev) => {
    const z = ev.target.closest('[data-zoom]');
    if (z) {
      ev.preventDefault();
      zoomPasso(svg(), z.dataset.zoom === 'mais' ? 1.8 : 1 / 1.8);
      return;
    }
    if (ev.target.closest('[data-volta]')) {
      ev.preventDefault();
      if (acesa) acender(acesa);
      else zoomPara(svg(), '', 1);
    }
  });

  // O botão de voltar acompanha o zoom, venha ele de um pino ou do dedo.
  caixa.addEventListener('geo:mudou', (ev) => {
    const b = botao();
    if (b) b.hidden = (ev.detail?.z || 1) <= 1.02;
  });

  node.querySelectorAll('[data-viagem]').forEach((b) => {
    let apertou = 0;
    b.onclick = () => {
      // Um toque aproxima o mapa; o segundo abre a viagem. O mesmo alvo serve
      // para olhar e para entrar, sem precisar de dois botões.
      const agora = Date.now();
      if (b.classList.contains('on') && agora - apertou < 4000) {
        if (aoAbrir) aoAbrir(b.dataset.viagem);
        else location.hash = '#/viagens';
        return;
      }
      apertou = agora;
      acender(b.dataset.cidade, b.dataset.viagem);
    };
  });

  requestAnimationFrame(() => {
    desenhar();
    // Abre com o país inteiro à vista, mas com a próxima viagem já escolhida
    // na coluna ao lado: tela vazia esperando um toque não ensina nada a quem
    // chegou agora, e abrir aproximado esconde onde as coisas ficam.
    if (prox && aoAcender) aoAcender(cidadeDaViagem(prox), prox.id);
  });
  // A caixa muda de tamanho quando o painel ao lado cresce; o desenho tem que
  // acompanhar, senão volta a sobrar canto vazio.
  new ResizeObserver(desenhar).observe(caixa);
}
