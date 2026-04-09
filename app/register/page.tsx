'use client';

import { useState } from 'react';

import Link from 'next/link';

import { supabase } from '../../lib/supabase';

import CardLogo from '../../components/CardLogo';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    setMessage('');

    if (!fullName || !email || !password || !confirmPassword) {
      setMessage('Compila tutti i campi.');

      return;
    }

    if (password !== confirmPassword) {
      setMessage('Le password non coincidono.');

      return;
    }

    const { error } = await supabase.auth.signUp({
      email,

      password,

      options: {
        data: {
          full_name: fullName,
        },

        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      const msg = error.message?.toLowerCase() || '';

      if (msg.includes('already')) {
        setMessage('Questa email è già registrata.');
      } else {
        setMessage('Errore registrazione: ' + error.message);
      }
    } else {
      setMessage('Registrazione completata! Controlla la tua email.');

      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <img src="/logo.png" alt="Logo" style={styles.smallLogo} />
        </div>
        <h1 style={styles.title}>Registrazione</h1>

        <div style={styles.formGroup}>
          <label style={styles.label}>Nome e Cognome</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Inserisci nome e cognome"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

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
              placeholder="Inserisci la password"
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

        <div style={styles.formGroup}>
          <label style={styles.label}>Conferma Password</label>
          <div style={styles.passwordWrapper}>
            <input
              style={styles.passwordInput}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Conferma la password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              style={styles.eyeButton}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            ></button>
          </div>
        </div>

        {message && <p style={styles.message}>{message}</p>}

        <button style={styles.primaryButton} onClick={handleRegister}>
          Registrati
        </button>

        <Link href="/" style={styles.secondaryButton}>
          Torna al login
        </Link>
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',

    display: 'flex',

    justifyContent: 'center',

    alignItems: 'center',

    padding: '20px',

    backgroundColor: '#f4f6f8',
  },

  card: {
    width: '100%',

    maxWidth: '420px',

    backgroundColor: '#ffffff',

    borderRadius: '16px',

    padding: '24px',

    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',

    display: 'flex',

    flexDirection: 'column',

    gap: '16px',
  },

  title: {
    margin: 0,

    textAlign: 'center',

    fontSize: '24px',

    lineHeight: 1.3,
  },

  formGroup: {
    display: 'flex',

    flexDirection: 'column',

    gap: '8px',
  },

  label: {
    fontSize: '14px',

    fontWeight: 600,
  },

  input: {
    width: '100%',

    padding: '12px',

    borderRadius: '10px',

    border: '1px solid #cfd6dd',

    fontSize: '16px',

    boxSizing: 'border-box',
  },

  passwordWrapper: {
    display: 'flex',

    alignItems: 'center',

    border: '1px solid #cfd6dd',

    borderRadius: '10px',

    overflow: 'hidden',

    backgroundColor: '#fff',
  },

  passwordInput: {
    flex: 1,

    padding: '12px',

    border: 'none',

    outline: 'none',

    fontSize: '16px',
  },

  eyeButton: {
    border: 'none',

    background: 'transparent',

    padding: '0 12px',

    cursor: 'pointer',

    fontSize: '18px',
  },

  primaryButton: {
    width: '100%',

    padding: '12px',

    borderRadius: '10px',

    border: 'none',

    backgroundColor: '#0070f3',

    color: '#fff',

    fontSize: '16px',

    cursor: 'pointer',
  },

  secondaryButton: {
    width: '100%',

    padding: '12px',

    borderRadius: '10px',

    border: '1px solid #0070f3',

    color: '#0070f3',

    fontSize: '16px',

    textAlign: 'center',

    textDecoration: 'none',

    boxSizing: 'border-box',
  },

  smallLogo: {
    width: '200px',
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
  },
  
  logoWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  message: {
    margin: 0,

    textAlign: 'center',

    fontSize: '14px',

    color: '#c62828',
  },
};
