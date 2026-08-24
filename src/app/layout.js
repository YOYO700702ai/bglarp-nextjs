import Script from 'next/script';
import JsonLd from '@/components/JsonLd';
import { ROOT_JSON_LD } from '@/lib/seo';
import './globals.css';

export const metadata = {
  metadataBase: new URL('https://www.bglarp.com'),
  title: 'BGLARP 實境推理館 | 台中劇本殺・沉浸劇場・狼人殺・陣營遊戲',
  description: '台中一中街 BGLARP 實境推理館，提供新手友善的選本協助、親切專業的 GM 帶場，以及一般新手劇本每人約 NT$450–600 的入門選擇。',
  keywords: '劇本殺, 沉浸劇場, 狼人殺, 陣營遊戲, LARP, 實境推理, 台中劇本殺, 一中街劇本殺, BGLARP',
  icons: { icon: '/favicon.ico' },
  verification: { google: 'FgTNUir7Fyy9YwREQaCB4vwgPX1DAdy6LP9i88s7tp4' },
  openGraph: {
    title: 'BGLARP 實境推理館 | 台中劇本殺・沉浸劇場',
    description: '第一次玩也不用先做功課；BGLARP 提供新手友善的選本協助、親切專業的 GM 帶場，以及價格好入門的劇本選擇。',
    url: 'https://www.bglarp.com',
    siteName: 'BGLARP 實境推理館',
    locale: 'zh_TW',
    type: 'website',
    images: [{ url: '/hero-cover.jpg', width: 1200, height: 675, alt: 'BGLARP 實境推理館' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <head>
        <JsonLd id="bglarp-site-jsonld" data={ROOT_JSON_LD} />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
        <Script id="gtm-head" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-W4V4NWRJ');`}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-W4V4NWRJ"
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
