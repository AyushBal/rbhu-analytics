import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShipmentEvents } from '../hooks/useShipmentEvents';
import { Button } from './ui';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/customers', label: 'Customers' },
  { to: '/shipments', label: 'Shipments' },
  { to: '/analytics', label: 'Sales analytics' },
  { to: '/assistant', label: 'Assistant' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  useShipmentEvents(true);

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation" aria-expanded={open}>☰</button>
        <span className="brand">RBHU Dispatch</span>
      </header>
      <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Main">
        <div className="brand brand-side">RBHU Dispatch</div>
        <ul>
          {links.map((l) => (
            <li key={l.to}><NavLink to={l.to} end={l.end} onClick={() => setOpen(false)}>{l.label}</NavLink></li>
          ))}
        </ul>
        <div className="side-foot">
          <div className="who"><strong>{user?.name}</strong><span>{user?.email}</span></div>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
        </div>
      </nav>
      <main className="content"><Outlet /></main>
    </div>
  );
}
