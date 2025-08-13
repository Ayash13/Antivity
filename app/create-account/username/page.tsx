"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState } from "react"

export default function CreateUsernamePage() {
  const router = useRouter()
  const [username, setUsername] = useState("")

  const handleContinue = () => {
    if (!username.trim()) return

    const params = new URLSearchParams()
    params.set("username", username.trim())
    router.push(`/create-account/email-password?${params.toString()}`)
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

      <div className="w-full max-w-md rounded-[40px] p-8 flex flex-col items-center text-center space-y-8 pb-8 mb-0 bg-white">
        <h1 className="font-bold text-gray-900 mt-8 mb-11 text-3xl">All set with that cool username?</h1>
        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full max-w-xs h-14 rounded-full text-center text-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0 mb-10 bg-slate-100"
        />
        <Button
          onClick={handleContinue}
          disabled={!username.trim()}
          className="max-w-xs h-14 hover:bg-[#50B0FF] rounded-full shadow-md transition-colors duration-200 disabled:opacity-50 bg-[rgba(108,211,255,1)] text-white font-bold text-xl w-60"
          variant="secondary"
          style={{ boxShadow: "0 5px 0 #50B0FF" }}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
