import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, IBM_Plex_Sans_JP, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistration from '@/components/layout/ServiceWorkerRegistration'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const ibmPlexSansJP = IBM_Plex_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-ibm-plex-sans-jp',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LabTask',
  description: '研究室タスク共有アプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LabTask',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${spaceGrotesk.variable} ${ibmPlexSansJP.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] font-body antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
