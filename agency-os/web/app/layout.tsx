import type { Metadata } from 'next'
import { Inter, Calistoga, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Editorial display font — headings, hero titles
const calistoga = Calistoga({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-calistoga',
})

// Monospace — data labels, IDs, badges, code
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Agency OS',
  description: 'Painel operacional da agência',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Agency OS' },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${calistoga.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#09090B] text-[#FAFAFA] antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="bottom-right" theme="dark" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
