"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { StarsBackground } from "@/components/stars-background"
import { Star } from "lucide-react"

export function DesktopLanding() {
  const handleGetStarted = () => {
    window.location.href = "/sign-in"
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative overflow-hidden"
      style={{ backgroundImage: "url(/images/bg3.webp)" }}
    >
      <StarsBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <Image src="/logo/favicon.webp" alt="Antivity" width={40} height={40} className="rounded-lg" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <Image src="/logo/antjvity-logo.webp" alt="Antivity Logo" width={300} height={120} className="mx-auto" />
          </div>

          {/* Hero Text */}
          <h1 className="text-5xl md:text-6xl font-bold text-[#7D47B9] mb-6">Discover Your World</h1>

          <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
            Embark on exciting missions, capture memories, and share your adventures. Antivity transforms everyday
            moments into extraordinary journeys.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-3xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-[#6CD3FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-white" fill="white" />
              </div>
              <h3 className="text-lg font-bold text-[#7D47B9] mb-2">Daily Missions</h3>
              <p className="text-gray-600">Complete exciting challenges and explore new places every day</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-[#62CD99] rounded-full flex items-center justify-center mx-auto mb-4">
                <Image src="/icon/book-open.svg" alt="Journal" width={24} height={24} className="brightness-0 invert" />
              </div>
              <h3 className="text-lg font-bold text-[#7D47B9] mb-2">Photo Journal</h3>
              <p className="text-gray-600">Capture and organize your memories with our beautiful journal</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-[#FFCC19] rounded-full flex items-center justify-center mx-auto mb-4">
                <Image
                  src="/icon/message-circle.svg"
                  alt="Social"
                  width={24}
                  height={24}
                  className="brightness-0 invert"
                />
              </div>
              <h3 className="text-lg font-bold text-[#7D47B9] mb-2">Social Sharing</h3>
              <p className="text-gray-600">Share your adventures and connect with fellow explorers</p>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleGetStarted}
            className="bg-[#6CD3FF] hover:bg-[#50B0FF] text-white text-xl px-12 py-6 rounded-full font-bold transition-all duration-200 transform hover:scale-105"
            style={{ boxShadow: "0 6px 0 #50B0FF" }}
          >
            Get Started on Mobile
          </Button>

          <p className="text-sm text-gray-500 mt-4">Best experienced on mobile devices</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-gray-500">
        <p>© 2025 Antivity. Made with ❤️ for adventurers.</p>
      </footer>
    </div>
  )
}
