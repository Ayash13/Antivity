'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

export function RedirectIfAuthenticated({ to = '/main' }: { to?: string }) {
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace(to)
      }
    })
    return () => unsub()
  }, [router, to])

  return null
}
