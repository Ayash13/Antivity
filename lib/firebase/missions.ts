import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  onSnapshot,
  type Unsubscribe,
  setDoc,
} from "firebase/firestore"
import { db } from "./client"

export interface Mission {
  id: string
  title: string
  description: string
  imageUrl: string
  status: boolean
}

export interface PersonalMissionStatus {
  missionId: string
  status: boolean
}

function missionsCol() {
  if (!db) throw new Error("Firestore not initialized")
  return collection(db, "mission")
}

function userMissionsCol(uid: string) {
  if (!db) throw new Error("Firestore not initialized")
  return collection(db, "users", uid, "missions")
}

export async function getMissions(): Promise<Mission[]> {
  if (!db) throw new Error("Firestore not initialized")

  const q = query(missionsCol(), orderBy("title"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title || "",
    description: doc.data().description || "",
    imageUrl: doc.data().imageUrl || "",
    status: doc.data().status || false,
  }))
}

export async function initializeUserMissions(uid: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized")

  // Get all public missions
  const publicMissions = await getMissions()

  // Create personal mission status for each public mission
  const batch = []
  for (const mission of publicMissions) {
    const userMissionRef = doc(db, "users", uid, "missions", mission.id)
    batch.push(
      setDoc(userMissionRef, {
        missionId: mission.id,
        status: false,
      }),
    )
  }

  // Execute all setDoc operations
  await Promise.all(batch)
}

export async function getPersonalMissions(uid: string): Promise<Mission[]> {
  if (!db) throw new Error("Firestore not initialized")

  // Get public mission details
  const publicMissions = await getMissions()

  // Get personal mission status
  const personalMissionsSnapshot = await getDocs(userMissionsCol(uid))
  const personalStatuses = new Map<string, boolean>()

  personalMissionsSnapshot.docs.forEach((doc) => {
    const data = doc.data()
    personalStatuses.set(data.missionId, data.status || false)
  })

  // Combine public details with personal status
  return publicMissions.map((mission) => ({
    ...mission,
    status: personalStatuses.get(mission.id) || false,
  }))
}

export function listenToPersonalMissions(uid: string, callback: (missions: Mission[]) => void): Unsubscribe {
  if (!db) throw new Error("Firestore not initialized")

  return onSnapshot(userMissionsCol(uid), async () => {
    const missions = await getPersonalMissions(uid)
    callback(missions)
  })
}

export async function updatePersonalMissionStatus(uid: string, missionId: string, status: boolean): Promise<void> {
  if (!db) throw new Error("Firestore not initialized")

  const userMissionRef = doc(db, "users", uid, "missions", missionId)
  await updateDoc(userMissionRef, { status })
}

export function getActiveMission(missions: Mission[]): Mission | null {
  return missions.find((mission) => !mission.status) || null
}

// Legacy functions for backward compatibility (now deprecated)
export function listenToMissions(callback: (missions: Mission[]) => void): Unsubscribe {
  if (!db) throw new Error("Firestore not initialized")

  const q = query(missionsCol(), orderBy("title"))
  return onSnapshot(q, (snapshot) => {
    const missions = snapshot.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title || "",
      description: doc.data().description || "",
      imageUrl: doc.data().imageUrl || "",
      status: doc.data().status || false,
    }))
    callback(missions)
  })
}

export async function updateMissionStatus(missionId: string, status: boolean): Promise<void> {
  if (!db) throw new Error("Firestore not initialized")

  const missionRef = doc(db, "mission", missionId)
  await updateDoc(missionRef, { status })
}
