import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Lancamentos } from './pages/Lancamentos.jsx';
import { Categorias } from './pages/Categorias.jsx';
import { Relatorios } from './pages/Relatorios.jsx';
import { Configuracoes } from './pages/Configuracoes.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lancamentos" element={<Lancamentos />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </Layout>
  );
}
