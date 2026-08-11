import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { MonthNavigator } from '../components/MonthNavigator.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { formatDate, monthLabel, monthRangeISO, todayISO } from '../utils/formatters.js';

const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function calendarDays(periodo) {
  const [year, month] = periodo.start.split('-').map(Number);
  const lastDay = Number(periodo.end.slice(8, 10));
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstIndex = (first.getUTCDay() + 6) % 7;
  const days = [];
  for (let index = 0; index < firstIndex; index += 1) days.push(null);
  for (let day = 1; day <= lastDay; day += 1) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function AgendaCalendario({ title, subtitle }) {
  const [periodo, setPeriodo] = useState(monthRangeISO(todayISO()));
  const days = useMemo(() => calendarDays(periodo), [periodo]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <MonthNavigator value={periodo.start} onChange={setPeriodo} />

      <section className="panel plantaoCalendar agendaCalendar">
        <header>
          <h2>{monthLabel(periodo.start)}</h2>
          <span className="muted">{formatDate(periodo.start)} a {formatDate(periodo.end)}</span>
        </header>
        <div className="calendarWeekHeader">
          {weekDays.map((day) => <strong key={day}>{day}</strong>)}
        </div>
        <div className="calendarGrid">
          {days.map((data, index) => (
            <button
              key={data || `empty-${index}`}
              className={`calendarDay agendaDay ${!data ? 'empty' : ''}`}
              disabled={!data}
              type="button"
            >
              {data && <span className="dayNumber">{Number(data.slice(8, 10))}</span>}
              {data && (
                <span className="agendaDayHint">
                  <CalendarDays size={16} />
                  Livre
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
