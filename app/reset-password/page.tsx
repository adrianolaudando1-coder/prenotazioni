'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Supabase conferma automaticamente la sessione dal link
    supabase.auth.getSession();
  }, []);

  const handleUpdatePassword = async () => {
    if (!password || password.length < 6) {
      setMessage('La password deve avere almeno 6 caratteri.');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

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
        <h1>Nuova password</h1>

        <input
          style={styles.input}
          type="password"
          placeholder="Nuova password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.primaryButton} onClick={handleUpdatePassword}>
          Aggiorna password
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
  },
};