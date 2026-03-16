import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SettingsProvider } from '@/contexts/SettingsContext'; // добавить импорт
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Providers>
          <SettingsProvider>
            {children}
          </SettingsProvider>
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}