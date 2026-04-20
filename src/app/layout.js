import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'BGLARP 實境推理館 | 台中劇本殺・沉浸劇場・狼人殺・陣營遊戲',
  description: '台中一中街 BGLARP 實境推理館。打破現實與虛構的邊界，走進專屬場景演繹你的第二人生。劇本殺、沉浸劇場、狼人殺、陣營遊戲一次滿足。',
  keywords: '劇本殺, 沉浸劇場, 狼人殺, 陣營遊戲, LARP, 實境推理, 台中劇本殺, 一中街劇本殺, BGLARP',
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
        <Script id="gtm-head" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KGZM4LF8');`}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KGZM4LF8"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
