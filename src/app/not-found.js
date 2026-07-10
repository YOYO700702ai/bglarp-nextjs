import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#080F0C',
        color: '#D5E4C3',
        fontFamily: "'Noto Serif TC', serif",
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div>
        <p style={{ color: '#E8A63B', letterSpacing: '0.3em', fontWeight: 700, fontSize: '0.8rem' }}>
          404 NOT FOUND
        </p>
        <h1 style={{ fontSize: '2rem', margin: '0.8rem 0', letterSpacing: '0.1em' }}>
          這個房間不存在
        </h1>
        <p style={{ color: '#8FA873', lineHeight: 1.9 }}>
          也許是劇本下架了，也許是網址打錯了。
          <br />
          回到大廳，重新選一場你的故事。
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.8rem 2.2rem',
            background: '#E8A63B',
            color: '#142B24',
            fontWeight: 800,
            letterSpacing: '0.15em',
            borderRadius: '4px',
            textDecoration: 'none',
          }}
        >
          回到首頁
        </Link>
      </div>
    </div>
  );
}
