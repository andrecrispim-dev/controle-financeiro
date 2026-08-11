import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, BriefcaseMedical, Building2, CalendarDays, CalendarClock, FileText, FolderTree, GraduationCap, Home, Menu, ReceiptText, Scissors, Settings, Target, TrendingUp, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import aurynLogo from '../assets/auryn-logo.svg';

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/lancamentos', label: 'Lançamentos', icon: ReceiptText },
  { to: '/contas', label: 'Contas', icon: Building2 },
  { to: '/faturas', label: 'Faturas', icon: FileText },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/investimentos', label: 'Investimentos', icon: TrendingUp },
  { to: '/agenda/plantoes', label: 'Agenda', icon: CalendarDays },
  { to: '/categorias', label: 'Categorias', icon: FolderTree },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 }
];

const agendaLinks = [
  { to: '/agenda/consultas', label: 'Consultas', icon: BriefcaseMedical },
  { to: '/agenda/cirurgias', label: 'Cirurgias', icon: Scissors },
  { to: '/agenda/reunioes', label: 'Reuniões', icon: UsersRound },
  { to: '/agenda/plantoes', label: 'Plantões', icon: CalendarClock },
  { to: '/agenda/aulas', label: 'Aulas', icon: GraduationCap }
];

export function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const agendaOpen = location.pathname.startsWith('/agenda') || location.pathname === '/plantoes';
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="appShell">
      <header className="mobileTopbar">
        <div className="brand compact">
          <img className="brandLogo" src={aurynLogo} alt="" aria-hidden="true" />
          <div>
            <strong>AURYN</strong>
            <span>Patrimônio inteligente</span>
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
          <img className="brandLogo" src={aurynLogo} alt="" aria-hidden="true" />
          <div>
            <strong>AURYN</strong>
            <span>Patrimônio inteligente</span>
          </div>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => {
            if (label === 'Agenda') {
              return (
                <div key={to} className={`navGroup ${agendaOpen ? 'open' : ''}`}>
                  <NavLink to={to} onClick={closeMenu} className={() => agendaOpen ? 'active' : ''}>
                    <Icon size={18} /> {label}
                  </NavLink>
                  <div className="navSubmenu">
                    {agendaLinks.map(({ to: agendaTo, label: agendaLabel, icon: AgendaIcon }) => (
                      <NavLink key={agendaTo} to={agendaTo} onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
                        <AgendaIcon size={16} /> {agendaLabel}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <NavLink key={to} to={to} onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
                <Icon size={18} /> {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="navFooter">
          <NavLink to="/configuracoes" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>
            <Settings size={18} /> Configurações
          </NavLink>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
