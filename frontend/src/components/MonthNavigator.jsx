import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { monthLabel, monthRangeISO, shiftMonth, todayISO } from '../utils/formatters.js';

export function MonthNavigator({ value, onChange }) {
  const current = value || monthRangeISO().start;
  const currentMonth = monthRangeISO(current);
  const thisMonth = monthRangeISO(todayISO());

  function goTo(dateISO) {
    const month = monthRangeISO(dateISO);
    onChange(month);
  }

  return (
    <div className="monthNavigator" aria-label="Navegação mensal">
      <button className="secondary iconOnly" onClick={() => goTo(shiftMonth(currentMonth.start, -1))} aria-label="Mês anterior">
        <ChevronLeft size={18} />
      </button>
      <div className="monthCurrent">
        <CalendarDays size={18} />
        <strong>{monthLabel(currentMonth.start)}</strong>
        <span>{currentMonth.start.slice(8, 10)}/{currentMonth.start.slice(5, 7)} a {currentMonth.end.slice(8, 10)}/{currentMonth.end.slice(5, 7)}</span>
      </div>
      <button className="secondary iconOnly" onClick={() => goTo(shiftMonth(currentMonth.start, 1))} aria-label="Próximo mês">
        <ChevronRight size={18} />
      </button>
      <button className="secondary monthToday" onClick={() => onChange(thisMonth)}>
        Mês atual
      </button>
    </div>
  );
}
