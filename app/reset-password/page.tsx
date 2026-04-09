'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase ricostruisce la sessione dal link email
    supabase.auth.getSession();
  }, []);

  const handleUpdatePassword = async () => {
    setMessage('');

    if (!password || !confirmPassword) {
      setMessage('Compila tutti i campi.');
      return;
    }

    if (password.length < 6) {
      setMessage('La password deve avere almeno 6 caratteri.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Le password non coincidono.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMessage('Errore: ' + error.message);
    } else {
      setMessage('Password aggiornata con successo!');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Nuova password</h1>

        <input
          style={styles.input}
          type="password"
          placeholder="Nuova password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Conferma nuova password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          style={{
            ...styles.primaryButton,
            opacity: loading ? 0.7 : 1,
          }}
          onClick={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? 'Aggiornamento...' : 'Aggiorna password'}
        </button>

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
    backgroundColor: '#f4f6f8',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#fff',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    margin: 0,
    textAlign: 'center',
  },
  input: {
    minHeight: '48px',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #cfd6dd',
    fontSize: '16px',
  },
  primaryButton: {
    minHeight: '48px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#0070f3',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  message: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#c62828',
  },
};
``
