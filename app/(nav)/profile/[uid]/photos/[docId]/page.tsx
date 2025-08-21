"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { getUserProfile, type UserProfile } from "@/lib/firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"

type PhotoSession = {
  docId: string
  createdAt: Date
  items: Array<{ imageUrl: string }>
  selfieImageUrl?: string
}

type ProfileData = Pick<UserProfile, "username" | "displayName" | "photoURL">

export default function PhotoDetailPage({ params }: { params: { uid: string; docId: string } }) {
  const router = useRouter()
  const { uid, docId } = params
  const [session, setSession] = useState<PhotoSession | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load session data
        const sessionRef = doc(db, "users", uid, "pathSessions", decodeURIComponent(docId))
        const sessionSnap = await getDoc(sessionRef)

        if (sessionSnap.exists()) {
          const data = sessionSnap.data()
          setSession({
            docId: sessionSnap.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            items: data.items || [],
            selfieImageUrl: data.selfieImageUrl,
          })
        }

        // Load profile data
        const userProfile = await getUserProfile(uid)
        if (userProfile) {
          setProfile({
            username: userProfile.username,
            displayName: userProfile.displayName,
            photoURL: userProfile.photoURL,
          })
        }
      } catch (error) {
        console.error("Failed to load photo session:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [uid, docId])

  if (loading) {
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
            <h1 className="text-lg font-semibold truncate text-white">Loading...</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="mx-auto max-w-md px-4 py-6 min-h-screen bg-no-repeat bg-cover bg-top mb-20 pt-20">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded-2xl" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </main>
      </>
    )
  }

  if (!session || !profile) {
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
            <h1 className="text-lg font-semibold truncate text-white">Not Found</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="mx-auto max-w-md px-4 py-10 min-h-screen bg-no-repeat bg-cover bg-top mb-20 pt-20">
          <p className="text-center text-gray-500">Photo session not found.</p>
        </main>
      </>
    )
  }

  const allImages = [
    ...(session.selfieImageUrl ? [session.selfieImageUrl] : []),
    ...session.items.map((item) => item.imageUrl),
  ]

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
          <h1 className="text-lg font-semibold truncate text-white">Photos</h1>
          <div className="w-10" />
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
        {/* Profile Header */}
        <section className="py-4 bg-[#6CD3FF]">
          <div className="flex items-center gap-4 px-6">
            <Avatar className="ring-4 ring-white w-16 h-16" style={{ boxShadow: "0 4px 0 #50B0FF" }}>
              <AvatarImage
                src={profile.photoURL || "/placeholder.svg?height=64&width=64&query=profile%20photo"}
                alt="Profile photo"
              />
              <AvatarFallback className="font-semibold">
                {profile.displayName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold text-[#7D47B9]">{profile.displayName}</h2>
              <p className="text-sm text-[#7D47B9]">@{profile.username}</p>
              <p className="text-xs text-[#7D47B9]">{session.createdAt.toLocaleDateString()}</p>
            </div>
          </div>
        </section>

        <div className="px-4 py-6">
          {/* Main Image Display */}
          <section className="mb-6">
            <div
              className="relative aspect-square rounded-[2rem] overflow-hidden bg-white"
              style={{ boxShadow: "0 8px 0 #50B0FF" }}
            >
              <img
                src={allImages[selectedImageIndex] || "/placeholder.svg"}
                alt={`Photo ${selectedImageIndex + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />

              {/* Image Counter */}
              <div className="absolute top-4 right-4">
                <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {selectedImageIndex + 1} / {allImages.length}
                </span>
              </div>

              {/* Navigation Arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                    aria-label="Previous image"
                  >
                    <Image
                      src="/icon/arrow_left.svg"
                      alt="Previous"
                      width={16}
                      height={16}
                      className="w-4 h-4 brightness-0"
                    />
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                    aria-label="Next image"
                  >
                    <Image
                      src="/icon/arrow_right.svg"
                      alt="Next"
                      width={16}
                      height={16}
                      className="w-4 h-4 brightness-0"
                    />
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <section className="mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index ? "border-[#50B0FF]" : "border-gray-200"
                    }`}
                  >
                    <img
                      src={imageUrl || "/placeholder.svg"}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Session Info */}
          
        </div>
      </main>
    </>
  )
}
