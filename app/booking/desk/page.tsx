'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import DeskMapPlaceholder from '../../../components/DeskMapPlaceholder';
import CardLogo from '../../../components/CardLogo';

type Desk = {
  id: number;
  desk_number: number;
  label: string | null;
};

type ExistingBooking = {
  id: number;
  desk_id: number;
  booking_date: string;
};

export default function BookingDeskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedDate = searchParams.get('date') || '';
  const bookingId = searchParams.get('bookingId') || '';
  const guestCount = Number(searchParams.get('guestCount') || '0');
  const isGuestFlow = guestCount > 0;

  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [desks, setDesks] = useState<Desk[]>([]);
  const [occupiedDeskIds, setOccupiedDeskIds] = useState<number[]>([]);
  const [selectedDeskId, setSelectedDeskId] = useState('');
  const [selectedGuestDeskIds, setSelectedGuestDeskIds] = useState<string[]>(
    []
  );
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ExistingBooking | null>(
    null
  );

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push('/');
        return;
      }

      if (!selectedDate) {
        router.push('/booking/date');
        return;
      }

      setUserId(data.user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.user.id)
        .single();

      setDisplayName(
        profileData?.full_name ||
          profileData?.email ||
          data.user.email ||
          'Utente'
      );

      if (isGuestFlow) {
        const { data: existingMainBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', data.user.id)
          .eq('booking_date', selectedDate)
          .eq('is_guest', false)
          .limit(1);

        if (!existingMainBooking || existingMainBooking.length === 0) {
          router.push('/booking/date');
          return;
        }
      }

      let currentEditingBooking: ExistingBooking | null = null;

      if (bookingId) {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('id, desk_id, booking_date')
          .eq('id', bookingId)
          .eq('user_id', data.user.id)
          .single();

        if (bookingData) {
          currentEditingBooking = bookingData as ExistingBooking;
          setEditingBooking(currentEditingBooking);
          setSelectedDeskId(String(currentEditingBooking.desk_id));
        }
      }

      await loadAvailableDesks(selectedDate, bookingId, currentEditingBooking);
      setLoading(false);
    };

    init();
  }, [router, selectedDate, bookingId, isGuestFlow]);

  const getReadableErrorMessage = (
    error: { message?: string } | null,
    isEdit: boolean
  ) => {
    const rawMessage = error?.message?.toLowerCase() || '';

    if (rawMessage.includes('unique_main_booking_per_day')) {
      return 'Hai già una prenotazione per questo giorno.';
    }

    if (rawMessage.includes('unique_desk_per_day')) {
      return 'Questa postazione è già prenotata per il giorno selezionato.';
    }

    return isEdit
      ? 'Errore durante la modifica della prenotazione.'
      : 'Errore durante la prenotazione.';
  };

  const loadAvailableDesks = async (
    date: string,
    currentBookingId?: string,
    currentEditingBooking?: ExistingBooking | null
  ) => {
    setMessage('');

    let occupiedQuery = supabase
      .from('bookings')
      .select('desk_id, id')
      .eq('booking_date', date);

    if (currentBookingId) {
      occupiedQuery = occupiedQuery.neq('id', currentBookingId);
    }

    const { data: occupiedRows, error: occupiedError } = await occupiedQuery;

    if (occupiedError) {
      setMessage('Errore nel caricamento delle postazioni occupate.');
      return;
    }

    const occupiedIds = (occupiedRows || []).map((row) => row.desk_id);
    setOccupiedDeskIds(occupiedIds);

    const { data: allDesks, error: desksError } = await supabase
      .from('desks')
      .select('id, desk_number, label')
      .eq('is_active', true)
      .order('desk_number', { ascending: true });

    if (desksError) {
      setMessage('Errore nel caricamento delle postazioni disponibili.');
      return;
    }

    let finalDesks = (allDesks as Desk[]) || [];

    const bookingToCheck = currentEditingBooking || editingBooking;

    if (bookingToCheck?.desk_id) {
      const alreadyIncluded = finalDesks.some(
        (desk) => desk.id === bookingToCheck.desk_id
      );

      if (!alreadyIncluded) {
        const { data: currentDesk } = await supabase
          .from('desks')
          .select('id, desk_number, label')
          .eq('id', bookingToCheck.desk_id)
          .single();

        if (currentDesk) {
          finalDesks = [...finalDesks, currentDesk as Desk].sort(
            (a, b) => a.desk_number - b.desk_number
          );
        }
      }
    }

    setDesks(finalDesks);
  };

  const selectedDesk = useMemo(
    () => desks.find((desk) => String(desk.id) === selectedDeskId),
    [desks, selectedDeskId]
  );

  const selectedGuestDesks = useMemo(
    () =>
      desks.filter((desk) => selectedGuestDeskIds.includes(String(desk.id))),
    [desks, selectedGuestDeskIds]
  );

  const normalDesks = desks.filter((desk) => desk.desk_number < 20);
  const meetingRoomDesks = desks.filter((desk) => desk.desk_number >= 20);

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;

    const params = new URLSearchParams();
    params.set('date', newDate);

    if (bookingId) params.set('bookingId', bookingId);
    if (isGuestFlow) params.set('guestCount', String(guestCount));

    router.push(`/booking/desk?${params.toString()}`);
  };

  const toggleGuestDeskSelection = (deskId: string) => {
    const deskIdNumber = Number(deskId);

    if (occupiedDeskIds.includes(deskIdNumber)) {
      return;
    }

    const isSelected = selectedGuestDeskIds.includes(deskId);

    if (isSelected) {
      setSelectedGuestDeskIds((prev) => prev.filter((id) => id !== deskId));
      return;
    }

    if (selectedGuestDeskIds.length >= guestCount) {
      setMessage(
        `Puoi selezionare al massimo ${guestCount} postazioni per gli ospiti.`
      );
      return;
    }

    setMessage('');
    setSelectedGuestDeskIds((prev) => [...prev, deskId]);
  };

  const handleSave = async () => {
    setMessage('');

    if (isGuestFlow) {
      if (selectedGuestDeskIds.length !== guestCount) {
        setMessage(
          `Devi selezionare esattamente ${guestCount} postazioni per gli ospiti.`
        );
        return;
      }

      const confirmed = window.confirm(
        `Confermi la prenotazione di ${guestCount} postazioni per gli ospiti?`
      );

      if (!confirmed) return;

      setSaving(true);

      const guestRows = selectedGuestDeskIds.map((deskId, index) => ({
        user_id: userId,
        desk_id: Number(deskId),
        booking_date: selectedDate,
        is_guest: true,
        guest_label: `user${index + 1}`,
        occupant_name: `${displayName} user${index + 1}`,
      }));

      const { error } = await supabase.from('bookings').insert(guestRows);

      setSaving(false);

      if (error) {
        setMessage(getReadableErrorMessage(error, false));
        await loadAvailableDesks(selectedDate);
        return;
      }

      router.push('/dashboard');
      return;
    }

    if (!selectedDeskId) {
      setMessage('Seleziona una postazione.');
      return;
    }

    if (occupiedDeskIds.includes(Number(selectedDeskId))) {
      setMessage('Questa postazione è già prenotata per il giorno selezionato.');
      return;
    }

    const confirmed = window.confirm(
      bookingId
        ? 'Confermi la modifica della prenotazione?'
        : 'Confermi la prenotazione di questa postazione?'
    );

    if (!confirmed) return;

    setSaving(true);

    if (bookingId) {
      const { error } = await supabase
        .from('bookings')
        .update({
          desk_id: Number(selectedDeskId),
          booking_date: selectedDate,
          is_guest: false,
          guest_label: null,
          occupant_name: displayName,
        })
        .eq('id', bookingId)
        .eq('user_id', userId);

      setSaving(false);

      if (error) {
        setMessage(getReadableErrorMessage(error, true));
        await loadAvailableDesks(selectedDate, bookingId, editingBooking);
        return;
      }
    } else {
      const { error } = await supabase.from('bookings').insert({
        user_id: userId,
        desk_id: Number(selectedDeskId),
        booking_date: selectedDate,
        is_guest: false,
        guest_label: null,
        occupant_name: displayName,
      });

      setSaving(false);

      if (error) {
        setMessage(getReadableErrorMessage(error, false));
        await loadAvailableDesks(selectedDate);
        return;
      }
    }

    router.push('/dashboard');
  };

  const renderDeskButtons = (deskList: Desk[], isMeetingRoom: boolean) => (
    <div style={styles.deskGrid}>
      {deskList.map((desk) => {
        const isSelected = isGuestFlow
          ? selectedGuestDeskIds.includes(String(desk.id))
          : String(desk.id) === selectedDeskId;

        const isOccupied = occupiedDeskIds.includes(desk.id);

        return (
          <button
            key={desk.id}
            type="button"
            disabled={isOccupied}
            onClick={() => {
              if (isOccupied) return;

              if (isGuestFlow) {
                toggleGuestDeskSelection(String(desk.id));
              } else {
                setSelectedDeskId(String(desk.id));
              }
            }}
            style={{
              ...styles.deskButton,
              ...(isMeetingRoom
                ? styles.meetingDeskButton
                : styles.normalDeskButton),
              ...(isSelected ? styles.selectedDeskButton : {}),
              ...(isOccupied ? styles.occupiedDeskButton : {}),
            }}
          >
            {desk.desk_number}
          </button>
        );
      })}
    </div>
  );

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

        <h1 style={styles.title}>Prenotazione postazioni</h1>
        <h2 style={styles.subtitle}>
          {isGuestFlow
            ? `Prenotazione ospiti (${guestCount})`
            : bookingId
            ? 'Modifica prenotazione'
            : ''}
        </h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Giorno selezionato</label>
          <input
            style={styles.input}
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>

        <DeskMapPlaceholder title="Mappa postazioni" />

        {normalDesks.length > 0 && (
          <div style={styles.sectionBox}>
            <p style={styles.sectionTitle}>Postazioni standard</p>
            {renderDeskButtons(normalDesks, false)}
          </div>
        )}

        {meetingRoomDesks.length > 0 && (
          <div style={styles.meetingSectionBox}>
            <p style={styles.meetingSectionTitle}>Sala riunioni</p>
            {renderDeskButtons(meetingRoomDesks, true)}
          </div>
        )}

        {isGuestFlow && (
          <div style={styles.guestInfoBox}>
            <p style={styles.guestInfoTitle}>
              Postazioni selezionate per ospiti: {selectedGuestDeskIds.length} /{' '}
              {guestCount}
            </p>

            {selectedGuestDesks.length > 0 && (
              <div style={styles.guestList}>
                {selectedGuestDesks.map((desk, index) => (
                  <span key={desk.id} style={styles.guestBadge}>
                    user{index + 1}: {desk.desk_number}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {!isGuestFlow && selectedDesk && (
          <p
            style={{
              ...styles.selectedText,
              ...(selectedDesk.desk_number >= 20
                ? styles.meetingSelectedText
                : styles.normalSelectedText),
            }}
          >
            Hai selezionato{' '}
            <strong>
              {selectedDesk.desk_number >= 20
                ? `Sala riunioni ${selectedDesk.desk_number}`
                : `Postazione ${selectedDesk.desk_number}`}
            </strong>
          </p>
        )}

        {desks.length === 0 && (
          <p style={styles.message}>
            Nessuna postazione disponibile per il giorno selezionato.
          </p>
        )}

        <button
          style={{
            ...styles.primaryButton,
            ...(saving || desks.length === 0 ? styles.disabledButton : {}),
          }}
          onClick={handleSave}
          disabled={saving || desks.length === 0}
        >
          {saving
            ? isGuestFlow
              ? 'Prenotazione ospiti in corso...'
              : bookingId
              ? 'Salvataggio in corso...'
              : 'Prenotazione in corso...'
            : isGuestFlow
            ? 'Prenota ospiti'
            : bookingId
            ? 'Salva modifica'
            : 'Prenota'}
        </button>

        <button
          style={styles.secondaryButton}
          onClick={() => router.push('/dashboard')}
        >
          Torna alla dashboard
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
    padding: 'clamp(12px, 4vw, 24px)',
    backgroundColor: '#f4f6f8',
    boxSizing: 'border-box',
  },

  card: {
    width: '100%',
    maxWidth: '800px',
    backgroundColor: '#ffffff',
    borderRadius: 'clamp(14px, 4vw, 16px)',
    padding: 'clamp(16px, 4.5vw, 24px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
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
    wordBreak: 'break-word',
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

  sectionBox: {
    border: '1px solid #dbe2ea',
    borderRadius: '12px',
    padding: 'clamp(12px, 3.5vw, 14px)',
    backgroundColor: '#fcfdff',
    boxSizing: 'border-box',
  },

  meetingSectionBox: {
    border: '1px solid #f2c078',
    borderRadius: '12px',
    padding: 'clamp(12px, 3.5vw, 14px)',
    backgroundColor: '#fff8ef',
    boxSizing: 'border-box',
  },

  sectionTitle: {
    margin: '0 0 10px 0',
    fontWeight: 700,
    fontSize: 'clamp(13px, 3.7vw, 14px)',
    lineHeight: 1.3,
  },

  meetingSectionTitle: {
    margin: '0 0 10px 0',
    fontWeight: 700,
    fontSize: 'clamp(13px, 3.7vw, 14px)',
    color: '#b26a00',
    lineHeight: 1.3,
  },

  deskGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))',
    gap: '10px',
    width: '100%',
  },

  deskButton: {
    width: '100%',
    minHeight: '48px',
    padding: '10px 8px',
    borderRadius: '10px',
    border: '1px solid transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600,
    boxSizing: 'border-box',
    textAlign: 'center',
  },

  normalDeskButton: {
    backgroundColor: '#eef4ff',
    color: '#0b57d0',
    borderColor: '#cfe0ff',
  },

  meetingDeskButton: {
    backgroundColor: '#ffe8c7',
    color: '#9a5a00',
    borderColor: '#f3c27b',
  },

  occupiedDeskButton: {
    backgroundColor: '#e0e0e0',
    color: '#7a7a7a',
    borderColor: '#c4c4c4',
    cursor: 'not-allowed',
    opacity: 0.8,
  },

  selectedDeskButton: {
    outline: '3px solid #222',
    outlineOffset: '1px',
  },

  guestInfoBox: {
    padding: 'clamp(12px, 3.5vw, 14px)',
    borderRadius: '12px',
    backgroundColor: '#f5f7fa',
    border: '1px solid #d9e2ec',
    boxSizing: 'border-box',
  },

  guestInfoTitle: {
    margin: 0,
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 'clamp(13px, 3.8vw, 15px)',
    lineHeight: 1.4,
  },

  guestList: {
    marginTop: '10px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  },

  guestBadge: {
    backgroundColor: '#e8f0fe',
    color: '#0b57d0',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: 1.3,
    maxWidth: '100%',
    wordBreak: 'break-word',
  },

  text: {
    margin: 0,
    textAlign: 'center',
    fontSize: 'clamp(14px, 4vw, 16px)',
    lineHeight: 1.4,
  },

  selectedText: {
    margin: 0,
    textAlign: 'center',
    padding: '10px 12px',
    borderRadius: '10px',
    fontSize: 'clamp(13px, 3.8vw, 15px)',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },

  normalSelectedText: {
    backgroundColor: '#eef4ff',
    color: '#0b57d0',
  },

  meetingSelectedText: {
    backgroundColor: '#ffe8c7',
    color: '#9a5a00',
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
    backgroundColor: '#fff',
    color: '#0070f3',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
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
