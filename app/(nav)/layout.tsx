"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"

export default function WithNavLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Map routes to nav indices
  const routeToIndex: Record<string, number> = {
    "/main": 0, // home
    "/social": 1,
    "/journal": 2,
    "/profile": 3,
  }

  const indexToRoute = ["/main", "/social", "/journal", "/profile"]

  const activeIndex = useMemo(() => {
    // Match exact or startsWith to handle nested routes later
    if (!pathname) return 0
    const found = Object.keys(routeToIndex).find((r) => pathname === r || pathname.startsWith(r + "/"))
    return found ? routeToIndex[found] : 0
  }, [pathname])

  const hideNav =
    pathname === "/profile/edit" ||
    Boolean(pathname?.startsWith("/profile/photos")) ||
    Boolean(pathname?.startsWith("/social/favorites")) ||
    Boolean(pathname?.match(/^\/profile\/[^/]+$/)) ||
    Boolean(pathname?.match(/^\/profile\/[^/]+\/photos\/[^/]+$/))

  const [isIOSPWA, setIsIOSPWA] = useState(false)

  useEffect(() => {
    const checkIOSPWA = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      setIsIOSPWA(isIOS && isStandalone)
    }

    checkIOSPWA()
  }, [])

  return (
    <>
      <div className={isIOSPWA ? "pwa-content" : "min-h-dvh"}>{children}</div>
      {!hideNav && <BottomNav activeIndex={activeIndex} onChange={(i) => router.push(indexToRoute[i] ?? "/main")} />}
    </>
  )
}
