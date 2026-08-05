import { useMemo, useState } from 'react';
import { CalendarPlus, Edit, Hospital, Moon, Plus, Save, SlidersHorizontal, Sparkles, Sun, Sunset, Trash2, WalletCards } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { MonthNavigator } from '../components/MonthNavigator.jsx';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Loading } from '../components/Loading.jsx';
import { Toast } from '../components/Toast.jsx';
import { formatDate, formatMoneyFromCentavos, monthLabel, monthRangeISO, queryString, todayISO } from '../utils/formatters.js';

const hospitais = ['UNIMED', 'IPIS'];
const tipos = [
  { value: 'DIURNO', label: 'Diurno', icon: Sun },
  { value: 'TARDE', label: 'Tarde', icon: Sunset },
  { value: 'NOTURNO', label: 'Noturno', icon: Moon },
  { value: 'ESPECIAL', label: 'Especial', icon: Sparkles }
];
const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

const emptyPlantao = (data) => ({
  data,
  hospital: 'UNIMED',
  tipo: 'DIURNO',
  quantidadeExtras: 0,
  observacoes: ''
});

function monthKey(periodo) {
  return periodo.start.slice(0, 7);
}

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

function tipoInfo(tipo) {
  return tipos.find((item) => item.value === tipo) || tipos[0];
}

function toDecimal(centavos) {
  return String((centavos || 0) / 100);
}

export function Plantoes() {
  const [periodo, setPeriodo] = useState(monthRangeISO(todayISO()));
  const [dayModal, setDayModal] = useState(null);
  const [plantaoModal, setPlantaoModal] = useState(null);
  const [lancarModal, setLancarModal] = useState(null);
  const [valoresOpen, setValoresOpen] = useState(false);
  const [valorModal, setValorModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const mes = monthKey(periodo);
  const plantoesApi = useApi(() => api.get(`/plantoes${queryString({ mes })}`), [mes]);
  const categoriasApi = useApi(() => api.get('/categorias'));
  const contasApi = useApi(() => api.get('/contas'));

  const payload = plantoesApi.data?.data;
  const plantoes = payload?.items || [];
  const resumo = payload?.resumo || [];
  const valores = payload?.valores || [];
  const feriados = payload?.feriados || [];
  const categorias = categoriasApi.data?.data || [];
  const contas = contasApi.data?.data || [];

  const byDate = useMemo(() => {
    const map = new Map();
    plantoes.forEach((plantao) => {
      const list = map.get(plantao.data) || [];
      list.push(plantao);
      map.set(plantao.data, list);
    });
    return map;
  }, [plantoes]);

  function needsConcluidoConfirmation(error) {
    return error.message?.includes('ja esta concluido');
  }

  async function runWithConcluidoConfirm(action, retry) {
    try {
      await action(false);
    } catch (err) {
      if (needsConcluidoConfirmation(err)) {
        setConfirm({
          title: 'Lancamento concluido',
          message: 'O lancamento financeiro deste hospital/mes ja esta concluido. Deseja atualizar mesmo assim?',
          confirmLabel: 'Atualizar mesmo assim',
          onConfirm: async () => {
            try {
              await retry(true);
              setConfirm(null);
            } catch (retryErr) {
              setToast({ type: 'error', message: retryErr.message });
              setConfirm(null);
            }
          }
        });
        return;
      }
      setToast({ type: 'error', message: err.message });
    }
  }

  async function savePlantao(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payloadForm = {
      data: form.get('data'),
      hospital: form.get('hospital'),
      tipo: form.get('tipo'),
      quantidadeExtras: Number(form.get('quantidadeExtras') || 0),
      observacoes: form.get('observacoes') || null
    };
    const submit = async (confirmarAtualizacaoConcluido) => {
      const body = { ...payloadForm, confirmarAtualizacaoConcluido };
      if (plantaoModal.id) await api.put(`/plantoes/${plantaoModal.id}`, body);
      else await api.post('/plantoes', body);
      setPlantaoModal(null);
      setToast({ message: 'Plantao salvo com sucesso.' });
      plantoesApi.reload();
    };
    await runWithConcluidoConfirm(submit, submit);
  }

  async function removePlantao(item, confirmarAtualizacaoConcluido = false) {
    try {
      await api.deleteBody(`/plantoes/${item.id}`, { confirmarAtualizacaoConcluido });
      setConfirm(null);
      setToast({ message: 'Plantao excluido com sucesso.' });
      plantoesApi.reload();
    } catch (err) {
      if (needsConcluidoConfirmation(err)) {
        setConfirm({
          title: 'Lancamento concluido',
          message: 'O lancamento financeiro deste hospital/mes ja esta concluido. Deseja excluir o plantao e atualizar mesmo assim?',
          confirmLabel: 'Excluir e atualizar',
          danger: true,
          onConfirm: () => removePlantao(item, true)
        });
        return;
      }
      setToast({ type: 'error', message: err.message });
      setConfirm(null);
    }
  }

  async function lancar(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bodyBase = {
      mes,
      hospital: lancarModal.hospital,
      categoriaId: form.get('categoriaId') || null,
      contaId: form.get('contaId') || null,
      dataVencimento: form.get('dataVencimento')
    };
    const submit = async (confirmarAtualizacaoConcluido) => {
      await api.post('/plantoes/lancar', { ...bodyBase, confirmarAtualizacaoConcluido });
      setLancarModal(null);
      setToast({ message: 'Plantoes lancados no financeiro com sucesso.' });
      plantoesApi.reload();
    };
    await runWithConcluidoConfirm(submit, submit);
  }

  async function saveValor(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.put(`/plantoes/valores/${valorModal.id}`, {
        valorBase: form.get('valorBase'),
        valorExtra: form.get('valorExtra')
      });
      setValorModal(null);
      setToast({ message: 'Valor atualizado com sucesso.' });
      plantoesApi.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  const days = calendarDays(periodo);

  return (
    <>
      <PageHeader
        title="Plantoes"
        subtitle="Cadastre os plantoes por hospital, acompanhe extras e lance o recebimento mensal."
        action={(
          <div className="pageActions">
            <button className="secondary" onClick={() => setValoresOpen(true)}><SlidersHorizontal size={18} /> Configurar valores</button>
            <button className="primary" onClick={() => setPlantaoModal(emptyPlantao(todayISO()))}><Plus size={18} /> Adicionar</button>
          </div>
        )}
      />
      <MonthNavigator value={periodo.start} onChange={setPeriodo} />

      {plantoesApi.loading ? <Loading /> : (
        <>
          <section className="hospitalGrid">
            {resumo.map((item) => (
              <article key={item.hospital} className="panel hospitalCard">
                <div>
                  <span className="muted"><Hospital size={16} /> {item.hospital}</span>
                  <strong>{formatMoneyFromCentavos(item.totalCentavos)}</strong>
                  {item.totalExtrasCentavos > 0 && (
                    <span className="hospitalExtra">+ {formatMoneyFromCentavos(item.totalExtrasCentavos)} em extras</span>
                  )}
                  <small>{item.quantidade} plantao(oes), {item.horas}h, {item.extras} extra(s)</small>
                  {item.lancamento && <small className={`syncStatus ${item.lancamento.lancamentoStatus === 'CONCLUIDO' ? 'done' : 'pending'}`}>Lancamento {item.lancamento.lancamentoStatus.toLowerCase()}</small>}
                </div>
                <button className="secondary" disabled={!item.quantidade} onClick={() => setLancarModal(item)}>
                  <WalletCards size={17} /> Lancar plantoes
                </button>
              </article>
            ))}
          </section>

          <section className="panel plantaoCalendar">
            <header>
              <h2>{monthLabel(periodo.start)}</h2>
              <span className="muted">{formatDate(periodo.start)} a {formatDate(periodo.end)}</span>
            </header>
            <div className="calendarWeekHeader">
              {weekDays.map((day) => <strong key={day}>{day}</strong>)}
            </div>
            <div className="calendarGrid">
              {days.map((data, index) => {
                const items = data ? byDate.get(data) || [] : [];
                const isHoliday = data && feriados.some((feriado) => feriado.data === data);
                return (
                  <button
                    key={data || `empty-${index}`}
                    className={`calendarDay ${!data ? 'empty' : ''} ${items.length ? 'hasItems' : ''} ${isHoliday ? 'holiday' : ''}`}
                    disabled={!data}
                    onClick={() => setDayModal({ data })}
                  >
                    {data && <span className="dayNumber">{Number(data.slice(8, 10))}</span>}
                    <span className="dayIcons">
                      {items.map((plantao) => {
                        const Info = tipoInfo(plantao.tipo);
                        const Icon = Info.icon;
                        return (
                          <span
                            key={plantao.id}
                            title={`${plantao.hospital} - ${Info.label}${plantao.quantidadeExtras ? ` - ${plantao.quantidadeExtras} extra(s)` : ''}`}
                            className={`plantaoIcon ${plantao.tipo.toLowerCase()} ${plantao.hospital.toLowerCase()}`}
                          >
                            <Icon size={15} />
                            {plantao.quantidadeExtras > 0 && <span className="extraDot">+</span>}
                          </span>
                        );
                      })}
                    </span>
                    {items.length > 0 && <small>{formatMoneyFromCentavos(items.reduce((sum, item) => sum + item.valorTotalCentavos, 0))}</small>}
                  </button>
                );
              })}
            </div>
          </section>

        </>
      )}

      {dayModal && (
        <Modal title={`Plantoes em ${formatDate(dayModal.data)}`} onClose={() => setDayModal(null)} wide>
          <div className="dayModalList">
            {(byDate.get(dayModal.data) || []).length === 0 ? <div className="emptyState">Nenhum plantao neste dia.</div> : (byDate.get(dayModal.data) || []).map((item) => {
              const Info = tipoInfo(item.tipo);
              const Icon = Info.icon;
              return (
                <article key={item.id} className="dayPlantaoCard">
                  <div>
                    <strong><Icon size={17} /> {Info.label} - {item.hospital}</strong>
                    <span>{item.horaInicio} as {item.horaFim} | {item.quantidadeHoras}h | extras: {item.quantidadeExtras}</span>
                    <small>{item.usaValorFimSemana ? 'Valor de fim de semana/feriado' : 'Valor de semana'}</small>
                  </div>
                  <strong>{formatMoneyFromCentavos(item.valorTotalCentavos)}</strong>
                  <div className="actions">
                    <button className="iconButton" onClick={() => setPlantaoModal(item)} aria-label="Editar"><Edit size={17} /></button>
                    <button className="iconButton dangerIcon" onClick={() => setConfirm({ title: 'Excluir plantao', message: `Excluir plantao ${Info.label} de ${item.hospital}?`, danger: true, confirmLabel: 'Excluir', onConfirm: () => removePlantao(item) })} aria-label="Excluir"><Trash2 size={17} /></button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="modalActions singleAction">
            <button className="primary" onClick={() => setPlantaoModal(emptyPlantao(dayModal.data))}><CalendarPlus size={17} /> Adicionar neste dia</button>
          </div>
        </Modal>
      )}

      {plantaoModal && (
        <Modal title={plantaoModal.id ? 'Editar plantao' : 'Novo plantao'} onClose={() => setPlantaoModal(null)}>
          <form className="formGrid" onSubmit={savePlantao}>
            <label>Data<input type="date" name="data" defaultValue={plantaoModal.data} required /></label>
            <label>Hospital
              <select name="hospital" defaultValue={plantaoModal.hospital}>
                {hospitais.map((hospital) => <option key={hospital} value={hospital}>{hospital}</option>)}
              </select>
            </label>
            <label>Tipo
              <select name="tipo" defaultValue={plantaoModal.tipo}>
                {tipos.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
              </select>
            </label>
            <label>Pacientes extras<input type="number" name="quantidadeExtras" min="0" max="999" defaultValue={plantaoModal.quantidadeExtras || 0} /></label>
            <label className="full">Observacoes<textarea name="observacoes" rows={3} maxLength={1000} defaultValue={plantaoModal.observacoes || ''} /></label>
            <div className="modalActions full">
              <button type="button" className="secondary" onClick={() => setPlantaoModal(null)}>Cancelar</button>
              <button className="primary"><Save size={17} /> Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {lancarModal && (
        <Modal title={`Lancar plantoes ${lancarModal.hospital}`} onClose={() => setLancarModal(null)}>
          <form className="formGrid" onSubmit={lancar}>
            <label>Categoria
              <select name="categoriaId" required defaultValue="">
                <option value="">Selecione</option>
                {categorias.filter((categoria) => ['RECEBER', 'AMBOS'].includes(categoria.tipo)).map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                ))}
              </select>
            </label>
            <label>Conta bancaria
              <select name="contaId" defaultValue="">
                <option value="">Sem conta</option>
                {contas.filter((conta) => conta.ativa).map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
              </select>
            </label>
            <label>Data de vencimento<input type="date" name="dataVencimento" required defaultValue={periodo.end} /></label>
            <div className="launchPreview full">
              <span>Total a receber</span>
              <strong>{formatMoneyFromCentavos(lancarModal.totalCentavos)}</strong>
              <small>{lancarModal.quantidade} plantao(oes), {lancarModal.horas}h e {lancarModal.extras} extra(s)</small>
            </div>
            <div className="modalActions full">
              <button type="button" className="secondary" onClick={() => setLancarModal(null)}>Cancelar</button>
              <button className="primary">Gerar/atualizar lancamento</button>
            </div>
          </form>
        </Modal>
      )}

      {valoresOpen && (
        <Modal title="Configurar valores dos plantoes" onClose={() => setValoresOpen(false)} wide>
          <div className="sectionHeader">
            <div>
              <h2>Valores cadastrados</h2>
              <p className="muted">Ajuste os valores base e extras quando houver mudanca futura. Novos plantoes passam a usar a nova tabela.</p>
            </div>
          </div>
          <div className="valueGrid">
            {valores.map((valor) => (
              <button key={valor.id} className="valueCard" onClick={() => setValorModal(valor)}>
                <span>{tipoInfo(valor.tipo).label} - {valor.contexto === 'SEMANA' ? 'Semana' : 'Fim semana/feriado'}</span>
                <strong>{formatMoneyFromCentavos(valor.valorBaseCentavos)}</strong>
                <small>Extra: {formatMoneyFromCentavos(valor.valorExtraCentavos)}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {valorModal && (
        <Modal title="Editar valor de plantao" onClose={() => setValorModal(null)}>
          <form className="formGrid single" onSubmit={saveValor}>
            <div className="launchPreview full">
              <span>{tipoInfo(valorModal.tipo).label}</span>
              <strong>{valorModal.contexto === 'SEMANA' ? 'Semana' : 'Fim semana/feriado'}</strong>
            </div>
            <label>Valor base<input name="valorBase" type="number" step="0.01" min="0" defaultValue={toDecimal(valorModal.valorBaseCentavos)} required /></label>
            <label>Valor extra<input name="valorExtra" type="number" step="0.01" min="0" defaultValue={toDecimal(valorModal.valorExtraCentavos)} required /></label>
            <div className="modalActions full">
              <button type="button" className="secondary" onClick={() => setValorModal(null)}>Cancelar</button>
              <button className="primary">Salvar valor</button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onClose={() => setConfirm(null)}
          onConfirm={confirm.onConfirm}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
