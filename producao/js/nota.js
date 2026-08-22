// Leitura automática da notinha.
//
// Nota fiscal de consumidor no Brasil (NFC-e/NFe) traz um QR code com a chave
// de acesso de 44 dígitos. A chave carrega, em posições fixas, o CNPJ de quem
// emitiu, o ano e o mês, a série e o número da nota — e a URL do QR costuma
// trazer o valor total. Dá para ler tudo isso no próprio aparelho, sem servidor
// e sem mandar a foto para lugar nenhum.
//
// O leitor de código de barras nativo não existe em todos os navegadores
// (hoje falta no Safari do iPhone). Quando faltar, o app avisa e a pessoa
// preenche na mão — a foto é guardada do mesmo jeito.

export const leitorDisponivel = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;

const soDigitos = (s) => String(s || '').replace(/\D/g, '');

/** Formata 14 dígitos como CNPJ. */
export function fmtCNPJ(d) {
  const n = soDigitos(d);
  if (n.length !== 14) return n;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

const UF = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI',
  23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES',
  33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF'
};

/**
 * Quebra a chave de acesso de 44 dígitos.
 * cUF(2) AAMM(4) CNPJ(14) mod(2) série(3) nNF(9) tpEmis(1) cNF(8) cDV(1)
 */
export function lerChave(chave) {
  const c = soDigitos(chave);
  if (c.length !== 44) return null;
  const ano = Number(c.slice(2, 4));
  const mes = c.slice(4, 6);
  return {
    chave: c,
    uf: UF[Number(c.slice(0, 2))] || '',
    ano: 2000 + ano,
    mes,
    competencia: `${2000 + ano}-${mes}`,
    cnpj: c.slice(6, 20),
    cnpjFmt: fmtCNPJ(c.slice(6, 20)),
    modelo: c.slice(20, 22) === '65' ? 'NFC-e' : c.slice(20, 22) === '55' ? 'NF-e' : c.slice(20, 22),
    serie: String(Number(c.slice(22, 25))),
    numero: String(Number(c.slice(25, 34)))
  };
}

/** Extrai o que der do conteúdo do QR (URL da SEFAZ ou a chave pura). */
export function lerQR(texto) {
  if (!texto) return null;
  const t = String(texto);
  let dados = null;

  // 1) chave de acesso: no parâmetro p=, em chNFe= ou solta no texto
  const porParam = t.match(/[?&](?:p|chNFe|chave)=([0-9]{44})/i);
  const solta = t.match(/(?<![0-9])([0-9]{44})(?![0-9])/);
  const chave = porParam?.[1] || solta?.[1];
  if (chave) dados = lerChave(chave);
  if (!dados) return null;

  // 2) valor total: vNF= na URL, ou 4º campo do parâmetro p=chave|versao|amb|...|vNF
  const vnf = t.match(/[?&]vNF=([0-9]+[.,][0-9]{2})/i);
  if (vnf) dados.valor = vnf[1];
  else {
    const pipes = t.match(/[?&]p=([^&]+)/i)?.[1]?.split('|');
    if (pipes && pipes.length >= 5) {
      const cand = pipes.find((x, i) => i >= 3 && /^[0-9]+\.[0-9]{2}$/.test(x));
      if (cand) dados.valor = cand;
    }
  }

  // 3) data de emissão, quando vier na URL
  const dh = t.match(/[?&]dhEmi=([^&]+)/i)?.[1];
  if (dh) {
    const iso = decodeURIComponent(dh).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) dados.data = iso;
  }
  dados.origem = t.slice(0, 200);
  return dados;
}

/** Procura um QR code na imagem e devolve os dados da nota, ou null. */
export async function lerNotaDaImagem(file) {
  if (!leitorDisponivel() || !file) return null;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const det = new window.BarcodeDetector({ formats: ['qr_code'] });
    let achados = await det.detect(bitmap);
    // Foto de notinha costuma ter QR pequeno; tenta de novo ampliada.
    if (!achados.length) {
      const escala = Math.min(3, Math.max(1, 1600 / Math.max(bitmap.width, bitmap.height)));
      if (escala > 1) {
        const cv = document.createElement('canvas');
        cv.width = Math.round(bitmap.width * escala);
        cv.height = Math.round(bitmap.height * escala);
        cv.getContext('2d').drawImage(bitmap, 0, 0, cv.width, cv.height);
        achados = await det.detect(cv);
      }
    }
    for (const a of achados) {
      const d = lerQR(a.rawValue);
      if (d) return d;
    }
    return null;
  } catch (e) {
    console.warn('Não consegui ler o QR:', e);
    return null;
  } finally {
    bitmap.close?.();
  }
}

/** Resumo curto para mostrar na tela depois da leitura. */
export function resumo(d) {
  if (!d) return '';
  return [
    d.modelo ? `${d.modelo} nº ${d.numero}` : '',
    d.cnpjFmt ? `CNPJ ${d.cnpjFmt}` : '',
    d.uf, d.valor ? `R$ ${d.valor}` : ''
  ].filter(Boolean).join(' · ');
}
