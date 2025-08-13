"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { Eye, EyeOff } from "lucide-react"
import { RedirectIfAuthenticated } from "@/components/redirect-if-auth"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignIn = async () => {
    setError("")
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.")
      return
    }

    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/main") // Navigate to the main app page on successful sign-in
    } catch (err: any) {
      console.error("Error signing in:", err)
      switch (err.code) {
        case "auth/invalid-email":
          setError("Invalid email address format.")
          break
        case "auth/user-disabled":
          setError("Your account has been disabled.")
          break
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Invalid email or password.")
          break
        case "auth/invalid-credential": // Newer Firebase versions might use this for wrong password/user not found
          setError("Invalid email or password.")
          break
        default:
          setError("Failed to sign in. Please check your credentials and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = () => {
    router.push("/create-account/username") // Updated navigation path
  }

  return (
    <div
      className="flex flex-col items-center justify-end min-h-screen p-4 bg-[rgba(226,249,255,1)]"
      style={{
        backgroundImage: 'url("/images/bg4.webp")',
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top center",
      }}
    >
      <RedirectIfAuthenticated to="/main" />
      <div className="w-full max-w-md rounded-[40px] p-8 flex flex-col items-center text-center space-y-6 pb-8 bg-white">
        <h1 className="font-bold mt-8 mb-11 text-3xl text-[rgba(125,71,185,1)]">
          Lace up! Let’s make this walk a good one
        </h1>

        <div className="w-full max-w-xs space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-14 rounded-full text-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8 text-center pr-8 bg-slate-100"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 rounded-full text-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-12 pl-12 text-center bg-slate-100"
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
        </div>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <Button
          onClick={handleSignIn}
          disabled={isLoading || !email.trim() || !password.trim()}
          className="max-w-xs h-14 hover:bg-[#50B0FF] rounded-full transition-colors duration-200 disabled:opacity-50 bg-[rgba(108,211,255,1)] text-white font-bold text-xl w-60"
          variant="secondary"
          style={{ boxShadow: "0 5px 0 #50B0FF" }}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>

        <Button onClick={handleCreateAccount} className="text-lg font-medium text-[rgba(82,30,130,1)]" variant="ghost">
          Create an account
        </Button>
      </div>
    </div>
  )
}
