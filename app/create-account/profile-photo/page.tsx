"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { Camera } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase/client"
import { updateUserProfile } from "@/lib/firebase/firestore"
import { uploadProfilePhoto, fileToBase64 } from "@/lib/firebase/storage"
import { validateImageFile } from "@/lib/image-upload"

export default function CreateProfilePhotoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [profileImage, setProfileImage] = useState<string | null>(
    "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FCaterpillar%20profile%20png.webp?alt=media&token=b0dbf2a1-20f6-4088-b94a-4371649e6258",
  )
  const [showOptions, setShowOptions] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const username = searchParams.get("username") || ""

  const handleFinish = async () => {
    if (!auth.currentUser) {
      console.warn("No authenticated user")
      router.push("/sign-in")
      return
    }
    setIsUploading(true)
    setError("")
    try {
      let finalPhotoURL = profileImage
      // If the user uploaded a file, upload it to Firebase Storage
      if (selectedFile) {
        finalPhotoURL = await uploadProfilePhoto(auth.currentUser.uid, selectedFile)
      }
      await updateUserProfile(auth.currentUser.uid, {
        photoURL: finalPhotoURL,
        avatarKind: "image",
      })
      router.push("/main")
    } catch (error: any) {
      console.error("Failed to update profile:", error)
      setError(error.message || "Failed to save profile. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleBack = () => router.back()
  const handlePlaceholderTap = () => setShowOptions(true)

  const handleUploadPhotoClick = () => {
    fileInputRef.current?.click()
    setShowOptions(false)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      const validation = validateImageFile(file)
      if (!validation.isValid) {
        setError(validation.error || "Invalid file")
        return
      }
      setError("")
      setSelectedFile(file)
      try {
        const base64 = await fileToBase64(file)
        setProfileImage(base64)
      } catch {
        setError("Failed to process image")
      }
    }
  }

  const handleCloseOptions = () => setShowOptions(false)

  return (
    <div
      className="flex flex-col items-center justify-between min-h-screen p-4 bg-[rgba(226,249,255,1)]"
      style={{
        backgroundImage: 'url("/images/bg4.webp")',
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top center",
      }}
    >
      {/* Back */}
      <div className="w-full flex justify-start pt-4">
        <Button
          onClick={handleBack}
          variant="ghost"
          size="icon"
          className="rounded-full bg-[#FFCC19] text-white h-10 w-10 hover:bg-[#E9B800]"
        >
          <Image
            src="/icon/arrow_left.svg"
            alt="Back"
            width={24}
            height={24}
            className="w-6 h-6"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <span className="sr-only">Go back</span>
        </Button>
      </div>

      {/* Bottom Card */}
      <div className="w-full max-w-md rounded-[40px] p-8 flex flex-col text-center space-y-6 pb-8 mb-0 bg-white items-center justify-between pt-8">
        <h1 className="font-bold mt-8 text-3xl text-[rgba(125,71,185,1)] mb-8">Now pick your best photo profile</h1>
        <button
          onClick={handlePlaceholderTap}
          className={cn(
            "w-40 h-40 rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 bg-slate-100 mb-0",
            "border-2 border-dashed border-gray-300 hover:border-gray-400",
          )}
        >
          {profileImage ? (
            <img src={profileImage || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <Camera className="h-8 w-8 mb-2" />
              <span className="text-xs">Tap to select</span>
            </div>
          )}
        </button>

        {/* Hidden file input */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

        {/* Default Avatars selector */}
        <div className="w-full max-w-xs mx-auto">
          <h3 className="text-sm font-semibold text-[rgba(125,71,185,1)] mb-3">Or choose a default avatar</h3>
          <div className="space-y-3">
            {/* First row - 4 avatars */}
            <div className="grid grid-cols-4 gap-3">
              {[
                "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FCaterpillar%20profile%20png.webp?alt=media&token=b0dbf2a1-20f6-4088-b94a-4371649e6258",
                "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FHappy%20ant%20profile%20png.webp?alt=media&token=73c2e5f8-9d4a-4b2c-8e1f-a5b7c9d2e4f6",
                "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FLadybug%20profile%20png.webp?alt=media&token=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FNerd%20ant%20profile%20png.webp?alt=media&token=f9e8d7c6-b5a4-3210-9876-543210fedcba",
              ].map((src) => {
                const selected = profileImage === src
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      setProfileImage(src)
                      setSelectedFile(null) // clear any uploaded file selection
                      setError("")
                    }}
                    className={cn(
                      "relative aspect-square rounded-full overflow-hidden border transition-all",
                      selected
                        ? "border-[rgba(108,211,255,1)] ring-2 ring-[#50B0FF]"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    aria-label="Choose default avatar"
                  >
                    <img
                      src={src || "/placeholder.svg"}
                      alt="Default avatar option"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </button>
                )
              })}
            </div>

            {/* Second row - 5th avatar centered */}
            <div className="flex justify-center">
              {(() => {
                const src =
                  "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FNonchalant%20ant%20profile%20png.webp?alt=media&token=c5d4e3f2-a1b0-9876-5432-10fedcba9876"
                const selected = profileImage === src
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      setProfileImage(src)
                      setSelectedFile(null) // clear any uploaded file selection
                      setError("")
                    }}
                    className={cn(
                      "relative aspect-square rounded-full overflow-hidden border transition-all w-16 h-16",
                      selected
                        ? "border-[rgba(108,211,255,1)] ring-2 ring-[#50B0FF]"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    aria-label="Choose default avatar"
                  >
                    <img
                      src={src || "/placeholder.svg"}
                      alt="Default avatar option"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </button>
                )
              })()}
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <Button
          onClick={handleFinish}
          disabled={isUploading}
          className="w-full max-w-xs h-14 hover:bg-[#50B0FF] rounded-full transition-colors duration-200 disabled:opacity-50 text-xl font-bold text-white bg-[rgba(108,211,255,1)] mt-0"
          variant="secondary"
          style={{ boxShadow: "0 5px 0 #50B0FF" }}
        >
          {isUploading ? (selectedFile ? "Uploading image..." : "Saving...") : "Finish"}
        </Button>
      </div>

      {/* Bottom sheet: Options */}
      {showOptions && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4 animate-in slide-in-from-bottom duration-300 border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-extrabold text-center mb-6 text-[rgba(125,71,185,1)]">
              Choose Profile Picture
            </h3>

            <Button
              onClick={handleUploadPhotoClick}
              className="w-full h-14 rounded-full text-white text-lg font-semibold bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] flex items-center justify-center space-x-2"
              style={{ boxShadow: "0 5px 0 #50B0FF" }}
            >
              <Camera className="h-5 w-5" />
              <span>Upload Photo</span>
            </Button>

            <Button
              onClick={handleCloseOptions}
              className="w-full h-14 rounded-full bg-[#F24B66] hover:bg-[#E13D59] text-white text-xl font-bold bg-[rgba(246,79,99,1)]"
              style={{ boxShadow: "0 4px 0 #EB2E58" }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
