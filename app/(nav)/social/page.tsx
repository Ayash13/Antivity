"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Search, MessageCircle, ChevronDown, ChevronUp, Check, X, Heart } from "lucide-react"
import { createPost, hasUserLiked, listenToPosts, toggleLike, type PostRecord } from "@/lib/firebase/posts"
import { auth } from "@/lib/firebase/client"
import { cn } from "@/lib/utils"
import { getLatestPathSession, type PathSessionDoc } from "@/lib/firebase/path-logs"
import { getUserProfile, type UserProfile } from "@/lib/firebase/firestore"
import { toggleFollow, listenToFollowingStatus } from "@/lib/firebase/follows"
import Image from "next/image"
import { db, getDocs, collection } from "@/lib/firebase/client"

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
          <button
            key={`${src}-${i}`}
            type="button"
            className={cn("relative aspect-square w-full h-full")}
            onClick={() => onOpen(i)}
          >
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

export default function SocialPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostRecord[]>([])
  const [query, setQuery] = useState("")

  // Composer modal state
  const [composerOpen, setComposerOpen] = useState(false)
  const [text, setText] = useState("")

  // Latest path session images
  const [latest, setLatest] = useState<PathSessionDoc | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [loadError, setLoadError] = useState<string>("")
  const [expanded, setExpanded] = useState(false)
  const [selectedMap, setSelectedMap] = useState<Record<number, boolean>>({})
  const [isPosting, setIsPosting] = useState(false)

  // Per-post like state for current user
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})
  const [authorMap, setAuthorMap] = useState<
    Record<string, Pick<UserProfile, "displayName" | "username" | "photoURL">>
  >({})

  const [currentUserProfile, setCurrentUserProfile] = useState<Pick<
    UserProfile,
    "displayName" | "username" | "photoURL"
  > | null>(null)

  // Lightbox for viewing images/albums
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // User search functionality
  const [users, setUsers] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<{ posts: any[]; users: any[] }>({ posts: [], users: [] })
  const [activeSearchTab, setActiveSearchTab] = useState<"people" | "posts">("people")

  useEffect(() => {
    let cancelled = false
    async function fetchCurrentUserProfile() {
      const user = auth?.currentUser
      if (!user) {
        setCurrentUserProfile(null)
        return
      }

      try {
        const profile = await getUserProfile(user.uid)
        if (!cancelled && profile) {
          setCurrentUserProfile({
            displayName: profile.displayName,
            username: profile.username,
            photoURL: profile.photoURL,
          })
        }
      } catch (error) {
        console.error("Failed to fetch current user profile:", error)
        if (!cancelled) {
          setCurrentUserProfile(null)
        }
      }
    }

    fetchCurrentUserProfile()
    return () => {
      cancelled = true
    }
  }, [auth?.currentUser?.uid])

  // Subscribe to posts
  useEffect(() => {
    const unsub = listenToPosts(setPosts)
    return () => unsub()
  }, [])

  // Refresh liked state when posts or user change
  useEffect(() => {
    let canceled = false
    async function run() {
      const user = auth?.currentUser
      if (!user) {
        setLikedMap({})
        return
      }
      const entries = await Promise.all(posts.map(async (p) => [p.id, await hasUserLiked(p.id, user.uid)] as const))
      if (!canceled) {
        const map: Record<string, boolean> = {}
        for (const [id, liked] of entries) map[id] = liked
        setLikedMap(map)
      }
    }
    run()
    return () => {
      canceled = true
    }
  }, [posts, auth?.currentUser?.uid])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const uids = Array.from(new Set(posts.map((p) => p.uid).filter(Boolean)))
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
      if (cancelled) return
      const map: Record<string, any> = {}
      for (const [id, prof] of entries) {
        if (prof) map[id] = prof
      }
      setAuthorMap(map)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [posts])

  useEffect(() => {
    if (!composerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setComposerOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [composerOpen])

  useEffect(() => {
    if (!auth?.currentUser?.uid) {
      setFollowingMap({})
      return
    }

    const unsubscribe = listenToFollowingStatus(auth.currentUser.uid, setFollowingMap)
    return () => unsubscribe()
  }, [auth?.currentUser?.uid])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    fetchUsers()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      setSearchResults({ posts: [], users: [] })
      return posts
    }

    const filteredPosts = posts.filter(
      (p) =>
        (p.content?.toLowerCase() || "").includes(q) ||
        (p.authorName?.toLowerCase() || "").includes(q) ||
        (p.authorHandle?.toLowerCase() || "").includes(q),
    )

    const filteredUsers = users.filter(
      (u) =>
        (u.displayName?.toLowerCase() || "").includes(q) ||
        (u.username?.toLowerCase() || "").includes(q) ||
        (u.email?.toLowerCase() || "").includes(q) ||
        (u.bio?.toLowerCase() || "").includes(q),
    )

    setSearchResults({ posts: filteredPosts, users: filteredUsers })
    return filteredPosts
  }, [posts, users, query])

  const selectedIndices = useMemo(
    () =>
      Object.entries(selectedMap)
        .filter(([, v]) => v)
        .map(([k]) => Number(k)),
    [selectedMap],
  )

  const canPost = useMemo(() => selectedIndices.length > 0 && !isPosting, [selectedIndices.length, isPosting])

  async function ensureAuthed(): Promise<true | null> {
    if (auth?.currentUser) return true
    router.push("/sign-in")
    return null
  }

  // Load latest session on opening the composer
  useEffect(() => {
    async function loadSession() {
      if (!composerOpen) return
      const ok = await ensureAuthed()
      if (!ok) return

      if (!auth?.currentUser) return
      setLoadingSession(true)
      setLoadError("")
      setExpanded(false)
      setSelectedMap({})

      try {
        const doc = await getLatestPathSession(auth.currentUser.uid)
        setLatest(doc || null)
        if (doc?.items?.length || doc?.selfieImageUrl) {
          const next: Record<number, boolean> = {}
          // Select path images
          doc.items?.forEach((it, i) => {
            if (it.imageUrl) next[i] = true
          })
          // Select selfie (use index after all path items)
          if (doc.selfieImageUrl) {
            next[doc.items.length] = true
          }
          setSelectedMap(next)
        }
      } catch (err) {
        console.error("Failed to load latest session", err)
        setLoadError("Could not load your latest walk. Please try again.")
        setLatest(null)
      } finally {
        setLoadingSession(false)
      }
    }
    loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composerOpen])

  async function onToggleLike(postId: string) {
    const ok = await ensureAuthed()
    if (!ok) return
    try {
      const result = await toggleLike(postId, auth!.currentUser!.uid)
      setLikedMap((prev) => ({ ...prev, [postId]: result }))
    } catch (e) {
      console.error("toggleLike failed", e)
    }
  }

  async function onToggleFollow(userId: string) {
    const ok = await ensureAuthed()
    if (!ok) return
    try {
      const result = await toggleFollow(auth!.currentUser!.uid, userId)
      setFollowingMap((prev) => ({ ...prev, [userId]: result }))
    } catch (e) {
      console.error("toggleFollow failed", e)
    }
  }

  function goToReply(postId: string) {
    router.push(`/social/${postId}`)
  }

  async function onOpenComposer() {
    const ok = await ensureAuthed()
    if (ok) setComposerOpen(true)
  }

  const toggleIndex = useCallback((i: number) => {
    setSelectedMap((prev) => ({ ...prev, [i]: !prev[i] }))
  }, [])

  const selectAll = useCallback(() => {
    if (!latest) return
    const next: Record<number, boolean> = {}
    latest.items.forEach((it, i) => {
      if (it.imageUrl) next[i] = true
    })
    if (latest.selfieImageUrl) {
      next[latest.items.length] = true
    }
    setSelectedMap(next)
  }, [latest])

  const clearAll = useCallback(() => setSelectedMap({}), [])

  function openLightbox(images: string[], index: number) {
    setLightboxImages(images)
    setLightboxIndex(index)
    setLightboxOpen(true)
  }
  function closeLightbox() {
    setLightboxOpen(false)
  }
  function prevLightbox() {
    setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)
  }
  function nextLightbox() {
    setLightboxIndex((i) => (i + 1) % lightboxImages.length)
  }

  async function onPost() {
    if (!canPost || !auth?.currentUser || !latest) return
    setIsPosting(true)
    try {
      const u = auth.currentUser
      const pathItemsToPost = selectedIndices
        .filter((i) => i < latest.items.length) // Only path items
        .map((i) => latest.items[i])
        .filter((it) => it && it.imageUrl) as {
        imageUrl: string
        target?: string
      }[]

      const imageUrls = pathItemsToPost.map((it) => it.imageUrl)

      const selfieIndex = latest.items.length
      if (selectedMap[selfieIndex] && latest.selfieImageUrl) {
        imageUrls.unshift(latest.selfieImageUrl) // Add selfie as first image
      }

      const base = text.trim()
      const content = base.length ? base : "From my walk"

      // Create ONE album post containing all selected images
      await createPost({
        uid: u.uid,
        content,
        imageUrls,
      })

      // Reset composer state (no marking as posted; allow re-posting later)
      setText("")
      setSelectedMap({})
      setComposerOpen(false)
    } catch (err) {
      console.error("Failed to post album:", err)
      alert("Failed to post your photos. Please try again.")
    } finally {
      setIsPosting(false)
    }
  }

  // First visible item for collapsed preview
  const firstSelectableIndex = useMemo(() => {
    if (!latest?.items?.length && !latest?.selfieImageUrl) return null
    if (latest.selfieImageUrl) return latest.items.length // Selfie index
    const idx = latest.items.findIndex((it) => it.imageUrl)
    return idx >= 0 ? idx : null
  }, [latest])

  const selectableCount = useMemo(() => {
    const pathCount = latest?.items?.filter((it) => it.imageUrl)?.length ?? 0
    const selfieCount = latest?.selfieImageUrl ? 1 : 0
    return pathCount + selfieCount
  }, [latest])

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
      {/* Header block (blue) */}
      <div
        className="sticky top-0 z-20 border-b border-gray-200"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
      >
        <div className="bg-[rgba(108,211,255,1)]">
          <div className="max-w-xl mx-auto px-4 pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="pr-3">
                <h1 className="text-lg font-extrabold leading-tight text-[rgba(125,71,185,1)]">
                  Welcome to the colony,{" "}
                </h1>
                <p className="text-lg font-extrabold leading-tight -mt-1 text-[rgba(125,71,185,1)]">
                  drop your crumbs!{" "}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl border-gray-300 bg-[rgba(255,204,25,1)] text-white hover:bg-[#50B0FF] border-0 border-none"
                aria-label="Favorites"
                style={{ boxShadow: "0 3px 0 #50B0FF" }}
                onClick={() => router.push("/social/favorites")}
              >
                <Image
                  src="/icon/favorite.svg"
                  alt="Favorites"
                  width={28}
                  height={28}
                  className="w-6 h-6"
                  style={{
                    filter: "brightness(0) invert(1)", // Makes the SVG white
                  }}
                />
              </Button>
            </div>

            {/* Search in header */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="pl-9 rounded-full bg-white focus-visible:ring-0 focus-visible:ring-offset-0 border-none"
                  aria-label="Search posts"
                  style={{ boxShadow: "0 4px 0 #50B0FF" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {query.trim() && (searchResults.users.length > 0 || searchResults.posts.length > 0) && (
        <div className="mt-6 mx-4 bg-white rounded-2xl shadow-lg border-0" style={{ boxShadow: "0 8px 0 #50B0FF" }}>
          <div className="flex bg-gray-50 rounded-t-2xl p-2 gap-2">
            <button
              onClick={() => setActiveSearchTab("people")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-bold transition-all duration-200 rounded-xl relative",
                activeSearchTab === "people"
                  ? "text-white bg-[#50B0FF] shadow-md"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-sm",
              )}
              style={activeSearchTab === "people" ? { boxShadow: "0 3px 0 #3A8FD9" } : {}}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn("w-2 h-2 rounded-full", activeSearchTab === "people" ? "bg-white" : "bg-[#50B0FF]")}
                ></div>
                <span>People</span>
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full font-semibold",
                    activeSearchTab === "people" ? "bg-white/20 text-white" : "bg-[#50B0FF]/10 text-[#50B0FF]",
                  )}
                >
                  {searchResults.users.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveSearchTab("posts")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-bold transition-all duration-200 rounded-xl relative",
                activeSearchTab === "posts"
                  ? "text-white bg-[#6CD3FF] shadow-md"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-sm",
              )}
              style={activeSearchTab === "posts" ? { boxShadow: "0 3px 0 #4AB8E6" } : {}}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn("w-2 h-2 rounded-full", activeSearchTab === "posts" ? "bg-white" : "bg-[#6CD3FF]")}
                ></div>
                <span>Posts</span>
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full font-semibold",
                    activeSearchTab === "posts" ? "bg-white/20 text-white" : "bg-[#6CD3FF]/10 text-[#6CD3FF]",
                  )}
                >
                  {searchResults.posts.length}
                </span>
              </div>
            </button>
          </div>

          {activeSearchTab === "people" && searchResults.users.length > 0 && (
            <div className="p-6">
              <div className="space-y-3">
                {searchResults.users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    onClick={() => router.push(`/profile/${user.uid || user.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl cursor-pointer"
                  >
                    <Avatar className="h-14 w-14 ring-2 ring-white shadow-lg">
                      <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-[#50B0FF] to-[#6CD3FF] text-white text-lg font-semibold">
                        {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate text-lg">{user.displayName || "Unknown User"}</p>
                      <p className="text-sm text-[#50B0FF] font-medium truncate">
                        @{user.username || user.email?.split("@")[0] || "user"}
                      </p>
                      {user.bio && <p className="text-sm text-gray-600 truncate mt-1 leading-relaxed">{user.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSearchTab === "posts" && searchResults.posts.length > 0 && (
            <div className="p-6">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-gray-700 font-medium">
                  Found {searchResults.posts.length} post{searchResults.posts.length !== 1 ? "s" : ""} matching your
                  search
                </p>
                <p className="text-xs text-gray-500 mt-1">Scroll down to see posts in the main feed</p>
              </div>
            </div>
          )}
        </div>
      )}

      {query.trim() && searchResults.users.length === 0 && searchResults.posts.length === 0 && (
        <div
          className="mt-6 mx-4 bg-white rounded-2xl shadow-lg border-0 p-8 text-center"
          style={{ boxShadow: "0 8px 0 #50B0FF" }}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">No results found</p>
          <p className="text-sm text-gray-500">Try searching for different keywords or check your spelling</p>
        </div>
      )}

      {/* Feed */}
      <div className="max-w-xl mx-auto px-4 pb-24">
        <ul className="divide-y divide-gray-100">
          {filtered.map((p) => {
            const images = (p.images && p.images.length > 0 ? p.images : p.imageUrl ? [p.imageUrl] : []) as string[]
            return (
              <li key={p.id} className="py-5 border-none">
                <div className="flex gap-3">
                  <Avatar
                    className="rounded-full ring-2 ring-transparent hover:ring-[#50B0FF] hover:bg-[#50B0FF] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#50B0FF] focus:ring-offset-2 w-14 h-14"
                    style={{ boxShadow: "0 4px 0 #50B0FF" }}
                    onClick={() => router.push(`/profile/${p.uid}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        router.push(`/profile/${p.uid}`)
                      }
                    }}
                    aria-label={`View ${authorMap[p.uid]?.displayName || "User"}'s profile`}
                  >
                    <AvatarImage
                      src={authorMap[p.uid]?.photoURL || "/placeholder.svg?height=48&width=48"}
                      alt={`${authorMap[p.uid]?.displayName || "User"} avatar`}
                    />
                    <AvatarFallback>{(authorMap[p.uid]?.displayName || "U").slice(0, 1)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Header row with follow button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-[rgba(125,71,185,1)]">
                          {authorMap[p.uid]?.displayName || "User"}
                        </span>
                        <span className="text-gray-400">· {timeAgo(p.createdAt)}</span>
                      </div>

                      {p.uid !== auth?.currentUser?.uid && (
                        <button
                          className={cn(
                            "rounded-full text-xs font-semibold transition-colors flex-shrink-0 py-1.5 px-3",
                            followingMap[p.uid]
                              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              : "bg-[rgba(108,211,255,1)] text-white hover:bg-[#50B0FF]",
                          )}
                          style={{ boxShadow: "0 2px 0 #50B0FF" }}
                          onClick={() => onToggleFollow(p.uid)}
                          aria-label={followingMap[p.uid] ? "Unfollow user" : "Follow user"}
                        >
                          {followingMap[p.uid] ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>

                    {/* Content preview */}
                    <p className="mt-1 whitespace-pre-wrap break-words text-[rgba(174,121,235,1)] tracking-normal text-sm">
                      {p.content}
                    </p>

                    {/* Media panel: album-aware */}
                    <div className="mt-2">
                      <GridPreview images={images} onOpen={(start) => openLightbox(images, start)} />
                    </div>

                    {/* Actions */}
                    <div className="mt-2 flex items-center gap-6 text-gray-500 text-sm ml-2">
                      <button
                        className="flex items-center gap-1 hover:text-gray-700"
                        aria-label="Reply"
                        onClick={() => goToReply(p.id)}
                      >
                        <MessageCircle className="h-6 w-6" />
                        <span className="tabular-nums">{p.repliesCount}</span>
                      </button>
                      <button
                        className={cn(
                          "flex items-center gap-1 hover:text-gray-700",
                          likedMap[p.id] ? "text-gray-900" : "text-gray-500",
                        )}
                        aria-label="Like"
                        onClick={() => onToggleLike(p.id)}
                      >
                        <Heart className={cn("h-6 w-6", likedMap[p.id] ? "fill-[#F64F63] text-[#F64F63]" : "")} />
                        <span className="tabular-nums">{p.likesCount}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
          {filtered.length === 0 && <li className="py-12 text-center text-gray-500">No posts match "{query}".</li>}
        </ul>
      </div>

      {/* Floating Add Button */}
      <Button
        type="button"
        onClick={onOpenComposer}
        className="fixed right-4 z-40 h-14 w-14 rounded-full mb-8 bg-[rgba(108,211,255,1)] text-white hover:bg-[#50B0FF]"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)", boxShadow: "0 3px 0 #50B0FF" }}
        aria-label="Create post"
      >
        <Image
          src="/icon/plus.svg"
          alt="Create post"
          width={40}
          height={40}
          className="w-10 h-10"
          style={{
            filter: "brightness(0) invert(1)", // Makes the SVG white
          }}
        />
      </Button>

      {/* Composer Modal - Custom from-scratch modal (no shadcn Dialog) */}
      {composerOpen && (
        <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true" aria-label="Share your walk composer">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setComposerOpen(false)} />

          {/* Panel wrapper: bottom sheet on mobile, centered on larger screens */}
          <div className="absolute inset-0 flex items-end sm:items-center justify-center">
            <div
              className="w-full sm:w-auto sm:max-w-xl p-0 overflow-hidden rounded-t-3xl sm:rounded-3xl border border-gray-100 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-[rgba(125,71,185,1)]">Share your walk</h2>
                <button
                  aria-label="Close composer"
                  className="h-9 w-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-gray-600"
                  onClick={() => setComposerOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body (keep your existing body content here) */}
              <div className="px-4 sm:px-6 pb-2">
                {/* Caption */}
                <div className="flex gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={currentUserProfile?.photoURL || "/placeholder.svg?height=40&width=40"}
                      alt="Your avatar"
                    />
                    <AvatarFallback>
                      {(currentUserProfile?.displayName || auth?.currentUser?.displayName || "Y").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Add a caption for this album"
                      className="min-h-[84px] resize-y border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl bg-slate-100"
                    />
                  </div>
                </div>

                {/* Session picker */}
                <div className="rounded-2xl text-center">
                  {loadingSession ? (
                    <div className="py-10 text-center text-gray-500">Loading your latest walk…</div>
                  ) : loadError ? (
                    <div className="py-8 text-center text-red-600">{loadError}</div>
                  ) : !latest ? (
                    <div className="py-8 text-center">
                      <p className="text-gray-600 mb-3">No recent walk found.</p>
                      <Button
                        onClick={() => {
                          setComposerOpen(false)
                          router.push("/main")
                        }}
                        className="rounded-full bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] text-white"
                        style={{ boxShadow: "0 5px 0 #50B0FF" }}
                      >
                        Start a walk
                      </Button>
                    </div>
                  ) : selectableCount === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-gray-600 mb-3">No photos in your latest walk yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Collapsed preview */}
                      {!expanded && firstSelectableIndex !== null && (
                        <button
                          type="button"
                          onClick={() => setExpanded(true)}
                          className="relative w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden border border-gray-200 bg-gray-100"
                        >
                          <div className="relative w-full aspect-square">
                            {(() => {
                              const items = latest.items.filter((it) => it.imageUrl).slice(0, 4)
                              if (items.length > 1) {
                                return (
                                  <div className="grid grid-cols-2 grid-rows-2 gap-0 absolute inset-0">
                                    {items.map((it, idx) => (
                                      <div key={idx} className="relative w-full h-full">
                                        <img
                                          src={it.imageUrl || "/placeholder.svg?height=360&width=360&query=walk-photo"}
                                          alt={it.target ? `Found: ${it.target}` : "Walk photo"}
                                          className="absolute inset-0 w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )
                              }
                              const single = latest.items[firstSelectableIndex!]
                              return (
                                <img
                                  src={single?.imageUrl || "/placeholder.svg?height=720&width=720&query=walk-photo"}
                                  alt={single?.target || "Walk photo"}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              )
                            })()}
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent text-white">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {selectedIndices.length} selected of {selectableCount}
                                </span>
                                <span className="inline-flex items-center gap-1 text-sm font-semibold">
                                  Show all <ChevronDown className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Expanded grid - smaller tiles, 2 per row on mobile */}
                      {expanded && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[rgba(125,71,185,1)]"
                              onClick={() => setExpanded(false)}
                            >
                              <ChevronUp className="h-4 w-4" />
                              Collapse
                            </button>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={selectAll}
                                className="text-sm text-[rgba(125,71,185,1)] font-medium"
                              >
                                Select all
                              </button>
                              <span className="text-gray-300">·</span>
                              <button type="button" onClick={clearAll} className="text-sm text-gray-600">
                                Clear
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
                            {latest.selfieImageUrl &&
                              (() => {
                                const selfieIndex = latest.items.length
                                const selected = !!selectedMap[selfieIndex]
                                return (
                                  <button
                                    key="selfie"
                                    type="button"
                                    onClick={() => toggleIndex(selfieIndex)}
                                    className={cn(
                                      "relative group rounded-2xl overflow-hidden border transition-all aspect-square",
                                      selected
                                        ? "border-[rgba(108,211,255,1)] ring-2 ring-[#50B0FF]"
                                        : "border-gray-200",
                                    )}
                                  >
                                    <img
                                      src={latest.selfieImageUrl || "/placeholder.svg"}
                                      alt="Selfie"
                                      className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    {/* Selfie label */}
                                    <div className="absolute left-2 bottom-2 pointer-events-none">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-white/90 text-[rgba(125,71,185,1)]">
                                        Selfie
                                      </span>
                                    </div>
                                    {/* Selected check */}
                                    <div
                                      className={cn(
                                        "absolute right-2 top-2 rounded-full flex items-center justify-center transition-all",
                                        "h-6 w-6 sm:h-7 sm:w-7",
                                        selected
                                          ? "bg-[rgba(108,211,255,1)] text-white"
                                          : "bg-white/90 text-gray-600 group-hover:bg-white",
                                      )}
                                    >
                                      <Check className="h-4 w-4" />
                                    </div>
                                  </button>
                                )
                              })()}

                            {latest.items.map((it, idx) => {
                              const selected = !!selectedMap[idx]
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => toggleIndex(idx)}
                                  disabled={!it.imageUrl}
                                  className={cn(
                                    "relative group rounded-2xl overflow-hidden border transition-all aspect-square",
                                    !it.imageUrl
                                      ? "opacity-60 cursor-not-allowed border-gray-200"
                                      : selected
                                        ? "border-[rgba(108,211,255,1)] ring-2 ring-[#50B0FF]"
                                        : "border-gray-200",
                                  )}
                                >
                                  {it.imageUrl ? (
                                    <img
                                      src={it.imageUrl || "/placeholder.svg?height=720&width=720&query=walk-photo"}
                                      alt={it.target ? `Found: ${it.target}` : "Walk photo"}
                                      className="absolute inset-0 w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 bg-gray-100" />
                                  )}
                                  {/* Target pill */}
                                  {it.target && (
                                    <div className="absolute left-2 bottom-2 pointer-events-none">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-white/90 text-[rgba(125,71,185,1)]">
                                        {it.target}
                                      </span>
                                    </div>
                                  )}
                                  {/* Selected check (slightly smaller on mobile) */}
                                  {it.imageUrl && (
                                    <div
                                      className={cn(
                                        "absolute right-2 top-2 rounded-full flex items-center justify-center transition-all",
                                        "h-6 w-6 sm:h-7 sm:w-7",
                                        selected
                                          ? "bg-[rgba(108,211,255,1)] text-white"
                                          : "bg-white/90 text-gray-600 group-hover:bg-white",
                                      )}
                                    >
                                      <Check className="h-4 w-4" />
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>

                          <div className="mt-2 text-sm text-gray-600">{selectedIndices.length} selected</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 gap-3 flex justify-end">
                <Button
                  onClick={onPost}
                  disabled={!canPost}
                  className="rounded-full bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] text-white disabled:opacity-50"
                  style={{ boxShadow: "0 5px 0 #50B0FF" }}
                >
                  {isPosting ? (
                    "Posting…"
                  ) : canPost ? (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>{`Post ${selectedIndices.length}`}</span>
                    </div>
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex flex-col"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <div className="flex items-center justify-between p-4 bg-black/20">
            <div className="w-10" /> {/* Spacer */}
            {/* Image counter */}
            {lightboxImages.length > 1 && (
              <div className="text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            )}
            {/* Close button */}
            <button
              aria-label="Close"
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                closeLightbox()
              }}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 relative">
            {/* Previous button - positioned on left side */}
            {lightboxImages.length > 1 && (
              <button
                aria-label="Previous image"
                className="absolute left-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  prevLightbox()
                }}
              >
                <Image
                  src="/icon/arrow_left.svg"
                  alt="Previous"
                  width={24}
                  height={24}
                  className="h-6 w-6 brightness-0 invert"
                />
              </button>
            )}

            {/* Main image */}
            <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightboxImages[lightboxIndex] || "/placeholder.svg?height=600&width=400&query=view"}
                alt={`Image ${lightboxIndex + 1} of ${lightboxImages.length}`}
                className="w-full h-auto object-contain rounded-2xl"
                style={{ maxHeight: "60vh" }}
              />
            </div>

            {/* Next button - positioned on right side */}
            {lightboxImages.length > 1 && (
              <button
                aria-label="Next image"
                className="absolute right-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  nextLightbox()
                }}
              >
                <Image
                  src="/icon/arrow_right.svg"
                  alt="Next"
                  width={24}
                  height={24}
                  className="h-6 w-6 brightness-0 invert"
                />
              </button>
            )}
          </div>

          {/* Thumbnails */}
          {lightboxImages.length > 1 && (
            <div className="p-4 bg-black/20">
              <div className="flex gap-2 justify-center overflow-x-auto">
                {lightboxImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxIndex(idx)
                    }}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                      idx === lightboxIndex
                        ? "border-white ring-2 ring-white/50"
                        : "border-white/30 hover:border-white/60",
                    )}
                  >
                    <img
                      src={img || "/placeholder.svg?height=64&width=64&query=thumb"}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
