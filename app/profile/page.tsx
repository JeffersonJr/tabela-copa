'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabaseClient';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import QRCode from 'react-qr-code';
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
  
  // MFA States
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

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
      await loadMfaFactors();
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

  const loadMfaFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors(data?.totp || []);
    } catch (err: any) {
      console.error('Error loading MFA:', err);
    }
  };

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

  const startMfaEnrollment = async () => {
    setLoading(true);
    try {
      // Buscar os fatores mais atualizados direto do servidor, caso a tela não tenha sido recarregada
      const { data: latestData } = await supabase.auth.mfa.listFactors();
      const allTotp = latestData?.totp || [];

      // Se já houver um fator pendente/não verificado (por ex: o usuário recarregou a página antes de confirmar), 
      // precisamos deletá-lo antes de gerar um novo, caso contrário a API do Supabase retorna erro.
      const unverifiedFactors = allTotp.filter((f: any) => f.status === 'unverified');
      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Evolves Authenticator'
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code); // URI
      setEnrolling(true);
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyMfaEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode.trim(),
      });
      if (verify.error) throw verify.error;

      showStatus('Autenticação de Dois Fatores (2FA) ativada com sucesso!', 'success');
      setEnrolling(false);
      setVerifyCode('');
      setQrCode('');
      await loadMfaFactors();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const unenrollMfa = async (fId: string) => {
    if (!confirm('Tem certeza que deseja desativar o 2FA? Sua conta ficará menos segura.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: fId });
      if (error) throw error;
      showStatus('Autenticação de Dois Fatores (2FA) desativada.', 'success');
      await loadMfaFactors();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><span className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)' }} /></div>;
  }

  const activeMfa = mfaFactors.find(f => f.status === 'verified');

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

        <div className="group-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Autenticação em Duas Etapas (2FA)</h2>
          
          {activeMfa ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ color: 'var(--green)', fontWeight: 600 }}>✅ 2FA está ativado na sua conta.</p>
              <button className="btn btn-ghost" onClick={() => unenrollMfa(activeMfa.id)} disabled={loading} style={{ alignSelf: 'flex-start', color: '#ff4444', borderColor: '#ff4444' }}>
                {loading ? <span className="spinner" /> : 'Desativar 2FA'}
              </button>
            </div>
          ) : enrolling ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                1. Escaneie o QR Code abaixo com seu aplicativo autenticador (ex: Google Authenticator, Authy).
              </p>
              {qrCode && (
                <div style={{ background: '#fff', padding: 16, borderRadius: 8, display: 'inline-block', alignSelf: 'center' }}>
                  <QRCode value={qrCode} size={150} />
                </div>
              )}
              <form onSubmit={verifyMfaEnrollment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: 4, color: 'var(--text-secondary)' }}>2. Digite o código de 6 dígitos gerado no app</label>
                  <input className="landing-input text-field" type="text" placeholder="000000" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} maxLength={6} required style={{ letterSpacing: '0.25em', textAlign: 'center', fontSize: '1.25rem' }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-accent" type="submit" disabled={loading || verifyCode.length < 6}>
                    {loading ? <span className="spinner" /> : 'Verificar e Ativar'}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => { setEnrolling(false); setFactorId(''); setQrCode(''); }} disabled={loading}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Adicione uma camada extra de segurança à sua conta exigindo um código de aplicativo autenticador para fazer login.</p>
              <button className="btn btn-accent" onClick={startMfaEnrollment} disabled={loading} style={{ alignSelf: 'flex-start' }}>
                {loading ? <span className="spinner" /> : 'Configurar 2FA'}
              </button>
            </div>
          )}
        </div>

      </div>

      <footer className="app-footer" style={{ marginTop: 40 }}>
        <span>Powered by <a href="https://evolves.site" target="_blank" rel="noopener noreferrer">Evolves Tecnologia</a></span>
      </footer>
    </div>
  );
}
