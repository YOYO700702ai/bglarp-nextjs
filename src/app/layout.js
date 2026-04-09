import './globals.css';

export const metadata = {
  title: 'BGLARP 實境推理館 | 台中劇本殺・沉浸劇場・狼人殺・陣營遊戲',
  description: '台中一中街 BGLARP 實境推理館，提供劇本殺、沉浸劇場、狼人殺、陣營遊戲等多種實境角色扮演體驗。打破現實與虛構的邊界，走進專屬場景，演繹你的第二人生。',
  keywords: '劇本殺, 沉浸劇場, 狼人殺, 陣營遊戲, LARP, 實境推理, 台中劇本殺, 一中街, BGLARP, 角色扮演, 推理遊戲',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  icons: { icon: '/favicon.ico' },
  verification: { google: 'FgTNUir7Fyy9YwREQaCB4vwgPX1DAdy6LP9i88s7tp4' },
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
