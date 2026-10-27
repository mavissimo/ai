# Fundação Bradesco 70 anos · site dos filmes

Site acessado pelo QR Code do livro *Fundação Bradesco 70 anos*. É estático (HTML + CSS + JS, sem build): basta publicar a pasta em qualquer hospedagem (Netlify, Vercel, GitHub Pages, S3…).

**Fluxo:** abertura com o selo → apresentação do projeto → mapa do Brasil.
No mapa, os pontos vermelhos são as escolas visitadas e os círculos são os fotógrafos, ligados às escolas que retrataram. Tocar numa escola abre a **Visita**; tocar num fotógrafo abre as **Pílulas**. O **Documentário** e o **Trailer** ficam fixos na parte de baixo, e "Todos os filmes" lista os 41.

## Conteúdo: tudo em `data.js`

| O quê | Onde |
|---|---|
| Textos da apresentação e créditos | `PROJETO` |
| Escolas (texto, posição, vídeo da visita) | `ESCOLAS` |
| Fotógrafos (bio, pílulas, escolas ligadas) | `FOTOGRAFOS` |
| Documentário e trailer | `DOCUMENTARIO` |

- **Vídeos:** preencha `url` com um link do YouTube, do Vimeo ou de um `.mp4`. Enquanto o campo estiver vazio, o player mostra "Filme em finalização".
- **Ligações no mapa:** o array `cidades` de cada fotógrafo define as linhas. As ligações listadas em `aConfirmar` são **provisórias** e aparecem com contorno tracejado no painel. Para esconder esse aviso na versão final, adicione `window.MODO_REVISAO = false;` em `data.js`.
- **Posição dos nós:** `pos` (viewBox 1000×1000). Ajuste à mão se mudar as ligações. Sem `pos`, o site calcula a posição sozinho.

## Identidade visual (do projeto gráfico do livro)

- **Fonte:** Sen (OFL), hospedada em `assets/fonts/`, sem depender do Google Fonts.
- **Cores:** roxo `#613CAD`; pontos em vermelho `#AB3438`, amarelo `#F5D775`, laranja `#E6AC5A`, azul `#4E9DBE` e creme `#FDEED9`; painéis em verde `#2F6246`, roxo e azul; card azul-claro `#A4CBD3`. Todas ficam como variáveis no topo de `styles.css`.
- **Selo 70 anos:** `assets/selo-70-branco.svg` e `assets/selo-70-roxo.svg`, vetorizados a partir da imagem do livro. Se a agência mandar o vetor oficial, substitua os dois mantendo os nomes.
- **Fotógrafos:** cada nó do mapa mostra um recorte da capa do livro daquele fotógrafo, com anel na cor da lombada (`cor` em `data.js`). O painel mostra a capa inteira.

## Fotos das capas (fora do git)

O repositório é público e o livro ainda não foi lançado, então `assets/capas/` está no `.gitignore`. Para gerar as imagens:

```sh
python3 tools/extrair-capas.py "Apr__Fundacao_Bradesco_Livro_capas.pdf"   # requer poppler + Pillow
```

Sem essas imagens, o site continua funcionando e usa a cor da lombada com as iniciais. Na hora de publicar, suba a pasta `assets/capas/` junto com o site.

## Links diretos (QR por página do livro)

Cada filme tem um endereço próprio, então dá para gerar um QR Code específico por página:

- `/#/fotografo/elza-lima`
- `/#/escola/conceicao-do-araguaia`
- `/#/filme/documentario` · `/#/filme/trailer`
- `/#/filmes` (índice) · `/#/mapa`

Nos links diretos, a abertura é mais curta e pula a apresentação.

## Pendências de conteúdo

- Logo oficial do selo 70 anos
- URLs dos 41 vídeos
- Minibiografias dos fotógrafos e títulos das pílulas
- Escolas que cada fotógrafo retratou (ligações em `aConfirmar`)
- Texto da escola de Osasco

## Rodar localmente

```sh
python3 -m http.server 8000   # depois abra http://localhost:8000
```
