import { useState } from 'react';
import { CheckCircle2, Edit, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Toast } from '../components/Toast.jsx';
import { formatDate, formatMoneyFromCentavos, todayISO } from '../utils/formatters.js';

const emptyMeta = { nome: '', valorAlvo: '', valorAtual: '0', dataAlvo: '', contaId: '', observacoes: '' };

function statusLabel(status) {
  if (status === 'CONCLUIDA') return 'Concluída';
  if (status === 'CANCELADA') return 'Cancelada';
  return 'Em andamento';
}

function statusBadgeClass(status) {
  if (status === 'CONCLUIDA') return 'concluido';
  if (status === 'CANCELADA') return 'cancelado';
  return 'pendente';
}

export function Metas() {
  const list = useApi(() => api.get('/metas'));
  const contas = useApi(() => api.get('/contas?ativas=true'));
  const [modal, setModal] = useState(null);
  const [aporteModal, setAporteModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const metas = list.data?.data || [];
  const contasAtivas = contas.data?.data || [];
  const emAndamento = metas.filter((item) => item.status === 'EM_ANDAMENTO');
  const totalAlvo = emAndamento.reduce((sum, item) => sum + item.valorAlvoCentavos, 0);
  const totalAtual = emAndamento.reduce((sum, item) => sum + item.valorAtualCentavos, 0);

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      nome: form.get('nome'),
      valorAlvo: form.get('valorAlvo'),
      valorAtual: form.get('valorAtual') || 0,
      dataAlvo: form.get('dataAlvo') || null,
      contaId: form.get('contaId') || null,
      status: form.get('status') || 'EM_ANDAMENTO',
      observacoes: form.get('observacoes')
    };
    try {
      if (modal?.id) await api.put(`/metas/${modal.id}`, payload);
      else await api.post('/metas', payload);
      setModal(null);
      setToast({ message: 'Meta salva com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function saveAporte(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post(`/metas/${aporteModal.id}/aportes`, {
        data: form.get('data'),
        valor: form.get('valor'),
        observacoes: form.get('observacoes')
      });
      setAporteModal(null);
      setToast({ message: 'Aporte registrado com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function remove(item) {
    try {
      await api.delete(`/metas/${item.id}`);
      setToast({ message: 'Meta excluída com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setConfirm(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle="Cadastre metas financeiras e acompanhe o progresso até o objetivo."
        action={<button className="primary" onClick={() => setModal(emptyMeta)}><Plus size={18} /> Nova meta</button>}
      />
      <section className="summaryGrid report">
        <article className="summaryCard info">
          <span>Metas em andamento</span>
          <strong>{emAndamento.length}</strong>
        </article>
        <article className="summaryCard receber">
          <span>Total já guardado</span>
          <strong>{formatMoneyFromCentavos(totalAtual)}</strong>
        </article>
        <article className="summaryCard info">
          <span>Total alvo</span>
          <strong>{formatMoneyFromCentavos(totalAlvo)}</strong>
        </article>
      </section>

      {list.loading ? <Loading /> : (
        metas.length === 0 ? <div className="emptyState">Nenhuma meta cadastrada.</div> : (
          <section className="metaGrid">
            {metas.map((meta) => (
              <article key={meta.id} className="panel metaCard">
                <div className="metaCardHeader">
                  <div>
                    <strong>{meta.nome}</strong>
                    {meta.dataAlvo && <span className="muted">Até {formatDate(meta.dataAlvo)}</span>}
                    {meta.contaNome && <span className="muted">Conta: {meta.contaNome}</span>}
                  </div>
                  <span className={`badge ${statusBadgeClass(meta.status)}`}>{statusLabel(meta.status)}</span>
                </div>
                <div className="metaProgressTrack">
                  <div className="metaProgressFill" style={{ width: `${Math.round(meta.progresso * 100)}%` }} />
                </div>
                <div className="metaProgressLabels">
                  <span>{formatMoneyFromCentavos(meta.valorAtualCentavos)}</span>
                  <span className="muted">de {formatMoneyFromCentavos(meta.valorAlvoCentavos)} ({Math.round(meta.progresso * 100)}%)</span>
                </div>
                <div className="actions">
                  <button className="secondary" onClick={() => setAporteModal(meta)} disabled={meta.status !== 'EM_ANDAMENTO'}><PiggyBank size={17} /> Aporte</button>
                  <button className="iconButton" onClick={() => setModal({ ...meta, valorAlvo: String(meta.valorAlvoCentavos / 100), contaId: meta.contaId || '' })} aria-label="Editar"><Edit size={17} /></button>
                  <button className="iconButton dangerIcon" onClick={() => setConfirm({ item: meta })} aria-label="Excluir"><Trash2 size={17} /></button>
                </div>
              </article>
            ))}
          </section>
        )
      )}

      {modal && (
        <Modal title={modal.id ? 'Editar meta' : 'Nova meta'} onClose={() => setModal(null)}>
          <form className="formGrid" onSubmit={save}>
            <label className="full">Nome<input name="nome" defaultValue={modal.nome} required maxLength={120} /></label>
            <label>Valor alvo<input name="valorAlvo" type="number" step="0.01" min="0.01" defaultValue={modal.valorAlvo} required /></label>
            {!modal.id && <label>Valor já guardado<input name="valorAtual" type="number" step="0.01" min="0" defaultValue={modal.valorAtual} /></label>}
            <label>Data alvo<input name="dataAlvo" type="date" defaultValue={modal.dataAlvo || ''} /></label>
            <label>Conta vinculada
              <select name="contaId" defaultValue={modal.contaId || ''}>
                <option value="">Nenhuma</option>
                {contasAtivas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
              </select>
            </label>
            {modal.id && (
              <label>Status
                <select name="status" defaultValue={modal.status}>
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="CONCLUIDA">Concluída</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </label>
            )}
            <label className="full">Observações<textarea name="observacoes" rows={3} maxLength={500} defaultValue={modal.observacoes || ''} /></label>
            <div className="modalActions full">
              <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {aporteModal && (
        <Modal title={`Registrar aporte - ${aporteModal.nome}`} onClose={() => setAporteModal(null)}>
          <form className="formGrid single" onSubmit={saveAporte}>
            <div className="launchPreview full">
              <span>Progresso atual</span>
              <strong>{formatMoneyFromCentavos(aporteModal.valorAtualCentavos)} de {formatMoneyFromCentavos(aporteModal.valorAlvoCentavos)}</strong>
            </div>
            <label>Data<input name="data" type="date" defaultValue={todayISO()} required /></label>
            <label>Valor do aporte<input name="valor" type="number" step="0.01" min="0.01" required /></label>
            <label>Observações<textarea name="observacoes" rows={2} maxLength={500} /></label>
            <div className="modalActions full">
              <button type="button" className="secondary" onClick={() => setAporteModal(null)}>Cancelar</button>
              <button className="primary"><CheckCircle2 size={17} /> Registrar aporte</button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          danger
          title="Excluir meta"
          message={`Excluir a meta "${confirm.item.nome}"? Todo o histórico de aportes será perdido.`}
          onClose={() => setConfirm(null)}
          onConfirm={() => remove(confirm.item)}
          confirmLabel="Excluir"
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
