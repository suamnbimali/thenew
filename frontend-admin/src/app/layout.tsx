import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NDIS Rostering Platform',
  description: 'Smart air traffic control style management for NDIS service providers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
}
