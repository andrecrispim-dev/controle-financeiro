import { AlertTriangle, CalendarClock, CheckCircle2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatMoneyFromCentavos, monthRangeISO, queryString } from '../utils/formatters.js';
import { Loading } from '../components/Loading.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MonthNavigator } from '../components/MonthNavigator.jsx';

export function Dashboard() {
  const [periodo, setPeriodo] = useState(() => monthRangeISO());
  const query = useMemo(() => queryString({ dataInicial: periodo.start, dataFinal: periodo.end }), [periodo]);
  const resumo = useApi(() => api.get(`/dashboard/resumo${query}`), [query]);
  const proximos = useApi(() => api.get(`/dashboard/proximos-vencimentos${query}`), [query]);

  if (resumo.loading) return <Loading />;
  if (resumo.error) return <div className="emptyState">{resumo.error}</div>;

  const data = resumo.data.data;
  const cards = [
    ['A receber pendente', data.totalReceberPendente, TrendingUp, 'receber'],
    ['A pagar pendente', data.totalPagarPendente, TrendingDown, 'pagar'],
    ['Saldo projetado', data.saldoProjetado, Wallet, 'info'],
    ['Ja recebido', data.totalRecebido, CheckCircle2, 'receber'],
    ['Ja pago', data.totalPago, CheckCircle2, 'pagar']
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Resumo do periodo (${formatDate(data.periodo.dataInicial)} a ${formatDate(data.periodo.dataFinal)}).`}
      />
      <MonthNavigator value={periodo.start} onChange={setPeriodo} />
      <section className="alertStrip">
        <span><AlertTriangle size={18} /> {data.vencidas} vencidas</span>
        <span><CalendarClock size={18} /> {data.vencendoHoje} vencendo hoje</span>
        <span><CalendarClock size={18} /> {data.proximosSeteDias} nos proximos 7 dias</span>
      </section>
      <section className="summaryGrid">
        {cards.map(([label, value, Icon, tone]) => (
          <article className={`summaryCard ${tone}`} key={label}>
            <Icon size={22} />
            <span>{label}</span>
            <strong>{formatMoneyFromCentavos(value)}</strong>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="sectionTitle">
          <h2>Proximos vencimentos do periodo</h2>
        </div>
        {proximos.loading ? <Loading /> : (
          <div className="listStack">
            {(proximos.data?.data || []).length === 0 && <div className="emptyState">Nenhum vencimento pendente.</div>}
            {(proximos.data?.data || []).map((item) => (
              <div className="dueItem" key={item.id}>
                <div>
                  <strong>{item.descricao}</strong>
                  <span>{item.tipo === 'PAGAR' ? 'Conta a pagar' : 'Conta a receber'} - {formatDate(item.dataVencimento)}</span>
                </div>
                <StatusBadge item={item} />
                <strong>{formatMoneyFromCentavos(item.valorCentavos)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
