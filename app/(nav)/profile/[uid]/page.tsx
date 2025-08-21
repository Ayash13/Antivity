"use client"

import { useEffect, useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserProfile, type UserProfile } from "@/lib/firebase/firestore"
import {
  getFollowCounts,
  onFollowCountsChange,
  type FollowCounts,
  followUser,
  unfollowUser,
  isFollowing,
} from "@/lib/firebase/follows"
import { getBadges, getCompletedMissionCount, type Badge } from "@/lib/firebase/badges"
import { collection, getCountFromServer, getDocs, where, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/client"

type ProfileData = Pick<UserProfile, "username" | "displayName" | "photoURL" | "createdAt" | "bio">
type DaySession = { docId: string; images: string[]; selfieUrl?: string }

function formatCreatedAt(d?: Date | null) {
  if (!d) return ""
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
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

export default function UserProfilePage({ params }: { params: { uid: string } }) {
  const router = useRouter()
  const { uid } = params
  const [user] = useAuthState(auth)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionCount, setSessionCount] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [daySessions, setDaySessions] = useState<DaySession[]>([])
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 })
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [badges, setBadges] = useState<Badge[]>([])
  const [completedMissions, setCompletedMissions] = useState(0)

  useEffect(() => {
    if (!uid) return

    const loadProfile = async () => {
      try {
        const p = await getUserProfile(uid)
        if (p) {
          setProfile({
            username: p.username,
            displayName: p.displayName,
            photoURL: p.photoURL,
            createdAt: p.createdAt,
            bio: p.bio ?? null,
          })
        }
      } catch (error) {
        console.error("Failed to load user profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [uid])

  useEffect(() => {
    if (!uid) return

    getFollowCounts(uid).then(setFollowCounts)

    const unsubscribe = onFollowCountsChange(uid, setFollowCounts)
    return unsubscribe
  }, [uid])

  useEffect(() => {
    if (!uid) return
    ;(async () => {
      try {
        const colRef = collection(db, "users", uid, "pathSessions")
        const agg = await getCountFromServer(colRef)
        setSessionCount(agg.data().count)
      } catch (err) {
        console.error("Failed to count pathSessions", err)
        setSessionCount(0)
      }
    })()
  }, [uid])

  useEffect(() => {
    if (!uid) return
    ;(async () => {
      try {
        const start = new Date(selectedDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 1)

        const colRef = collection(db, "users", uid, "pathSessions")
        const q = query(
          colRef,
          where("createdAt", ">=", start),
          where("createdAt", "<", end),
          orderBy("createdAt", "desc"),
        )
        const snap = await getDocs(q)

        const sessions: DaySession[] = []
        snap.forEach((d) => {
          const data: any = d.data()
          if (Array.isArray(data?.items)) {
            const urls = data.items
              .map((it: any) => (it?.imageUrl ? String(it.imageUrl) : null))
              .filter(Boolean) as string[]
            if (urls.length)
              sessions.push({
                docId: d.id,
                images: urls,
                selfieUrl: data?.selfieImageUrl || undefined,
              })
          }
        })
        setDaySessions(sessions)
      } catch (e) {
        console.error("Failed to fetch day sessions", e)
        setDaySessions([])
      }
    })()
  }, [uid, selectedDate])

  useEffect(() => {
    if (!user?.uid || !uid || user.uid === uid) return

    const checkFollowStatus = async () => {
      try {
        const following = await isFollowing(user.uid, uid)
        setIsFollowingUser(following)
      } catch (error) {
        console.error("Failed to check follow status:", error)
      }
    }

    checkFollowStatus()
  }, [user?.uid, uid])

  useEffect(() => {
    if (!uid) return

    const loadBadges = async () => {
      try {
        const [badgeList, missionCount] = await Promise.all([getBadges(), getCompletedMissionCount(uid)])
        setBadges(badgeList)
        setCompletedMissions(missionCount)
      } catch (error) {
        console.error("Failed to load badges:", error)
      }
    }

    loadBadges()
  }, [uid])

  const handleFollowToggle = async () => {
    if (!user?.uid || !uid || user.uid === uid || followLoading) return

    setFollowLoading(true)
    try {
      if (isFollowingUser) {
        await unfollowUser(user.uid, uid)
        setIsFollowingUser(false)
      } else {
        await followUser(user.uid, uid)
        setIsFollowingUser(true)
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error)
    } finally {
      setFollowLoading(false)
    }
  }

  const now = new Date()
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])
  const monthLabel = useMemo(
    () => selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [selectedDate],
  )
  const isOwnProfile = user?.uid === uid

  const earnedBadges = useMemo(() => {
    return badges.map((badge) => ({
      ...badge,
      earned: completedMissions >= badge.mission,
    }))
  }, [badges, completedMissions])

  if (loading) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-[#50B0FF] focus:ring-offset-2"
              aria-label="Go back"
            >
              <Image src="/icon/arrow_left.svg" alt="Back" width={20} height={20} className="w-5 h-5 brightness-0" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate">Loading Profile</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        <main className="mx-auto max-w-md px-4 py-6 min-h-screen bg-no-repeat bg-cover bg-top mb-20 pt-20">
          <div className="rounded-[32px] bg-gray-100 p-4">
            <div className="relative h-24 rounded-full bg-gray-200" />
          </div>
          <div className="mt-6 space-y-2 px-2">
            <div className="h-6 w-40 rounded bg-gray-200" />
            <div className="h-4 w-56 rounded bg-gray-100" />
            <div className="h-4 w-24 rounded bg-gray-100" />
          </div>
          <div className="mt-6 rounded-[36px] bg-gray-200 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="h-6 w-40 rounded bg-gray-300" />
              <div className="flex gap-3">
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
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-gray-300" />
              ))}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-gray-200" />
            ))}
          </div>
        </main>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-[#50B0FF] focus:ring-offset-2"
              aria-label="Go back"
            >
              <Image src="/icon/arrow_left.svg" alt="Back" width={20} height={20} className="w-5 h-5 brightness-0" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate">Profile Not Found</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        <main className="mx-auto max-w-md px-4 py-10 min-h-screen bg-no-repeat bg-cover bg-top mb-20 pt-20">
          <p className="text-center text-gray-500">User profile not found.</p>
        </main>
      </>
    )
  }

  const { displayName, username, photoURL, createdAt, bio } = profile
  const level = Math.floor(sessionCount / 3)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-gray-200 bg-[rgba(108,211,255,1)] border-b-0">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-shadow focus:outline-none focus:ring-2 focus:ring-[#50B0FF] focus:ring-offset-2 bg-[rgba(255,204,25,1)] text-white"
            aria-label="Go back"
          >
            <Image
              src="/icon/arrow_left.svg"
              alt="Back"
              width={20}
              height={20}
              className="w-5 h-5 brightness-0 invert"
            />
          </button>
          <h1 className="text-lg font-semibold truncate text-white">{profile?.displayName || "Profile"}</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      <main
        className="relative mx-auto max-w-md min-h-screen bg-no-repeat bg-cover bg-top pt-16 mb-0"
        style={{
          backgroundImage:
            "url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg3-BFx35t1Phlq3cYwSR6R3EjnSDtATYk.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <section className="py-4 bg-[#6CD3FF]">
          <div className="flex items-center gap-4 px-6">
            <div className="flex-shrink-0">
              <Avatar className="ring-4 ring-white w-24 h-24" style={{ boxShadow: "0 5px 0 #50B0FF" }}>
                <AvatarImage
                  src={photoURL || "/placeholder.svg?height=64&width=64&query=profile%20photo"}
                  alt="Profile photo"
                />
                <AvatarFallback className="font-semibold text-lg">
                  {displayName?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 flex justify-around">
              <div className="text-center">
                <div className="text-lg font-bold text-[#7D47B9]">Followers</div>
                <div className="font-extrabold text-[#7D47B9] text-3xl">{followCounts.followers}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#7D47B9]">Following</div>
                <div className="font-extrabold text-[#7D47B9] text-3xl">{followCounts.following}</div>
              </div>
            </div>
          </div>
          {!isOwnProfile && user?.uid && uid && user.uid !== uid && (
            <div className="px-6 pt-4 text-center">
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`py-3 px-6 rounded-full font-semibold text-sm transition-all duration-200 bg-[rgba(80,176,255,1)] w-full ${
                  isFollowingUser ? "bg-[#6CD3FF] text-white" : "bg-white text-[#50B0FF] hover:bg-gray-50"
                } ${followLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                style={{ boxShadow: "0 4px 0 #50B0FF" }}
                aria-label={isFollowingUser ? "Unfollow user" : "Follow user"}
              >
                {followLoading ? "Loading..." : isFollowingUser ? "Following" : "Follow"}
              </button>
            </div>
          )}
        </section>

        <div className="px-4 py-6 pt-0 pl-6 pr-6">
          <section className="mt-6 px-2">
            <h1 className="text-2xl font-extrabold text-[rgba(125,71,185,1)]">{displayName || "Username"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-gray-500">
              <span className="font-medium text-[rgba(174,121,235,1)]">@{username}</span>
              <span className="text-[rgba(174,121,235,1)] font-medium">Joined</span>
              <span className="text-[rgba(174,121,235,1)] font-medium">{formatCreatedAt(createdAt)}</span>
            </div>
            <p className="mt-2 text-[rgba(174,121,235,1)]">{bio && bio.trim().length > 0 ? bio : "No bio yet"}</p>
          </section>

          <section className="mt-6 rounded-[36px] p-5 bg-white">
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
                    <div className="z-10 text-sm font-semibold text-[#7D47B9]">{label}</div>
                    <div className="z-10 text-base font-extrabold tabular-nums leading-none pt-1 text-[#7D47B9]">
                      {String(d.getDate()).padStart(2, "0")}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mt-6 px-1">
            {daySessions.length === 0 ? (
              <div className="text-center text-sm text-[#7D47B9] py-8 bg-white rounded-3xl font-bold">
                No activity on this day
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {daySessions.map((s, idx) => (
                  <button
                    key={s.docId}
                    type="button"
                    onClick={() => router.push(`/profile/${uid}/photos/${encodeURIComponent(s.docId)}`)}
                    className="block w-full rounded-2xl bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#50B0FF]"
                    aria-label={`View session ${idx + 1} with ${s.images.length} photo${s.images.length > 1 ? "s" : ""}`}
                  >
                    <div className="relative aspect-square">
                      <div className="absolute inset-0 p-2">
                        <div
                          className="relative w-full h-full rounded-2xl bg-white overflow-hidden"
                          style={{ boxShadow: "0 4px 0 #50B0FF" }}
                        >
                          <img
                            src={s.images[0] || "/placeholder.svg?height=600&width=600&query=session%20cover"}
                            alt={`Session ${idx + 1} cover`}
                            className="absolute inset-0 h-full w-full object-cover py-1.5 px-1.5 rounded-2xl"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          {s.selfieUrl && (
                            <div className="absolute top-3 left-3 z-10">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                                <img
                                  src={s.selfieUrl || "/placeholder.svg"}
                                  alt="Selfie"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 mb-1.5 ml-1.5">
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs bg-[rgba(108,211,255,1)] text-white font-bold"
                              style={{ boxShadow: "0 3px 0 #50B0FF" }}
                            >
                              {s.images.length + (s.selfieUrl ? 1 : 0)} photo
                              {s.images.length + (s.selfieUrl ? 1 : 0) > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6 mb-12 px-1">
            <h3 className="text-[#7D47B9] mb-6 text-xl font-extrabold text-left">Badges</h3>
            <div className="flex justify-center gap-6 items-center">
              {earnedBadges.slice(0, 3).map((badge, index) => (
                <div key={badge.id} className="flex flex-col items-center gap-2">
                  {badge.earned ? (
                    <img
                      src={badge.badgeUrl || "/placeholder.svg"}
                      alt={badge.name}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">?</span>
                    </div>
                  )}
                  <span className="text-sm text-[#7D47B9] text-center font-bold">
                    {badge.earned ? badge.name : "Locked"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
