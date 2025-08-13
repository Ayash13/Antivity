"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { Heart, MessageCircle, Send, X } from "lucide-react"
import {
  addReply,
  listenToPost,
  listenToReplies,
  type PostRecord,
  type ReplyRecord,
  toggleLike,
  hasUserLiked,
} from "@/lib/firebase/posts"
import { auth } from "@/lib/firebase/client"
import { cn } from "@/lib/utils"
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

function GridPreview({ images, onOpen }: { images: string[]; onOpen: (start: number) => void }) {
  if (!images?.length) return null
  if (images.length === 1) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
        <button type="button" className="block w-full" onClick={() => onOpen(0)}>
          <img src={images[0] || "/placeholder.svg"} alt="Post media" className="w-full h-auto object-cover" />
        </button>
      </div>
    )
  }
  const shown = images.slice(0, 4)
  const extra = images.length - shown.length
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
      {shown.map((src, i) => {
        const isLast = i === shown.length - 1 && extra > 0
        return (
          <button key={`${src}-${i}`} type="button" className="relative aspect-square" onClick={() => onOpen(i)}>
            <img
              src={src || "/placeholder.svg"}
              alt={`Media ${i + 1}`}
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

export default function ReplyPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const postId = params?.id

  const [post, setPost] = useState<PostRecord | null>(null)
  const [replies, setReplies] = useState<ReplyRecord[]>([])
  const [liked, setLiked] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [author, setAuthor] = useState<Pick<UserProfile, "displayName" | "username" | "photoURL"> | null>(null)
  const [replyAuthors, setReplyAuthors] = useState<Record<string, UserProfile>>({})
  const [currentUserProfile, setCurrentUserProfile] = useState<Pick<
    UserProfile,
    "displayName" | "username" | "photoURL"
  > | null>(null)

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    if (!postId) return
    const unsubPost = listenToPost(postId, setPost)
    const unsubReplies = listenToReplies(postId, setReplies)
    return () => {
      unsubPost()
      unsubReplies()
    }
  }, [postId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!post?.uid) {
        setAuthor(null)
        return
      }
      try {
        const prof = await getUserProfile(post.uid)
        if (!cancelled) {
          setAuthor(prof ? { displayName: prof.displayName, username: prof.username, photoURL: prof.photoURL } : null)
        }
      } catch {
        if (!cancelled) setAuthor(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [post?.uid])

  useEffect(() => {
    async function checkLiked() {
      if (!postId || !auth?.currentUser) {
        setLiked(false)
        return
      }
      setLiked(await hasUserLiked(postId, auth.currentUser.uid))
    }
    checkLiked()
  }, [postId, auth?.currentUser?.uid])

  useEffect(() => {
    async function fetchReplyAuthors() {
      const uniqueUids = [...new Set(replies.map((r) => r.uid))]
      const authorsData: Record<string, UserProfile> = {}

      await Promise.all(
        uniqueUids.map(async (uid) => {
          if (!replyAuthors[uid]) {
            try {
              const profile = await getUserProfile(uid)
              if (profile) {
                authorsData[uid] = profile
              }
            } catch (error) {
              console.error(`Failed to fetch profile for ${uid}:`, error)
            }
          }
        }),
      )

      setReplyAuthors((prev) => ({ ...prev, ...authorsData }))
    }

    if (replies.length > 0) {
      fetchReplyAuthors()
    }
  }, [replies])

  useEffect(() => {
    let cancelled = false
    async function fetchCurrentUserProfile() {
      if (!auth?.currentUser?.uid) {
        setCurrentUserProfile(null)
        return
      }
      try {
        const profile = await getUserProfile(auth.currentUser.uid)
        if (!cancelled && profile) {
          setCurrentUserProfile({
            displayName: profile.displayName,
            username: profile.username,
            photoURL: profile.photoURL,
          })
        }
      } catch (error) {
        console.error("Failed to fetch current user profile:", error)
        if (!cancelled) setCurrentUserProfile(null)
      }
    }
    fetchCurrentUserProfile()
    return () => {
      cancelled = true
    }
  }, [auth?.currentUser?.uid])

  async function ensureAuthed(): Promise<true | null> {
    if (auth?.currentUser) return true
    router.push("/sign-in")
    return null
  }

  async function onToggleLike() {
    if (!postId) return
    const ok = await ensureAuthed()
    if (!ok) return
    try {
      const result = await toggleLike(postId, auth!.currentUser!.uid)
      setLiked(result)
    } catch {
      // ignore
    }
  }

  async function sendReply() {
    if (!postId || !replyText.trim()) return
    const ok = await ensureAuthed()
    if (!ok) return
    setIsSending(true)
    try {
      const u = auth!.currentUser!
      await addReply(postId, {
        uid: u.uid,
        content: replyText.trim(),
      })
      setReplyText("")
    } finally {
      setIsSending(false)
    }
  }

  if (!postId) return null

  const images = (
    post?.images && post.images.length > 0 ? post.images : post?.imageUrl ? [post.imageUrl] : []
  ) as string[]

  return (
    <main
      className="min-h-dvh bg-[rgba(226,249,255,1)] text-gray-900 pb-28"
      style={{
        backgroundImage: 'url("/images/bg3.webp")',
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top center",
      }}
    >
      {/* Colorful header */}
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
                  className="h-5 w-5 brightness-0 invert"
                />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-white text-xl font-bold">{post ? `Reply (${post.repliesCount})` : "Reply"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thread content */}
      <div className="max-w-xl mx-auto px-4">
        {/* Original post (album-aware, no white card) */}
        <article className="mt-4">
          {post ? (
            <div className="flex gap-3 pb-4 border-b border-gray-200">
              <Avatar
                className="h-12 w-12 rounded-full ring-2 ring-transparent hover:ring-[#50B0FF] hover:bg-[#50B0FF] transition-colors"
                style={{ boxShadow: "0 4px 0 #50B0FF" }}
              >
                <AvatarImage
                  src={author?.photoURL || "/placeholder.svg?height=48&width=48"}
                  alt={`${post.authorName} avatar`}
                />
                <AvatarFallback>{(author?.displayName || "U").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-[rgba(125,71,185,1)]">{author?.displayName || "User"}</span>
                  
                  <span className="text-gray-400">· {timeAgo(post.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[rgba(82,30,130,1)]/80">{post.content}</p>

                {/* Album-aware media */}
                <div className="mt-3">
                  <GridPreview
                    images={images}
                    onOpen={(start) => {
                      setLightboxImages(images)
                      setLightboxIndex(start)
                      setLightboxOpen(true)
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center gap-6 text-gray-500 text-sm">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-5 w-5" />
                    <span className="tabular-nums">{post.repliesCount}</span>
                  </div>
                  <button
                    className={cn(
                      "flex items-center gap-1 hover:text-gray-700",
                      liked ? "text-gray-900" : "text-gray-500",
                    )}
                    onClick={onToggleLike}
                    aria-label="Like"
                  >
                    <Heart className={cn("h-5 w-5", liked ? "fill-[#F64F63] text-[#F64F63]" : "")} />
                    <span className="tabular-nums">{post.likesCount}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-3 text-gray-500">Loading post…</div>
          )}
        </article>

        {/* Reply composer (no white card) */}
        <section className="mt-3 pb-4 border-b border-gray-200">
          <div className="flex gap-3">
            <Avatar
              className="h-12 w-12 rounded-full ring-2 ring-transparent hover:ring-[#50B0FF] hover:bg-[#50B0FF] transition-colors"
              style={{ boxShadow: "0 4px 0 #50B0FF" }}
            >
              <AvatarImage
                src={
                  currentUserProfile?.photoURL || auth?.currentUser?.photoURL || "/placeholder.svg?height=40&width=40"
                }
                alt="Your avatar"
              />
              <AvatarFallback>
                {(currentUserProfile?.displayName || auth?.currentUser?.displayName || "Y").slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Post your reply"
                className="min-h-[96px] resize-y rounded-2xl border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  onClick={sendReply}
                  disabled={!replyText.trim() || isSending}
                  className="rounded-full bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] text-white"
                  style={{ boxShadow: "0 5px 0 #50B0FF" }}
                >
                  {isSending ? (
                    "Replying..."
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>Reply</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Replies heading */}
        <div className="mt-5 mb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[rgba(255,204,25,1)]" />
          <h2 className="text-sm font-semibold tracking-wide text-[rgba(125,71,185,1)] uppercase">
            Replies {post ? `(${post.repliesCount})` : ""}
          </h2>
        </div>

        {/* Replies list */}
        <section className="pb-24">
          <ul className="divide-y divide-gray-200">
            {replies.map((r) => {
              const replyAuthor = replyAuthors[r.uid]
              const displayName = replyAuthor?.displayName || "User"
              const username = replyAuthor?.username || r.uid.slice(0, 6)
              const photoURL = replyAuthor?.photoURL || "/placeholder.svg?height=40&width=40"

              return (
                <li key={r.id} className="py-4">
                  <div className="flex gap-3">
                    <Avatar
                      className="h-12 w-12 rounded-full ring-2 ring-transparent hover:ring-[#50B0FF] hover:bg-[#50B0FF] transition-colors"
                      style={{ boxShadow: "0 4px 0 #50B0FF" }}
                    >
                      <AvatarImage src={photoURL || "/placeholder.svg"} alt={`${displayName} avatar`} />
                      <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-[rgba(125,71,185,1)]">{displayName}</span>
                        
                        <span className="text-gray-400">· {timeAgo(r.createdAt)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[rgba(82,30,130,1)]/80">{r.content}</p>
                    </div>
                  </div>
                </li>
              )
            })}
            {replies.length === 0 && (
              <li className="py-12 text-center text-[rgba(174,121,235,1)]">Be the first to reply.</li>
            )}
          </ul>
        </section>
      </div>

      {/* Lightbox for post images */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex flex-col"
          onClick={() => setLightboxOpen(false)}
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
                setLightboxOpen(false)
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
                  setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)
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
                  setLightboxIndex((i) => (i + 1) % lightboxImages.length)
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
