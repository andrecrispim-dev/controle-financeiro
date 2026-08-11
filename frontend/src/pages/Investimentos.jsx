import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Edit, Plus, Trash2, TrendingUp, UploadCloud } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Toast } from '../components/Toast.jsx';
import { formatDate, formatMoneyFromCentavos } from '../utils/formatters.js';

const colors = ['#d4af37', '#2dd4bf', '#ef4444', '#f1d178', '#8b7355', '#f2ede5'];

const classes = [
  { value: 'RENDA_FIXA', label: 'Renda Fixa' },
  { value: 'RENDA_VARIAVEL', label: 'Renda Variável' },
  { value: 'FUNDO', label: 'Fundo' },
  { value: 'IMOVEL', label: 'Imóvel' },
  { value: 'EXTERIOR', label: 'Exterior' },
  { value: 'OUTRO', label: 'Outro' }
];

function classeLabel(value) {
  return classes.find((item) => item.value === value)?.label || value;
}

function formatPercent(value) {
  const percent = (value * 100).toFixed(2).replace('.', ',');
  return `${value > 0 ? '+' : ''}${percent}%`;
}

const emptyInvestimento = { ativo: '', classe: 'RENDA_FIXA', instituicao: '', valorInvestido: '', valorAtual: '', dataAplicacao: '' };

function tooltipProps() {
  return {
    contentStyle: { color: '#0f172a', background: '#fff', border: '1px solid #cbd5e1' },
    labelStyle: { color: '#0f172a', fontWeight: 700 },
    itemStyle: { fontWeight: 700 }
  };
}

export function Investimentos() {
  const list = useApi(() => api.get('/investimentos'));
  const [modal, setModal] = useState(null);
  const [importModal, setImportModal] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const items = list.data?.data?.items || [];
  const resumo = list.data?.data?.resumo || { totalInvestidoCentavos: 0, totalAtualCentavos: 0, rentabilidade: 0, porClasse: [] };
  const chartData = resumo.porClasse.map((item) => ({ name: classeLabel(item.classe), value: item.totalAtualCentavos }));

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      ativo: form.get('ativo'),
      classe: form.get('classe'),
      instituicao: form.get('instituicao'),
      valorInvestido: form.get('valorInvestido'),
      valorAtual: form.get('valorAtual'),
      dataAplicacao: form.get('dataAplicacao'),
      observacoes: form.get('observacoes')
    };
    try {
      if (modal?.id) await api.put(`/investimentos/${modal.id}`, payload);
      else await api.post('/investimentos', payload);
      setModal(null);
      setToast({ message: 'Investimento salvo com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function remove(item) {
    try {
      await api.delete(`/investimentos/${item.id}`);
      setToast({ message: 'Investimento excluído com sucesso.' });
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setConfirm(null);
    }
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('arquivo', file);
    setImporting(true);
    setImportResult(null);
    try {
      const response = await api.upload('/investimentos/importar', data);
      setImportResult(response.data);
      list.reload();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  }

  return (
    <>
      <PageHeader
        title="Investimentos"
        subtitle="Acompanhe sua carteira, aportes e rentabilidade por classe de ativo."
        action={(
          <div className="pageActions">
            <button className="secondary" onClick={() => { setImportResult(null); setImportModal(true); }}><UploadCloud size={18} /> Importar CSV</button>
            <button className="primary" onClick={() => setModal(emptyInvestimento)}><Plus size={18} /> Novo investimento</button>
          </div>
        )}
      />

      <section className="summaryGrid report">
        <article className="summaryCard info">
          <span>Total investido</span>
          <strong>{formatMoneyFromCentavos(resumo.totalInvestidoCentavos)}</strong>
        </article>
        <article className="summaryCard info">
          <span>Valor atual</span>
          <strong>{formatMoneyFromCentavos(resumo.totalAtualCentavos)}</strong>
        </article>
        <article className={`summaryCard ${resumo.rentabilidade >= 0 ? 'receber' : 'pagar'}`}>
          <span><TrendingUp size={16} /> Rentabilidade</span>
          <strong className={resumo.rentabilidade >= 0 ? 'positiveText' : 'negativeText'}>{formatPercent(resumo.rentabilidade)}</strong>
        </article>
      </section>

      {list.loading ? <Loading /> : (
        <>
          {items.length === 0 ? <div className="emptyState">Nenhum investimento cadastrado.</div> : (
            <>
              <section className="panel">
                <h2>Distribuição por classe</h2>
                <div className="chartWithLegend">
                  <ResponsiveContainer height={320}>
                    <PieChart>
                      <Pie dataKey="value" data={chartData} outerRadius={110}>
                        {chartData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                      </Pie>
                      <Tooltip {...tooltipProps()} formatter={(value) => formatMoneyFromCentavos(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="categoryValueList">
                    {resumo.porClasse.map((item, index) => (
                      <div key={item.classe}>
                        <span style={{ background: colors[index % colors.length] }} />
                        <strong>{classeLabel(item.classe)} ({item.quantidade})</strong>
                        <b className={item.rentabilidade >= 0 ? 'positiveText' : 'negativeText'}>{formatPercent(item.rentabilidade)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panel tablePanel">
                <table>
                  <thead>
                    <tr><th>Ativo</th><th>Classe</th><th>Instituição</th><th>Investido</th><th>Atual</th><th>Rentabilidade</th><th>Aplicação</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Ativo" className="mobileTitle">{item.ativo}{item.origem === 'IMPORTADO' && <span className="badge">Importado</span>}</td>
                        <td data-label="Classe">{classeLabel(item.classe)}</td>
                        <td data-label="Instituição">{item.instituicao || '-'}</td>
                        <td data-label="Investido">{formatMoneyFromCentavos(item.valorInvestidoCentavos)}</td>
                        <td data-label="Atual" className="moneyCell">{formatMoneyFromCentavos(item.valorAtualCentavos)}</td>
                        <td data-label="Rentabilidade" className={item.rentabilidade >= 0 ? 'positiveText' : 'negativeText'}>{formatPercent(item.rentabilidade)}</td>
                        <td data-label="Aplicação">{formatDate(item.dataAplicacao)}</td>
                        <td data-label="Ações" className="actions">
                          <button className="iconButton" onClick={() => setModal({ ...item, valorInvestido: String(item.valorInvestidoCentavos / 100), valorAtual: String(item.valorAtualCentavos / 100) })} aria-label="Editar"><Edit size={17} /></button>
                          <button className="iconButton dangerIcon" onClick={() => setConfirm({ item })} aria-label="Excluir"><Trash2 size={17} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}

      {modal && (
        <Modal title={modal.id ? 'Editar investimento' : 'Novo investimento'} onClose={() => setModal(null)}>
          <form className="formGrid" onSubmit={save}>
            <label className="full">Ativo<input name="ativo" defaultValue={modal.ativo} required maxLength={120} /></label>
            <label>Classe
              <select name="classe" defaultValue={modal.classe}>
                {classes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>Instituição<input name="instituicao" defaultValue={modal.instituicao || ''} maxLength={120} /></label>
            <label>Valor investido<input name="valorInvestido" type="number" step="0.01" min="0" defaultValue={modal.valorInvestido} required /></label>
            <label>Valor atual<input name="valorAtual" type="number" step="0.01" min="0" defaultValue={modal.valorAtual} required /></label>
            <label>Data de aplicação<input name="dataAplicacao" type="date" defaultValue={modal.dataAplicacao} required /></label>
            <label className="full">Observações<textarea name="observacoes" rows={3} maxLength={500} defaultValue={modal.observacoes || ''} /></label>
            <div className="modalActions full">
              <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {importModal && (
        <Modal title="Importar investimentos via CSV" onClose={() => setImportModal(false)}>
          <p className="muted">
            Colunas esperadas: <strong>ativo, classe, instituicao, valor_investido, valor_atual, data_aplicacao</strong> (AAAA-MM-DD).
            Classes válidas: {classes.map((item) => item.value).join(', ')}.
          </p>
          <div className="invoiceFilebar">
            <label className="secondary buttonLink">
              <UploadCloud size={16} /> {importing ? 'Importando...' : 'Selecionar CSV'}
              <input type="file" accept=".csv,text/csv" onChange={importCsv} disabled={importing} />
            </label>
          </div>
          {importResult && (
            <div className={`invoiceStatus ${importResult.erros.length ? 'warn' : 'ok'}`} style={{ marginTop: '1rem' }}>
              {importResult.criados} investimento(s) importado(s) com sucesso.
              {importResult.erros.length > 0 && (
                <ul>
                  {importResult.erros.map((erro) => <li key={erro.linha}>Linha {erro.linha}: {erro.motivo}</li>)}
                </ul>
              )}
            </div>
          )}
          <div className="modalActions">
            <button type="button" className="secondary" onClick={() => setImportModal(false)}>Fechar</button>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          danger
          title="Excluir investimento"
          message={`Excluir "${confirm.item.ativo}"?`}
          onClose={() => setConfirm(null)}
          onConfirm={() => remove(confirm.item)}
          confirmLabel="Excluir"
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
