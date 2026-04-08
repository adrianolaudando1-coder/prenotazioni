'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

type Booking = {
  id: number;
  booking_date: string;
  desk_id: number;
  is_guest?: boolean;
  guest_label?: string | null;
  occupant_name?: string | null;
  desks: {
    desk_number: number;
    label: string | null;
  } | null;
};

type GroupedGuestBookings = {
  date: string;
  items: Booking[];
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      if (!currentUser) {
        window.location.href = '/';
        return;
      }

      setUser(currentUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .single();

      if (profileData?.full_name) {
        setFullName(profileData.full_name);
      }

      await loadBookings(currentUser.id);
      setLoading(false);
    };

    init();
  }, []);

  const loadBookings = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        desk_id,
        is_guest,
        guest_label,
        occupant_name,
        desks (
          desk_number,
          label
        )
      `)
      .eq('user_id', userId)
      .gte('booking_date', today)
      .order('booking_date', { ascending: true });

    if (error) {
      setMessage('Errore nel caricamento prenotazioni.');
    } else {
      setBookings((data as Booking[]) || []);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      'Vuoi davvero cancellare questa prenotazione?'
    );

    if (!confirmed) return;

    const { error } = await supabase.from('bookings').delete().eq('id', id);

    if (error) {
      setMessage('Errore durante la cancellazione.');
      return;
    }

    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const handleLogout = async () => {
    setMessage('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage('Errore durante il logout.');
      return;
    }

    window.location.href = '/';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT');
  };

  const mainBookings = useMemo(
    () => bookings.filter((booking) => !booking.is_guest),
    [bookings]
  );

  const guestBookings = useMemo(
    () => bookings.filter((booking) => booking.is_guest),
    [bookings]
  );

  const groupedGuestBookings = useMemo(() => {
    const map = new Map<string, Booking[]>();

    guestBookings.forEach((booking) => {
      const current = map.get(booking.booking_date) || [];
      current.push(booking);
      map.set(booking.booking_date, current);
    });

    return Array.from(map.entries())
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => {
          const aLabel = a.guest_label || '';
          const bLabel = b.guest_label || '';
          return aLabel.localeCompare(bLabel, undefined, { numeric: true });
        }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [guestBookings]);

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
    <>
      <main style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>NTT Salerno prenotazione postazioni</h1>
          <p style={styles.welcomeText}>
            Benvenuto <strong>{fullName || user?.email}</strong>
          </p>

          <div style={styles.topButtonsRow}>
            <button style={styles.logoutButton} onClick={handleLogout}>
              Logout
            </button>

            <button style={styles.mapButton} onClick={() => setShowMap(true)}>
              Mappa
            </button>
          </div>

          <div style={styles.sectionHeader}>
            <h2 style={styles.subtitle}>Le tue prenotazioni</h2>
          </div>

          {mainBookings.length === 0 && guestBookings.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.text}>Non hai prenotazioni odierne o future.</p>
            </div>
          )}

          {mainBookings.length > 0 && (
            <div style={styles.sectionContainer}>
              <h3 style={styles.sectionTitle}>Prenotazioni principali</h3>

              {mainBookings.map((booking) => {
                const desk = booking.desks;
                const isMeetingRoom = desk ? desk.desk_number >= 20 : false;

                return (
                  <div
                    key={booking.id}
                    style={{
                      ...styles.bookingCard,
                      ...(isMeetingRoom
                        ? styles.meetingBookingCard
                        : styles.normalBookingCard),
                    }}
                  >
                    <div style={styles.bookingTop}>
                      <span style={styles.bookingBadge}>
                        {isMeetingRoom ? 'Sala riunioni' : 'Postazione'}
                      </span>
                      <span style={styles.bookingDate}>
                        {formatDate(booking.booking_date)}
                      </span>
                    </div>

                    <div style={styles.bookingMain}>
                      <strong>
                        {isMeetingRoom
                          ? `Sala riunioni ${desk?.desk_number}`
                          : `Postazione ${desk?.desk_number}`}
                      </strong>
                    </div>

                    <div style={styles.actions}>
                      <Link
                        href={`/booking/desk?date=${booking.booking_date}&bookingId=${booking.id}`}
                        style={styles.modifyButton}
                      >
                        Modifica
                      </Link>

                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDelete(booking.id)}
                      >
                        Cancella
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {groupedGuestBookings.length > 0 && (
            <div style={styles.sectionContainer}>
              <h3 style={styles.sectionTitle}>Prenotazioni ospiti</h3>

              {groupedGuestBookings.map((group: GroupedGuestBookings) => (
                <div key={group.date} style={styles.guestGroupCard}>
                  <div style={styles.guestGroupHeader}>
                    <span style={styles.guestGroupBadge}>Ospiti</span>
                    <span style={styles.bookingDate}>
                      {formatDate(group.date)}
                    </span>
                  </div>

                  <div style={styles.guestList}>
                    {group.items.map((booking) => {
                      const desk = booking.desks;
                      const isMeetingRoom = desk ? desk.desk_number >= 20 : false;

                      return (
                        <div
                          key={booking.id}
                          style={{
                            ...styles.guestItem,
                            ...(isMeetingRoom
                              ? styles.meetingGuestItem
                              : styles.normalGuestItem),
                          }}
                        >
                          <div style={styles.guestItemTop}>
                            <strong>{booking.guest_label || 'Ospite'}</strong>
                            <span style={styles.guestOccupantName}>
                              {booking.occupant_name || ''}
                            </span>
                          </div>

                          <div style={styles.guestItemMiddle}>
                            {isMeetingRoom
                              ? `Sala riunioni ${desk?.desk_number}`
                              : `Postazione ${desk?.desk_number}`}
                          </div>

                          <div style={styles.guestItemActions}>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDelete(booking.id)}
                            >
                              Cancella
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link href="/booking/date" style={styles.primaryButton}>
            Prenota un posto
          </Link>

          {message && <p style={styles.message}>{message}</p>}
        </div>
      </main>

      {showMap && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Mappa postazioni</h3>
              <button
                style={styles.closeButton}
                onClick={() => setShowMap(false)}
                aria-label="Chiudi mappa"
              >
                ×
              </button>
            </div>

            <div style={styles.modalImageWrapper}>
              <Image
                src="/mappa-postazioni.png"
                alt="Mappa delle postazioni"
                width={1200}
                height={800}
                style={styles.modalImage}
                priority
              />
            </div>
          </div>
        </div>
      )}
    </>
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
    maxWidth: '620px',
    backgroundColor: '#ffffff',
    borderRadius: 'clamp(14px, 4vw, 16px)',
    padding: 'clamp(16px, 4.5vw, 24px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(14px, 4vw, 18px)',
    boxSizing: 'border-box',
  },

  title: {
    textAlign: 'center',
    fontSize: 'clamp(20px, 5.5vw, 24px)',
    margin: 0,
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },

  welcomeText: {
    margin: 0,
    textAlign: 'center',
    color: '#555',
    fontSize: 'clamp(14px, 4vw, 16px)',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },

  topButtonsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    width: '100%',
  },

  logoutButton: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #d32f2f',
    backgroundColor: '#fff',
    color: '#d32f2f',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  mapButton: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #0070f3',
    backgroundColor: '#fff',
    color: '#0070f3',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'center',
  },

  subtitle: {
    fontSize: 'clamp(17px, 4.8vw, 20px)',
    margin: 0,
    lineHeight: 1.3,
    textAlign: 'center',
  },

  sectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  sectionTitle: {
    margin: 0,
    fontSize: 'clamp(15px, 4vw, 16px)',
    lineHeight: 1.3,
  },

  text: {
    textAlign: 'center',
    margin: 0,
    fontSize: 'clamp(14px, 4vw, 16px)',
    lineHeight: 1.4,
  },

  emptyState: {
    border: '1px dashed #cfd6dd',
    borderRadius: '12px',
    padding: 'clamp(14px, 4vw, 18px)',
    backgroundColor: '#fafbfd',
    boxSizing: 'border-box',
  },

  bookingCard: {
    borderRadius: '14px',
    padding: 'clamp(12px, 3.8vw, 16px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxSizing: 'border-box',
  },

  normalBookingCard: {
    backgroundColor: '#eef4ff',
    border: '1px solid #cfe0ff',
  },

  meetingBookingCard: {
    backgroundColor: '#fff4e5',
    border: '1px solid #f2c078',
  },

  bookingTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },

  bookingBadge: {
    fontSize: '12px',
    fontWeight: 700,
    backgroundColor: '#ffffff',
    padding: '6px 10px',
    borderRadius: '999px',
    lineHeight: 1.2,
  },

  bookingDate: {
    fontSize: 'clamp(13px, 3.8vw, 14px)',
    color: '#555',
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },

  bookingMain: {
    fontSize: 'clamp(16px, 4.5vw, 18px)',
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },

  actions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    width: '100%',
  },

  modifyButton: {
    width: '100%',
    minWidth: 0,
    backgroundColor: '#faad14',
    color: '#fff',
    padding: '12px 12px',
    borderRadius: '10px',
    textDecoration: 'none',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    boxSizing: 'border-box',
  },

  deleteButton: {
    width: '100%',
    minWidth: 0,
    backgroundColor: '#ff4d4f',
    color: '#fff',
    border: 'none',
    padding: '12px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    boxSizing: 'border-box',
  },

  guestGroupCard: {
    borderRadius: '14px',
    padding: 'clamp(12px, 3.8vw, 16px)',
    backgroundColor: '#f8fafc',
    border: '1px solid #d9e2ec',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxSizing: 'border-box',
  },

  guestGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },

  guestGroupBadge: {
    fontSize: '12px',
    fontWeight: 700,
    backgroundColor: '#ffffff',
    padding: '6px 10px',
    borderRadius: '999px',
    lineHeight: 1.2,
  },

  guestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  guestItem: {
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxSizing: 'border-box',
  },

  normalGuestItem: {
    backgroundColor: '#eef4ff',
    border: '1px solid #cfe0ff',
  },

  meetingGuestItem: {
    backgroundColor: '#fff4e5',
    border: '1px solid #f2c078',
  },

  guestItemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  guestOccupantName: {
    fontSize: 'clamp(12px, 3.6vw, 13px)',
    color: '#555',
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },

  guestItemMiddle: {
    fontSize: 'clamp(14px, 4vw, 15px)',
    fontWeight: 600,
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },

  guestItemActions: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },

  primaryButton: {
    marginTop: '8px',
    width: '100%',
    minHeight: '48px',
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: '#0070f3',
    color: '#fff',
    textAlign: 'center',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 600,
    boxSizing: 'border-box',
  },

  message: {
    color: '#c62828',
    textAlign: 'center',
    margin: 0,
    fontSize: 'clamp(13px, 3.8vw, 14px)',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'clamp(12px, 4vw, 20px)',
    zIndex: 1000,
    boxSizing: 'border-box',
  },

  modalContent: {
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90dvh',
    backgroundColor: '#fff',
    borderRadius: 'clamp(14px, 4vw, 16px)',
    padding: 'clamp(14px, 4vw, 20px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },

  modalTitle: {
    margin: 0,
    fontSize: 'clamp(18px, 5vw, 20px)',
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },

  closeButton: {
    width: '40px',
    height: '40px',
    minWidth: '40px',
    borderRadius: '50%',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    color: '#333',
    fontSize: '24px',
    lineHeight: 1,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  modalImageWrapper: {
    width: '100%',
    overflow: 'auto',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    WebkitOverflowScrolling: 'touch',
  },

  modalImage: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
};
