import { NavLink } from 'react-router-dom';
import { BarChart3, FolderTree, Home, Menu, ReceiptText, Settings, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/lancamentos', label: 'Lancamentos', icon: ReceiptText },
  { to: '/categorias', label: 'Categorias', icon: FolderTree },
  { to: '/relatorios', label: 'Relatorios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configuracoes', icon: Settings }
];

export function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="appShell">
      <header className="mobileTopbar">
        <div className="brand compact">
          <div className="brandMark">CF</div>
          <div>
            <strong>Controle Financeiro</strong>
            <span>Contas a pagar e receber</span>
          </div>
        </div>
        <button className="iconButton menuToggle" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
          <Menu size={22} />
        </button>
      </header>

      <div className={`drawerOverlay ${menuOpen ? 'open' : ''}`} onClick={closeMenu} />

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <button className="iconButton drawerClose" onClick={closeMenu} aria-label="Fechar menu">
          <X size={20} />
        </button>
        <div className="brand">
          <div className="brandMark">CF</div>
          <div>
            <strong>Controle Financeiro</strong>
            <span>Contas a pagar e receber</span>
          </div>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
