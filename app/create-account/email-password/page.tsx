"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { createUserProfile } from "@/lib/firebase/firestore"
import { initializeUserMissions } from "@/lib/firebase/missions"

export default function EmailPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const username = searchParams.get("username") || ""

  const validateForm = () => {
    if (!email.trim()) {
      setError("Email is required")
      return false
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email")
      return false
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return false
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    return true
  }

  const handleContinue = async () => {
    setError("")

    if (!validateForm()) return

    setIsLoading(true)
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update the user's display name
      await updateProfile(user, {
        displayName: username,
      })

      // Create user profile in Firestore
      await createUserProfile({
        uid: user.uid,
        email: user.email || "",
        username: username,
        displayName: username,
        photoURL: null,
        avatarKind: "emoji",
      })

      await initializeUserMissions(user.uid)

      // Navigate to profile photo page
      const params = new URLSearchParams()
      params.set("username", username)
      router.push(`/create-account/profile-photo?${params.toString()}`)
    } catch (error: any) {
      console.error("Error creating account:", error)

      // Handle Firebase auth errors
      switch (error.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered")
          break
        case "auth/invalid-email":
          setError("Please enter a valid email address")
          break
        case "auth/weak-password":
          setError("Password is too weak")
          break
        default:
          setError("Failed to create account. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => router.back()

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

      <div className="w-full max-w-md rounded-[40px] p-8 flex flex-col items-center text-center space-y-6 pb-8 mb-0 bg-white">
        <h1 className="font-bold text-[rgba(125,71,185,1)] mt-8 mb-8 text-3xl">Enter your details</h1>

        <div className="w-full max-w-xs space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-14 rounded-full text-center text-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-slate-100"
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 rounded-full text-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-12 text-center pt-0 pl-12 bg-slate-100"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-14 rounded-full text-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-12 pl-12 bg-slate-100 text-center"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-500"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <Button
          onClick={handleContinue}
          disabled={!email.trim() || !password || !confirmPassword || isLoading}
          className="max-w-xs h-14 hover:bg-[#50B0FF] rounded-full transition-colors duration-200 disabled:opacity-50 mt-6 bg-[rgba(108,211,255,1)] text-xl font-bold text-white w-60"
          variant="secondary"
          style={{ boxShadow: "0 5px 0 #50B0FF" }}
        >
          {isLoading ? "Creating Account..." : "Continue"}
        </Button>
      </div>
    </div>
  )
}
