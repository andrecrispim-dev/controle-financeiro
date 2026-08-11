import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Lancamentos } from './pages/Lancamentos.jsx';
import { Categorias } from './pages/Categorias.jsx';
import { Contas } from './pages/Contas.jsx';
import { Faturas } from './pages/Faturas.jsx';
import { Metas } from './pages/Metas.jsx';
import { Investimentos } from './pages/Investimentos.jsx';
import { Plantoes } from './pages/Plantoes.jsx';
import { AgendaCalendario } from './pages/AgendaCalendario.jsx';
import { Relatorios } from './pages/Relatorios.jsx';
import { Configuracoes } from './pages/Configuracoes.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lancamentos" element={<Lancamentos />} />
        <Route path="/contas" element={<Contas />} />
        <Route path="/faturas" element={<Faturas />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/investimentos" element={<Investimentos />} />
        <Route path="/agenda" element={<Navigate to="/agenda/plantoes" replace />} />
        <Route path="/agenda/consultas" element={<AgendaCalendario title="Consultas" subtitle="Organize atendimentos e compromissos clínicos por mês." />} />
        <Route path="/agenda/cirurgias" element={<AgendaCalendario title="Cirurgias" subtitle="Visualize o calendário mensal de cirurgias programadas." />} />
        <Route path="/agenda/reunioes" element={<AgendaCalendario title="Reuniões" subtitle="Acompanhe reuniões profissionais e administrativas por mês." />} />
        <Route path="/agenda/plantoes" element={<Plantoes />} />
        <Route path="/agenda/aulas" element={<AgendaCalendario title="Aulas" subtitle="Planeje aulas, treinamentos e compromissos acadêmicos." />} />
        <Route path="/plantoes" element={<Navigate to="/agenda/plantoes" replace />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </Layout>
  );
}
