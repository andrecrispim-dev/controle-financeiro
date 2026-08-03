import { useMemo, useState } from 'react';
import { Download, FileDown, Play } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api.js';
import { formatDate, formatMoneyFromCentavos, monthLabel, monthRangeISO, queryString } from '../utils/formatters.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';

const colors = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#64748b', '#0891b2'];
const chartReports = ['GRAFICO_COMPARATIVO', 'GRAFICO_CATEGORIA', 'GRAFICO_MENSAL'];

function filtrosIniciais() {
  const month = monthRangeISO();
  return {
    dataInicial: month.start,
    dataFinal: month.end,
    relatorio: 'CONSOLIDADO',
    status: '',
    categoria: '',
    descricao: '',
    valorMin: '',
    valorMax: ''
  };
}

function tipoDoRelatorio(relatorio) {
  if (relatorio === 'PAGAR') return 'PAGAR';
  if (relatorio === 'RECEBER') return 'RECEBER';
  return '';
}

function tituloRelatorio(relatorio) {
  if (relatorio === 'PAGAR') return 'Contas a pagar';
  if (relatorio === 'RECEBER') return 'Contas a receber';
  if (relatorio === 'GRAFICO_COMPARATIVO') return 'Grafico previsto x realizado';
  if (relatorio === 'GRAFICO_CATEGORIA') return 'Grafico por categoria';
  if (relatorio === 'GRAFICO_MENSAL') return 'Grafico de saldo mensal';
  return 'Consolidado de contas';
}

function buildQuery(filters) {
  const { relatorio, ...rest } = filters;
  return queryString({ ...rest, tipo: tipoDoRelatorio(relatorio) });
}

export function Relatorios() {
  const [filters, setFilters] = useState(filtrosIniciais);
  const [executed, setExecuted] = useState(null);
  const [report, setReport] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const executedQuery = useMemo(() => executed ? buildQuery(executed) : '', [executed]);

  function setFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function execute() {
    const snapshot = { ...filters };
    setLoading(true);
    setError('');
    try {
      if (chartReports.includes(snapshot.relatorio)) {
        const [resumo, especificos] = await Promise.all([
          api.get(`/relatorios/resumo${buildQuery(snapshot)}`),
          api.get(`/relatorios/especificos${buildQuery(snapshot)}`)
        ]);
        setChartData({ resumo: resumo.data, especificos: especificos.data });
        setReport(null);
      } else {
        const response = await api.get(`/relatorios/lancamentos${buildQuery(snapshot)}`);
        setReport(response.data);
        setChartData(null);
      }
      setExecuted(snapshot);
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
    value: Math.abs(item.saldoPrevisto || item.saldoRealizado || item.receberPrevisto || item.pagarPrevisto)
  })).filter((item) => item.value > 0);
  const mensalData = (relatoriosGrafico.mensal || []).map((item) => ({
    ...item,
    label: monthLabel(`${item.mes}-01`)
  }));
  const comparativoData = [
    { nome: 'Previsto', entradas: resumoGrafico.previstoReceber || 0, saidas: resumoGrafico.previstoPagar || 0, saldo: resumoGrafico.saldoPrevisto || 0 },
    { nome: 'Realizado', entradas: resumoGrafico.recebido || 0, saidas: resumoGrafico.pago || 0, saldo: resumoGrafico.saldoRealizado || 0 }
  ];
  const visibleTotals = executed?.relatorio === 'PAGAR'
    ? [
      ['Total a pagar', totais.totalPagar],
      ['Pendente', totais.pagarPendente],
      ['Pago', totais.pago]
    ]
    : executed?.relatorio === 'RECEBER'
      ? [
        ['Total a receber', totais.totalReceber],
        ['Pendente', totais.receberPendente],
        ['Recebido', totais.recebido]
      ]
      : [
        ['Total a receber', totais.totalReceber],
        ['Total a pagar', totais.totalPagar],
        ['Saldo geral', totais.saldoGeral]
      ];

  return (
    <>
      <PageHeader title="Relatorios" subtitle="Escolha os filtros, execute e exporte o resultado." />
      <section className="filters panel reportFilters">
        <label>Relatorio
          <select value={filters.relatorio} onChange={(e) => setFilter('relatorio', e.target.value)}>
            <option value="CONSOLIDADO">Consolidado</option>
            <option value="PAGAR">Contas a pagar</option>
            <option value="RECEBER">Contas a receber</option>
            <option value="GRAFICO_COMPARATIVO">Grafico previsto x realizado</option>
            <option value="GRAFICO_CATEGORIA">Grafico por categoria</option>
            <option value="GRAFICO_MENSAL">Grafico de saldo mensal</option>
          </select>
        </label>
        <label>Inicio<input type="date" value={filters.dataInicial} onChange={(e) => setFilter('dataInicial', e.target.value)} /></label>
        <label>Fim<input type="date" value={filters.dataFinal} onChange={(e) => setFilter('dataFinal', e.target.value)} /></label>
        <label>Status
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="CONCLUIDO">Concluidos</option>
            <option value="CANCELADO">Cancelados</option>
            <option value="VENCIDO">Vencidos</option>
          </select>
        </label>
        <input placeholder="Categoria" value={filters.categoria} onChange={(e) => setFilter('categoria', e.target.value)} />
        <input placeholder="Descricao" value={filters.descricao} onChange={(e) => setFilter('descricao', e.target.value)} />
        <input type="number" placeholder="Valor min." value={filters.valorMin} onChange={(e) => setFilter('valorMin', e.target.value)} />
        <input type="number" placeholder="Valor max." value={filters.valorMax} onChange={(e) => setFilter('valorMax', e.target.value)} />
        <button className="primary" onClick={execute} disabled={loading}><Play size={17} /> Executar</button>
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
              <p>{formatDate(executed.dataInicial)} a {formatDate(executed.dataFinal)}</p>
            </div>
          </div>
          {executed.relatorio === 'GRAFICO_COMPARATIVO' && (
            <ResponsiveContainer height={340}>
              <BarChart data={comparativoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis tickFormatter={(value) => `R$ ${value / 100}`} />
                <Tooltip formatter={(value) => formatMoneyFromCentavos(value)} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#16a34a" />
                <Bar dataKey="saidas" name="Saidas" fill="#dc2626" />
                <Bar dataKey="saldo" name="Saldo" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
          {executed.relatorio === 'GRAFICO_CATEGORIA' && (
            categoriaData.length === 0 ? <div className="emptyState compact">Sem dados no periodo.</div> : (
              <ResponsiveContainer height={340}>
                <PieChart>
                  <Pie dataKey="value" data={categoriaData} outerRadius={110}>
                    {categoriaData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoneyFromCentavos(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )
          )}
          {executed.relatorio === 'GRAFICO_MENSAL' && (
            mensalData.length === 0 ? <div className="emptyState compact">Sem dados no periodo.</div> : (
              <ResponsiveContainer height={340}>
                <LineChart data={mensalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value) => `R$ ${value / 100}`} />
                  <Tooltip formatter={(value) => formatMoneyFromCentavos(value)} />
                  <Legend />
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
              <p>{formatDate(executed.dataInicial)} a {formatDate(executed.dataFinal)} - {totais.quantidade || 0} lancamentos</p>
            </div>
            <div className="reportActions">
              <a className="secondary buttonLink" href={api.csvUrl(executedQuery)}><Download size={17} /> CSV</a>
              <a className="secondary buttonLink" href={api.pdfUrl(executedQuery)}><FileDown size={17} /> PDF</a>
            </div>
          </div>
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
        </section>
      )}
    </>
  );
}
