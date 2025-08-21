import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./client"

export interface FollowRelationship {
  followerId: string
  followingId: string
  createdAt: Date
}

// Check if user A follows user B
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (!db) throw new Error("Firestore not initialized")

  const followRef = doc(db, "users", followerId, "following", followingId)
  const followSnap = await getDoc(followRef)
  return followSnap.exists()
}

// Follow a user
export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized")

  // Add to follower's following list
  const followingRef = doc(db, "users", followerId, "following", followingId)
  await setDoc(followingRef, {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  })

  // Add to following user's followers list
  const followerRef = doc(db, "users", followingId, "followers", followerId)
  await setDoc(followerRef, {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  })
}

// Unfollow a user
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized")

  // Remove from follower's following list
  const followingRef = doc(db, "users", followerId, "following", followingId)
  await deleteDoc(followingRef)

  // Remove from following user's followers list
  const followerRef = doc(db, "users", followingId, "followers", followerId)
  await deleteDoc(followerRef)
}

// Toggle follow status
export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  const isCurrentlyFollowing = await isFollowing(followerId, followingId)

  if (isCurrentlyFollowing) {
    await unfollowUser(followerId, followingId)
    return false
  } else {
    await followUser(followerId, followingId)
    return true
  }
}

// Get following status for multiple users
export async function getFollowingStatus(followerId: string, userIds: string[]): Promise<Record<string, boolean>> {
  if (!db) throw new Error("Firestore not initialized")

  const followingCol = collection(db, "users", followerId, "following")
  const snapshot = await getDocs(followingCol)

  const followingMap: Record<string, boolean> = {}
  userIds.forEach((id) => {
    followingMap[id] = false
  })

  snapshot.docs.forEach((doc) => {
    const followingId = doc.id
    if (userIds.includes(followingId)) {
      followingMap[followingId] = true
    }
  })

  return followingMap
}

// Listen to following status changes for real-time updates
export function listenToFollowingStatus(
  followerId: string,
  callback: (followingMap: Record<string, boolean>) => void,
): Unsubscribe {
  if (!db) throw new Error("Firestore not initialized")

  const followingCol = collection(db, "users", followerId, "following")
  return onSnapshot(followingCol, (snapshot) => {
    const followingMap: Record<string, boolean> = {}
    snapshot.docs.forEach((doc) => {
      followingMap[doc.id] = true
    })
    callback(followingMap)
  })
}

export interface FollowCounts {
  followers: number
  following: number
}

// Get follow counts for a user
export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  if (!db) throw new Error("Firestore not initialized")

  const followersCol = collection(db, "users", userId, "followers")
  const followingCol = collection(db, "users", userId, "following")

  const [followersSnap, followingSnap] = await Promise.all([getDocs(followersCol), getDocs(followingCol)])

  return {
    followers: followersSnap.size,
    following: followingSnap.size,
  }
}

// Listen to follow count changes for real-time updates
export function onFollowCountsChange(userId: string, callback: (counts: FollowCounts) => void): Unsubscribe {
  if (!db) throw new Error("Firestore not initialized")

  const followersCol = collection(db, "users", userId, "followers")
  const followingCol = collection(db, "users", userId, "following")

  let followersCount = 0
  let followingCount = 0

  const unsubFollowers = onSnapshot(followersCol, (snapshot) => {
    followersCount = snapshot.size
    callback({ followers: followersCount, following: followingCount })
  })

  const unsubFollowing = onSnapshot(followingCol, (snapshot) => {
    followingCount = snapshot.size
    callback({ followers: followersCount, following: followingCount })
  })

  // Return a combined unsubscribe function
  return () => {
    unsubFollowers()
    unsubFollowing()
  }
}
