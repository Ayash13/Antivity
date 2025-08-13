import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
}

// Validate that all required config values are present
const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"] as const

for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    throw new Error(
      `Missing Firebase config: ${key}. Make sure NEXT_PUBLIC_FIREBASE_${key.toUpperCase()} is set in your environment variables.`,
    )
  }
}

// Initialize Firebase app
let app
if (typeof window !== "undefined") {
  // Client-side initialization
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
} else {
  // Server-side - return null or minimal config
  app = null
}

// Initialize services only on client-side
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null
const storage = app ? getStorage(app) : null

export { app, auth, db, storage }
