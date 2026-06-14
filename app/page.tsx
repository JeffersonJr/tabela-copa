'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTournamentStore } from '@/lib/store';
import GroupCard from '@/components/GroupCard';
import BracketView from '@/components/BracketView';
import GROUPS from '@/data/teams';
import { TournamentState } from '@/lib/types';
import { useTheme } from '@/lib/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { createInitialTournamentState } from '@/lib/tournament';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

type Tab = 'grupos' | 'chaveamento';

// ─── Custom Short ID Generator ───────────────────────────────────────────────
function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
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

// ─── Notification Toast ──────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'info' | 'error' }) {
  return (
    <div className={`share-popup ${type === 'success' ? 'success' : ''}`}>
      {type === 'success' && '✓'} {type === 'error' && '✗'} <span>{message}</span>
    </div>
  );
}

// ─── Landing Page ────────────────────────────────────────────────────────────
function LandingPage({ onJoin }: { onJoin: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 2FA login state
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string, id: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    
    // Check if we are verifying MFA
    if (mfaChallenge) {
      const verify = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.id,
        code: mfaCode.trim()
      });
      if (verify.error) {
        setError(verify.error.message);
        setLoading(false);
      } else {
        // Success
        setMfaChallenge(null);
        setMfaCode('');
        showSuccessMessage();
      }
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    if (authError) {
      if (authError.message.toLowerCase().includes('rate limit')) {
        setError('Muitas tentativas. Aguarde um momento.');
      } else {
        setError(authError.message);
      }
      setLoading(false);
    } else {
      // Check if AAL2 (2FA) is required
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find((f: any) => f.status === 'verified');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (totpFactor && session?.user?.app_metadata?.aal === 'aal1') {
        // Need to challenge
        const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
        if (challenge.error) {
          setError('Erro ao iniciar 2FA. Tente novamente.');
          setLoading(false);
        } else {
          setMfaChallenge({ factorId: totpFactor.id, id: challenge.data.id });
          setLoading(false);
        }
      } else {
        showSuccessMessage();
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Por favor, preencha o campo de e-mail acima para recuperar sua senha.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/profile`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Se o e-mail existir, um link de recuperação foi enviado.');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });
    if (authError) {
      if (authError.message.toLowerCase().includes('rate limit')) {
        setError('Limite de cadastros excedido no servidor (muitos emails enviados). Tente novamente mais tarde.');
      } else {
        setError(authError.message);
      }
      setLoading(false);
    } else if (data.session) {
      showSuccessMessage();
    } else {
      setSuccess('Cadastro realizado! Por favor, confirme seu e-mail ou tente fazer login.');
      setLoading(false);
    }
  };

  const showSuccessMessage = () => {
    setSuccess('Login efetuado com sucesso!');
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinId.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('id')
        .eq('id', joinId.trim().toUpperCase())
        .maybeSingle();

      if (error || !data) {
        setError('Código de palpites não encontrado.');
      } else {
        onJoin(joinId.trim().toUpperCase());
      }
    } catch {
      setError('Erro ao carregar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <div className="landing-card animate-fadeIn">
        <div className="landing-logo-container">
          <img src="/logo.png" alt="FIFA World Cup 2026 Logo" className="landing-logo" />
        </div>
        <h1 className="landing-title">Copa 2026</h1>
        <p className="landing-sub">
          Acompanhe e simule todos os jogos da Copa do Mundo 2026.<br />
          Preencha placares, veja a classificação e compartilhe seus palpites!
        </p>

        {/* Auth Tabs */}
        <div className="landing-tabs">
          <button
            className={`landing-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); setMfaChallenge(null); }}
          >
            Entrar
          </button>
          <button
            className={`landing-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); setMfaChallenge(null); }}
          >
            Cadastrar
          </button>
        </div>

        <div className="landing-tab-content">

          {activeTab === 'login' && !mfaChallenge && (
            <form onSubmit={handleLogin} className="auth-form">
              <input
                className="landing-input text-field"
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  className="landing-input text-field"
                  style={{ width: '100%' }}
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <div style={{ width: '100%', textAlign: 'right', marginTop: -6 }}>
                <button type="button" className="btn btn-ghost btn-xs" onClick={handleResetPassword} disabled={loading} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Esqueceu a senha?
                </button>
              </div>

              <button
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 24px' }}
                type="submit"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : 'Entrar'}
              </button>
            </form>
          )}

          {activeTab === 'login' && mfaChallenge && (
            <form onSubmit={handleLogin} className="auth-form" style={{ gap: 16 }}>
              <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                Proteção por 2FA ativada.<br/>Digite o código gerado no seu aplicativo autenticador.
              </p>
              <input
                className="landing-input text-field"
                type="text"
                placeholder="000000"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                maxLength={6}
                required
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.25em' }}
              />
              <button
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 24px' }}
                type="submit"
                disabled={loading || mfaCode.length < 6}
              >
                {loading ? <span className="spinner" /> : 'Verificar 2FA e Entrar'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setMfaChallenge(null)}
                disabled={loading}
              >
                Voltar
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
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
                placeholder="Senha (mín. 6 caracteres)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 24px' }}
                type="submit"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : 'Criar Conta'}
              </button>
            </form>
          )}

          {error && <span className="auth-status-msg error">{error}</span>}
          {success && <span className="auth-status-msg success">{success}</span>}
        </div>

        <div className="landing-divider">ou ver palpites existentes</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="landing-input-group">
            <input
              className="landing-input"
              type="text"
              placeholder="Código do palpite (ex: AB3X9K7P)"
              value={joinId}
              onChange={e => { setJoinId(e.target.value.toUpperCase()); setError(''); setSuccess(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={12}
            />
            <button
              className="btn btn-ghost"
              onClick={handleJoin}
              disabled={!joinId.trim() || loading}
            >
              {loading ? <span className="spinner" /> : 'Ver ➔'}
            </button>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="app-footer landing-footer">
        <span>Powered by <a href="https://evolves.site" target="_blank" rel="noopener noreferrer">Evolves Tecnologia</a> · <a href="mailto:contato@evolves.site">contato@evolves.site</a></span>
      </footer>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  const {
    tournament,
    sessionId,
    isDirty,
    user,
    isReadOnly,
    ownerId,
    setUser,
    setReadOnly,
    setOwnerId,
    setSessionId,
    loadState,
  } = useTournamentStore();

  if (!isSupabaseConfigured) {
    return (
      <div className="landing animate-fadeIn">
        <div className="landing-card" style={{ maxWidth: 460 }}>
          <div className="landing-logo-container">
            <img src="/logo.png" alt="FIFA World Cup 2026 Logo" className="landing-logo" style={{ height: 100 }} />
          </div>
          <h1 className="landing-title" style={{ fontSize: '1.5rem', marginBottom: 12 }}>Configuração Necessária ⚙️</h1>
          <p className="landing-sub" style={{ marginBottom: 20 }}>
            As credenciais do Supabase não foram encontradas no ambiente de execução.
          </p>
          <div className="auth-form-container" style={{ textAlign: 'left', background: 'var(--bg-input)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <p className="auth-info-text" style={{ textAlign: 'left', color: 'var(--text-primary)', fontSize: '0.8125rem', marginBottom: 12, lineHeight: 1.5, fontWeight: 500 }}>
              Para rodar este projeto na <strong>Vercel</strong>, adicione as seguintes variáveis de ambiente nas configurações do seu projeto (**Settings &gt; Environment Variables**):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <strong>NEXT_PUBLIC_SUPABASE_URL</strong>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <strong>SUPABASE_SERVICE_ROLE_KEY</strong>
              </div>
            </div>
          </div>
          
          <footer className="app-footer landing-footer" style={{ marginTop: 28 }}>
            <span>Powered by <a href="https://evolves.site" target="_blank" rel="noopener noreferrer">Evolves Tecnologia</a> · <a href="mailto:contato@evolves.site">contato@evolves.site</a></span>
          </footer>
        </div>
      </div>
    );
  }

  const [tab, setTab] = useState<Tab>('grupos');
  const [showLanding, setShowLanding] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Fetch prediction by short ID
  const fetchPrediction = useCallback(async (id: string) => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching prediction:', err);
      return null;
    }
  }, []);

  // Helper to create a new prediction row in Supabase
  const handleCreateNewPrediction = useCallback(async (userId: string) => {
    try {
      setIsSaving(true);
      const shortId = generateShortId();
      const initialState = createInitialTournamentState();

      const { error } = await supabase
        .from('predictions')
        .insert({
          id: shortId,
          user_id: userId,
          data: initialState,
        });

      if (error) throw error;

      loadState(initialState);
      setSessionId(shortId);
      setOwnerId(userId);
      setReadOnly(false);
      setShowLanding(false);
      showToast('Novos palpites gerados!', 'success');
    } catch (err) {
      console.error('Error creating new prediction:', err);
      showToast('Erro ao criar novos palpites.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [loadState, setReadOnly, setSessionId, setOwnerId, showToast]);

  // Load current user's prediction from DB, or create one if not exists
  const loadUserPrediction = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        loadState(data.data);
        setSessionId(data.id);
        setOwnerId(data.user_id);
        setReadOnly(false);
        setShowLanding(false);
      } else {
        // First time login - auto-create a prediction
        await handleCreateNewPrediction(userId);
      }
    } catch (err) {
      console.error('Error loading user prediction:', (err as any)?.message || err);
      showToast('Erro ao carregar seus palpites.', 'error');
    }
  }, [handleCreateNewPrediction, loadState, setReadOnly, setSessionId, setOwnerId, showToast]);

  // Set up auth state change listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/profile';
        return;
      }
      
      const u = session?.user || null;
      setUser(u ? { id: u.id, email: u.email, is_anonymous: u.is_anonymous } : null);

      if (u) {
        // If logged in, check if we're not already viewing a specific share link
        const params = new URLSearchParams(window.location.search);
        const sharedId = params.get('s');
        if (!sharedId) {
          await loadUserPrediction(u.id);
        } else {
          // If there is a shared link, we already load it in handleJoin which is triggered on mount,
          // but we might need to adjust the readOnly state now that the user is logged in
          const data = await fetchPrediction(sharedId);
          if (data) {
            setReadOnly(u.id !== data.user_id);
          }
        }
      } else {
        // Clear session on logout
        setSessionId(null);
        setOwnerId(null);
        setReadOnly(false);
        setShowLanding(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPrediction, loadUserPrediction, setReadOnly, setSessionId, setOwnerId, setUser]);

  // Handle Join (viewing a shared prediction)
  const handleJoin = useCallback(async (id: string) => {
    const data = await fetchPrediction(id);
    if (data) {
      loadState(data.data);
      setSessionId(id);
      setOwnerId(data.user_id);

      // Check if logged in user is the owner
      const currentSession = (await supabase.auth.getSession()).data.session;
      const currentUserId = currentSession?.user?.id;

      if (currentUserId && currentUserId === data.user_id) {
        setReadOnly(false);
      } else {
        setReadOnly(true);
      }

      setShowLanding(false);
    } else {
      showToast('Código de palpite inválido ou inexistente.', 'error');
    }
  }, [fetchPrediction, loadState, setReadOnly, setSessionId, showToast]);

  // Copy share link
  const handleShare = useCallback(async () => {
    if (!sessionId) return;
    const url = `${window.location.origin}?s=${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiado! ✓', 'success');
    } catch {
      showToast(url, 'info');
    }
  }, [sessionId, showToast]);

  const handleShareWhatsApp = () => {
    if (!sessionId) return;
    const url = `${window.location.origin}?s=${sessionId}`;
    const text = `Confira os meus palpites para a Copa do Mundo 2026! 🏆⚽ ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareInstagram = () => {
    if (!sessionId) return;
    const url = `${window.location.origin}?s=${sessionId}`;
    navigator.clipboard.writeText(url);
    showToast('Link copiado! Cole na bio ou Stories do Instagram 📸', 'success');
  };

  // "Criar meus próprios palpites" from preview mode
  const handleCreateMyOwn = async () => {
    // 1. Clear query param from address bar without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete('s');
    window.history.pushState({}, '', url.pathname);

    // 2. Clear store status
    setSessionId(null);
    setOwnerId(null);
    setReadOnly(false);

    // 3. Check if user is logged in
    const sessionRes = await supabase.auth.getSession();
    const u = sessionRes.data.session?.user;

    if (u) {
      await loadUserPrediction(u.id);
    } else {
      setShowLanding(true);
    }
  };

  // Auto-save debounced when isDirty (only for owners)
  useEffect(() => {
    if (!isDirty || showLanding || isReadOnly || !sessionId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const { error } = await supabase
          .from('predictions')
          .update({
            data: tournament,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (error) throw error;
      } catch (err) {
        console.error('Failed to auto-save:', err);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isDirty, tournament, sessionId, showLanding, isReadOnly]);

  // On mount, check URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('s');
    if (sid) {
      handleJoin(sid);
    }
  }, [handleJoin]);

  if (showLanding) {
    return <LandingPage onJoin={handleJoin} />;
  }

  return (
    <div className="page-wrapper">
      {/* Read-Only Banner */}
      {isReadOnly && (
        <div className="read-only-banner animate-slideDown">
          <span>
            👁️ Você está em <strong>Modo Leitura</strong> (palpites de outro usuário).
          </span>
          <button className="btn btn-accent btn-sm" onClick={handleCreateMyOwn}>
            Criar meus palpites 🏆
          </button>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <img src="/logo.png" alt="FIFA World Cup 2026 Logo" className="header-logo" />
          <div>
            <h1 className="header-title">Copa 2026</h1>
            <span className="header-sub">FIFA World Cup · Canada · Mexico · USA</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* User badge */}
          {user && (
            <a className="user-badge" href="/profile" title="Meu Perfil">
              <span className="user-badge-icon">👤</span>
              <span className="user-badge-name">Perfil</span>
            </a>
          )}

          {/* Session indicator */}
          {sessionId && (
            <div className="session-bar" title={isReadOnly ? 'Palpite de outro usuário (Leitura)' : 'Seu palpite (Salvamento automático)'}>
              <span className={`session-dot ${isSaving ? 'saving' : ''} ${isReadOnly ? 'readonly' : ''}`} />
              <span>{isReadOnly ? 'Preview' : 'Palpite'}</span>
              <span className="session-id">{sessionId}</span>
            </div>
          )}

          {/* Share button */}
          {sessionId && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowShareMenu(!showShareMenu)}
                title="Compartilhar palpites"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Compartilhar
              </button>

              {showShareMenu && (
                <div className="share-menu-dropdown animate-fadeIn">
                  <div className="share-menu-header">
                    <span>Compartilhar</span>
                    <button className="share-menu-close" onClick={() => setShowShareMenu(false)}>✕</button>
                  </div>
                  <div className="share-menu-url-container">
                    <input
                      type="text"
                      className="share-menu-input"
                      value={`${window.location.origin}?s=${sessionId}`}
                      readOnly
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      className="btn btn-accent btn-xs"
                      onClick={() => {
                        handleShare();
                        setShowShareMenu(false);
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                  <div className="share-menu-options">
                    <button className="share-menu-opt-btn whatsapp" onClick={handleShareWhatsApp}>
                      <span>💬</span> WhatsApp
                    </button>
                    <button className="share-menu-opt-btn instagram" onClick={handleShareInstagram}>
                      <span>📸</span> Instagram
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logout button */}
          {user && (
            <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()} title="Desconectar do painel">
              Sair
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        <button
          className={`tab ${tab === 'grupos' ? 'active' : ''}`}
          role="tab"
          aria-selected={tab === 'grupos'}
          onClick={() => setTab('grupos')}
          id="tab-grupos"
        >
          Fase de Grupos
        </button>
        <button
          className={`tab ${tab === 'chaveamento' ? 'active' : ''}`}
          role="tab"
          aria-selected={tab === 'chaveamento'}
          onClick={() => setTab('chaveamento')}
          id="tab-chaveamento"
        >
          Mata Mata
        </button>
      </div>

      {/* Content */}
      {tab === 'grupos' && (
        <div className="groups-grid" role="tabpanel" aria-labelledby="tab-grupos">
          {GROUPS.map(group => (
            <GroupCard
              key={group.id}
              groupId={group.id}
              groupState={tournament.groups[group.id]}
            />
          ))}
        </div>
      )}

      {tab === 'chaveamento' && (
        <div role="tabpanel" aria-labelledby="tab-chaveamento">
          <BracketView />
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Footer */}
      <footer className="app-footer">
        <span>Powered by <a href="https://evolves.site" target="_blank" rel="noopener noreferrer">Evolves Tecnologia</a> · <a href="mailto:contato@evolves.site">contato@evolves.site</a></span>
      </footer>
    </div>
  );
}
