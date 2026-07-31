import { useMemo, useState } from 'react';
import { Eye, Plus, RotateCcw, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatMoneyFromCentavos, monthRangeISO, queryString, todayISO } from '../utils/formatters.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Modal } from '../components/Modal.jsx';
import { LancamentoForm } from '../components/LancamentoForm.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Toast } from '../components/Toast.jsx';

function filtrosIniciais() {
  const month = monthRangeISO();
  return {
    status: '',
    dataInicial: month.start,
    dataFinal: month.end,
    descricao: '',
    ordenarPor: 'data_vencimento',
    ordem: 'asc',
    pagina: 1,
    limite: 10
  };
}

export function Lancamentos() {
  const [filters, setFilters] = useState(filtrosIniciais);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const query = useMemo(() => queryString(filters), [filters]);
  const list = useApi(() => api.get(`/lancamentos${query}`), [query]);
  const categorias = useApi(() => api.get('/categorias'));

  function setFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value, pagina: 1 }));
  }

  async function save(payload) {
    if (modal?.item) await api.put(`/lancamentos/${modal.item.id}`, payload);
    else await api.post('/lancamentos', payload);
    setModal(null);
    setToast({ message: 'Lancamento salvo com sucesso.' });
    list.reload();
  }

  async function remove(item) {
    await api.delete(`/lancamentos/${item.id}`);
    setConfirm(null);
    setToast({ message: 'Lancamento excluido com sucesso.' });
    list.reload();
  }

  async function concluir(item) {
    const dataPagamento = window.prompt(item.tipo === 'PAGAR' ? 'Data do pagamento (YYYY-MM-DD)' : 'Data do recebimento (YYYY-MM-DD)', todayISO());
    if (!dataPagamento) return;
    await api.patch(`/lancamentos/${item.id}/concluir`, { dataPagamento });
    setToast({ message: item.tipo === 'PAGAR' ? 'Conta marcada como paga.' : 'Conta marcada como recebida.' });
    list.reload();
  }

  async function reabrir(item) {
    await api.patch(`/lancamentos/${item.id}/reabrir`);
    setConfirm(null);
    setToast({ message: 'Lancamento reaberto com sucesso.' });
    list.reload();
  }

  async function cancelar(item) {
    await api.patch(`/lancamentos/${item.id}/cancelar`);
    setConfirm(null);
    setToast({ message: 'Lancamento cancelado com sucesso.' });
    list.reload();
  }

  const items = list.data?.data || [];
  const meta = list.data?.meta || { total: 0, pagina: 1, limite: 10 };
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limite));

  return (
    <>
      <PageHeader title="Lancamentos" subtitle="Cadastre, filtre e acompanhe contas a pagar e receber."
        action={<button className="primary" onClick={() => setModal({ item: null })}><Plus size={18} /> Adicionar</button>} />
      <section className="filters panel">
        <input placeholder="Descricao" value={filters.descricao} onChange={(e) => setFilter('descricao', e.target.value)} />
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Todos os status</option><option value="PENDENTE">Pendentes</option><option value="CONCLUIDO">Concluidos</option><option value="CANCELADO">Cancelados</option><option value="VENCIDO">Vencidos</option>
        </select>
        <input type="date" value={filters.dataInicial} onChange={(e) => setFilter('dataInicial', e.target.value)} />
        <input type="date" value={filters.dataFinal} onChange={(e) => setFilter('dataFinal', e.target.value)} />
      </section>
      {list.loading ? <Loading /> : (
        <section className="panel tablePanel">
          {items.length === 0 ? <div className="emptyState">Nenhum lancamento encontrado.</div> : (
            <table>
              <thead><tr><th>Tipo</th><th>Descricao</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Pagamento</th><th>Acoes</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Tipo"><span className={`typePill ${item.tipo.toLowerCase()}`}>{item.tipo === 'PAGAR' ? 'Pagar' : 'Receber'}</span></td>
                    <td data-label="Descricao" className="mobileTitle">{item.descricao}</td>
                    <td data-label="Categoria">{item.categoria || '-'}</td>
                    <td data-label="Valor" className="moneyCell">{formatMoneyFromCentavos(item.valorCentavos)}</td>
                    <td data-label="Vencimento">{formatDate(item.dataVencimento)}</td>
                    <td data-label="Status"><StatusBadge item={item} /></td>
                    <td data-label="Pagamento">{formatDate(item.dataPagamento)}</td>
                    <td data-label="Acoes" className="actions">
                      <button className="iconButton" onClick={() => setModal({ item, mode: 'view' })} aria-label="Visualizar"><Eye size={17} /></button>
                      {item.status === 'CONCLUIDO'
                        ? <button className="iconButton" onClick={() => setConfirm({ title: 'Reabrir lancamento', message: `Reabrir "${item.descricao}"?`, action: () => reabrir(item) })} aria-label="Reabrir"><RotateCcw size={17} /></button>
                        : <button className="iconButton" onClick={() => concluir(item)} aria-label={item.tipo === 'PAGAR' ? 'Marcar como pago' : 'Marcar como recebido'}><CheckCircle2 size={17} /></button>}
                      {item.status !== 'CANCELADO' && <button className="iconButton" onClick={() => setConfirm({ title: 'Cancelar lancamento', message: `Cancelar "${item.descricao}"?`, action: () => cancelar(item) })} aria-label="Cancelar"><XCircle size={17} /></button>}
                      <button className="iconButton dangerIcon" onClick={() => setConfirm({ title: 'Excluir lancamento', message: `Excluir definitivamente "${item.descricao}"?`, action: () => remove(item), danger: true })} aria-label="Excluir"><Trash2 size={17} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="pagination">
            <button className="secondary" disabled={filters.pagina <= 1} onClick={() => setFilters((f) => ({ ...f, pagina: f.pagina - 1 }))}>Anterior</button>
            <span>Pagina {meta.pagina} de {totalPages}</span>
            <button className="secondary" disabled={filters.pagina >= totalPages} onClick={() => setFilters((f) => ({ ...f, pagina: f.pagina + 1 }))}>Proxima</button>
          </div>
        </section>
      )}
      {modal?.item !== undefined && (
        <Modal title={modal.item ? (modal.mode === 'view' ? 'Visualizar lancamento' : 'Editar lancamento') : 'Novo lancamento'} onClose={() => setModal(null)} wide>
          <LancamentoForm
            lancamento={modal.item}
            categorias={categorias.data?.data || []}
            onSubmit={save}
            onCancel={() => setModal(null)}
            readOnly={modal.mode === 'view'}
            onEdit={() => setModal((current) => ({ ...current, mode: 'edit' }))}
          />
        </Modal>
      )}
      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} onConfirm={confirm.action} />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
