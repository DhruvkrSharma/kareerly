import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kareerly — AI Career Discovery',
  description: 'Swipe-based AI job discovery built for Indian tech. Find your perfect role with explainable AI matching.',
  keywords: ['jobs', 'career', 'AI', 'India', 'startups', 'tech'],
  openGraph: {
    title: 'Kareerly',
    description: 'AI-powered career discovery for Indian tech',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
