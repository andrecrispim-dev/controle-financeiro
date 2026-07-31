import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { formatMoneyFromCentavos, monthRangeISO, queryString } from '../utils/formatters.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';

const colors = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#64748b', '#0891b2'];

function filtrosIniciais() {
  const month = monthRangeISO();
  return {
    dataInicial: month.start,
    dataFinal: month.end,
    tipo: '',
    status: '',
    categoria: '',
    descricao: '',
    valorMin: '',
    valorMax: ''
  };
}

export function Relatorios() {
  const [filters, setFilters] = useState(filtrosIniciais);
  const query = useMemo(() => queryString(filters), [filters]);
  const resumo = useApi(() => api.get(`/relatorios/resumo${query}`), [query]);
  const categorias = useApi(() => api.get(`/relatorios/por-categoria${query}`), [query]);
  const meses = useApi(() => api.get(`/relatorios/por-mes${query}`), [query]);

  function setFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  if (resumo.loading) return <Loading />;
  const data = resumo.data?.data || {};
  const catData = (categorias.data?.data || []).map((item) => ({ name: `${item.categoria} ${item.tipo}`, value: item.total }));
  const monthMap = {};
  (meses.data?.data || []).forEach((item) => {
    monthMap[item.mes] ||= { mes: item.mes, entradas: 0, saidas: 0 };
    if (item.tipo === 'RECEBER') monthMap[item.mes].entradas += item.total;
    if (item.tipo === 'PAGAR') monthMap[item.mes].saidas += item.total;
  });
  const monthData = Object.values(monthMap);
  const barData = [{ nome: 'Previsto', entradas: data.previstoReceber, saidas: data.previstoPagar }, { nome: 'Realizado', entradas: data.recebido, saidas: data.pago }];

  return (
    <>
      <PageHeader title="Relatorios" subtitle="Analise o periodo por saldo, categoria e evolucao mensal." />
      <section className="filters panel">
        <label>Inicio<input type="date" value={filters.dataInicial} onChange={(e) => setFilter('dataInicial', e.target.value)} /></label>
        <label>Fim<input type="date" value={filters.dataFinal} onChange={(e) => setFilter('dataFinal', e.target.value)} /></label>
        <select value={filters.tipo} onChange={(e) => setFilter('tipo', e.target.value)}>
          <option value="">Todos os tipos</option><option value="PAGAR">A pagar</option><option value="RECEBER">A receber</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Todos os status</option><option value="PENDENTE">Pendentes</option><option value="CONCLUIDO">Concluidos</option><option value="CANCELADO">Cancelados</option><option value="VENCIDO">Vencidos</option>
        </select>
        <input placeholder="Categoria" value={filters.categoria} onChange={(e) => setFilter('categoria', e.target.value)} />
        <input placeholder="Descricao" value={filters.descricao} onChange={(e) => setFilter('descricao', e.target.value)} />
        <input type="number" placeholder="Valor min." value={filters.valorMin} onChange={(e) => setFilter('valorMin', e.target.value)} />
        <input type="number" placeholder="Valor max." value={filters.valorMax} onChange={(e) => setFilter('valorMax', e.target.value)} />
        <button className="secondary" onClick={() => setFilters(filtrosIniciais())}>Voltar ao mes atual</button>
        <a className="secondary buttonLink" href={api.csvUrl(query)}><Download size={17} /> Exportar CSV</a>
      </section>
      <section className="summaryGrid report">
        {[
          ['Previsto receber', data.previstoReceber], ['Previsto pagar', data.previstoPagar], ['Saldo previsto', data.saldoPrevisto],
          ['Recebido', data.recebido], ['Pago', data.pago], ['Saldo realizado', data.saldoRealizado],
          ['Pendentes', data.pendentes, true], ['Concluidos', data.concluidos, true], ['Vencidas', data.vencidas, true]
        ].map(([label, value, count]) => (
          <article className="summaryCard info" key={label}><span>{label}</span><strong>{count ? value : formatMoneyFromCentavos(value)}</strong></article>
        ))}
      </section>
      <section className="chartGrid">
        <div className="panel chartPanel"><h2>Entradas versus saidas</h2><ResponsiveContainer height={280}><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis tickFormatter={(v) => `R$ ${v / 100}`} /><Tooltip formatter={(v) => formatMoneyFromCentavos(v)} /><Legend /><Bar dataKey="entradas" fill="#16a34a" /><Bar dataKey="saidas" fill="#dc2626" /></BarChart></ResponsiveContainer></div>
        <div className="panel chartPanel"><h2>Por categoria</h2><ResponsiveContainer height={280}><PieChart><Pie dataKey="value" data={catData} outerRadius={90} label>{catData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(v) => formatMoneyFromCentavos(v)} /></PieChart></ResponsiveContainer></div>
        <div className="panel chartPanel wideChart"><h2>Evolucao mensal</h2><ResponsiveContainer height={300}><LineChart data={monthData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis tickFormatter={(v) => `R$ ${v / 100}`} /><Tooltip formatter={(v) => formatMoneyFromCentavos(v)} /><Legend /><Line dataKey="entradas" stroke="#16a34a" strokeWidth={3} /><Line dataKey="saidas" stroke="#dc2626" strokeWidth={3} /></LineChart></ResponsiveContainer></div>
      </section>
    </>
  );
}
