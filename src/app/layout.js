import './globals.css';

export const metadata = {
  title: 'BGLARP 實境推理館',
  description: '打破現實與虛構的邊界。走進專屬場景，演繹你的第二人生。台中一中街 LARP 劇本殺推理館。',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
