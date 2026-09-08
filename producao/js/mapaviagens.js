// O mapa das viagens e a lista, conversando.
//
// O desenho diz onde, a lista diz quando e com o quê. Separados, o mapa vira
// enfeite e a lista vira tabela; juntos, tocar num pino acende a viagem e tocar
// na viagem aproxima o mapa. Como isso vale no painel e na aba de viagens, mora
// aqui em vez de existir duas vezes.
import { store } from './store.js';
import { brasilSVG, coord, zoomPara } from './geo.js';
import { hoje } from './utils.js';

/* A cidade de uma viagem, com o estado no fim. O "(PA)" fica: é ele que salva
   quando a cidade não está no mapa de coordenadas — e era exatamente isso que
   fazia Belém, Salvador e Curitiba sumirem do desenho sem avisar. Quem desenha
   o rótulo encurta na hora. */
export const cidadeDaViagem = (v) => String(v?.destino || v?.titulo || '').trim();

/** A caixa vazia. O desenho entra depois, quando ela tiver largura. */
export const caixaMapaHTML = () => '<div class="pn-mapa-caixa" data-mapinha>'
  + '<button class="pn-mapa-volta" data-volta hidden>ver o país</button></div>';

/**
 * Desenha o mapa e amarra os dois lados.
 *
 * @param {HTMLElement} node       a tela inteira
 * @param {number} alturaMax       teto de altura do desenho
 * @param {Function} aoAbrir       chamada quando a mesma viagem é tocada de novo
 */
export function ligarMapaViagens(node, { alturaMax = 340, aoAbrir = null } = {}) {
  const caixa = node.querySelector('[data-mapinha]');
  if (!caixa) return;

  const hj = hoje();
  const vs = [...store.doProjeto('viagens')].sort((a, b) => String(a.ida).localeCompare(String(b.ida)));
  const prox = vs.find((v) => (v.volta || v.ida) >= hj) || vs[vs.length - 1];

  const desenhar = () => {
    const larg = caixa.clientWidth;
    if (!larg) return;
    const pinos = vs.map((v) => ({
      nome: v.destino, cidade: cidadeDaViagem(v),
      estado: (v.volta || v.ida) < hj ? 'passou' : 'futuro'
    })).filter((x) => coord(x.cidade));
    // No desktop a caixa é larga demais: sem teto, o país ocuparia uma tela
    // inteira de altura. O desenho se centra sozinho na largura que sobra.
    caixa.insertAdjacentHTML('afterbegin', brasilSVG({
      larg, alt: Math.min(alturaMax, Math.round(larg * 0.86)), pinos,
      rota: 'São Paulo', aceso: cidadeDaViagem(prox)
    }));
    ligarPinos();
  };

  const svg = () => caixa.querySelector('.geo');
  const botao = () => caixa.querySelector('[data-volta]');
  let acesa = null;

  const acender = (cidade, viagemId) => {
    acesa = acesa === cidade ? null : cidade;
    // Aproximação de leve: 1,55× já separa Gravataí de Porto Alegre sem jogar o
    // contorno do país para fora da tela — que é o que faria o zoom deixar de
    // dizer onde a cidade fica.
    zoomPara(svg(), acesa, 1.55);
    const b = botao();
    if (b) b.hidden = !acesa;
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
  };

  function ligarPinos() {
    svg()?.querySelectorAll('.geo-p').forEach((g) => {
      g.onclick = () => {
        const alvo = node.querySelector(`[data-viagem][data-cidade="${CSS.escape(g.dataset.cidade)}"]`);
        acender(g.dataset.cidade, alvo?.dataset.viagem);
      };
    });
  }

  // O botão de voltar nasce com a caixa, mas o ouvinte fica nela para valer
  // também depois do desenho entrar.
  caixa.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-volta]')) { ev.preventDefault(); acender(acesa); }
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

  requestAnimationFrame(desenhar);
}
