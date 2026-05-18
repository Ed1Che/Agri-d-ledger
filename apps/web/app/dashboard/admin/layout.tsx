import { Header } from '@/components/header'
import { ReactNode } from 'react'

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
