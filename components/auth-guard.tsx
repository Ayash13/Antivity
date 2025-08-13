'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
  redirectTo?: string // where to send guests
}

export function AuthGuard({ children, redirectTo = '/' }: AuthGuardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'authed'>('checking')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setStatus('authed')
      } else {
        router.replace(redirectTo)
      }
    })
    return () => unsub()
  }, [router, redirectTo])

  if (status === 'checking') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  return <>{children}</>
}
