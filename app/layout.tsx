import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Copa 2026 — Tabela Interativa',
  description: 'Acompanhe e preencha os resultados da Copa do Mundo FIFA 2026 em tempo real. Fase de grupos, oitavas, quartas, semifinais e final.',
  keywords: ['Copa do Mundo 2026', 'FIFA World Cup', 'tabela', 'chaveamento', 'resultados'],
  openGraph: {
    title: 'Copa 2026 — Tabela Interativa',
    description: 'Preencha os placares da Copa 2026 e veja o chaveamento se atualizar em tempo real.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Inline script to apply theme before paint — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('copa-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'');}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#f5f6fa" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
