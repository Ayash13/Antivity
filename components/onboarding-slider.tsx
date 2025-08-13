"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OnboardingSlide {
  id: number
  title: string
  subtitle: string
  image: string
  hasBlueOutline?: boolean
}

const onboardingSlides: OnboardingSlide[] = [
  {
    id: 1,
    title: "Find more",
    subtitle: "purpose to walk",
    image: "/images/onboarding/1.webp",
    hasBlueOutline: false,
  },
  {
    id: 2,
    title: "Don't ignore your",
    subtitle: "surrounding",
    image: "/images/onboarding/2.webp",
    hasBlueOutline: false,
  },
  {
    id: 3,
    title: "Hey!",
    subtitle: "Take it easy",
    image: "/images/onboarding/3.webp",
    hasBlueOutline: false,
  },
]

interface OnboardingSliderProps {
  onComplete: () => void
}

export function OnboardingSlider({ onComplete }: OnboardingSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsSwiping(true)
    setStartX(e.touches[0].clientX)
    setCurrentX(e.touches[0].clientX)
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwiping) return
      setCurrentX(e.touches[0].clientX)
    },
    [isSwiping],
  )

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return
    setIsSwiping(false)

    const diffX = currentX - startX
    const swipeThreshold = 50

    if (diffX < -swipeThreshold && currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide((prev) => prev + 1)
    } else if (diffX > swipeThreshold && currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1)
    }

    setStartX(0)
    setCurrentX(0)
  }, [isSwiping, currentX, startX, currentSlide])

  const handleNext = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide((prev) => prev + 1)
    } else {
      onComplete()
    }
  }

  const isLastSlide = currentSlide === onboardingSlides.length - 1

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
      <div
        ref={containerRef}
        className="flex h-full transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(-${currentSlide * 100}%)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {onboardingSlides.map((slide, index) => (
          <div
            key={slide.id}
            className="w-full h-full flex-shrink-0 flex flex-col justify-between px-6 py-12 relative overflow-hidden pb-8"
          >
            {/* Background pattern image */}
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 -z-10 bg-top bg-no-repeat bg-cover"
              style={{ backgroundImage: "url('/images/onboarding/bg1.webp')" }}
            />

            {/* Image Container */}
            <div className="flex items-center justify-center w-full max-w-sm mx-auto">
              <div
                className={cn(
                  "w-full bg-gray-300 flex items-center justify-center overflow-hidden border-0 h-[420px]",
                  "rounded-t-[84px] rounded-b-[32px]",
                  slide.hasBlueOutline && "border-4 border-blue-500",
                )}
                style={{ boxShadow: "0 10px 0 #8BE5FF" }}
              >
                <img
                  src={slide.image || "/placeholder.svg"}
                  alt={`${slide.title} ${slide.subtitle}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Unified section: text + indicators + button */}
            <div className="w-full max-w-sm mx-auto text-center">
              {/* Text */}
              <div className="text-center">
                <h1 className="text-2xl font-bold leading-tight text-[rgba(125,71,185,1)]">{slide.title}</h1>
                <h2 className="text-2xl font-bold mt-0.5 mb-6 text-[rgba(125,71,185,1)]">{slide.subtitle}</h2>
              </div>

              {/* Indicators close to text */}
              <div className="flex justify-center space-x-3 mt-0 mb-6">
                {onboardingSlides.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "transition-all duration-200",
                      index === currentSlide
                        ? "w-6 h-3 rounded-md bg-[#62CD99]" // active: #62CD99
                        : "w-3 h-3 rounded-full bg-[#7D47B9]", // inactive: #7D47B9
                    )}
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* Button */}
              <Button
                onClick={handleNext}
                className="h-14 hover:bg-[#50B0FF] rounded-full transition-colors duration-200 bg-[rgba(108,211,255,1)] text-white font-bold text-2xl w-60"
                variant="secondary"
                style={{ boxShadow: "0 5px 0 #50B0FF" }}
              >
                {isLastSlide ? "Start" : "Next"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
