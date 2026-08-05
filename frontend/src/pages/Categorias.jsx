import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Toast } from '../components/Toast.jsx';

export function Categorias() {
  const list = useApi(() => api.get('/categorias'));
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { nome: form.get('nome'), tipo: form.get('tipo') };
    try {
      if (modal?.id) await api.put(`/categorias/${modal.id}`, payload);
      else await api.post('/categorias', payload);
      setModal(null);
      setToast({ message: 'Categoria salva com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function remove(item) {
    try {
      await api.delete(`/categorias/${item.id}`);
      setToast({ message: 'Categoria excluida com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setConfirm(null);
    }
  }

  function tipoBadgeClass(tipo) {
    return {
      PAGAR: 'categoryPay',
      RECEBER: 'categoryReceive',
      AMBOS: 'categoryBoth'
    }[tipo] || 'categoryBoth';
  }

  return (
    <>
      <PageHeader title="Categorias" subtitle="Organize entradas e saidas por grupos."
        action={<button className="primary" onClick={() => setModal({ nome: '', tipo: 'AMBOS' })}><Plus size={18} /> Adicionar</button>} />
      {list.loading ? <Loading /> : (
        <section className="panel tablePanel">
          <table>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Acoes</th></tr></thead>
            <tbody>{(list.data?.data || []).map((item) => (
              <tr key={item.id}>
                <td data-label="Nome" className="mobileTitle">{item.nome}</td>
                <td data-label="Tipo"><span className={`badge ${tipoBadgeClass(item.tipo)}`}>{item.tipo}</span></td>
                <td data-label="Acoes" className="actions">
                  <button className="iconButton" onClick={() => setModal(item)} aria-label="Editar"><Edit size={17} /></button>
                  <button className="iconButton dangerIcon" onClick={() => setConfirm({ item })} aria-label="Excluir"><Trash2 size={17} /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
      {modal && (
        <Modal title={modal.id ? 'Editar categoria' : 'Nova categoria'} onClose={() => setModal(null)}>
          <form className="formGrid single" onSubmit={save}>
            <label>Nome<input name="nome" defaultValue={modal.nome} required maxLength={80} /></label>
            <label>Tipo<select name="tipo" defaultValue={modal.tipo}><option value="PAGAR">Pagar</option><option value="RECEBER">Receber</option><option value="AMBOS">Ambos</option></select></label>
            <div className="modalActions full"><button className="secondary" type="button" onClick={() => setModal(null)}>Cancelar</button><button className="primary">Salvar</button></div>
          </form>
        </Modal>
      )}
      {confirm && <ConfirmDialog danger title="Excluir categoria" message={`Excluir "${confirm.item.nome}"? Categorias em uso serao bloqueadas pela API.`} onClose={() => setConfirm(null)} onConfirm={() => remove(confirm.item)} confirmLabel="Excluir" />}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
