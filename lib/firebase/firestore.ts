import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "./client"

export interface UserProfile {
  uid: string
  email: string
  username: string
  displayName: string
  photoURL: string | null
  avatarKind: "emoji" | "image" | "google"
  bio?: string | null
  createdAt: Date
  updatedAt: Date
}

export async function createUserProfile(userProfile: Omit<UserProfile, "createdAt" | "updatedAt">) {
  if (!db) throw new Error("Firestore not initialized")

  const userRef = doc(db, "users", userProfile.uid)
  const now = new Date()

  await setDoc(userRef, {
    ...userProfile,
    bio: (userProfile as any).bio ?? null,
    createdAt: now,
    updatedAt: now,
  })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) throw new Error("Firestore not initialized")

  const userRef = doc(db, "users", uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    const data = userSnap.data()
    return {
      ...data,
      bio: data.bio ?? null,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as UserProfile
  }

  return null
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, "uid" | "createdAt" | "updatedAt">>,
) {
  if (!db) throw new Error("Firestore not initialized")

  const userRef = doc(db, "users", uid)
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date(),
  })
}
