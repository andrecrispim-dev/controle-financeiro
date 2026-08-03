import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Toast } from '../components/Toast.jsx';
import { formatMoneyFromCentavos } from '../utils/formatters.js';

const emptyConta = {
  nome: '',
  bancoId: '',
  banco: '',
  agencia: '',
  numero: '',
  saldoInicial: '',
  ativa: true,
  observacoes: ''
};

export function Contas() {
  const list = useApi(() => api.get('/contas'));
  const bancos = useApi(() => api.get('/bancos'));
  const [modal, setModal] = useState(null);
  const [bankModal, setBankModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      nome: form.get('nome'),
      bancoId: form.get('bancoId') || null,
      agencia: form.get('agencia'),
      numero: form.get('numero'),
      saldoInicial: form.get('saldoInicial') || 0,
      ativa: form.get('ativa') === 'on',
      observacoes: form.get('observacoes')
    };
    try {
      if (modal?.id) await api.put(`/contas/${modal.id}`, payload);
      else await api.post('/contas', payload);
      setModal(null);
      setToast({ message: 'Conta salva com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function saveBanco(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post('/bancos', {
        nome: form.get('nome'),
        codigo: form.get('codigo')
      });
      setBankModal(null);
      setToast({ message: 'Banco cadastrado com sucesso.' });
      bancos.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function remove(item) {
    try {
      await api.delete(`/contas/${item.id}`);
      setToast({ message: 'Conta excluida com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setConfirm(null);
    }
  }

  const contas = list.data?.data || [];
  const bancosOptions = bancos.data?.data || [];
  const total = contas.filter((conta) => conta.ativa).reduce((sum, conta) => sum + conta.saldoAtualCentavos, 0);

  function saldoInicialFormValue(conta) {
    if (conta.saldoInicial !== undefined) return conta.saldoInicial;
    if (conta.saldoInicialCentavos !== undefined) return String(conta.saldoInicialCentavos / 100);
    return '0';
  }

  return (
    <>
      <PageHeader
        title="Contas"
        subtitle="Cadastre contas bancarias e acompanhe o saldo consolidado."
        action={<button className="primary" onClick={() => setModal(emptyConta)}><Plus size={18} /> Adicionar</button>}
      />
      <section className="summaryGrid report">
        <article className="summaryCard info">
          <span>Total nas contas ativas</span>
          <strong>{formatMoneyFromCentavos(total)}</strong>
        </article>
        <article className="summaryCard info">
          <span>Contas ativas</span>
          <strong>{contas.filter((conta) => conta.ativa).length}</strong>
        </article>
      </section>
      {list.loading ? <Loading /> : (
        <section className="panel tablePanel">
          {contas.length === 0 ? <div className="emptyState">Nenhuma conta cadastrada.</div> : (
            <table>
              <thead><tr><th>Nome</th><th>Banco</th><th>Saldo inicial</th><th>Saldo atual</th><th>Status</th><th>Acoes</th></tr></thead>
              <tbody>{contas.map((item) => (
                <tr key={item.id}>
                  <td data-label="Nome" className="mobileTitle">{item.nome}</td>
                  <td data-label="Banco">{item.banco || '-'}</td>
                  <td data-label="Saldo inicial">{formatMoneyFromCentavos(item.saldoInicialCentavos)}</td>
                  <td data-label="Saldo atual" className="moneyCell">{formatMoneyFromCentavos(item.saldoAtualCentavos)}</td>
                  <td data-label="Status"><span className={`badge ${item.ativa ? 'concluido' : 'cancelado'}`}>{item.ativa ? 'ATIVA' : 'INATIVA'}</span></td>
                  <td data-label="Acoes" className="actions">
                    <button className="iconButton" onClick={() => setModal({ ...item, bancoId: item.bancoId || '', saldoInicial: String(item.saldoInicialCentavos / 100) })} aria-label="Editar"><Edit size={17} /></button>
                    <button className="iconButton dangerIcon" onClick={() => setConfirm({ item })} aria-label="Excluir"><Trash2 size={17} /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </section>
      )}
      {modal && (
        <Modal title={modal.id ? 'Editar conta' : 'Nova conta'} onClose={() => setModal(null)}>
          <form className="formGrid" onSubmit={save}>
            <label>Nome<input name="nome" defaultValue={modal.nome} required maxLength={80} /></label>
            <label>
              Banco
              <span className="inlineField">
                <select name="bancoId" defaultValue={modal.bancoId || ''}>
                  <option value="">Selecione um banco</option>
                  {bancosOptions.map((banco) => (
                    <option key={banco.id} value={banco.id}>{banco.nome}{banco.codigo ? ` - ${banco.codigo}` : ''}</option>
                  ))}
                </select>
                <button className="iconButton addInline" type="button" onClick={() => setBankModal({ nome: '', codigo: '' })} aria-label="Cadastrar banco">
                  <Plus size={18} />
                </button>
              </span>
            </label>
            <label>Agencia<input name="agencia" defaultValue={modal.agencia || ''} maxLength={30} /></label>
            <label>Numero<input name="numero" defaultValue={modal.numero || ''} maxLength={40} /></label>
            <label>Saldo inicial<input name="saldoInicial" type="number" step="0.01" defaultValue={saldoInicialFormValue(modal)} /></label>
            <label className="checkboxLabel"><input name="ativa" type="checkbox" defaultChecked={modal.ativa !== false} /> Conta ativa</label>
            <label className="full">Observacoes<textarea name="observacoes" defaultValue={modal.observacoes || ''} rows={3} maxLength={500} /></label>
            <div className="modalActions full"><button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary">Salvar</button></div>
          </form>
        </Modal>
      )}
      {bankModal && (
        <Modal title="Novo banco" onClose={() => setBankModal(null)}>
          <form className="formGrid single" onSubmit={saveBanco}>
            <label>Nome do banco<input name="nome" defaultValue={bankModal.nome} required maxLength={80} autoFocus /></label>
            <label>Codigo<input name="codigo" defaultValue={bankModal.codigo} maxLength={10} placeholder="Ex.: 260" /></label>
            <div className="modalActions full"><button type="button" className="secondary" onClick={() => setBankModal(null)}>Cancelar</button><button className="primary">Salvar banco</button></div>
          </form>
        </Modal>
      )}
      {confirm && <ConfirmDialog danger title="Excluir conta" message={`Excluir "${confirm.item.nome}"? Contas vinculadas a lancamentos serao bloqueadas pela API.`} onClose={() => setConfirm(null)} onConfirm={() => remove(confirm.item)} confirmLabel="Excluir" />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
