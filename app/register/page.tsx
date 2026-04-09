'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    setMessage('');
    setMessageType('error');

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFullName || !cleanEmail || !password || !confirmPassword) {
      setMessage('Compila tutti i campi.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Le password non coincidono.');
      return;
    }

    if (password.length < 6) {
      setMessage('La password deve contenere almeno 6 caratteri.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanFullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        const msg = error.message?.toLowerCase() || '';

        if (
          msg.includes('already registered') ||
          msg.includes('already been registered') ||
          msg.includes('user already registered') ||
          msg.includes('already exists') ||
          msg.includes('duplicate')
        ) {
          setMessage('Questa email è già registrata.');
        } else {
          setMessage(`Errore registrazione: ${error.message}`);
        }
        return;
      }

      /**
       * Supabase, in alcune configurazioni, può non restituire errore
       * anche se l'email esiste già, per evitare email enumeration.
       * In questi casi si può ricevere una risposta "positiva" ma senza
       * una vera nuova sessione/creazione distinguibile lato client.
       *
       * Qui mostriamo un messaggio neutro ma utile.
       */
      if (!data.user) {
        setMessageType('success');
        setMessage(
          'Se l’email non è già registrata, riceverai un messaggio di conferma nella tua casella.'
        );
        return;
      }

      setMessageType('success');
      setMessage('Se l’email non è già registrata, riceverai un messaggio di conferma nella tua casella');

      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Errore imprevisto durante la registrazione.';
      setMessage(`Errore registrazione: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

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
              aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
            >
              
            </button>
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
              aria-label={showConfirmPassword ? 'Nascondi conferma password' : 'Mostra conferma password'}
            >
              
            </button>
          </div>
        </div>

        {message && (
          <p
            style={{
              ...styles.message,
              color: messageType === 'success' ? '#2e7d32' : '#c62828',
            }}
          >
            {message}
          </p>
        )}

        <button
          style={{
            ...styles.primaryButton,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? 'Registrazione...' : 'Registrati'}
        </button>

        <Link href="/" style={styles.secondaryButton}>
          Torna al login
        </Link>
      </div>
    </main>
  );
}

const styles: { [key: string]: CSSProperties } = {
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
  },
};
