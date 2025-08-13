import {
  serverTimestamp,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  getDoc,
  type DocumentData,
} from "firebase/firestore"
import { db } from "./client"

export type PathSessionItem = {
  index: number
  target: string
  imageUrl: string
  lat?: number | null
  lng?: number | null
  posted?: boolean // whether this item was already posted to social
}

export type SavePathSessionInput = {
  uid: string
  items: PathSessionItem[]
  targets: string[]
  startedAt?: Date | null
  endedAt?: Date | null
}

export type PathSessionDoc = {
  id: string // Firestore doc id
  docId: string
  isoTime?: string
  localTime?: string
  items: PathSessionItem[]
  createdAt?: Date | null
  selfieImageUrl?: string
}

/**
 * Format a local date-time into an ID like 2025-08-09_17-23-45
 */
function formatDocId(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${y}-${m}-${day}_${h}-${min}-${s}`
}

/**
 * Save a single session document under users/{uid}/pathSessions/{docId}
 * docId is the local date-time so it’s human readable and chronological.
 */
export async function savePathSession(input: SavePathSessionInput) {
  if (!db) throw new Error("Firestore not initialized")
  const now = input.endedAt ?? new Date()
  const docId = formatDocId(now)

  const userSessionsCol = collection(db, "users", input.uid, "pathSessions")
  const ref = doc(userSessionsCol, docId)

  const payload = {
    uid: input.uid,
    createdAt: serverTimestamp(),
    docId,
    isoTime: now.toISOString(),
    localTime: docId
      .replace(/_/g, " ")
      .replace(/-/g, ":")
      .replace(/(\d{4}:\d{2}:\d{2})\s/, "$1 "),
    startedAtISO: input.startedAt ? input.startedAt.toISOString() : null,
    endedAtISO: now.toISOString(),
    targets: input.targets,
    items: input.items.map((x) => ({
      index: x.index,
      target: x.target,
      imageUrl: x.imageUrl,
      lat: x.lat ?? null,
      lng: x.lng ?? null,
      posted: x.posted ?? false,
    })),
  }

  await setDoc(ref, payload)
}

/**
 * Get the latest path session for a user (ordered by createdAt desc).
 */
export async function getLatestPathSession(uid: string): Promise<PathSessionDoc | null> {
  if (!db) throw new Error("Firestore not initialized")
  const userSessionsCol = collection(db, "users", uid, "pathSessions")
  const q = query(userSessionsCol, orderBy("createdAt", "desc"), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  const data = d.data() as DocumentData
  const items: PathSessionItem[] = Array.isArray(data.items)
    ? data.items.map((x: any, i: number) => ({
        index: Number(x?.index ?? i),
        target: String(x?.target ?? ""),
        imageUrl: String(x?.imageUrl ?? ""),
        lat: typeof x?.lat === "number" ? x.lat : null,
        lng: typeof x?.lng === "number" ? x.lng : null,
        posted: Boolean(x?.posted ?? false),
      }))
    : []
  return {
    id: d.id,
    docId: data.docId ?? d.id,
    isoTime: data.isoTime ?? undefined,
    localTime: data.localTime ?? undefined,
    items,
    createdAt: data.createdAt?.toDate?.() ?? null,
    selfieImageUrl: data.selfieImageUrl || undefined,
  }
}

/**
 * Fetch a specific session by document ID.
 */
export async function getPathSessionByDocId(uid: string, docId: string): Promise<PathSessionDoc | null> {
  if (!db) throw new Error("Firestore not initialized")
  const ref = doc(db, "users", uid, "pathSessions", docId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data() as DocumentData
  const items: PathSessionItem[] = Array.isArray(data.items)
    ? data.items.map((x: any, i: number) => ({
        index: Number(x?.index ?? i),
        target: String(x?.target ?? ""),
        imageUrl: String(x?.imageUrl ?? ""),
        lat: typeof x?.lat === "number" ? x.lat : null,
        lng: typeof x?.lng === "number" ? x.lng : null,
        posted: Boolean(x?.posted ?? false),
      }))
    : []
  return {
    id: snap.id,
    docId: data.docId ?? snap.id,
    isoTime: data.isoTime ?? undefined,
    localTime: data.localTime ?? undefined,
    items,
    createdAt: data.createdAt?.toDate?.() ?? null,
    selfieImageUrl: data.selfieImageUrl || undefined,
  }
}

/**
 * Mark a specific item in a path session as posted.
 */
export async function markPathItemPosted(uid: string, docId: string, index: number) {
  if (!db) throw new Error("Firestore not initialized")
  const ref = doc(db, "users", uid, "pathSessions", docId)
  await updateDoc(ref, {
    [`items.${index}.posted`]: true,
  })
}

/**
 * Bulk mark multiple items as posted in a single update.
 */
export async function markPathItemsPosted(uid: string, docId: string, indices: number[]) {
  if (!db) throw new Error("Firestore not initialized")
  const ref = doc(db, "users", uid, "pathSessions", docId)
  const updates: Record<string, unknown> = {}
  for (const i of indices) {
    updates[`items.${i}.posted`] = true
  }
  if (Object.keys(updates).length > 0) {
    await updateDoc(ref, updates)
  }
}
