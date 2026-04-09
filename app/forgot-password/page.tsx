'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setMessage('');

    if (!email) {
      setMessage('Inserisci un indirizzo email valido.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setMessage('Errore: ' + error.message);
    } else {
      setMessage(
        'Email inviata! Controlla la posta per reimpostare la password.'
      );
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Recupero password</h1>

        <input
          style={styles.input}
          type="email"
          placeholder="Inserisci la tua email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button style={styles.primaryButton} onClick={handleReset} disabled={loading}>
          {loading ? 'Invio...' : 'Invia link di reset'}
        </button>

        <Link href="/" style={styles.link}>
          Torna al login
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
  title: {
    textAlign: 'center',
    margin: 0,
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
  link: {
    textAlign: 'center',
    color: '#0070f3',
    textDecoration: 'underline',
    fontSize: '14px',
  },
  message: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#333',
  },
};
