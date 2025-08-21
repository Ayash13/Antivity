"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import { MessageCircle, Search, Heart, X, ImagePlusIcon as PrevIcon, ForwardIcon as NextIcon } from "lucide-react"
import { auth, db } from "@/lib/firebase/client"
import { cn } from "@/lib/utils"
import type { PostRecord } from "@/lib/firebase/posts"
import { toggleLike } from "@/lib/firebase/posts"
import { collection, doc, getDoc, onSnapshot, query, orderBy, limit, type DocumentData } from "firebase/firestore"
import { getUserProfile, type UserProfile } from "@/lib/firebase/firestore"

function timeAgo(date: Date | null) {
  if (!date) return "now"
  const diff = Date.now() - date.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

function GridPreview({
  images,
  onOpen,
}: {
  images: string[]
  onOpen: (startIndex: number) => void
}) {
  if (!images?.length) return null
  if (images.length === 1) {
    return (
      <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
        <button type="button" className="block w-full" onClick={() => onOpen(0)}>
          <img
            src={images[0] || "/placeholder.svg?height=420&width=720&query=post-image"}
            alt="Post media"
            className="w-full h-auto object-cover"
          />
        </button>
      </div>
    )
  }

  const shown = images.slice(0, 4)
  const extra = images.length - shown.length
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
      {shown.map((src, i) => {
        const isLast = i === shown.length - 1 && extra > 0
        return (
          <button key={`${src}-${i}`} type="button" className="relative aspect-square" onClick={() => onOpen(i)}>
            <img
              src={src || "/placeholder.svg?height=360&width=360&query=post-image"}
              alt={`Post media ${i + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {isLast && (
              <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center">
                <span className="text-lg font-semibold">+{extra}</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function FavoritesPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostRecord[]>([])
  const [queryText, setQueryText] = useState("")
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const mounted = useRef(false)
  const [authorMap, setAuthorMap] = useState<
    Record<string, Pick<UserProfile, "displayName" | "username" | "photoURL">>
  >({})

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Listen to all "likes" by current user and load parent posts
  useEffect(() => {
    const u = auth?.currentUser
    if (!db || !u) return

    // Instead of using collectionGroup which requires an index,
    // we'll query posts and check if user has liked them
    const postsRef = collection(db, "posts")
    const qPosts = query(postsRef, orderBy("createdAt", "desc"), limit(100))

    const unsub = onSnapshot(qPosts, async (snap) => {
      const allPosts = snap.docs.map((doc) => {
        const data = doc.data() as DocumentData
        const rawImages = Array.isArray((data as any).images) ? (data as any).images : []
        const images = rawImages.filter((u: any) => typeof u === "string" && u.length > 0)
        const imageUrl = (data as any).imageUrl ?? images[0] ?? null

        return {
          id: doc.id,
          uid: (data as any).uid ?? "",
          content: (data as any).content ?? "",
          imageUrl,
          images,
          createdAt: (data as any).createdAt?.toDate?.() ?? null,
          likesCount: (data as any).likesCount ?? 0,
          repliesCount: (data as any).repliesCount ?? 0,
        } as PostRecord
      })

      // Check which posts the user has liked
      const likedPosts: PostRecord[] = []
      const likedMap: Record<string, boolean> = {}

      for (const post of allPosts) {
        try {
          const likeDoc = await getDoc(doc(db, "posts", post.id, "likes", u.uid))
          if (likeDoc.exists()) {
            likedPosts.push(post)
            likedMap[post.id] = true
          }
        } catch (error) {
          // Skip posts we can't check
          continue
        }
      }

      if (!mounted.current) return

      likedPosts.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0))
      setPosts(likedPosts)
      setLikedMap(likedMap)

      // Load author profiles
      const uids = Array.from(new Set(likedPosts.map((p) => p.uid).filter(Boolean)))
      const entries = await Promise.all(
        uids.map(async (id) => {
          try {
            const prof = await getUserProfile(id)
            if (!prof) return [id, null] as const
            return [id, { displayName: prof.displayName, username: prof.username, photoURL: prof.photoURL }] as const
          } catch {
            return [id, null] as const
          }
        }),
      )

      const amap: Record<string, any> = {}
      for (const [id, prof] of entries) {
        if (prof) amap[id] = prof
      }
      if (!mounted.current) return
      setAuthorMap(amap)
    })

    return () => unsub()
  }, [auth?.currentUser?.uid])

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase()
    if (!q) return posts
    return posts.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        authorMap[p.uid]?.displayName?.toLowerCase().includes(q) ||
        authorMap[p.uid]?.username?.toLowerCase().includes(q),
    )
  }, [posts, queryText, authorMap])

  async function ensureAuthed(): Promise<true | null> {
    if (auth?.currentUser) return true
    router.push("/sign-in")
    return null
  }

  async function onToggleLike(postId: string) {
    const ok = await ensureAuthed()
    if (!ok) return
    try {
      const result = await toggleLike(postId, auth!.currentUser!.uid)
      setLikedMap((prev) => ({ ...prev, [postId]: result }))
      if (!result) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      }
    } catch {
      // ignore
    }
  }

  function goToReply(postId: string) {
    router.push(`/social/${postId}`)
  }

  function openLightbox(images: string[], startIndex: number) {
    setLightboxImages(images)
    setLightboxIndex(startIndex)
    setLightboxOpen(true)
  }

  return (
    <main
      className="min-h-dvh text-gray-900 pb-28 bg-[rgba(226,249,255,1)]"
      style={{
        backgroundImage: 'url("/images/bg3.webp")',
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top center",
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 border-b border-gray-200"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
      >
        <div className="bg-[rgba(108,211,255,1)]">
          <div className="max-w-xl mx-auto px-4 pt-4 pb-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-[#50B0FF] text-gray-700 bg-[rgba(255,204,26,1)]"
                aria-label="Back"
                style={{ boxShadow: "0 3px 0 #50B0FF" }}
              >
                <Image
                  src="/icon/arrow_left.svg"
                  alt="Back"
                  width={20}
                  height={20}
                  className="h-5 w-5 brightness-0 invert"
                />
              </Button>

              <div className="flex-1 text-center">
                <div className="text-white text-xl font-bold">Favorites</div>
              </div>
            </div>

            {/* Search */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Search favorites"
                  className="pl-9 rounded-full bg-white focus-visible:ring-0 focus-visible:ring-offset-0 border-none"
                  aria-label="Search favorites"
                  style={{ boxShadow: "0 4px 0 #50B0FF" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-xl mx-auto px-4 pb-24">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white"
              style={{ boxShadow: "0 4px 0 #50B0FF" }}
            >
              <Heart className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[rgba(125,71,185,1)]">No favorites yet</h2>
            <p className="mt-1 text-[rgba(174,121,235,1)]">Like some posts to see them here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const images = (p.images && p.images.length > 0 ? p.images : p.imageUrl ? [p.imageUrl] : []) as string[]
              return (
                <li key={p.id} className="py-5 border-none">
                  <div className="flex gap-3">
                    <Avatar
                      className="h-12 w-12 rounded-full ring-2 ring-transparent hover:ring-[#50B0FF] hover:bg-[#50B0FF] transition-colors"
                      style={{ boxShadow: "0 4px 0 #50B0FF" }}
                    >
                      <AvatarImage
                        src={authorMap[p.uid]?.photoURL || "/placeholder.svg?height=48&width=48"}
                        alt={`${authorMap[p.uid]?.displayName || "User"} avatar`}
                      />
                      <AvatarFallback>{(authorMap[p.uid]?.displayName || "U").slice(0, 1)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-[rgba(125,71,185,1)]">
                          {authorMap[p.uid]?.displayName || "User"}
                        </span>
                        <span className="text-gray-500">
                          {authorMap[p.uid]?.username ? `@${authorMap[p.uid]?.username}` : `@${p.uid.slice(0, 6)}`}
                        </span>
                        <span className="text-gray-400">· {timeAgo(p.createdAt)}</span>
                      </div>

                      <p className="mt-1 whitespace-pre-wrap break-words text-[rgba(174,121,235,1)]">{p.content}</p>

                      <div className="mt-2">
                        <GridPreview images={images} onOpen={(start) => openLightbox(images, start)} />
                      </div>

                      <div className="mt-2 flex items-center gap-6 text-gray-500 text-sm">
                        <button
                          className="flex items-center gap-1 hover:text-gray-700"
                          aria-label="Reply"
                          onClick={() => goToReply(p.id)}
                        >
                          <MessageCircle className="h-5 w-5" />
                          <span className="tabular-nums">{p.repliesCount}</span>
                        </button>
                        <button
                          className={cn(
                            "flex items-center gap-1 hover:text-gray-700",
                            likedMap[p.id] ? "text-gray-900" : "text-gray-500",
                          )}
                          aria-label="Unlike"
                          onClick={() => onToggleLike(p.id)}
                        >
                          <Heart className={cn("h-5 w-5", likedMap[p.id] ? "fill-[#F64F63] text-[#F64F63]" : "")} />
                          <span className="tabular-nums">{p.likesCount}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            aria-label="Close"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              setLightboxOpen(false)
            }}
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxImages.length > 1 && (
            <button
              aria-label="Previous"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)
              }}
            >
              <PrevIcon className="h-6 w-6" />
            </button>
          )}

          {lightboxImages.length > 1 && (
            <button
              aria-label="Next"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((i) => (i + 1) % lightboxImages.length)
              }}
            >
              <NextIcon className="h-6 w-6" />
            </button>
          )}

          <div className="relative max-w-[92vw] max-h-[80vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImages[lightboxIndex] || "/placeholder.svg?height=1200&width=1200&query=view"}
              alt={`Image ${lightboxIndex + 1} of ${lightboxImages.length}`}
              className="w-full h-full object-contain"
            />
            {lightboxImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/80 text-xs">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
