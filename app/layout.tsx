export const metadata: Metadata = {
  title: 'NTT Salerno - Prenotazione Postazioni',
  description: 'Applicazione interna per prenotare le postazioni di lavoro presso NTT DATA Salerno',

  openGraph: {
    title: 'NTT Salerno - Prenotazione Postazioni',
    description: 'Prenota la tua postazione in ufficio',
    url: 'https://ntt-prenotazioni-alpha.vercel.app/', // 🔁 cambia con il tuo dominio
    siteName: 'NTT Salerno Booking',
    images: [
      {
        url: '/anteprima.png', // 🔁 immagine tua
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'NTT Salerno - Prenotazione Postazioni',
    description: 'Prenota la tua postazione in ufficio',
    images: [
      '/anteprima.png', // 🔁 stessa immagine
    ],
  },
};
