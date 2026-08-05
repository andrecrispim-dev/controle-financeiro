import { getDb } from '../database/db.js';

function mapFatura(row) {
  if (!row) return null;
  return {
    id: row.id,
    lancamentoId: row.lancamento_id,
    banco: row.banco,
    descricao: row.descricao,
    valorTotalCentavos: row.valor_total_centavos,
    dataVencimento: row.data_vencimento,
    arquivoNome: row.arquivo_nome,
    quantidadeItens: row.quantidade_itens,
    somaItensCentavos: row.soma_itens_centavos,
    status: row.status,
    dataPagamento: row.data_pagamento,
    contaId: row.conta_id,
    contaNome: row.conta_nome,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    faturaId: row.fatura_id,
    categoriaId: row.categoria_id,
    categoria: row.categoria_nome || row.categoria_importada || 'Sem categoria',
    categoriaImportada: row.categoria_importada,
    dataCompra: row.data_compra,
    dataOriginal: row.data_original,
    descricao: row.descricao,
    cidade: row.cidade,
    valorCentavos: row.valor_centavos,
    tipo: row.tipo,
    parcela: row.parcela,
    cartaoTitular: row.cartao_titular,
    cartaoFinal: row.cartao_final,
    ambiguo: Boolean(row.ambiguo),
    moeda: row.moeda,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildItemWhere(filters = {}) {
  const clauses = [];
  const params = {};
  if (filters.faturaId) {
    clauses.push('fi.fatura_id = @faturaId');
    params.faturaId = filters.faturaId;
  }
  if (filters.categoriaId) {
    clauses.push('fi.categoria_id = @categoriaId');
    params.categoriaId = filters.categoriaId;
  }
  if (filters.categoria) {
    clauses.push("LOWER(COALESCE(c.nome, fi.categoria_importada, 'Sem categoria')) = LOWER(@categoria)");
    params.categoria = filters.categoria;
  }
  if (filters.dataInicial) {
    clauses.push('fi.data_compra >= @dataInicial');
    params.dataInicial = filters.dataInicial;
  }
  if (filters.dataFinal) {
    clauses.push('fi.data_compra <= @dataFinal');
    params.dataFinal = filters.dataFinal;
  }
  if (filters.descricao) {
    clauses.push('LOWER(fi.descricao) LIKE @descricao');
    params.descricao = `%${String(filters.descricao).toLowerCase()}%`;
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export function createFaturaComItens(data, itens, db = getDb()) {
  const faturaResult = db.prepare(`
    INSERT INTO faturas_cartao
      (lancamento_id, banco, descricao, valor_total_centavos, data_vencimento, arquivo_nome, quantidade_itens, soma_itens_centavos)
    VALUES
      (@lancamentoId, @banco, @descricao, @valorTotalCentavos, @dataVencimento, @arquivoNome, @quantidadeItens, @somaItensCentavos)
  `).run(data);

  const faturaId = faturaResult.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO fatura_itens
      (fatura_id, categoria_id, categoria_importada, data_compra, data_original, descricao, cidade, valor_centavos, tipo, parcela, cartao_titular, cartao_final, ambiguo, moeda)
    VALUES
      (@faturaId, @categoriaId, @categoriaImportada, @dataCompra, @dataOriginal, @descricao, @cidade, @valorCentavos, @tipo, @parcela, @cartaoTitular, @cartaoFinal, @ambiguo, @moeda)
  `);

  itens.forEach((item) => insertItem.run({ ...item, faturaId }));
  return getFaturaById(faturaId);
}

export function getFaturaById(id) {
  return mapFatura(getDb().prepare(`
    SELECT f.*, l.status, l.data_pagamento, l.conta_id, cb.nome AS conta_nome
    FROM faturas_cartao f
    LEFT JOIN lancamentos l ON l.id = f.lancamento_id
    LEFT JOIN contas_bancarias cb ON cb.id = l.conta_id
    WHERE f.id = ?
  `).get(id));
}

export function getFaturaDetalhada(id) {
  const fatura = getFaturaById(id);
  if (!fatura) return null;
  return { ...fatura, itens: listFaturaItens({ faturaId: id }) };
}

export function listFaturas() {
  return getDb().prepare(`
    SELECT f.*, l.status, l.data_pagamento, l.conta_id, cb.nome AS conta_nome
    FROM faturas_cartao f
    LEFT JOIN lancamentos l ON l.id = f.lancamento_id
    LEFT JOIN contas_bancarias cb ON cb.id = l.conta_id
    ORDER BY f.data_vencimento DESC, f.id DESC
  `).all().map(mapFatura);
}

export function deleteFatura(id) {
  const fatura = getFaturaById(id);
  if (!fatura) return 0;
  return getDb().prepare('DELETE FROM lancamentos WHERE id = ?').run(fatura.lancamentoId).changes;
}

export function listFaturaItens(filters = {}) {
  const { where, params } = buildItemWhere(filters);
  return getDb().prepare(`
    SELECT fi.*, c.nome AS categoria_nome
    FROM fatura_itens fi
    LEFT JOIN categorias c ON c.id = fi.categoria_id
    ${where}
    ORDER BY fi.data_compra ASC, fi.id ASC
  `).all(params).map(mapItem);
}

export function updateFaturaItemCategoria(id, categoriaId) {
  getDb().prepare(`
    UPDATE fatura_itens
    SET categoria_id = @categoriaId,
        categoria_importada = CASE WHEN @categoriaId IS NULL THEN categoria_importada ELSE NULL END,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ id, categoriaId: categoriaId || null });
  return getFaturaItemById(id);
}

export function getFaturaItemById(id) {
  return mapItem(getDb().prepare(`
    SELECT fi.*, c.nome AS categoria_nome
    FROM fatura_itens fi
    LEFT JOIN categorias c ON c.id = fi.categoria_id
    WHERE fi.id = ?
  `).get(id));
}

export function gastosPorCategoria(filters = {}) {
  const { where, params } = buildItemWhere(filters);
  return getDb().prepare(`
    SELECT
      COALESCE(c.nome, fi.categoria_importada, 'Sem categoria') categoria,
      fi.categoria_id categoria_id,
      COUNT(*) quantidade,
      SUM(fi.valor_centavos) total_centavos
    FROM fatura_itens fi
    LEFT JOIN categorias c ON c.id = fi.categoria_id
    ${where}
    GROUP BY categoria, fi.categoria_id
    ORDER BY total_centavos DESC, categoria COLLATE NOCASE
  `).all(params).map((row) => ({
    categoria: row.categoria,
    categoriaId: row.categoria_id,
    quantidade: row.quantidade || 0,
    totalCentavos: row.total_centavos || 0
  }));
}
