import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

// Opt out of static generation — auth and cookie-based APIs require dynamic rendering.
export const dynamic = 'force-dynamic'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Agri-D-Ledger - Fair Pricing for African Farmers',
  description:
    'A blockchain-powered marketplace improving market access and pricing fairness for small-scale farmers in Africa through transparent regional bidding',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
