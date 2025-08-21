"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SwipeableCardStack } from "@/components/swipeable-card-stack"
import { cn } from "@/lib/utils"
import { AppDrawer } from "@/components/app-drawer"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { type Mission, listenToPersonalMissions, getActiveMission } from "@/lib/firebase/missions"
import { PermissionDialog, checkIfPermissionsAlreadyGranted } from "@/components/permission-dialog"
import { useAuth } from "@/context/auth-context"

// Define placeholder "planet" data for wireframe style
const placeholderItems = [
  {
    id: "item1",
    name: "Object 1",
    description: "Description of the first object to find while walking.",
    imagePlaceholder: "/placeholder.svg?height=150&width=150&text=Placeholder+Image+1",
    avatar: "/avatar/ava1.webp",
    number: "01",
  },
  {
    id: "item2",
    name: "Object 2",
    description: "Description of the second object to find while walking.",
    imagePlaceholder: "/placeholder.svg?height=150&width=150&text=Placeholder+Image+2",
    avatar: "/avatar/ava2.webp",
    number: "02",
  },
  {
    id: "item3",
    name: "Object 3",
    description: "Description of the third object to find while walking.",
    imagePlaceholder: "/placeholder.svg?height=150&width=150&text=Placeholder+Image+3",
    avatar: "/avatar/ava3.webp",
    number: "03",
  },
  {
    id: "item4",
    name: "Object 4",
    description: "Description of the fourth object to find while walking.",
    imagePlaceholder: "/placeholder.svg?height=150&width=150&text=Placeholder+Image+4",
    avatar: "/avatar/ava4.webp",
    number: "04",
  },
]

// The pool of search terms to randomly choose from
const SEARCH_TERMS = [
  "Cat",
  "Car",
  "Dog",
  "Tree",
  "Umbrella",
  "Flower",
  "Stop sign",
  "Zebra cross",
  "Pink color",
  "Green color",
  "Building",
  "Street vendor",
  "Fruit",
] as const

function pickRandomTargets(): string[] {
  // choose exactly 5 items randomly from SEARCH_TERMS
  const count = 5
  const pool = [...SEARCH_TERMS]
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

interface PlaceholderCardProps {
  item: (typeof placeholderItems)[0]
  isActive: boolean
  onStartClick: () => void
}

function PlaceholderCard({ item, isActive, onStartClick }: PlaceholderCardProps) {
  return (
    <Card className="relative flex flex-col items-center justify-center bg-white text-gray-900 rounded-[40px] shadow-lg p-6 pb-28 min-h-[360px] overflow-visible pt-24 border-none">
      <div className="absolute -top-20 w-[200px] h-[200px] rounded-full overflow-hidden">
        <img
          src={item.avatar || "/placeholder.svg"}
          alt={`Avatar for ${item.name}`}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="flex mt-8 w-full flex-col items-center text-center">
        <h2 className="text-3xl font-bold mb-2 text-[rgba(125,71,185,1)]">{item.name}</h2>
        <p className="text-sm max-w-[180px] mb-2 text-[rgba(174,121,235,1)]">{item.description}</p>

        <Button
          onClick={onStartClick}
          className="absolute bottom-0 inset-x-0 mx-6 mb-6 text-xl rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 leading-7 py-7 border-none text-white bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] font-bold"
          style={{ boxShadow: "0 5px 0 #50B0FF" }}
        >
          Start
        </Button>

        <div className="absolute bottom-4 right-4 text-8xl font-extrabold text-gray-200 opacity-50 -z-10">
          {item.number}
        </div>
      </CardContent>

      <Button
        className={cn(
          "absolute -bottom-8 w-16 h-16 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center shadow-lg transition-all duration-300 ease-in-out",
          isActive ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
          "border-2 border-gray-400 text-gray-900",
        )}
      >
        <span className="sr-only">Explore {item.name}</span>
      </Button>
    </Card>
  )
}

interface MissionCardProps {
  mission: Mission
  isActive: boolean
  onStartClick: () => void
  missions: Mission[]
  isFunctionallyActive: boolean
}

function MissionCard({ mission, isActive, onStartClick, missions, isFunctionallyActive }: MissionCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col items-center justify-center bg-white text-gray-900 rounded-[40px] shadow-lg p-6 pb-28 min-h-[360px] overflow-visible pt-24 border-none transition-all duration-300",
        isActive ? "ring-4 ring-[rgba(108,211,255,1)] ring-opacity-50 shadow-xl scale-105" : "",
      )}
      style={{
        boxShadow: "0 4px 0 1px #50B0FF",
      }}
    >
      <div className="absolute -top-20 w-[200px] h-[200px] overflow-hidden">
        <img
          src={mission.imageUrl || "/placeholder.svg"}
          alt={`Avatar for ${mission.title}`}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="flex mt-8 w-full flex-col items-center text-center">
        <h2 className="font-bold mb-2 text-[rgba(125,71,185,1)] text-4xl">{mission.title}</h2>
        <p className="max-w-[180px] mb-2 text-[rgba(174,121,235,1)] text-lg">{mission.description}</p>

        <Button
          onClick={onStartClick}
          disabled={!isFunctionallyActive}
          className={cn(
            "absolute bottom-0 inset-x-0 mx-6 mb-6 text-xl rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 leading-7 py-7 border-none text-white font-bold",
            isFunctionallyActive ? "bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF]" : "bg-gray-400 cursor-not-allowed",
          )}
          style={{ boxShadow: isFunctionallyActive ? "0 5px 0 #50B0FF" : "0 5px 0 #9CA3AF" }}
        >
          {mission.status ? "Completed" : "Start"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function MainAppWireframe() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [activeMission, setActiveMission] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const unsubscribe = listenToPersonalMissions(user.uid, (fetchedMissions) => {
      const sortedMissions = [...fetchedMissions].sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.toMillis() - a.createdAt.toMillis()
      })
      setMissions(sortedMissions)
      setActiveMission(getActiveMission(sortedMissions))
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (user && !loading) {
      // Check if permissions were already granted (from localStorage)
      const alreadyGranted = checkIfPermissionsAlreadyGranted()

      if (!alreadyGranted) {
        // Small delay to let the main page load
        const timer = setTimeout(() => {
          setShowPermissionDialog(true)
        }, 1000)

        return () => clearTimeout(timer)
      }
      // If permissions are already granted in localStorage, don't show dialog
    }
  }, [user, loading])

  const handleStartChallenge = () => {
    if (!activeMission) return

    const targets = pickRandomTargets()
    // encode targets and mission ID into the URL
    const param = encodeURIComponent(JSON.stringify(targets))
    router.push(`/path?targets=${param}&missionId=${activeMission.id}`)
  }

  const now = new Date()
  const dayNumber = new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(now)
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(now)
  const month = new Intl.DateTimeFormat(undefined, { month: "long" }).format(now)
  const year = now.getFullYear()

  if (loading) {
    return (
      <div className="relative min-h-dvh flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden text-gray-900 bg-[rgba(226,249,255,1)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgba(125,71,185,1)] mx-auto mb-4"></div>
          <p className="text-[rgba(125,71,185,1)]">Loading missions...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-dvh flex flex-col items-center justify-between overflow-y-auto overflow-x-hidden text-gray-900 bg-[rgba(226,249,255,1)]"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 112px)",
        backgroundImage: 'url("/images/bg3.webp")',
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top center",
      }}
    >
      <section className="text-center mt-4 z-10 px-4">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight py-0 pb-6 pt-6 text-[rgba(125,71,185,1)]">
          Start your walk
          <br />
          Today!
        </h1>
      </section>

      <section className="w-full mt-16 sm:mt-20 z-10 mr-[260px]">
        <div className="mx-auto w-full max-w-[320px] px-0">
          <SwipeableCardStack className="w-full">
            {missions.map((mission) => {
              const isActive = activeMission?.id === mission.id
              const isFunctionallyActive = activeMission?.id === mission.id && !mission.status
              return (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  isActive={isActive}
                  onStartClick={handleStartChallenge}
                  missions={missions}
                  isFunctionallyActive={isFunctionallyActive}
                />
              )
            })}
          </SwipeableCardStack>
        </div>
      </section>

      <footer className="w-full flex flex-col items-center p-3 z-10 bg-transparent pb-3 pt-20">
        <div className="text-center">
          <div className="text-5xl font-extrabold leading-none text-[rgba(125,71,185,1)]">{dayNumber}</div>
          <div className="text-sm mt-0.5 text-[rgba(174,121,235,1)]">
            {weekday}, {month} {year}
          </div>
        </div>
      </footer>

      <AppDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <PermissionDialog isOpen={showPermissionDialog} onClose={() => setShowPermissionDialog(false)} />
    </div>
  )
}
