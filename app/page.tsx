'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import CardLogo from '../components/CardLogo';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setMessage('');

    if (!email || !password) {
      setMessage('Inserisci email e password.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage('Errore login: ' + error.message);
    } else {
      setMessage('Login riuscito!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage('Logout effettuato.');
  };

  if (user) {
    window.location.href = '/dashboard';
    return null;
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <img src="/logo.png" alt="Logo" style={styles.logo} />
        </div>
        
        <h1 style={styles.title}> Sede Salerno </h1>
        <h1 style={styles.title}> Prenotazione postazioni </h1>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="Inserisci la tua email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password</label>
          <div style={styles.passwordWrapper}>
            <input
              style={styles.passwordInput}
              type={showPassword ? 'text' : 'password'}
              placeholder="Inserisci la tua password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              style={styles.eyeButton}
              onClick={() => setShowPassword(!showPassword)}
            ></button>
          </div>
        </div>

        <button style={styles.primaryButton} onClick={handleLogin}>
          Login
        </button>

        <Link href="/register" style={styles.secondaryButton}>
          Registrati
        </Link>

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'clamp(12px, 4vw, 24px)',
    backgroundColor: '#f4f6f8',
    boxSizing: 'border-box',
  },

  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: 'clamp(14px, 4vw, 16px)',
    padding: 'clamp(16px, 4.5vw, 24px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(12px, 3.5vw, 16px)',
    boxSizing: 'border-box',
  },

  title: {
    margin: 0,
    textAlign: 'center',
    fontSize: 'clamp(20px, 5.5vw, 24px)',
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },

  subtitle: {
    margin: 0,
    textAlign: 'center',
    fontSize: 'clamp(17px, 4.8vw, 20px)',
    lineHeight: 1.3,
  },

  text: {
    margin: 0,
    textAlign: 'center',
    wordBreak: 'break-word',
    fontSize: 'clamp(14px, 4vw, 16px)',
    lineHeight: 1.4,
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },

  label: {
    fontSize: 'clamp(13px, 3.6vw, 14px)',
    fontWeight: 600,
    lineHeight: 1.3,
  },

  input: {
    width: '100%',
    minHeight: '48px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cfd6dd',
    fontSize: '16px',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    appearance: 'none',
    WebkitAppearance: 'none',
  },

  passwordWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minHeight: '48px',
    border: '1px solid #cfd6dd',
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },

  passwordInput: {
    flex: 1,
    minWidth: 0,
    padding: '12px 14px',
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
  },

  eyeButton: {
    minWidth: '48px',
    height: '48px',
    border: 'none',
    background: 'transparent',
    padding: '0 12px',
    cursor: 'pointer',
    fontSize: '18px',
    boxSizing: 'border-box',
  },

  primaryButton: {
    width: '100%',
    minHeight: '48px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#0070f3',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  secondaryButton: {
    width: '100%',
    minHeight: '48px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #0070f3',
    color: '#0070f3',
    fontSize: '16px',
    fontWeight: 600,
    textAlign: 'center',
    textDecoration: 'none',
    boxSizing: 'border-box',
  },

  message: {
    margin: 0,
    textAlign: 'center',
    fontSize: 'clamp(13px, 3.8vw, 14px)',
    color: '#c62828',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
};
