import { useState } from 'react';
import { Download, Moon, Plus, Sun } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Loading } from '../components/Loading.jsx';
import { Toast } from '../components/Toast.jsx';
import { useTheme } from '../hooks/useTheme.js';

export function Configuracoes() {
  const backups = useApi(() => api.get('/backups'));
  const [toast, setToast] = useState(null);
  const { theme, toggleTheme } = useTheme();

  async function createBackup() {
    const result = await api.post('/backups', {});
    setToast({ message: `Backup criado: ${result.data.arquivo}` });
    backups.reload();
  }

  return (
    <>
      <PageHeader title="Configuracoes" subtitle="Backup do banco e preferencias locais."
        action={<button className="primary" onClick={createBackup}><Plus size={18} /> Criar backup</button>} />
      <section className="panel settingsPanel">
        <div>
          <h2>Aparencia</h2>
          <p className="muted">Escolha o tema usado neste navegador.</p>
        </div>
        <button className="secondary" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        </button>
      </section>
      <section className="panel">
        <h2>Backups</h2>
        {backups.loading ? <Loading /> : (
          <div className="listStack">
            {(backups.data?.data || []).length === 0 && <div className="emptyState">Nenhum backup criado.</div>}
            {(backups.data?.data || []).map((item) => (
              <div className="dueItem" key={item.arquivo}>
                <div><strong>{item.arquivo}</strong><span>{Math.round(item.tamanhoBytes / 1024)} KB</span></div>
                <a className="secondary buttonLink" href={api.backupDownloadUrl(item.arquivo)}><Download size={17} /> Baixar</a>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Restauracao de backup</h2>
        <p className="muted">Pare o servidor, copie o arquivo `.sqlite` desejado para o caminho configurado em `DB_FILE` e reinicie a aplicacao. Em Docker, esse caminho fica dentro do volume persistente em `/app/data/financeiro.sqlite`.</p>
      </section>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
