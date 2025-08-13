import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "./client"

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  if (!storage) throw new Error("Firebase Storage not initialized")

  const fileExtension = file.name.split(".").pop()
  const fileName = `photo_profile/${uid}.${fileExtension}` // Changed folder from profile-photos to photo_profile
  const storageRef = ref(storage, fileName)

  // Upload the file
  const snapshot = await uploadBytes(storageRef, file)

  // Get the download URL
  const downloadURL = await getDownloadURL(snapshot.ref)

  return downloadURL
}

export async function deleteProfilePhoto(uid: string, photoURL: string) {
  if (!storage) return

  try {
    // Extract the file path from the URL
    const url = new URL(photoURL)
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/)
    if (pathMatch) {
      const filePath = decodeURIComponent(pathMatch[1])
      const storageRef = ref(storage, filePath)
      await deleteObject(storageRef)
    }
  } catch (error) {
    console.error("Error deleting profile photo:", error)
  }
}

// Convert File to base64 for preview
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function uploadPostImages(imageUrls: string[]): Promise<string[]> {
  if (!storage) throw new Error("Firebase Storage not initialized")

  const uploadPromises = imageUrls.map(async (imageUrl, index) => {
    try {
      // Fetch the image from the current URL (likely free image host)
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)

      const blob = await response.blob()

      // Generate a unique filename for the post image
      const timestamp = Date.now()
      const fileName = `post/${timestamp}_${index}.jpg`
      const storageRef = ref(storage, fileName)

      // Upload to Firebase Storage
      const snapshot = await uploadBytes(storageRef, blob)

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref)

      return downloadURL
    } catch (error) {
      console.error(`Failed to upload image ${index}:`, error)
      // Return original URL as fallback
      return imageUrl
    }
  })

  return Promise.all(uploadPromises)
}

export async function uploadPathImage(file: File, uid: string, index: number): Promise<string> {
  if (!storage) throw new Error("Firebase Storage not initialized")

  const fileExtension = file.name.split(".").pop() || "jpg"
  const timestamp = Date.now()
  const fileName = `path/${uid}_${timestamp}_${index}.${fileExtension}`
  const storageRef = ref(storage, fileName)

  // Upload the file
  const snapshot = await uploadBytes(storageRef, file)

  // Get the download URL
  const downloadURL = await getDownloadURL(snapshot.ref)

  return downloadURL
}
