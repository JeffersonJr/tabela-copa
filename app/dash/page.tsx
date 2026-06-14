'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  predictionsCount: number;
  predictionCodes: string[];
  last_updated: string | null;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      <span>{isDark ? '☀️' : '🌙'}</span>
      <div className={`theme-toggle-track ${isDark ? 'dark' : ''}`}>
        <div className="theme-toggle-thumb" />
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');

  const handleLogin = async (e: React.FormEvent | null, savedEmail?: string, savedPass?: string) => {
    if (e) e.preventDefault();
    const loginEmail = savedEmail || email;
    const loginPass = savedPass || password;

    if (!loginEmail.trim() || !loginPass.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPass.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro na autenticação');
      }

      setUsers(data.users || []);
      setIsAuth(true);
      sessionStorage.setItem('admin_email', loginEmail);
      sessionStorage.setItem('admin_pass', loginPass);
    } catch (err: any) {
      setError(err.message);
      sessionStorage.removeItem('admin_email');
      sessionStorage.removeItem('admin_pass');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('admin_email');
    const savedPass = sessionStorage.getItem('admin_pass');
    if (savedEmail && savedPass) {
      handleLogin(null, savedEmail, savedPass);
    }
  }, []); // eslint-disable-line

  const handleLogout = () => {
    setIsAuth(false);
    setUsers([]);
    setEmail('');
    setPassword('');
    sessionStorage.removeItem('admin_email');
    sessionStorage.removeItem('admin_pass');
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = users.length;
  const usersWithPredictions = users.filter(u => u.predictionsCount > 0).length;
  const activePercent = totalUsers > 0 ? Math.round((usersWithPredictions / totalUsers) * 100) : 0;

  if (!isAuth) {
    return (
      <div className="landing">
        <div className="landing-card animate-fadeIn" style={{ maxWidth: 400 }}>
          <div className="landing-logo-container">
            <img src="/logo.png" alt="FIFA World Cup 2026 Logo" className="landing-logo" style={{ height: 90 }} />
          </div>
          <h1 className="landing-title" style={{ fontSize: '1.5rem', marginBottom: 6 }}>Evolves Admin</h1>
          <p className="landing-sub" style={{ marginBottom: 20 }}>Acesso restrito ao painel administrativo</p>

          <form onSubmit={e => handleLogin(e)} className="auth-form" style={{ gap: 12 }}>
            <input
              className="landing-input text-field"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              className="landing-input text-field"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              className="btn btn-accent w-full"
              style={{ justifyContent: 'center', padding: '12px 24px' }}
              type="submit"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Acessar Painel 🔒'}
            </button>
          </form>

          {error && <span className="auth-status-msg error" style={{ marginTop: 12 }}>{error}</span>}
          
          <footer className="app-footer landing-footer" style={{ marginTop: 24 }}>
            <span>Powered by <a href="https://evolves.site" target="_blank" rel="noopener noreferrer">Evolves Tecnologia</a></span>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper animate-fadeIn">
      {/* Header */}
      <header className="header" style={{ marginBottom: 32 }}>
        <div className="header-brand">
          <img src="/logo.png" alt="FIFA World Cup 2026 Logo" className="header-logo" />
          <div>
            <h1 className="header-title">Evolves Copa Dashboard</h1>
            <span className="header-sub">Painel Administrativo de Monitoramento</span>
          </div>
        </div>

        <div className="header-actions">
          <ThemeToggle />
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sair do Painel
          </button>
        </div>
      </header>

      {/* Metrics Cards */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="group-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Usuários</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalUsers}</span>
        </div>
        <div className="group-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Palpites Criados</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{usersWithPredictions}</span>
        </div>
        <div className="group-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conversão</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green)' }}>{activePercent}%</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="group-card" style={{ padding: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Usuários Inscritos</h2>
          <input
            className="landing-input text-field"
            type="text"
            placeholder="Pesquisar por e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 320, textTransform: 'none', letterSpacing: 0 }}
          />
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Usuário / E-mail</th>
                <th style={{ padding: '12px 16px' }}>Criado em</th>
                <th style={{ padding: '12px 16px' }}>Último Acesso</th>
                <th style={{ padding: '12px 16px' }}>Palpite</th>
                <th style={{ padding: '12px 16px' }}>Última Atualização</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.email}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Sem acessos'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {u.predictionsCount > 0 ? (
                        u.predictionCodes.map(code => (
                          <span key={code} className="session-id" style={{ display: 'inline-block', margin: '2px', padding: '2px 6px', fontSize: '0.75rem' }}>
                            {code}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Nenhum</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {u.last_updated
                        ? new Date(u.last_updated).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {u.predictionsCount > 0 ? (
                        <a
                          className="btn btn-ghost btn-sm"
                          style={{ display: 'inline-flex', gap: 4, padding: '4px 8px', fontSize: '0.75rem' }}
                          href={`/?s=${u.predictionCodes[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visualizar 👁️
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nenhum palpite</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="app-footer">
        <span>Powered by <a href="https://evolves.site" target="_blank" rel="noopener noreferrer">Evolves Tecnologia</a> · <a href="mailto:contato@evolves.site">contato@evolves.site</a></span>
      </footer>
    </div>
  );
}
