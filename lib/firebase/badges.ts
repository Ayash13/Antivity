import { collection, getDocs, query, orderBy, onSnapshot, type Unsubscribe } from "firebase/firestore"
import { db } from "./client"
import { getPersonalMissions } from "./missions"

export interface Badge {
  id: string
  name: string
  badgeUrl: string
  mission: number // Number of missions required to earn this badge
}

export interface EarnedBadge extends Badge {
  earned: boolean
}

function badgesCol() {
  if (!db) throw new Error("Firestore not initialized")
  return collection(db, "badge")
}

export async function getBadges(): Promise<Badge[]> {
  if (!db) throw new Error("Firestore not initialized")

  const q = query(badgesCol(), orderBy("mission"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name || "",
    badgeUrl: doc.data().badgeUrl || "",
    mission: doc.data().mission || 0,
  }))
}

export async function getUserEarnedBadges(uid: string): Promise<EarnedBadge[]> {
  if (!db) throw new Error("Firestore not initialized")

  // Get all badges
  const badges = await getBadges()

  // Get user's completed missions count
  const completedMissionsCount = await getCompletedMissionCount(uid)

  // Check which badges are earned based on completed missions
  return badges.map((badge) => ({
    ...badge,
    earned: completedMissionsCount >= badge.mission,
  }))
}

export async function getCompletedMissionCount(uid: string): Promise<number> {
  if (!db) throw new Error("Firestore not initialized")

  const personalMissions = await getPersonalMissions(uid)
  return personalMissions.filter((mission) => mission.status).length
}

export function listenToUserEarnedBadges(uid: string, callback: (badges: EarnedBadge[]) => void): Unsubscribe {
  if (!db) throw new Error("Firestore not initialized")

  // Listen to changes in both badges and user missions
  return onSnapshot(badgesCol(), async () => {
    const earnedBadges = await getUserEarnedBadges(uid)
    callback(earnedBadges)
  })
}
