function moneyToNumber(value) {
  return Number.parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
}

function isMoneyTok(tok) {
  return /^[\d.]*\d,\d{2}\s?-?$/.test((tok || '').trim());
}

function isDateTok(tok) {
  return /^\d{2}\/\d{2}$/.test((tok || '').trim());
}

function isCurrencyCode(tok) {
  return /^[A-Z]{3}$/.test((tok || '').trim());
}

function isCardHeaderName(tok) {
  return /^[A-ZÀ-Ü][A-ZÀ-Ü .]{4,60}$/.test((tok || '').trim());
}

function isMaskedCard(tok) {
  return /^\d{4} XXXX XXXX \d{4}$/.test((tok || '').trim());
}

export function splitDescParcela(raw) {
  const match = /(\d{2})\/(\d{2})$/.exec(raw);
  if (match) {
    const before = raw.slice(0, match.index);
    const charBefore = before.slice(-1);
    if (before.trim() !== '' && !/\d/.test(charBefore)) {
      return { desc: before.trim(), parcela: `${match[1]}/${match[2]}`, ambiguous: false };
    }
    if (/\d$/.test(charBefore)) {
      return { desc: `${before}${match[1][0]}`.trim(), parcela: `${match[1]}/${match[2]}`, ambiguous: false };
    }
  }
  return { desc: raw.trim(), parcela: null, ambiguous: /\d{2}\/\d{2}$/.test(raw) };
}

function parseTransacoes(paginasItens) {
  const toks = [];
  paginasItens.forEach((page) => {
    page.items.forEach((item) => {
      if (item.x < 360 && item.str && item.str.trim() !== '') toks.push({ s: item.str.trim(), x: item.x });
    });
  });

  const grupos = [];
  const preamble = [];
  let cur = null;
  let index = 0;

  function pushItem(item) {
    if (cur) cur.itens.push(item);
    else preamble.push(item);
  }

  while (index < toks.length) {
    const tok = toks[index].s;

    if (isCardHeaderName(tok) && (toks[index + 1] || {}).s === 'Cartão' && isMaskedCard((toks[index + 2] || {}).s)) {
      cur = { titularRaw: tok, cardRaw: toks[index + 2].s, itens: [], totalDeclarado: null };
      grupos.push(cur);
      index += 3;
      continue;
    }

    if (tok.startsWith('Total para')) {
      let cursor = index + 1;
      let valor = null;
      if (isMoneyTok((toks[cursor] || {}).s)) {
        valor = moneyToNumber(toks[cursor].s);
        cursor += 1;
      } else {
        cursor += 1;
        if (isMoneyTok((toks[cursor] || {}).s)) {
          valor = moneyToNumber(toks[cursor].s);
          cursor += 1;
        }
      }
      if (cur) cur.totalDeclarado = valor;
      index = cursor;
      continue;
    }

    if (isDateTok(tok)) {
      const nextS = (toks[index + 1] || {}).s || '';
      const looksLikeBoundary = nextS.startsWith('Total para') ||
        (isCardHeaderName(nextS) && (toks[index + 2] || {}).s === 'Cartão');
      const lastItem = cur ? cur.itens[cur.itens.length - 1] : preamble[preamble.length - 1];
      if (looksLikeBoundary && lastItem && !lastItem.p) {
        lastItem.p = tok;
        index += 1;
        continue;
      }
    }

    if (isDateTok(tok) && (toks[index + 1] || {}).s && /[A-Za-zÀ-ÿ]/.test(toks[index + 1].s)) {
      const data = tok;
      let cursor = index + 1;
      const descParts = [];
      while (toks[cursor] && toks[cursor].x < 145) {
        descParts.push(toks[cursor].s);
        cursor += 1;
      }
      const combinedDesc = descParts.join(' ');
      const split = splitDescParcela(combinedDesc);
      const desc = split.desc;
      const parcela = split.parcela;
      const ambiguous = split.ambiguous;

      let city = '';
      let fx = null;
      if (toks[cursor] && toks[cursor].x >= 145 && toks[cursor].x < 265 && isCurrencyCode(toks[cursor].s)) {
        const code = toks[cursor].s;
        cursor += 1;
        const amtCity = (toks[cursor] || {}).s || '';
        cursor += 1;
        const matchAmount = /^([\d.,]+)\s+(.+)$/.exec(amtCity);
        const fxAmount = matchAmount ? matchAmount[1] : '';
        city = matchAmount ? matchAmount[2] : amtCity;
        if (isMoneyTok((toks[cursor] || {}).s)) cursor += 1;
        let cotacao = '';
        if (toks[cursor] && /^[\d.,]+$/.test(toks[cursor].s)) {
          cotacao = toks[cursor].s;
          cursor += 1;
        }
        fx = `${code} ${fxAmount} - cambio ${cotacao}`;
      } else {
        while (toks[cursor] && toks[cursor].x >= 145 && toks[cursor].x < 265) {
          city = `${city} ${toks[cursor].s}`.trim();
          cursor += 1;
        }
      }

      while (toks[cursor] && toks[cursor].x < 300 && !isMoneyTok(toks[cursor].s)) cursor += 1;
      const valorTok = (toks[cursor] || {}).s || '';
      const isCredito = valorTok.includes('-');
      const valor = isMoneyTok(valorTok) ? moneyToNumber(valorTok) : Number.NaN;
      if (toks[cursor]) cursor += 1;

      if (!isCredito) pushItem({ data, desc, city, valor, parcela, fx, ambiguous });
      index = cursor;
      continue;
    }

    index += 1;
  }

  return { grupos, preamble };
}

function pageText(items) {
  return items.map((item) => item.str.trim()).filter(Boolean).join('\n');
}

function extractResumo(pageOneText, pageTwoText) {
  const resumo = {};
  let match = /Total da fatura\s*\nR\$ ([\d.,]+)\s*\nVencimento\s*\n(\d{2}\/\d{2}\/\d{4})/.exec(pageOneText);
  if (match) {
    resumo.totalFatura = moneyToNumber(match[1]);
    resumo.vencimento = match[2];
  }
  match = /Previs[aã]o de fechamento da pr[oó]xima fatura: (\d{2}\/\d{2}\/\d{4})/.exec(pageOneText);
  if (match) resumo.fechamento = match[1];
  match = /Total para as pr[oó]ximas faturas\s*\nR\$ ([\d.,]+)/.exec(pageTwoText);
  if (match) resumo.compromissoFuturo = moneyToNumber(match[1]);
  return resumo;
}

function toISODate(dateBR) {
  if (!dateBR) return null;
  const [day, month, year] = dateBR.split('/');
  return `${year}-${month}-${day}`;
}

function toCentavos(value) {
  return Math.round((Number(value) || 0) * 100);
}

function normalizeCard(cardRaw) {
  return cardRaw ? cardRaw.replace('XXXX XXXX', '**** ****') : '';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function smartTitleCase(value) {
  return String(value || '').toLowerCase().replace(/(^|\s)([a-zà-ú])/g, (match) => match.toUpperCase());
}

function categoryOf(description) {
  const text = normalizeText(description);
  const rules = [
    [/MYTRIP|SMILES|AZUL|TAP|MAXMILHAS|QUEROPASSAGEM|POUSADA|BOOKING|CARS ON/, 'Viagem'],
    [/DROGA|DROGASIL|RAIA/, 'Farmacia'],
    [/SEPHORA|BEAUTY|SPA|DANTAS PRADO/, 'Beleza'],
    [/DECATHLON|ACADEMIA|SELFIT/, 'Esporte/Academia'],
    [/AMERICANAS|MERCADOLIVRE|SHOPEE|AMAZON|COMERCIO VAREJISTA/, 'Compras Online'],
    [/USAFLEX|SHOULDER|AREZZO|DAMYLLER|RITUAL|ALFAIATARIA/, 'Vestuario'],
    [/PRECO|G BARBOSA|SUPERMERCADO|HORTIFRUTI|BOMBOM/, 'Supermercado'],
    [/PANDORO|FORNERIA|IFOOD|RESTAUR|CAFE|LANCCHE|SUSHI|BOTECO|CUSCUZ|MANOEL|DIPLOMATA|GELATO|MARALCO|K M /, 'Alimentacao'],
    [/POSTO|COMBUSTIV|REDE RPB/, 'Combustivel'],
    [/NETFLIX|APPLE.COM|LIVELO/, 'Assinatura'],
    [/MAPFRE|SEGURO|ASSIST/, 'Seguros'],
    [/PARKING|ESTACIONAMENTO|GARCEZ/, 'Estacionamento'],
    [/IPM EDUCACAO/, 'Educacao'],
    [/IOF|CUSTO TRANS|ANUIDADE/, 'Tarifas e Impostos'],
    [/UBER/, 'Transporte'],
    [/LOGIN|INFORMATICA|KALUNGA/, 'Informatica'],
    [/OCULOS|LUMINARE/, 'Saude'],
    [/JOIAS|BIJOUX|PEROLA/, 'Joias/Acessorios']
  ];
  return rules.find(([regex]) => regex.test(text))?.[1] || 'Sem categoria';
}

function parcelaInfo(parcela) {
  if (!parcela) return null;
  const [atual, total] = parcela.split('/').map(Number);
  if (!Number.isFinite(atual) || !Number.isFinite(total)) return null;
  return { atual, total, faltam: Math.max(total - atual, 0) };
}

export async function parseFaturaPdf(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const allPages = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    allPages.push({
      items: content.items.map((item) => ({
        str: item.str,
        x: item.transform[4]
      }))
    });
  }

  const resumo = extractResumo(pageText(allPages[0]?.items || []), pageText(allPages[1]?.items || []));
  const { grupos, preamble } = parseTransacoes(allPages.slice(1));
  if (preamble.length) {
    if (grupos[0]) grupos[0].itens.push(...preamble);
    else {
      grupos.push({
        titularRaw: 'ENCARGOS DA FATURA',
        cardRaw: '',
        itens: preamble,
        totalDeclarado: preamble.reduce((sum, item) => sum + (Number.isNaN(item.valor) ? 0 : item.valor), 0)
      });
    }
  }

  const gruposNormalizados = grupos.map((grupo) => {
    const last4 = grupo.cardRaw.match(/(\d{4})$/)?.[1] || '';
    const somaItens = grupo.itens.reduce((sum, item) => sum + (Number.isNaN(item.valor) ? 0 : item.valor), 0);
    return {
      titular: last4 ? `${smartTitleCase(grupo.titularRaw)} - Cartao final ${last4}` : smartTitleCase(grupo.titularRaw),
      cartao: normalizeCard(grupo.cardRaw),
      totalCentavos: toCentavos(grupo.totalDeclarado ?? somaItens),
      somaItensCentavos: toCentavos(somaItens),
      divergente: grupo.totalDeclarado != null && Math.abs(grupo.totalDeclarado - somaItens) > 0.02,
      itens: grupo.itens.map((item) => ({
        data: item.data,
        descricao: smartTitleCase(item.desc),
        categoria: categoryOf(item.desc),
        cidade: item.city,
        valorCentavos: toCentavos(item.valor),
        parcela: item.parcela,
        parcelaInfo: parcelaInfo(item.parcela),
        tipo: item.parcela ? 'PARCELADO' : 'A_VISTA',
        moeda: item.fx,
        ambiguo: item.ambiguous
      }))
    };
  });

  const totalCentavos = resumo.totalFatura
    ? toCentavos(resumo.totalFatura)
    : gruposNormalizados.reduce((sum, grupo) => sum + grupo.totalCentavos, 0);
  const somaItensCentavos = gruposNormalizados.reduce((sum, grupo) => sum + grupo.somaItensCentavos, 0);
  const divergencias = gruposNormalizados
    .filter((grupo) => grupo.divergente)
    .map((grupo) => ({
      titular: grupo.titular,
      cartao: grupo.cartao,
      totalCentavos: grupo.totalCentavos,
      somaItensCentavos: grupo.somaItensCentavos,
      diferencaCentavos: grupo.somaItensCentavos - grupo.totalCentavos
    }));

  return {
    banco: 'Bradesco',
    totalCentavos,
    somaItensCentavos,
    validacao: {
      totalBate: Math.abs(somaItensCentavos - totalCentavos) <= 2,
      diferencaCentavos: somaItensCentavos - totalCentavos,
      divergencias
    },
    vencimento: toISODate(resumo.vencimento),
    fechamento: toISODate(resumo.fechamento),
    compromissoFuturoCentavos: toCentavos(resumo.compromissoFuturo),
    quantidadeItens: gruposNormalizados.reduce((sum, grupo) => sum + grupo.itens.length, 0),
    grupos: gruposNormalizados
  };
}
