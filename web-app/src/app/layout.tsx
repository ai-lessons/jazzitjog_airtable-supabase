// src/app/layout.tsx
import './globals.css';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';

export const metadata = {
  title: 'Shoes Search',
  description: 'Secure search UI for running shoes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-gray-900">
        <header className="border-b">
          <nav className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-semibold">Shoes Search</Link>
              <Navigation />
            </div>
            <div className="flex gap-4 text-sm">
              <Link href="/login">Login</Link>
              <a href="/api/auth/signout">Sign out</a>
            </div>
          </nav>
        </header>
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </body>
    </html>
  );
}
