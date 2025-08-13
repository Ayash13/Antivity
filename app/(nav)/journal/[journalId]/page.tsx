"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { AuthGuard } from "@/components/auth-guard"

interface JournalEntry {
  id: string
  resultImageUrl: string
  storyTitle: string
  storyContent: string
  totalDistance: number
  createdAt: Date
  sessionId: string
}

export default function JournalDetailPage() {
  const params = useParams<{ journalId: string }>()
  const journalId = params?.journalId
  const router = useRouter()

  const [journal, setJournal] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const journalData = sessionStorage.getItem(`journal-${journalId}`)
    if (journalData) {
      const parsedJournal = JSON.parse(journalData)
      // Convert createdAt back to Date object if it's a string
      if (typeof parsedJournal.createdAt === "string") {
        parsedJournal.createdAt = new Date(parsedJournal.createdAt)
      }
      setJournal(parsedJournal)
    }
    setLoading(false)
  }, [journalId])

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  return (
    <AuthGuard redirectTo="/">
      <main
        className="min-h-dvh bg-[rgba(226,249,255,1)] text-gray-900 pb-28 bg-no-repeat bg-cover bg-top"
        style={{
          backgroundImage: "url('/images/bg3.webp')",
        }}
      >
        {/* Header with back + title, styled like profile photos */}
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
                    className="filter brightness-0 invert"
                  />
                </Button>
                <div className="text-white text-xl font-bold">Journal </div>
                <div className="w-10" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-xl mx-auto px-4">
          {loading ? (
            <div className="h-[60vh] flex items-center justify-center text-gray-500">Loading journal...</div>
          ) : !journal ? (
            <div className="rounded-2xl bg-white/70 text-center text-sm text-[#7D47B9] py-8 mt-6">
              Journal entry not found
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {/* Journal Image */}
              <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                <div className="relative w-full aspect-[17/30]">
                  <img
                    src={journal.resultImageUrl || "/placeholder.svg?height=800&width=600&query=journal"}
                    alt={journal.storyTitle}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Distance badge */}
                  <div className="absolute left-2 bottom-2">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[rgba(108,211,255,1)] text-white"
                      style={{ boxShadow: "0px 3px 0px 0px #50B0FF" }}
                    >
                      {formatDistance(journal.totalDistance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Journal Content */}
              <div className="bg-white/80 rounded-2xl p-6 space-y-4" style={{ boxShadow: "0 4px 0 #50B0FF" }}>
                <h1 className="text-2xl font-bold text-[#7D47B9]">{journal.storyTitle}</h1>
                <p className="text-gray-700 leading-relaxed">{journal.storyContent}</p>

                {/* Date */}
                <div className="text-sm text-gray-500 pt-2 border-t border-gray-200">
                  {journal.createdAt.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  )
}
