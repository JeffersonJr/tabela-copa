'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabaseClient';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { useRouter } from 'next/navigation';

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

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  


  // Status messages
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    const initProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setUser(session.user);
      setName(session.user.user_metadata?.full_name || '');
      setName(session.user.user_metadata?.full_name || '');
      setLoading(false);
    };

    // Listen for password recovery
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'PASSWORD_RECOVERY') {
        showStatus('Por favor, defina sua nova senha abaixo.', 'success');
      }
    });

    initProfile();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);



  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() }
      });
      if (error) throw error;
      showStatus('Nome atualizado com sucesso!', 'success');
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showStatus('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      showStatus('Senha alterada com sucesso!', 'success');
      setNewPassword('');
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };



  if (loading && !user) {
    return <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><span className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} /></div>;
  }



  return (
    <div className="page-wrapper animate-fadeIn">
      <header className="header" style={{ marginBottom: 32 }}>
        <div className="header-brand" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img src="/logo-escura.svg" alt="FIFA World Cup 2026 Logo" className="header-logo logo-light" />
          <img src="/logo-clara.svg" alt="FIFA World Cup 2026 Logo" className="header-logo logo-dark" />
          <div>
            <h1 className="header-title">Copa 2026</h1>
            <span className="header-sub">Voltar para Palpites</span>
          </div>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/')}>
            Voltar
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {statusMsg.text && (
          <div className={`share-popup ${statusMsg.type === 'success' ? 'success' : ''}`} style={{ position: 'static', transform: 'none', marginBottom: 16 }}>
            {statusMsg.type === 'success' ? '✓' : '✗'} <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="group-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Meu Perfil</h2>
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: 4, color: 'var(--text-secondary)' }}>E-mail</label>
              <input className="landing-input text-field" type="email" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Nome de Exibição</label>
              <input className="landing-input text-field" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <button className="btn btn-accent" type="submit" disabled={loading} style={{ alignSelf: 'flex-start' }}>
              {loading ? <span className="spinner" /> : 'Salvar Nome'}
            </button>
          </form>
        </div>

        <div className="group-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Segurança</h2>
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Nova Senha</label>
              <input className="landing-input text-field" type="password" placeholder="Mínimo de 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} />
            </div>
            <button className="btn btn-accent" type="submit" disabled={loading} style={{ alignSelf: 'flex-start' }}>
              {loading ? <span className="spinner" /> : 'Atualizar Senha'}
            </button>
          </form>
        </div>



      </div>

      <footer className="app-footer" style={{ marginTop: 40 }}>
        <span>Powered by <a href="https://evolves.site" target="_blank" rel="noopener noreferrer">Evolves Tecnologia</a></span>
      </footer>
    </div>
  );
}
