"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { auth } from "@/lib/firebase/client"
import { getPathSessionByDocId, type PathSessionDoc } from "@/lib/firebase/path-logs"
import { cn } from "@/lib/utils"

export default function ProfilePhotosDetailPage() {
  const params = useParams<{ docId: string }>()
  const docId = params?.docId
  const router = useRouter()

  const [session, setSession] = useState<PathSessionDoc | null>(null)
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load session by docId for current user
  useEffect(() => {
    let canceled = false
    async function run() {
      const u = auth?.currentUser
      if (!u) {
        router.replace("/sign-in")
        return
      }
      if (!docId) return
      setLoading(true)
      try {
        const s = await getPathSessionByDocId(u.uid, decodeURIComponent(docId))
        if (!canceled) {
          setSession(s)
          setIndex(0)
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    run()
    return () => {
      canceled = true
    }
  }, [docId, router])

  const images = useMemo(() => {
    const pathImages = (session?.items || []).map((it) => it.imageUrl).filter(Boolean) as string[]
    if (session?.selfieImageUrl) {
      return [session.selfieImageUrl, ...pathImages]
    }
    return pathImages
  }, [session])

  const targets = useMemo(() => {
    const pathTargets = (session?.items || []).map((it) => it.target || "")
    if (session?.selfieImageUrl) {
      return ["Selfie", ...pathTargets]
    }
    return pathTargets
  }, [session])

  const next = useCallback(() => {
    if (!images.length) return
    setIndex((i) => (i + 1) % images.length)
  }, [images.length])

  const prev = useCallback(() => {
    if (!images.length) return
    setIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  // swipe support
  useEffect(() => {
    let startX = 0
    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX
      if (dx < -40) next()
      else if (dx > 40) prev()
    }
    window.addEventListener("touchstart", onTouchStart)
    window.addEventListener("touchend", onTouchEnd)
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [next, prev])

  return (
    <main className="min-h-dvh bg-[rgba(226,249,255,1)] text-gray-900 pb-28">
      {/* Header with back + pill title, styled like app */}
      <div
        className="sticky top-0 z-20 border-b border-gray-200"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
      >
        <div className="bg-[rgba(108,211,255,1)]">
          <div className="max-w-xl mx-auto px-4 pt-4 pb-4">
            <div className="flex items-center justify-between gap-2">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl bg-[rgba(255,204,25,1)] hover:bg-[#50B0FF] text-white"
                aria-label="Back"
                style={{ boxShadow: "0 3px 0 #50B0FF" }}
              >
                <Image
                  src="/icon/arrow_left.svg"
                  alt="Back"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                  style={{
                    filter: "brightness(0) saturate(100%) invert(100%)",
                  }}
                />
              </Button>
              <div className="text-white text-xl font-bold">Photos {images.length ? `(${images.length})` : ""}</div>
              <div className="w-10" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* Viewer */}
      <div className="max-w-xl mx-auto px-4">
        {loading ? (
          <div className="h-[60vh] flex items-center justify-center text-gray-500">Loading photos…</div>
        ) : !images.length ? (
          <div className="rounded-2xl bg-white/70 text-center text-sm text-[#7D47B9] py-8 mt-6">
            No photos found for this session
          </div>
        ) : (
          <div className="relative mt-4">
            {/* Image */}
            <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
              <div className="relative w-full aspect-[4/5] sm:aspect-[3/4]">
                <img
                  src={images[index] || "/placeholder.svg?height=800&width=800&query=photo"}
                  alt={`Photo ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* target badge */}
                {targets[index] && (
                  <div className="absolute left-2 bottom-2">
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[rgba(108,211,255,1)] text-white"
                      style={{ boxShadow: "0px 3px 0px 0px #50B0FF" }}
                    >
                      {targets[index]}
                    </span>
                  </div>
                )}
                {/* index indicator */}
                <div className="absolute bottom-2 right-2 text-white/95 bg-black/40 px-2 py-0.5 rounded-full text-xs">
                  {index + 1} / {images.length}
                </div>
              </div>
            </div>

            {/* Prev/Next controls */}
            {images.length > 1 && <></>}
          </div>
        )}

        {/* Thumbnails row */}
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-6 sm:grid-cols-8 gap-2">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden border",
                  i === index ? "border-[rgba(108,211,255,1)] ring-2 ring-[#50B0FF]" : "border-gray-200",
                )}
                aria-label={`Go to photo ${i + 1}`}
              >
                <img
                  src={src || "/placeholder.svg"}
                  alt={`Thumb ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
