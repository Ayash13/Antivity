"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Image from "next/image"

interface SplashScreenProps {
  children: React.ReactNode
}

export function SplashScreen({ children }: SplashScreenProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Show splash screen for minimum 2 seconds
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(226,249,255,1)]"
        style={{
          backgroundImage: 'url("/images/bg3.webp")',
          backgroundSize: "cover",
          backgroundPosition: "top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex flex-col items-center justify-center">
          <div className="animate-pulse">
            <Image
              src="/logo/antjvity-logo.webp"
              alt="Antjvity Logo"
              width={300}
              height={200}
              priority
              className="w-72 h-auto"
            />
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
