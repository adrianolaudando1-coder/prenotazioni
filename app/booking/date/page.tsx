'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import CardLogo from '../../../components/CardLogo';

export default function BookingDatePage() {
  const router = useRouter();

  const [userId, setUserId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasExistingBooking, setHasExistingBooking] = useState(false);
  const [showGuestOptions, setShowGuestOptions] = useState(false);
  const [guestCount, setGuestCount] = useState('1');

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push('/');
        return;
      }

      setUserId(data.user.id);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const checkExistingBooking = async (date: string, currentUserId: string) => {
    if (!date || !currentUserId) return;

    setMessage('');
    setHasExistingBooking(false);
    setShowGuestOptions(false);

    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('booking_date', date)
      .eq('is_guest', false)
      .limit(1);

    if (error) {
      setMessage('Errore nel controllo delle prenotazioni.');
      return;
    }

    if (data && data.length > 0) {
      setHasExistingBooking(true);
      setMessage('Hai già una prenotazione');
    }
  };

  const handleDateChange = async (value: string) => {
    setSelectedDate(value);
    setGuestCount('1');
    await checkExistingBooking(value, userId);
  };

  const handleContinue = () => {
    setMessage('');

    if (!selectedDate) {
      setMessage('Seleziona un giorno per continuare.');
      return;
    }

    if (hasExistingBooking) {
      setMessage('Hai già una prenotazione');
      return;
    }

    router.push(`/booking/desk?date=${selectedDate}`);
  };

  const handleGuestContinue = () => {
    setMessage('');

    if (!selectedDate) {
      setMessage('Seleziona un giorno per continuare.');
      return;
    }

    router.push(`/booking/desk?date=${selectedDate}&guestCount=${guestCount}`);
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <p style={styles.text}>Caricamento...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <img src="/logo.png" alt="Logo" style={styles.smallLogo} />
        </div>

        
        <h1 style={styles.title}>Seleziona il giorno</h1>

        <div style={styles.formGroup}>
          <label style={styles.label}>Giorno</label>
          <input
            style={styles.input}
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>

        {message && <p style={styles.message}>{message}</p>}

        {!hasExistingBooking && (
          <button style={styles.primaryButton} onClick={handleContinue}>
            Continua
          </button>
        )}

        {hasExistingBooking && (
          <>
            {!showGuestOptions && (
              <button
                style={styles.guestButton}
                onClick={() => setShowGuestOptions(true)}
              >
                Aggiungi ospite
              </button>
            )}

            {showGuestOptions && (
              <div style={styles.guestBox}>
                <label style={styles.label}>Numero ospiti</label>
                <select
                  style={styles.input}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>

                <button
                  style={styles.primaryButton}
                  onClick={handleGuestContinue}
                >
                  Continua con ospiti
                </button>
              </div>
            )}
          </>
        )}

        <button
          style={styles.secondaryButton}
          onClick={() => router.push('/dashboard')}
        >
          Torna alla dashboard
        </button>
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

  guestButton: {
    width: '100%',
    minHeight: '48px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#f4b400',
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
    backgroundColor: '#fff',
    color: '#0070f3',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  guestBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: 'clamp(12px, 3.5vw, 14px)',
    borderRadius: '12px',
    backgroundColor: '#fff8e1',
    border: '1px solid #f4d06f',
    width: '100%',
    boxSizing: 'border-box',
  },

  text: {
    margin: 0,
    textAlign: 'center',
    fontSize: 'clamp(14px, 4vw, 16px)',
    lineHeight: 1.4,
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
    fontSize: 'clamp(13px, 3.8vw, 14px)',
    color: '#c62828',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
};
