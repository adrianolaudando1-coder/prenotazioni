import CardLogo from '../../components/CardLogo';
export default function ConfirmPage() {
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <img src="/logo.png" alt="Logo" style={styles.logo} />
        </div>


        <h1 style={styles.title}>Email confermata</h1>

        <p style={styles.text}>
          Il tuo account è stato attivato correttamente.
        </p>

        <a href="/" style={styles.primaryButton}>
          Torna al login
        </a>
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

    textAlign: 'center',
  },

  title: {
    margin: 0,

    fontSize: '24px',

    lineHeight: 1.3,
  },

  text: {
    margin: 0,

    fontSize: '16px',

    color: '#333',
  },

  primaryButton: {
    display: 'inline-block',

    marginTop: '10px',

    padding: '12px',

    borderRadius: '10px',

    backgroundColor: '#0070f3',

    color: '#fff',

    fontSize: '16px',

    textDecoration: 'none',
  },
};
