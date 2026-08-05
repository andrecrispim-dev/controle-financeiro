import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, FileUp, Trash2, UploadCloud } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { Loading } from '../components/Loading.jsx';
import { Toast } from '../components/Toast.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { formatDate, formatMoneyFromCentavos } from '../utils/formatters.js';

function descricaoPadrao(fatura) {
  if (!fatura?.vencimento) return 'Fatura Bradesco';
  const [year, month] = fatura.vencimento.split('-');
  return `Fatura Bradesco ${month}/${year}`;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findCategoriaId(nome, categorias) {
  const normalized = normalizeText(nome);
  if (!normalized || normalized === 'sem categoria') return '';
  return categorias.find((categoria) => normalizeText(categoria.nome) === normalized)?.id || '';
}

function aplicarCategorias(fatura, categorias) {
  if (!fatura) return fatura;
  return {
    ...fatura,
    grupos: fatura.grupos.map((grupo) => ({
      ...grupo,
      itens: grupo.itens.map((item) => ({
        ...item,
        categoriaId: item.categoriaId || findCategoriaId(item.categoria, categorias)
      }))
    }))
  };
}

function filterItems(items, search, filter, categoryFilter) {
  const term = search.trim().toLowerCase();
  return items.filter((item) => {
    if (term && !`${item.descricao} ${item.categoria}`.toLowerCase().includes(term)) return false;
    if (filter === 'avista' && item.tipo !== 'A_VISTA') return false;
    if (filter === 'parc' && item.tipo !== 'PARCELADO') return false;
    if (filter === 'semcat' && item.categoriaId) return false;
    if (filter === 'ambig' && !item.ambiguo) return false;
    if (categoryFilter === 'semcat' && item.categoriaId) return false;
    if (categoryFilter && categoryFilter !== 'semcat' && String(item.categoriaId || '') !== categoryFilter) return false;
    return true;
  });
}

function groupItemsByCard(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = `${item.cartaoTitular || 'Cartao'}-${item.cartaoFinal || ''}`;
    const current = map.get(key) || {
      key,
      titular: item.cartaoTitular || 'Cartao',
      cartao: item.cartaoFinal ? `Final ${item.cartaoFinal}` : '',
      totalCentavos: 0,
      itens: []
    };
    current.totalCentavos += item.valorCentavos;
    current.itens.push(item);
    map.set(key, current);
  });
  return [...map.values()];
}

function flattenItems(fatura) {
  if (!fatura) return [];
  return fatura.grupos.flatMap((grupo) => grupo.itens.map((item) => ({
    ...item,
    categoriaId: item.categoriaId || null,
    cartaoTitular: grupo.titular,
    cartaoFinal: grupo.cartao?.match(/(\d{4})$/)?.[1] || null
  })));
}

export function Faturas() {
  const categorias = useApi(() => api.get('/categorias'));
  const contas = useApi(() => api.get('/contas?ativas=true'));
  const faturasImportadas = useApi(() => api.get('/faturas'));
  const [fileName, setFileName] = useState('');
  const [fatura, setFatura] = useState(null);
  const [form, setForm] = useState({ descricao: '', categoriaId: '', contaId: '', dataVencimento: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewerSearch, setViewerSearch] = useState('');
  const [viewerFilter, setViewerFilter] = useState('all');
  const [viewerCategoryFilter, setViewerCategoryFilter] = useState('');

  const categoriasPagar = (categorias.data?.data || []).filter((item) => item.tipo === 'PAGAR' || item.tipo === 'AMBOS');
  const contasAtivas = contas.data?.data || [];

  async function analyze(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('arquivo', file);
    setLoading(true);
    setFileName(file.name);

    try {
      const response = await api.upload('/faturas/analisar', data);
      const parsed = aplicarCategorias(response.data, categoriasPagar);
      setFatura(parsed);
      setForm({
        descricao: descricaoPadrao(parsed),
        categoriaId: '',
        contaId: '',
        dataVencimento: parsed.vencimento || ''
      });
      setToast({ message: `${parsed.quantidadeItens} lancamentos em ${parsed.grupos.length} grupo(s) importados.` });
    } catch (err) {
      setFatura(null);
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItemCategory(groupIndex, itemIndex, categoriaId) {
    const categoria = categoriasPagar.find((item) => String(item.id) === String(categoriaId));
    setFatura((current) => ({
      ...current,
      grupos: current.grupos.map((grupo, gIndex) => {
        if (gIndex !== groupIndex) return grupo;
        return {
          ...grupo,
          itens: grupo.itens.map((item, iIndex) => {
            if (iIndex !== itemIndex) return item;
            return {
              ...item,
              categoriaId: categoria?.id || '',
              categoria: categoria?.nome || 'Sem categoria'
            };
          })
        };
      })
    }));
  }

  async function confirm() {
    if (!fatura) return;
    setLoading(true);
    try {
      await api.post('/faturas/confirmar', {
        descricao: form.descricao,
        categoriaId: form.categoriaId || null,
        contaId: form.contaId,
        valorCentavos: fatura.totalCentavos,
        dataVencimento: form.dataVencimento,
        banco: fatura.banco || 'Bradesco',
        arquivoNome: fileName,
        observacoes: `Importado da fatura ${fatura.banco}. Arquivo: ${fileName}. Itens lidos: ${fatura.quantidadeItens}.`,
        itens: flattenItems(fatura)
      });
      setToast({ message: 'Fatura e itens importados com sucesso.' });
      setFatura(null);
      setFileName('');
      setForm({ descricao: '', categoriaId: '', contaId: '', dataVencimento: '' });
      faturasImportadas.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function viewFatura(item) {
    setLoading(true);
    try {
      const response = await api.get(`/faturas/${item.id}`);
      setViewer(response.data);
      setViewerSearch('');
      setViewerFilter('all');
      setViewerCategoryFilter('');
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function removeFatura(item) {
    try {
      await api.delete(`/faturas/${item.id}`);
      setConfirmDelete(null);
      setToast({ message: 'Fatura excluida com sucesso.' });
      faturasImportadas.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function updateSavedItemCategory(itemId, categoriaId) {
    const categoria = categoriasPagar.find((item) => String(item.id) === String(categoriaId));
    try {
      const response = await api.patch(`/faturas/itens/${itemId}/categoria`, { categoriaId: categoria?.id || null });
      setViewer((current) => ({
        ...current,
        itens: current.itens.map((item) => (item.id === itemId ? response.data : item))
      }));
      setToast({ message: 'Categoria atualizada com sucesso.' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  const stats = useMemo(() => {
    if (!fatura) return { avista: 0, avistaN: 0, parcelas: 0, parcelasN: 0 };
    return fatura.grupos.reduce((acc, grupo) => {
      grupo.itens.forEach((item) => {
        if (item.tipo === 'A_VISTA') {
          acc.avista += item.valorCentavos;
          acc.avistaN += 1;
        }
        if (item.tipo === 'PARCELADO') {
          acc.parcelas += item.valorCentavos;
          acc.parcelasN += 1;
        }
      });
      return acc;
    }, { avista: 0, avistaN: 0, parcelas: 0, parcelasN: 0 });
  }, [fatura]);

  const importedItems = faturasImportadas.data?.data || [];
  const previewItems = flattenItems(fatura);
  const viewerItems = useMemo(() => {
    if (!viewer) return [];
    return filterItems(viewer.itens || [], viewerSearch, viewerFilter, viewerCategoryFilter);
  }, [viewer, viewerSearch, viewerFilter, viewerCategoryFilter]);
  const viewerGroups = useMemo(() => groupItemsByCard(viewerItems), [viewerItems]);

  if (viewer) {
    return (
      <div className="invoiceImporter invoiceViewerPage">
        <div className="viewerPageHeader">
          <button className="secondary" onClick={() => setViewer(null)}><ArrowLeft size={17} /> Voltar</button>
          <div>
            <h1>{viewer.descricao}</h1>
            <p>Visualize, filtre e ajuste os itens importados desta fatura.</p>
          </div>
        </div>

        {loading && <Loading />}

        <div className="invoiceViewerSummary">
          <article><span>Banco</span><strong>{viewer.banco}</strong></article>
          <article><span>Vencimento</span><strong>{formatDate(viewer.dataVencimento)}</strong></article>
          <article><span>Conta</span><strong>{viewer.contaNome || '-'}</strong></article>
          <article><span>Total</span><strong>{formatMoneyFromCentavos(viewer.valorTotalCentavos)}</strong></article>
        </div>

        <section className="invoiceControls viewerControls">
          <input placeholder="Buscar estabelecimento..." value={viewerSearch} onChange={(e) => setViewerSearch(e.target.value)} />
          <select value={viewerCategoryFilter} onChange={(e) => setViewerCategoryFilter(e.target.value)} aria-label="Filtrar por categoria">
            <option value="">Todas as categorias</option>
            <option value="semcat">Sem categoria</option>
            {categoriasPagar.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
          </select>
          {[
            ['all', 'Todos'],
            ['avista', 'A vista'],
            ['parc', 'Parcelados'],
            ['semcat', 'Sem categoria'],
            ['ambig', 'Ambiguos']
          ].map(([value, label]) => (
            <button key={value} className={`secondary ${viewerFilter === value ? 'active' : ''}`} onClick={() => setViewerFilter(value)}>{label}</button>
          ))}
        </section>

        <section className="invoiceGroups viewerGroups">
          {viewerGroups.length === 0 ? <div className="emptyState compact">Nenhum item encontrado com os filtros atuais.</div> : viewerGroups.map((grupo) => (
            <article className="invoiceGroupCard" key={grupo.key}>
              <header>
                <div><strong>{grupo.titular}</strong><span>{grupo.cartao}</span></div>
                <strong className="invoiceGroupTotal">{formatMoneyFromCentavos(grupo.totalCentavos)}</strong>
              </header>
              <div className="reportTableWrap">
                <table className="invoiceTable viewerInvoiceTable">
                  <thead><tr><th>Data</th><th>Estabelecimento</th><th>Categoria</th><th>Tipo</th><th>Valor</th></tr></thead>
                  <tbody>
                    {grupo.itens.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.dataCompra)}</td>
                        <td><strong>{item.descricao}</strong><span>{item.cidade || '-'}</span>{item.moeda && <em>{item.moeda}</em>}</td>
                        <td>
                          <select className="tableSelect" value={item.categoriaId || ''} onChange={(e) => updateSavedItemCategory(item.id, e.target.value)}>
                            <option value="">Sem categoria</option>
                            {categoriasPagar.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
                          </select>
                        </td>
                        <td>{item.tipo === 'PARCELADO' ? <span className="invoiceTag parc">parc {item.parcela || '-'}</span> : <span className="invoiceTag avista">a vista</span>}{item.ambiguo && <span className="invoiceTag warn">ambiguo</span>}</td>
                        <td className="negativeText">{formatMoneyFromCentavos(item.valorCentavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>

        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="invoiceImporter">
      <div className="invoiceTitle">
        <h1>Importador de <span>Fatura Bradesco</span></h1>
        <p>Importe o PDF da fatura mensal, ajuste categorias e gere a conta a pagar.</p>
      </div>

      <div className="invoiceFilebar">
        <label className="secondary buttonLink">
          <UploadCloud size={16} /> {fatura ? 'Trocar arquivo' : 'Selecionar PDF'}
          <input type="file" accept="application/pdf" onChange={analyze} />
        </label>
        <span>{fileName || 'Nenhum arquivo selecionado'}</span>
      </div>

      {loading && <Loading />}

      {fatura && !loading && (
        <>
          <div className="invoiceStatus ok">{fatura.quantidadeItens} lancamentos em {fatura.grupos.length} grupo(s) importados.</div>
          <section className="invoiceKpis">
            <article><span>Total da fatura</span><strong className="pink">{formatMoneyFromCentavos(fatura.totalCentavos)}</strong><small>Venc. {formatDate(fatura.vencimento)}</small></article>
            <article><span>A vista este mes</span><strong className="green">{formatMoneyFromCentavos(stats.avista)}</strong><small>{stats.avistaN} lancamentos do mes</small></article>
            <article><span>Parcelas este mes</span><strong className="purple">{formatMoneyFromCentavos(stats.parcelas)}</strong><small>{stats.parcelasN} parcelas nesta fatura</small></article>
            <article><span>Compromisso futuro</span><strong className="blue">{formatMoneyFromCentavos(fatura.compromissoFuturoCentavos)}</strong><small>parcelas em proximas faturas</small></article>
          </section>

          {fatura.validacao && !fatura.validacao.totalBate && (
            <div className="invoiceStatus warn">
              A soma dos itens ({formatMoneyFromCentavos(fatura.somaItensCentavos)}) diverge do total da fatura ({formatMoneyFromCentavos(fatura.totalCentavos)}).
              Diferenca: {formatMoneyFromCentavos(fatura.validacao.diferencaCentavos)}.
            </div>
          )}

          <section className="invoiceConfirm panel">
            <div className="formGrid">
              <label>Descricao<input value={form.descricao} onChange={(e) => update('descricao', e.target.value)} maxLength={120} /></label>
              <label>Conta bancaria
                <select value={form.contaId} onChange={(e) => update('contaId', e.target.value)}>
                  <option value="">Selecione a conta</option>
                  {contasAtivas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
                </select>
              </label>
              <label>Categoria da conta
                <select value={form.categoriaId} onChange={(e) => update('categoriaId', e.target.value)}>
                  <option value="">Sem categoria</option>
                  {categoriasPagar.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
                </select>
              </label>
              <label>Data de vencimento<input type="date" value={form.dataVencimento} onChange={(e) => update('dataVencimento', e.target.value)} /></label>
              <button className="primary full" onClick={confirm} disabled={!form.contaId || !form.dataVencimento || !form.descricao}>
                <CheckCircle2 size={17} /> Confirmar fatura e itens
              </button>
            </div>
          </section>

          <section className="panel invoicePreview">
            <div className="sectionHeader">
              <div>
                <h2>Previa da fatura</h2>
                <p>{previewItems.length} item(ns) lidos. Ajuste categorias essenciais e confirme a importacao.</p>
              </div>
            </div>
            <div className="reportTableWrap">
              <table className="reportTable">
                <thead>
                  <tr><th>Data</th><th>Estabelecimento</th><th>Categoria</th><th>Tipo</th><th>Parcela</th><th>Valor</th></tr>
                </thead>
                <tbody>
                  {previewItems.map((item, index) => {
                    const groupIndex = fatura.grupos.findIndex((grupo) => grupo.itens.includes(item));
                    const itemIndex = fatura.grupos[groupIndex]?.itens.indexOf(item) ?? index;
                    return (
                      <tr key={`${item.descricao}-${item.data}-${index}`}>
                        <td>{item.data}</td>
                        <td>{item.descricao}<span className="mutedBlock">{item.cidade || '-'}</span>{item.moeda && <span className="mutedBlock">{item.moeda}</span>}</td>
                        <td>
                          <select className="tableSelect" value={item.categoriaId || ''} onChange={(e) => updateItemCategory(groupIndex, itemIndex, e.target.value)}>
                            <option value="">Sem categoria</option>
                            {categoriasPagar.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
                          </select>
                        </td>
                        <td>{item.tipo === 'PARCELADO' ? 'Parcelado' : 'A vista'}</td>
                        <td>{item.parcela || '-'}</td>
                        <td className="negativeText">{formatMoneyFromCentavos(item.valorCentavos)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!fatura && !loading && (
        <section className="emptyState">
          <FileUp size={22} /> Importe um PDF para visualizar a fatura antes de criar o lancamento.
        </section>
      )}

      <section className="panel invoiceHistory">
        <div className="sectionHeader">
          <div>
            <h2>Faturas importadas</h2>
            <p>Consulte ou remova faturas salvas anteriormente.</p>
          </div>
        </div>
        {faturasImportadas.loading ? <Loading /> : (
          importedItems.length === 0 ? (
            <div className="emptyState compact">Nenhuma fatura importada ainda.</div>
          ) : (
            <div className="reportTableWrap">
              <table className="reportTable invoiceHistoryTable">
                <thead>
                  <tr><th>Descricao</th><th>Banco</th><th>Conta</th><th>Vencimento</th><th>Status</th><th>Itens</th><th>Total</th><th>Acoes</th></tr>
                </thead>
                <tbody>
                  {importedItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.descricao}</td>
                      <td>{item.banco}</td>
                      <td>{item.contaNome || '-'}</td>
                      <td>{formatDate(item.dataVencimento)}</td>
                      <td><span className={`badge ${(item.status || 'pendente').toLowerCase()}`}>{item.status || '-'}</span></td>
                      <td>{item.quantidadeItens}</td>
                      <td className="negativeText">{formatMoneyFromCentavos(item.valorTotalCentavos)}</td>
                      <td className="actions">
                        <button className="iconButton" onClick={() => viewFatura(item)} aria-label="Visualizar fatura"><Eye size={17} /></button>
                        <button className="iconButton dangerIcon" onClick={() => setConfirmDelete(item)} aria-label="Excluir fatura"><Trash2 size={17} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir fatura"
          message={`Excluir definitivamente "${confirmDelete.descricao}"? O lancamento a pagar vinculado tambem sera removido.`}
          confirmLabel="Excluir"
          danger
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => removeFatura(confirmDelete)}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
