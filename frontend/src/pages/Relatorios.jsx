import { useMemo, useState } from 'react';
import { Download, FileDown, Play } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatMoneyFromCentavos, monthLabel, monthRangeISO, queryString } from '../utils/formatters.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';

const colors = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#64748b', '#0891b2', '#e6007e', '#7c5cff'];
const chartReports = ['GRAFICO_COMPARATIVO', 'GRAFICO_CATEGORIA', 'GRAFICO_MENSAL'];
const reportsWithExport = ['CONSOLIDADO', 'PAGAR', 'RECEBER'];

function filtrosIniciais() {
  const month = monthRangeISO();
  return {
    relatorio: 'CONSOLIDADO',
    dataInicial: month.start,
    dataFinal: month.end,
    mes: month.start.slice(0, 7),
    categoria: '',
    descricao: '',
    status: '',
    faturaId: ''
  };
}

function monthToRange(month) {
  const base = `${month}-01`;
  return monthRangeISO(base);
}

function tituloRelatorio(relatorio) {
  if (relatorio === 'PAGAR') return 'Contas a pagar';
  if (relatorio === 'RECEBER') return 'Contas a receber';
  if (relatorio === 'CARTAO_CATEGORIA') return 'Gastos no cartao - Categorias';
  if (relatorio === 'GRAFICO_COMPARATIVO') return 'Grafico previsto x realizado';
  if (relatorio === 'GRAFICO_CATEGORIA') return 'Grafico por categoria';
  if (relatorio === 'GRAFICO_MENSAL') return 'Grafico de saldo realizado';
  return 'Consolidado de contas';
}

function tipoDoRelatorio(relatorio) {
  if (relatorio === 'PAGAR') return 'PAGAR';
  if (relatorio === 'RECEBER') return 'RECEBER';
  return '';
}

function buildLancamentoQuery(filters) {
  const base = {
    dataInicial: filters.dataInicial,
    dataFinal: filters.dataFinal,
    categoria: filters.categoria,
    descricao: filters.descricao,
    status: filters.status,
    tipo: tipoDoRelatorio(filters.relatorio),
    ordenarPor: ['PAGAR', 'RECEBER'].includes(filters.relatorio) ? 'data_vencimento' : undefined,
    ordem: ['PAGAR', 'RECEBER'].includes(filters.relatorio) ? 'asc' : undefined
  };
  return queryString(base);
}

function buildChartQuery(filters) {
  if (filters.relatorio === 'GRAFICO_COMPARATIVO') {
    const range = monthToRange(filters.mes);
    return queryString({ dataInicial: range.start, dataFinal: range.end });
  }
  if (filters.relatorio === 'GRAFICO_MENSAL') return '';
  return queryString({
    dataInicial: filters.dataInicial,
    dataFinal: filters.dataFinal,
    categoria: filters.categoria
  });
}

function buildCardQuery(filters) {
  return queryString({
    faturaId: filters.faturaId,
    categoria: filters.categoria
  });
}

function reportDateText(executed) {
  if (!executed) return '';
  if (executed.relatorio === 'CARTAO_CATEGORIA') return executed.faturaDescricao || 'Fatura selecionada';
  if (executed.relatorio === 'GRAFICO_COMPARATIVO') return monthLabel(`${executed.mes}-01`);
  if (executed.relatorio === 'GRAFICO_MENSAL') return 'Todos os meses';
  return `${formatDate(executed.dataInicial)} a ${formatDate(executed.dataFinal)}`;
}

function tooltipProps() {
  return {
    contentStyle: { color: '#0f172a', background: '#fff', border: '1px solid #cbd5e1' },
    labelStyle: { color: '#0f172a', fontWeight: 700 },
    itemStyle: { fontWeight: 700 }
  };
}

export function Relatorios() {
  const [filters, setFilters] = useState(filtrosIniciais);
  const [executed, setExecuted] = useState(null);
  const [report, setReport] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const categorias = useApi(() => api.get('/categorias'));
  const faturas = useApi(() => api.get('/faturas'));

  const categoriasData = categorias.data?.data || [];
  const faturasData = faturas.data?.data || [];
  const categoriasPagar = categoriasData.filter((item) => item.tipo === 'PAGAR' || item.tipo === 'AMBOS');
  const executedQuery = useMemo(() => executed ? buildLancamentoQuery(executed) : '', [executed]);

  function setFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function changeReport(value) {
    setFilters((current) => ({
      ...current,
      relatorio: value,
      status: '',
      descricao: '',
      categoria: '',
      faturaId: value === 'CARTAO_CATEGORIA' ? current.faturaId || String(faturasData[0]?.id || '') : current.faturaId
    }));
    setExecuted(null);
    setReport(null);
    setChartData(null);
    setError('');
  }

  async function execute() {
    const snapshot = { ...filters };
    const selectedFatura = faturasData.find((item) => String(item.id) === String(snapshot.faturaId));
    setLoading(true);
    setError('');
    try {
      if (chartReports.includes(snapshot.relatorio)) {
        const query = buildChartQuery(snapshot);
        const [resumo, especificos] = await Promise.all([
          snapshot.relatorio === 'GRAFICO_COMPARATIVO' ? api.get(`/relatorios/resumo${query}`) : Promise.resolve({ data: null }),
          api.get(`/relatorios/especificos${query}`)
        ]);
        setChartData({ resumo: resumo.data, especificos: especificos.data });
        setReport(null);
      } else if (snapshot.relatorio === 'CARTAO_CATEGORIA') {
        if (!snapshot.faturaId) throw new Error('Selecione uma fatura importada.');
        const response = await api.get(`/faturas/gastos-por-categoria${buildCardQuery(snapshot)}`);
        setReport({
          tipo: 'CARTAO_CATEGORIA',
          items: response.data,
          totais: {
            quantidade: response.data.reduce((sum, item) => sum + item.quantidade, 0),
            totalPagar: response.data.reduce((sum, item) => sum + item.totalCentavos, 0)
          }
        });
        setChartData(null);
      } else {
        const response = await api.get(`/relatorios/lancamentos${buildLancamentoQuery(snapshot)}`);
        setReport(response.data);
        setChartData(null);
      }
      setExecuted({
        ...snapshot,
        faturaDescricao: selectedFatura?.descricao,
        faturaQuantidadeItens: selectedFatura?.quantidadeItens,
        faturaValorTotalCentavos: selectedFatura?.valorTotalCentavos
      });
    } catch (err) {
      setReport(null);
      setChartData(null);
      setExecuted(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const items = report?.items || [];
  const totais = report?.totais || {};
  const resumoGrafico = chartData?.resumo || {};
  const relatoriosGrafico = chartData?.especificos || {};
  const categoriaData = (relatoriosGrafico.categorias || []).map((item) => ({
    name: item.categoria,
    value: Math.abs(item.saldoPrevisto || item.saldoRealizado || item.receberPrevisto || item.pagarPrevisto),
    total: Math.abs(item.saldoPrevisto || item.saldoRealizado || item.receberPrevisto || item.pagarPrevisto)
  })).filter((item) => item.value > 0);
  const cartaoCategoriaData = items.map((item) => ({
    name: item.categoria || 'Sem categoria',
    total: item.totalCentavos || 0
  }));
  const cartaoTotais = items.reduce((acc, item) => ({
    quantidade: acc.quantidade + (item.quantidade || 0),
    totalCentavos: acc.totalCentavos + (item.totalCentavos || 0)
  }), { quantidade: 0, totalCentavos: 0 });
  const mensalData = (relatoriosGrafico.mensal || []).map((item) => ({
    ...item,
    label: monthLabel(`${item.mes}-01`)
  }));
  const comparativoData = [
    { nome: 'Previsto', entradas: resumoGrafico.previstoReceber || 0, saidas: resumoGrafico.previstoPagar || 0, saldo: resumoGrafico.saldoPrevisto || 0 },
    { nome: 'Realizado', entradas: resumoGrafico.recebido || 0, saidas: resumoGrafico.pago || 0, saldo: resumoGrafico.saldoRealizado || 0 }
  ];
  const visibleTotals = executed?.relatorio === 'PAGAR'
    ? [['Total a pagar', totais.totalPagar], ['Pendente', totais.pagarPendente], ['Pago', totais.pago]]
    : executed?.relatorio === 'RECEBER'
      ? [['Total a receber', totais.totalReceber], ['Pendente', totais.receberPendente], ['Recebido', totais.recebido]]
      : [['Total a receber', totais.totalReceber], ['Total a pagar', totais.totalPagar], ['Saldo geral', totais.saldoGeral]];

  const showLancamentoDates = ['CONSOLIDADO', 'PAGAR', 'RECEBER', 'GRAFICO_CATEGORIA'].includes(filters.relatorio);
  const showLancamentoCategoria = ['CONSOLIDADO', 'PAGAR', 'RECEBER', 'GRAFICO_CATEGORIA'].includes(filters.relatorio);
  const showStatus = ['CONSOLIDADO'].includes(filters.relatorio);
  const showDescricao = ['CONSOLIDADO', 'PAGAR', 'RECEBER'].includes(filters.relatorio);

  return (
    <>
      <PageHeader title="Relatorios" subtitle="Escolha o relatorio, aplique os filtros correspondentes e execute." />
      <section className={`filters panel reportFilters smartReportFilters ${filters.relatorio === 'CARTAO_CATEGORIA' ? 'cardReportFilters' : ''}`}>
        <label>Relatorio
          <select value={filters.relatorio} onChange={(e) => changeReport(e.target.value)}>
            <option value="CONSOLIDADO">Consolidado</option>
            <option value="PAGAR">Contas a pagar</option>
            <option value="RECEBER">Contas a receber</option>
            <option value="CARTAO_CATEGORIA">Gastos no cartao - Categorias</option>
            <option value="GRAFICO_COMPARATIVO">Grafico previsto x realizado</option>
            <option value="GRAFICO_CATEGORIA">Grafico por categoria</option>
            <option value="GRAFICO_MENSAL">Grafico de saldo realizado</option>
          </select>
        </label>

        {showLancamentoDates && (
          <>
            <label>Inicio<input type="date" value={filters.dataInicial} onChange={(e) => setFilter('dataInicial', e.target.value)} /></label>
            <label>Fim<input type="date" value={filters.dataFinal} onChange={(e) => setFilter('dataFinal', e.target.value)} /></label>
          </>
        )}

        {filters.relatorio === 'GRAFICO_COMPARATIVO' && (
          <label>Mes
            <input type="month" value={filters.mes} onChange={(e) => setFilter('mes', e.target.value)} />
          </label>
        )}

        {filters.relatorio === 'CARTAO_CATEGORIA' && (
          <label>Fatura
            <select value={filters.faturaId} onChange={(e) => setFilter('faturaId', e.target.value)}>
              <option value="">Selecione a fatura</option>
              {faturasData.map((fatura) => <option key={fatura.id} value={fatura.id}>{fatura.descricao} - {formatMoneyFromCentavos(fatura.valorTotalCentavos)}</option>)}
            </select>
          </label>
        )}

        {showStatus && (
          <label>Status
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="CONCLUIDO">Concluidos</option>
              <option value="CANCELADO">Cancelados</option>
              <option value="VENCIDO">Vencidos</option>
            </select>
          </label>
        )}

        {showLancamentoCategoria && (
          <label>Categoria
            <select value={filters.categoria} onChange={(e) => setFilter('categoria', e.target.value)}>
              <option value="">Todas as categorias</option>
              {categoriasData.map((categoria) => <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>)}
            </select>
          </label>
        )}

        {filters.relatorio === 'CARTAO_CATEGORIA' && (
          <label>Categoria
            <select value={filters.categoria} onChange={(e) => setFilter('categoria', e.target.value)}>
              <option value="">Todas as categorias</option>
              {categoriasPagar.map((categoria) => <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>)}
            </select>
          </label>
        )}

        {showDescricao && <input placeholder="Descricao" value={filters.descricao} onChange={(e) => setFilter('descricao', e.target.value)} />}

        <div className="reportExecuteSlot">
          <button className="primary" onClick={execute} disabled={loading}><Play size={17} /> Executar</button>
        </div>
      </section>

      {error && <div className="formError">{error}</div>}
      {loading && <Loading />}
      {!loading && !report && !chartData && !error && (
        <section className="emptyState">Configure os filtros e clique em Executar para gerar o relatorio.</section>
      )}

      {!loading && chartData && (
        <section className="panel reportBlock chartReport">
          <div className="reportHeader">
            <div>
              <h2>{tituloRelatorio(executed.relatorio)}</h2>
              <p>{reportDateText(executed)}</p>
            </div>
          </div>

          {executed.relatorio === 'GRAFICO_COMPARATIVO' && (
            <ResponsiveContainer height={340}>
              <BarChart data={comparativoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis tickFormatter={(value) => `R$ ${value / 100}`} />
                <Tooltip {...tooltipProps()} formatter={(value) => formatMoneyFromCentavos(value)} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#16a34a" />
                <Bar dataKey="saidas" name="Saidas" fill="#dc2626" />
                <Bar dataKey="saldo" name="Saldo" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {executed.relatorio === 'GRAFICO_CATEGORIA' && (
            categoriaData.length === 0 ? <div className="emptyState compact">Sem dados no periodo.</div> : (
              <div className="chartWithLegend">
                <ResponsiveContainer height={360}>
                  <PieChart>
                    <Pie dataKey="value" data={categoriaData} outerRadius={115}>
                      {categoriaData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipProps()} formatter={(value) => formatMoneyFromCentavos(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="categoryValueList">
                  {categoriaData.map((item, index) => (
                    <div key={item.name}>
                      <span style={{ background: colors[index % colors.length] }} />
                      <strong>{item.name}</strong>
                      <b>{formatMoneyFromCentavos(item.total)}</b>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {executed.relatorio === 'GRAFICO_MENSAL' && (
            mensalData.length === 0 ? <div className="emptyState compact">Sem dados no periodo.</div> : (
              <ResponsiveContainer height={340}>
                <LineChart data={mensalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--text)', fontWeight: 700 }} />
                  <YAxis tickFormatter={(value) => `R$ ${value / 100}`} tick={{ fill: 'var(--muted)' }} />
                  <Tooltip {...tooltipProps()} formatter={(value) => formatMoneyFromCentavos(value)} />
                  <Legend wrapperStyle={{ color: 'var(--text)' }} />
                  <Line dataKey="saldoPrevisto" name="Saldo previsto" stroke="#2563eb" strokeWidth={3} />
                  <Line dataKey="saldoRealizado" name="Saldo realizado" stroke="#16a34a" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )
          )}
        </section>
      )}

      {!loading && report && (
        <section className="panel reportBlock">
          <div className="reportHeader">
            <div>
              <h2>{tituloRelatorio(executed.relatorio)}</h2>
              <p>{reportDateText(executed)} - {totais.quantidade || 0} lancamentos</p>
            </div>
            {reportsWithExport.includes(executed.relatorio) && (
              <div className="reportActions">
                <a className="secondary buttonLink" href={api.csvUrl(executedQuery)}><Download size={17} /> CSV</a>
                <a className="secondary buttonLink" href={api.pdfUrl(executedQuery)}><FileDown size={17} /> PDF</a>
              </div>
            )}
          </div>

          {report.tipo === 'CARTAO_CATEGORIA' ? (
            <>
              {cartaoCategoriaData.length > 0 && (
                <ResponsiveContainer height={360}>
                  <BarChart data={cartaoCategoriaData} margin={{ bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={90} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `R$ ${value / 100}`} />
                    <Tooltip {...tooltipProps()} formatter={(value) => formatMoneyFromCentavos(value)} />
                    <Bar dataKey="total" name="Total" fill="#e6007e" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="reportTableWrap cartaoCategoryTableWrap">
                <table className="reportTable cartaoCategoryTable">
                  <thead><tr><th>Categoria</th><th>Quantidade</th><th>Total</th></tr></thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="3">Nenhum gasto de cartao encontrado.</td></tr> : items.map((item) => (
                      <tr key={`${item.categoria}-${item.categoriaId || 'semcat'}`}>
                        <td data-label="Categoria" className="mobileTitle">{item.categoria || 'Sem categoria'}</td>
                        <td data-label="Quantidade">{item.quantidade}</td>
                        <td data-label="Total" className="negativeText">{formatMoneyFromCentavos(item.totalCentavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {items.length > 0 && (
                    <tfoot>
                      <tr className="cartaoCategoryTotalRow">
                        <th data-label="Total">Total agrupado</th>
                        <th data-label="Quantidade">{cartaoTotais.quantidade} {executed.faturaQuantidadeItens ? `/ ${executed.faturaQuantidadeItens}` : ''}</th>
                        <th className={cartaoTotais.totalCentavos === executed.faturaValorTotalCentavos ? 'positiveText' : 'negativeText'}>
                          {formatMoneyFromCentavos(cartaoTotais.totalCentavos)}
                          {executed.faturaValorTotalCentavos ? ` / ${formatMoneyFromCentavos(executed.faturaValorTotalCentavos)}` : ''}
                        </th>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="reportTotals">
                {visibleTotals.map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{formatMoneyFromCentavos(value)}</strong>
                  </article>
                ))}
              </div>
              <div className="reportTableWrap">
                <table className="reportTable">
                  <thead>
                    <tr><th>Tipo</th><th>Descricao</th><th>Categoria</th><th>Conta</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Valor</th></tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? <tr><td colSpan="8">Nenhum lancamento encontrado.</td></tr> : items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.tipo === 'PAGAR' ? 'Pagar' : 'Receber'}</td>
                        <td>{item.descricao}</td>
                        <td>{item.categoria || '-'}</td>
                        <td>{item.contaNome || '-'}</td>
                        <td>{formatDate(item.dataVencimento)}</td>
                        <td>{formatDate(item.dataPagamento)}</td>
                        <td><span className={`badge ${item.status.toLowerCase()}`}>{item.status}</span></td>
                        <td className={item.tipo === 'RECEBER' ? 'positiveText' : 'negativeText'}>{formatMoneyFromCentavos(item.valorCentavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
