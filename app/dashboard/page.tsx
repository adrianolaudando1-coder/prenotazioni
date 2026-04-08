'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type DeskInfo = {
  id: number;
  desk_number: number;
  label: string | null;
};

type RawBooking = {
  id: number;
  booking_date: string;
  desk_id: number;
  is_guest?: boolean;
  guest_label?: string | null;
  occupant_name?: string | null;
};

type Booking = RawBooking & {
  desk: DeskInfo | null;
};

type GroupedGuestBookings = {
  date: string;
  items: Booking[];
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [expandedGuestGroups, setExpandedGuestGroups] = useState<
    Record<string, boolean>
  >({});
  const [expandedMainCardId, setExpandedMainCardId] = useState<number | null>(
    null
  );
  const [expandedGuestCardId, setExpandedGuestCardId] = useState<number | null>(
    null
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setMessage('');

      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          setMessage('Errore nel recupero utente.');
          return;
        }

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
      } catch {
        setMessage('Si è verificato un errore inatteso.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadBookings = async (userId: string) => {
    setMessage('');

    const today = new Date().toISOString().split('T')[0];

    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        desk_id,
        is_guest,
        guest_label,
        occupant_name
      `)
      .eq('user_id', userId)
      .gte('booking_date', today)
      .order('booking_date', { ascending: true });

    if (bookingsError) {
      setMessage('Errore nel caricamento prenotazioni.');
      return;
    }

    const { data: desksData, error: desksError } = await supabase
      .from('desks')
      .select('id, desk_number, label');

    if (desksError) {
      setMessage('Errore nel caricamento delle postazioni.');
      return;
    }

    const deskMap = new Map<number, DeskInfo>();
    ((desksData as DeskInfo[]) || []).forEach((desk) => {
      deskMap.set(Number(desk.id), desk);
    });

    const mergedBookings: Booking[] = ((bookingsData as RawBooking[]) || []).map(
      (booking) => ({
        ...booking,
        desk: deskMap.get(Number(booking.desk_id)) || null,
      })
    );

    setBookings(mergedBookings);
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      'Vuoi davvero cancellare questa prenotazione?'
    );

    if (!confirmed) return;

    setMessage('');

    const { error } = await supabase.from('bookings').delete().eq('id', id);

    if (error) {
      setMessage('Errore durante la cancellazione.');
      return;
    }

    setBookings((prev) => prev.filter((b) => b.id !== id));

    if (expandedMainCardId === id) {
      setExpandedMainCardId(null);
    }

    if (expandedGuestCardId === id) {
      setExpandedGuestCardId(null);
    }
  };

  const handleDeleteGuestGroup = async (group: GroupedGuestBookings) => {
    const confirmed = window.confirm(
      'Vuoi davvero cancellare tutte le prenotazioni di questo gruppo ospiti?'
    );

    if (!confirmed) return;

    setMessage('');

    const ids = group.items.map((item) => item.id);

    const { error } = await supabase.from('bookings').delete().in('id', ids);

    if (error) {
      setMessage('Errore durante la cancellazione del gruppo ospiti.');
      return;
    }

    setBookings((prev) => prev.filter((b) => !ids.includes(b.id)));

    setExpandedGuestGroups((prev) => ({
      ...prev,
      [group.date]: false,
    }));

    if (expandedGuestCardId && ids.includes(expandedGuestCardId)) {
      setExpandedGuestCardId(null);
    }
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
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return date;
    return `${day}/${month}/${year}`;
  };

  const isMeetingRoom = (desk: DeskInfo | null) => {
    return desk ? desk.desk_number >= 20 : false;
  };

  const getDeskLabel = (booking: Booking) => {
    const desk = booking.desk;

    if (!desk) return `Desk ID ${booking.desk_id}`;

    return isMeetingRoom(desk)
      ? `Sala riunioni ${desk.desk_number}`
      : `Postazione ${desk.desk_number}`;
  };

  const toggleGuestGroup = (date: string) => {
    setExpandedGuestGroups((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const toggleMainCard = (id: number) => {
    setExpandedMainCardId((prev) => (prev === id ? null : id));
  };

  const toggleGuestCard = (id: number) => {
    setExpandedGuestCardId((prev) => (prev === id ? null : id));
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
          const aDeskNumber = a.desk?.desk_number ?? a.desk_id;
          const bDeskNumber = b.desk?.desk_number ?? b.desk_id;
          return aDeskNumber - bDeskNumber;
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
          <div style={styles.logoWrapper}>
            <img src="/logo.png" alt="Logo" style={styles.smallLogo} />
          </div>

          <h1 style={styles.title}>Benvenuto/a</h1>

          <p style={styles.userName}>
            <strong>{fullName || user?.email}</strong>
          </p>

          <div style={styles.bookingsIntroSpace}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.subtitle}>Le tue prenotazioni</h2>
            </div>
          </div>

          {mainBookings.length === 0 && guestBookings.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.text}>Non hai prenotazioni odierne o future.</p>
            </div>
          )}

          {mainBookings.length > 0 && (
            <>
              <div style={styles.mapTopRow}>
                <button
                  type="button"
                  style={styles.mapInlineButton}
                  onClick={() => setShowMap(true)}
                >
                  Mostra mappa
                </button>
              </div>

              <div style={styles.sectionBox}>
                <div style={styles.sectionTitleOnlyRow}>
                  <h3 style={styles.sectionTitle}>Prenotazioni principali</h3>
                </div>

                <div
                  style={{
                    ...styles.mainBookingsGrid,
                    gridTemplateColumns: isMobile
                      ? 'repeat(2, minmax(0, 1fr))'
                      : 'repeat(5, minmax(0, 1fr))',
                  }}
                >
                  {mainBookings.map((booking) => {
                    const meetingRoom = isMeetingRoom(booking.desk);
                    const isExpanded = expandedMainCardId === booking.id;

                    return (
                      <div
                        key={booking.id}
                        style={{
                          ...styles.slimBookingCard,
                          ...(meetingRoom
                            ? styles.meetingBookingCard
                            : styles.normalBookingCard),
                          ...(isExpanded ? styles.expandedBookingCard : {}),
                        }}
                      >
                        <button
                          type="button"
                          style={styles.cardClickArea}
                          onClick={() => toggleMainCard(booking.id)}
                          aria-expanded={isExpanded}
                        >
                          <div style={styles.compactCardBodyCentered}>
                            <span style={styles.compactCardDateTop}>
                              {formatDate(booking.booking_date)}
                            </span>
                            <span style={styles.compactCardDeskBottom}>
                              {getDeskLabel(booking)}
                            </span>
                          </div>
                        </button>

                        <div
                          style={{
                            ...styles.animatedActionsWrapper,
                            ...(isExpanded
                              ? styles.animatedActionsWrapperOpen
                              : styles.animatedActionsWrapperClosed),
                          }}
                        >
                          <div style={styles.revealActionsRow}>
                            <Link
                              href={`/booking/desk?date=${booking.booking_date}&bookingId=${booking.id}`}
                              style={styles.inlineModifyLink}
                            >
                              Modifica
                            </Link>

                            <button
                              type="button"
                              style={styles.inlineDeleteLink}
                              onClick={() => handleDelete(booking.id)}
                            >
                              Cancella
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {groupedGuestBookings.length > 0 && (
            <div style={styles.sectionBox}>
              <div style={styles.sectionTitleOnlyRow}>
                <h3 style={styles.sectionTitle}>Prenotazioni ospiti</h3>
              </div>

              {groupedGuestBookings.map((group) => {
                const isExpanded = expandedGuestGroups[group.date] ?? false;
                const selectedDesks = group.items.map(getDeskLabel).join(', ');

                return (
                  <div key={group.date} style={styles.guestGroupCard}>
                    <div style={styles.guestSummaryHeaderRow}>
                      <span style={styles.guestSummaryDate}>
                        {formatDate(group.date)}
                      </span>

                      <span style={styles.guestSummaryCount}>
                        {group.items.length}{' '}
                        {group.items.length === 1 ? 'ospite' : 'ospiti'}
                      </span>
                    </div>

                    <div style={styles.guestSummaryInfo}>
                      <p style={styles.guestSummaryText}>
                        <strong>Postazioni selezionate:</strong> {selectedDesks}
                      </p>
                    </div>

                    <div style={styles.guestSummaryActions}>
                      <button
                        type="button"
                        style={styles.guestTextAction}
                        onClick={() => toggleGuestGroup(group.date)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? 'Nascondi dettagli' : 'Mostra dettagli'}
                      </button>

                      <button
                        type="button"
                        style={styles.guestDeleteAllAction}
                        onClick={() => handleDeleteGuestGroup(group)}
                      >
                        Cancella tutti
                      </button>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          ...styles.mainBookingsGrid,
                          gridTemplateColumns: isMobile
                            ? 'repeat(2, minmax(0, 1fr))'
                            : 'repeat(5, minmax(0, 1fr))',
                        }}
                      >
                        {group.items.map((booking, index) => {
                          const meetingRoom = isMeetingRoom(booking.desk);
                          const cardExpanded = expandedGuestCardId === booking.id;

                          return (
                            <div
                              key={booking.id}
                              style={{
                                ...styles.slimBookingCard,
                                ...(meetingRoom
                                  ? styles.meetingBookingCard
                                  : styles.normalBookingCard),
                                ...(cardExpanded ? styles.expandedBookingCard : {}),
                              }}
                            >
                              <button
                                type="button"
                                style={styles.cardClickArea}
                                onClick={() => toggleGuestCard(booking.id)}
                                aria-expanded={cardExpanded}
                              >
                                <div style={styles.compactCardBodyCentered}>
                                  <span style={styles.compactGuestTitle}>
                                    {`Ospite ${index + 1}`}
                                  </span>
                                  <span style={styles.compactCardDeskBottom}>
                                    {getDeskLabel(booking)}
                                  </span>
                                </div>
                              </button>

                              <div
                                style={{
                                  ...styles.animatedActionsWrapper,
                                  ...(cardExpanded
                                    ? styles.animatedActionsWrapperOpen
                                    : styles.animatedActionsWrapperClosed),
                                }}
                              >
                                <div style={styles.revealActionsRowGuest}>
                                  <button
                                    type="button"
                                    style={styles.inlineDeleteLink}
                                    onClick={() => handleDelete(booking.id)}
                                  >
                                    Cancella
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Link href="/booking/date" style={styles.primaryButton}>
            Prenota un posto
          </Link>

          <button style={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>

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
    maxWidth: '1180px',
    backgroundColor: '#ffffff',
    borderRadius: 'clamp(14px, 4vw, 16px)',
    padding: 'clamp(16px, 4.5vw, 24px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    boxSizing: 'border-box',
  },
  logoWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallLogo: {
    width: '50%',
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
  },
  title: {
    textAlign: 'center',
    fontSize: 'clamp(20px, 5.5vw, 24px)',
    margin: 0,
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },
  userName: {
    textAlign: 'center',
    fontSize: 'clamp(20px, 5.5vw, 24px)',
    margin: 0,
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },
  bookingsIntroSpace: {
    marginTop: '38px',
    marginBottom: '8px',
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
  mapTopRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: '-6px',
  },
  sectionBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '18px',
    borderRadius: '18px',
    backgroundColor: '#fbfcfe',
    border: '1px solid #e4ebf3',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)',
    boxSizing: 'border-box',
  },
  sectionTitleOnlyRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  sectionTitle: {
    margin: 0,
    fontSize: 'clamp(15px, 4vw, 16px)',
    lineHeight: 1.3,
    color: '#0f172a',
  },
  mapInlineButton: {
    border: 'none',
    backgroundColor: 'transparent',
    color: '#0070f3',
    padding: 0,
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
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
  mainBookingsGrid: {
    display: 'grid',
    gap: '10px',
    width: '100%',
  },
  slimBookingCard: {
    borderRadius: '12px',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxSizing: 'border-box',
    minHeight: '64px',
    width: '100%',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  expandedBookingCard: {
    boxShadow: '0 6px 14px rgba(15, 23, 42, 0.08)',
    transform: 'translateY(-1px)',
  },
  cardClickArea: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    width: '100%',
    textAlign: 'center',
    cursor: 'pointer',
  },
  compactCardBodyCentered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    minWidth: 0,
    width: '100%',
    textAlign: 'center',
  },
  compactCardDateTop: {
    fontSize: 'clamp(11px, 3.2vw, 13px)',
    fontWeight: 700,
    color: '#334155',
    lineHeight: 1.15,
    textAlign: 'center',
    wordBreak: 'break-word',
    width: '100%',
  },
  compactCardDeskBottom: {
    fontSize: 'clamp(11px, 3.4vw, 13px)',
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.2,
    textAlign: 'center',
    wordBreak: 'break-word',
    width: '100%',
  },
  compactGuestTitle: {
    fontSize: 'clamp(11px, 3.2vw, 13px)',
    fontWeight: 700,
    color: '#334155',
    lineHeight: 1.15,
    textAlign: 'center',
    wordBreak: 'break-word',
    width: '100%',
  },
  animatedActionsWrapper: {
    overflow: 'hidden',
    transition:
      'max-height 0.24s ease, opacity 0.24s ease, margin-top 0.24s ease',
  },
  animatedActionsWrapperClosed: {
    maxHeight: 0,
    opacity: 0,
    marginTop: 0,
    pointerEvents: 'none',
  },
  animatedActionsWrapperOpen: {
    maxHeight: '44px',
    opacity: 1,
    marginTop: '4px',
    pointerEvents: 'auto',
  },
  revealActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '2px',
  },
  revealActionsRowGuest: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '2px',
  },
  normalBookingCard: {
    backgroundColor: '#eef4ff',
    border: '1px solid #cfe0ff',
  },
  meetingBookingCard: {
    backgroundColor: '#fff4e5',
    border: '1px solid #f2c078',
  },
  inlineModifyLink: {
    color: '#faad14',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 700,
  },
  inlineDeleteLink: {
    border: 'none',
    backgroundColor: 'transparent',
    color: '#d32f2f',
    padding: 0,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
  },
  guestGroupCard: {
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #d9e2ec',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxSizing: 'border-box',
    padding: 'clamp(12px, 3.8vw, 16px)',
  },
  guestSummaryHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  guestSummaryDate: {
    fontSize: 'clamp(14px, 4vw, 16px)',
    fontWeight: 700,
    color: '#334155',
    lineHeight: 1.2,
    textAlign: 'left',
  },
  guestSummaryCount: {
    fontSize: 'clamp(14px, 4vw, 16px)',
    fontWeight: 700,
    color: '#1f2937',
    lineHeight: 1.3,
    textAlign: 'right',
    marginLeft: 'auto',
  },
  guestSummaryInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  guestSummaryText: {
    margin: 0,
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  guestSummaryActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  guestTextAction: {
    border: 'none',
    backgroundColor: 'transparent',
    padding: 0,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    color: '#0070f3',
  },
  guestDeleteAllAction: {
    border: 'none',
    backgroundColor: 'transparent',
    padding: 0,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    color: '#d32f2f',
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
  logoutButton: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#d32f2f',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
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
