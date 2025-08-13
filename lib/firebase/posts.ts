import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./client"

export type PostRecord = {
  id: string
  uid: string
  content: string
  // Backward-compatible single image
  imageUrl?: string | null
  // New: multiple images (album)
  images?: string[]
  createdAt: Date | null
  likesCount: number
  repliesCount: number
}

export type ReplyRecord = {
  id: string
  uid: string
  content: string
  createdAt: Date | null
}

function postsCol() {
  if (!db) throw new Error("Firestore not initialized")
  return collection(db, "posts")
}

export async function createPost(input: {
  uid: string
  content: string
  imageUrls?: string[] // album (optional)
}) {
  const images = Array.isArray(input.imageUrls) ? input.imageUrls.filter(Boolean) : []
  const first = images[0] ?? null

  const ref = await addDoc(postsCol(), {
    uid: input.uid,
    content: input.content,
    // Keep both for compatibility
    imageUrl: first,
    images: images,
    createdAt: serverTimestamp(),
    likesCount: 0,
    repliesCount: 0,
  })
  return ref.id
}

function mapPostDoc(d: any, id: string): PostRecord {
  const rawImages = Array.isArray(d.images) ? d.images : []
  const images = rawImages.filter((u: any) => typeof u === "string" && u.length > 0)
  const single = d.imageUrl ?? (images.length > 0 ? images[0] : null)

  return {
    id,
    uid: d.uid ?? "",
    content: d.content ?? "",
    imageUrl: single,
    images: images,
    createdAt: d.createdAt?.toDate?.() ?? null,
    likesCount: d.likesCount ?? 0,
    repliesCount: d.repliesCount ?? 0,
  }
}

export function listenToPosts(cb: (posts: PostRecord[]) => void): Unsubscribe {
  const q = query(postsCol(), orderBy("createdAt", "desc"))
  return onSnapshot(q, (snap) => {
    const list: PostRecord[] = snap.docs.map((doc) => {
      const data = doc.data() as any
      return mapPostDoc(data, doc.id)
    })
    cb(list)
  })
}

export function listenToPost(postId: string, cb: (post: PostRecord | null) => void): Unsubscribe {
  const ref = doc(db!, "posts", postId)
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return cb(null)
    const data = snap.data() as any
    cb(mapPostDoc(data, snap.id))
  })
}

// Likes are stored in posts/{postId}/likes/{uid}
export async function hasUserLiked(postId: string, uid: string): Promise<boolean> {
  const likeRef = doc(db!, "posts", postId, "likes", uid)
  const likeSnap = await getDoc(likeRef)
  return likeSnap.exists()
}

export async function toggleLike(postId: string, uid: string) {
  if (!db) throw new Error("Firestore not initialized")
  const likeRef = doc(db, "posts", postId, "likes", uid)
  const postRef = doc(db, "posts", postId)
  const liked = await getDoc(likeRef)

  if (liked.exists()) {
    await deleteDoc(likeRef)
    await updateDoc(postRef, { likesCount: increment(-1) })
    return false
  } else {
    await setDoc(likeRef, { uid, createdAt: serverTimestamp() })
    await updateDoc(postRef, { likesCount: increment(1) })
    return true
  }
}

// Replies live in posts/{postId}/replies
export async function addReply(
  postId: string,
  input: {
    uid: string
    content: string
  },
) {
  const repliesCol = collection(db!, "posts", postId, "replies")
  await addDoc(repliesCol, {
    uid: input.uid,
    content: input.content,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db!, "posts", postId), { repliesCount: increment(1) })
}

export function listenToReplies(postId: string, cb: (replies: ReplyRecord[]) => void): Unsubscribe {
  const repliesCol = collection(db!, "posts", postId, "replies")
  const q = query(repliesCol, orderBy("createdAt", "asc"))
  return onSnapshot(q, (snap) => {
    const list: ReplyRecord[] = snap.docs.map((d) => {
      const data = d.data() as any
      return {
        id: d.id,
        uid: data.uid ?? "",
        content: data.content ?? "",
        createdAt: data.createdAt?.toDate?.() ?? null,
      }
    })
    cb(list)
  })
}
