import { useEffect, useState } from 'react';

const initial = {
  tipo: 'PAGAR',
  descricao: '',
  categoriaId: '',
  categoria: '',
  valor: '',
  dataVencimento: '',
  dataPagamento: '',
  status: 'PENDENTE',
  observacoes: '',
  recorrencia: { frequencia: 'NAO_REPETIR', quantidade: 1, dataFinal: '' }
};

export function LancamentoForm({ lancamento, categorias, onSubmit, onCancel, readOnly = false, onEdit }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editing = Boolean(lancamento);

  useEffect(() => {
    if (lancamento) {
      setForm({
        tipo: lancamento.tipo,
        descricao: lancamento.descricao,
        categoriaId: lancamento.categoriaId || '',
        categoria: lancamento.categoria || '',
        valor: String(lancamento.valor),
        dataVencimento: lancamento.dataVencimento,
        dataPagamento: lancamento.dataPagamento || '',
        status: lancamento.status,
        observacoes: lancamento.observacoes || '',
        recorrencia: { frequencia: 'NAO_REPETIR', quantidade: 1, dataFinal: '' }
      });
    }
  }, [lancamento]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (readOnly) return;
    setError('');
    if (!form.descricao.trim()) return setError('Informe a descricao.');
    if (!form.valor || Number(form.valor) <= 0) return setError('Informe um valor maior que zero.');
    if (!form.dataVencimento) return setError('Informe a data de vencimento.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        categoriaId: form.categoriaId || null,
        valor: Number(String(form.valor).replace(',', '.')),
        recorrencia: editing ? undefined : form.recorrencia
      };
      await onSubmit(payload);
      if (!editing) setForm(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const categoriasFiltradas = categorias.filter((cat) => cat.tipo === 'AMBOS' || cat.tipo === form.tipo);

  return (
    <form className="formGrid" onSubmit={submit}>
      {error && <div className="formError">{error}</div>}
      <label>Tipo
        <select value={form.tipo} onChange={(e) => update('tipo', e.target.value)} required disabled={readOnly}>
          <option value="PAGAR">Conta a pagar</option>
          <option value="RECEBER">Conta a receber</option>
        </select>
      </label>
      <label>Descricao
        <input value={form.descricao} onChange={(e) => update('descricao', e.target.value)} maxLength={120} required readOnly={readOnly} />
      </label>
      <label>Categoria
        <select value={form.categoriaId} onChange={(e) => update('categoriaId', e.target.value)} disabled={readOnly}>
          <option value="">Sem categoria</option>
          {categoriasFiltradas.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
        </select>
      </label>
      <label>Valor
        <input type="number" min="0.01" step="0.01" value={form.valor} onChange={(e) => update('valor', e.target.value)} required readOnly={readOnly} />
      </label>
      <label>Vencimento
        <input type="date" value={form.dataVencimento} onChange={(e) => update('dataVencimento', e.target.value)} required readOnly={readOnly} />
      </label>
      <label>Status
        <select value={form.status} onChange={(e) => update('status', e.target.value)} disabled={readOnly}>
          <option value="PENDENTE">Pendente</option>
          <option value="CONCLUIDO">Concluido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </label>
      {form.status === 'CONCLUIDO' && (
        <label>Data de pagamento ou recebimento
          <input type="date" value={form.dataPagamento} onChange={(e) => update('dataPagamento', e.target.value)} readOnly={readOnly} />
        </label>
      )}
      {!editing && (
        <>
          <label>Recorrencia
            <select value={form.recorrencia.frequencia} onChange={(e) => setForm((c) => ({ ...c, recorrencia: { ...c.recorrencia, frequencia: e.target.value } }))}>
              <option value="NAO_REPETIR">Nao repetir</option>
              <option value="SEMANAL">Semanal</option>
              <option value="QUINZENAL">Quinzenal</option>
              <option value="MENSAL">Mensal</option>
              <option value="ANUAL">Anual</option>
            </select>
          </label>
          {form.recorrencia.frequencia !== 'NAO_REPETIR' && (
            <label>Quantidade
              <input type="number" min="1" max="120" value={form.recorrencia.quantidade} onChange={(e) => setForm((c) => ({ ...c, recorrencia: { ...c.recorrencia, quantidade: Number(e.target.value) } }))} />
            </label>
          )}
        </>
      )}
      <label className="full">Observacoes
        <textarea value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} maxLength={1000} rows={3} readOnly={readOnly} />
      </label>
      <div className="modalActions full">
        <button type="button" className="secondary" onClick={onCancel}>{readOnly ? 'Fechar' : 'Cancelar'}</button>
        {readOnly
          ? <button type="button" className="primary" onClick={onEdit}>Editar</button>
          : <button type="submit" className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>}
      </div>
    </form>
  );
}
