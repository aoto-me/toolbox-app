import type { Metadata, Viewport } from 'next';
import { Antic_Didone } from 'next/font/google';
import './styles/globals.scss';
import styles from './layout.module.scss';

const anticDidone = Antic_Didone({
  subsets: ['latin'],
  variable: '--font-antic-didone',
  weight: '400',
});

export const viewport: Viewport = {
  themeColor: '#0d1b3e',
};

export function generateMetadata(): Metadata {
  const siteUrl = process.env.AUTH_URL;

  return {
    alternates: siteUrl ? { canonical: siteUrl } : undefined,
    appleWebApp: {
      statusBarStyle: 'black-translucent',
      title: 'Toolbox',
    },
    description: '個人用ツール集',
    icons: {
      apple: '/icons/apple-touch-icon.png',
    },
    openGraph: {
      description: '個人用ツール集',
      locale: 'ja_JP',
      siteName: 'Toolbox',
      title: 'Toolbox',
      type: 'website',
      ...(siteUrl && { url: siteUrl }),
    },
    robots: { follow: false, index: false },
    title: 'Toolbox',
    twitter: {
      card: 'summary_large_image',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={anticDidone.variable} lang="ja">
      <body>
        <div className={styles.bg}>
          <div className={styles.bg__sky} />
          <div className={styles.bg__moon} />
          <div className={styles.bg__clouds} />
          {children}
        </div>
      </body>
    </html>
  );
}
