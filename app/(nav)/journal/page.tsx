"use client"

import { useEffect, useState, useMemo } from "react"
import { auth, db } from "@/lib/firebase/client"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { AuthGuard } from "@/components/auth-guard"
import { useRouter } from "next/navigation"
import Image from "next/image"

type JournalEntry = {
  id: string
  sessionId: string
  resultImageUrl: string
  storyTitle: string
  storyContent: string
  totalDistance: number
  createdAt: Date
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDates(anchor: Date) {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function JournalPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [dayEntries, setDayEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])
  const monthLabel = useMemo(
    () => selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [selectedDate],
  )

  useEffect(() => {
    async function loadJournalEntries() {
      try {
        const user = auth?.currentUser
        if (!user) return

        const pathSessionsRef = collection(db, "users", user.uid, "pathSessions")
        const pathSessionsSnap = await getDocs(pathSessionsRef)

        const allEntries: JournalEntry[] = []

        for (const sessionDoc of pathSessionsSnap.docs) {
          const journalRef = collection(db, "users", user.uid, "pathSessions", sessionDoc.id, "journal")
          const journalSnap = await getDocs(query(journalRef, orderBy("createdAt", "desc")))

          journalSnap.forEach((journalDoc) => {
            const data = journalDoc.data()
            allEntries.push({
              id: journalDoc.id,
              sessionId: sessionDoc.id,
              resultImageUrl: data.resultImageUrl || "",
              storyTitle: data.storyTitle || "Untitled",
              storyContent: data.storyContent || "",
              totalDistance: data.totalDistance || 0,
              createdAt: data.createdAt?.toDate() || new Date(),
            })
          })
        }

        allEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        setJournalEntries(allEntries)
      } catch (error) {
        console.error("Failed to load journal entries:", error)
      } finally {
        setLoading(false)
      }
    }

    loadJournalEntries()
  }, [])

  useEffect(() => {
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    const filtered = journalEntries.filter((entry) => entry.createdAt >= start && entry.createdAt < end)
    setDayEntries(filtered)
  }, [selectedDate, journalEntries])

  const handleJournalClick = (entry: JournalEntry) => {
    // Store journal data in sessionStorage for the detail page
    sessionStorage.setItem(
      `journal-${entry.id}`,
      JSON.stringify({
        ...entry,
        createdAt: entry.createdAt.toISOString(), // Convert Date to string for storage
      }),
    )
    router.push(`/journal/${entry.id}`)
  }

  if (loading) {
    return (
      <AuthGuard redirectTo="/">
        <main className="mx-auto max-w-md px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </main>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard redirectTo="/">
      <main
        className="relative mx-auto max-w-md px-4 py-6 min-h-screen bg-no-repeat bg-cover bg-top mb-20"
        style={{
          backgroundImage: "url('/images/bg3.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Header */}
        <section className="mb-6">
          <h1 className="text-3xl font-extrabold text-[rgba(125,71,185,1)] text-center">Journal</h1>
        </section>

        {/* Calendar card */}
        <section className="mb-6 rounded-[36px] p-5 bg-white">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-extrabold text-[rgba(125,71,185,1)] text-xl">{monthLabel}</h2>
            <div className="flex items-center gap-3">
              <button
                aria-label="Previous day"
                onClick={() =>
                  setSelectedDate((d) => {
                    const nd = new Date(d)
                    nd.setDate(d.getDate() - 1)
                    return nd
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAD02C]"
              >
                <Image
                  src="/icon/arrow_left.svg"
                  alt="Previous"
                  width={16}
                  height={16}
                  className="h-4 w-4 brightness-0 invert"
                />
              </button>
              <button
                aria-label="Next day"
                onClick={() =>
                  setSelectedDate((d) => {
                    const nd = new Date(d)
                    nd.setDate(d.getDate() + 1)
                    return nd
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAD02C]"
              >
                <Image
                  src="/icon/arrow_right.svg"
                  alt="Next"
                  width={16}
                  height={16}
                  className="h-4 w-4 brightness-0 invert"
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center mt-1 h-20">
            {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => {
              const d = weekDates[i]
              const highlight = isSameDay(d, selectedDate)
              const hasEntries = journalEntries.some((entry) => isSameDay(entry.createdAt, d))

              return (
                <div
                  key={label}
                  className="relative flex cursor-pointer flex-col items-center justify-center gap-2 py-1 text-[#7D47B9]"
                  onClick={() => setSelectedDate(d)}
                  role="button"
                  aria-pressed={highlight}
                  aria-label={`Select ${label} ${d.toDateString()}`}
                >
                  {highlight && (
                    <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-12 rounded-full bg-cyan-200/60 h-full sm:w-9" />
                  )}
                  {hasEntries && !highlight && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-[#6CD3FF] rounded-full" />
                  )}
                  <div className="z-10 text-sm font-semibold text-[#7D47B9]">{label}</div>
                  <div className="z-10 text-base font-extrabold tabular-nums leading-none pt-1 text-[#7D47B9]">
                    {String(d.getDate()).padStart(2, "0")}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Journal entries grid */}
        <section className="px-1">
          {dayEntries.length === 0 ? (
            <div className="text-center text-sm text-[#7D47B9] py-8 bg-white rounded-3xl font-bold">
              No journal entries for this day
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {dayEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleJournalClick(entry)}
                  className="block w-full rounded-2xl bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#50B0FF]"
                  aria-label={`View journal entry: ${entry.storyTitle}`}
                >
                  <div className="relative aspect-[17/30]">
                    <div className="absolute inset-0 p-2">
                      <div
                        className="relative w-full h-full rounded-2xl bg-white overflow-hidden"
                        style={{ boxShadow: "0 4px 0 #50B0FF" }}
                      >
                        <img
                          src={entry.resultImageUrl || "/placeholder.svg?height=600&width=600&query=journal%20entry"}
                          alt={entry.storyTitle}
                          className="absolute inset-0 w-full object-cover py-1.5 px-1.5 rounded-2xl h-full"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2 left-2 mb-1.5 ml-1.5"></div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </AuthGuard>
  )
}
