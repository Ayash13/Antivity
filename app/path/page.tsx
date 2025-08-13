"use client"

import type React from "react"
import { uploadPathImage } from "@/lib/firebase/storage"
import { savePathSession } from "@/lib/firebase/path-logs"

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { fileToBase64 } from "@/lib/image-upload"
import { cn } from "@/lib/utils"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/context/auth-context"
import Image from "next/image"

type CircleItem = {
  id: number
  top: string
  left: string
  size: string
}

type Coord = { lat: number; lng: number }

// Fixed circle size and layout params
const CIRCLE_SIZE = "clamp(84px, 28vw, 132px)"
const LEFT_POS = "22%"
const RIGHT_POS = "58%"
const START_TOP = 8
const STEP = 18
const FIXED_COUNT = 5

const DEFAULT_IMAGE = "/images/star-rotatable.jpeg"

// Soft warm stains (avoid blue/indigo)
const STAIN_GRADIENTS = [
  "radial-gradient(60% 60% at 50% 50%, rgba(255,184,148,0.35) 0%, rgba(255,184,148,0.22) 45%, rgba(255,184,148,0) 70%), radial-gradient(40% 40% at 70% 30%, rgba(255,153,102,0.18) 0%, rgba(255,153,102,0) 60%)",
  "radial-gradient(60% 60% at 50% 50%, rgba(245,209,143,0.35) 0%, rgba(245,209,143,0.22) 45%, rgba(245,209,143,0) 70%), radial-gradient(40% 40% at 30% 70%, rgba(224,172,58,0.18) 0%, rgba(224,172,58,0) 60%)",
  "radial-gradient(60% 60% at 50% 50%, rgba(255,168,178,0.35) 0%, rgba(255,168,178,0.22) 45%, rgba(255,168,178,0) 70%), radial-gradient(40% 40% at 65% 25%, rgba(220,88,112,0.18) 0%, rgba(220,88,112,0) 60%)",
  "radial-gradient(60% 60% at 50% 50%, rgba(189,224,201,0.35) 0%, rgba(189,224,201,0.22) 45%, rgba(189,224,201,0) 70%), radial-gradient(40% 40% at 35% 65%, rgba(76,175,80,0.18) 0%, rgba(76,175,80,0) 60%)",
  "radial-gradient(60% 60% at 50% 50%, rgba(255,224,138,0.35) 0%, rgba(255,224,138,0.22) 45%, rgba(255,224,138,0) 70%), radial-gradient(40% 40% at 60% 40%, rgba(255,193,7,0.18) 0%, rgba(255,193,7,0) 60%)",
]

// Pool of search terms (same as /main)
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

type OverlayState = "hidden" | "confirm" | "loading" | "success" | "error"

export default function PathPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const startedAtRef = useRef<Date>(new Date())

  const { user } = useAuth()

  const missionId = searchParams?.get("missionId")

  // Normalize targets to exactly 5
  const targets = useMemo<string[]>(() => {
    // parse from URL if present
    let base: string[] = []
    const raw = searchParams?.get("targets")
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw))
        if (Array.isArray(parsed)) base = parsed.map(String)
      } catch {
        // ignore parse error, fall back to empty
      }
    }

    // dedupe while preserving order
    const seen = new Set<string>()
    const unique: string[] = []
    for (const s of base) {
      if (!seen.has(s)) {
        unique.push(s)
        seen.add(s)
      }
    }

    // Do NOT randomize here. Only take up to FIXED_COUNT if too many were passed.
    return unique.slice(0, FIXED_COUNT)
  }, [searchParams])

  // Build fixed circle layout (always 5)
  const circlesLayout: CircleItem[] = useMemo(() => {
    return Array.from({ length: FIXED_COUNT }, (_, i) => ({
      id: i,
      top: `${START_TOP + i * STEP}%`,
      left: i % 2 === 0 ? RIGHT_POS : LEFT_POS,
      size: CIRCLE_SIZE,
    }))
  }, [])

  const [activeCircle, setActiveCircle] = useState<number | null>(null)
  const [lastPickedIndex, setLastPickedIndex] = useState<number | null>(null)
  const [images, setImages] = useState<(string | null)[]>(Array(FIXED_COUNT).fill(DEFAULT_IMAGE))
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>(Array(FIXED_COUNT).fill(null))
  const [pickedCoords, setPickedCoords] = useState<(Coord | null)[]>(Array(FIXED_COUNT).fill(null))
  const [rotateAngles] = useState<number[]>(() =>
    Array(FIXED_COUNT)
      .fill(0)
      .map(() => Math.round((Math.random() * 60 - 30) * 10) / 10),
  )
  const [overlay, setOverlay] = useState<OverlayState>("hidden")
  const [flipped, setFlipped] = useState<boolean[]>(Array(FIXED_COUNT).fill(false))
  const [validationError, setValidationError] = useState<string>("")
  const [validated, setValidated] = useState<boolean[]>(Array(FIXED_COUNT).fill(false))
  const [isFinishing, setIsFinishing] = useState(false)

  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [isMobile, setIsMobile] = useState(false)

  // Dynamic scroll canvas sizing
  const [canvasHeight, setCanvasHeight] = useState<number>(0)
  const [scrollable, setScrollable] = useState<boolean>(false)
  const FOOTER_ESTIMATE = 88

  const recomputeCanvas = () => {
    const vh = Math.max(window.innerHeight, 1)
    if (canvasRef.current) canvasRef.current.style.height = `${vh}px`

    requestAnimationFrame(() => {
      const nodes = canvasRef.current?.querySelectorAll<HTMLElement>(".circle-node")
      let maxBottom = 0
      nodes?.forEach((el) => {
        const rect = el.getBoundingClientRect()
        maxBottom = Math.max(maxBottom, rect.bottom)
      })

      const needed = Math.ceil(maxBottom + FOOTER_ESTIMATE + 16)
      const finalHeight = Math.max(vh, needed)

      if (canvasRef.current) canvasRef.current.style.height = `${finalHeight}px`
      setCanvasHeight(finalHeight)
      setScrollable(finalHeight > vh)
    })
  }

  useEffect(() => {
    recomputeCanvas()
    const onResize = () => recomputeCanvas()
    window.addEventListener("resize", onResize)
    window.addEventListener("orientationchange", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("orientationchange", onResize)
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768
      setIsMobile(isMobileDevice)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (overlay === "hidden") {
      const t = setTimeout(() => {
        recomputeCanvas()
        setFlipped(Array(FIXED_COUNT).fill(false))
      }, 50)
      return () => clearTimeout(t)
    }
  }, [overlay])

  const handleBack = () => router.back()

  // Flip logic: first tap flips, second opens picker
  const handleCircleClick = (index: number) => {
    const wasFlipped = flipped[index]
    if (!wasFlipped) {
      setFlipped((prev) => prev.map((_, i) => i === index))
    } else {
      setActiveCircle(index)
      handleCameraCapture() // Use custom camera instead of file input
    }
  }

  // Get current location (best-effort)
  function getCurrentCoord(): Promise<Coord | null> {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
      )
    })
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || activeCircle === null) return

    try {
      const [base64, coord] = await Promise.all([fileToBase64(file), getCurrentCoord()])

      setImages((prev) => {
        const next = [...prev]
        next[activeCircle] = base64
        return next
      })
      setSelectedFiles((prev) => {
        const next = [...prev]
        next[activeCircle] = file
        return next
      })
      setPickedCoords((prev) => {
        const next = [...prev]
        next[activeCircle] = coord
        return next
      })
      setValidated((prev) => {
        const next = [...prev]
        next[activeCircle] = false // reset validated on new pick
        return next
      })

      setValidationError("")
      setLastPickedIndex(activeCircle)
      setOverlay("confirm") // show confirm overlay
      setFlipped(Array(FIXED_COUNT).fill(false))
    } finally {
      e.target.value = ""
      setActiveCircle(null)
    }
  }

  const onConfirm = async () => {
    if (lastPickedIndex == null) return
    const f = selectedFiles[lastPickedIndex]
    const target = targets[lastPickedIndex] || "object"

    if (!f) {
      setValidationError("No file selected.")
      setOverlay("confirm")
      return
    }

    setOverlay("loading")
    setValidationError("")

    try {
      console.log("Starting validation for:", { target, fileType: f.type, fileSize: f.size })

      const formData = new FormData()
      formData.append("file", f)
      formData.append("target", target)

      const response = await fetch("/api/validate-photo", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()
      console.log("Validation result:", data)

      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.valid) {
        setValidationError(`That doesn't look like ${target}. Please try again.`)
        setOverlay("confirm")
        return
      }

      console.log("✅ Validation successful!")

      // Mark as validated
      setValidated((prev) => {
        const next = [...prev]
        if (lastPickedIndex != null) next[lastPickedIndex] = true
        return next
      })

      setOverlay("success")
      setTimeout(() => {
        setOverlay("hidden")
        setLastPickedIndex(null)
      }, 1100)
    } catch (error) {
      console.error("Validation failed:", error)
      const message = error instanceof Error ? error.message : "Unknown error occurred"
      setValidationError(`Validation failed: ${message}`)
      setOverlay("confirm")
    }
  }

  function clearSelectionAtIndex(index: number) {
    setImages((prev) => {
      const next = [...prev]
      next[index] = DEFAULT_IMAGE
      return next
    })
    setSelectedFiles((prev) => {
      const next = [...prev]
      next[index] = null
      return next
    })
    setPickedCoords((prev) => {
      const next = [...prev]
      next[index] = null
      return next
    })
    setValidated((prev) => {
      const next = [...prev]
      next[index] = false
      return next
    })
  }

  function closeInvalidAndReset() {
    if (lastPickedIndex !== null) {
      clearSelectionAtIndex(lastPickedIndex)
    }
    setValidationError("")
    setOverlay("hidden")
  }

  // Bulk save session when Finish
  const handleFinish = async () => {
    if (isFinishing) return
    setIsFinishing(true)

    try {
      if (!user) {
        console.error("User not authenticated")
        return
      }

      // Prepare items with images to upload
      const itemsToSave = images
        .map((img, index) => ({
          index,
          imageData: img !== DEFAULT_IMAGE ? img : null,
          target: targets[index],
          coord: pickedCoords[index],
        }))
        .filter((item) => item.imageData !== null)

      // Upload images to Firebase Storage and get URLs
      const uploadedItems = await Promise.all(
        itemsToSave.map(async (item) => {
          try {
            // Convert base64 to blob
            const response = await fetch(item.imageData!)
            const blob = await response.blob()
            const file = new File([blob], `path-image-${item.index}.png`, { type: "image/png" }) // Changed to PNG

            // Upload to Firebase Storage in "path" folder
            const imageUrl = await uploadPathImage(file, user.uid, item.index)

            return {
              index: item.index,
              target: item.target,
              imageUrl,
              lat: item.coord?.lat || null,
              lng: item.coord?.lng || null,
              posted: false,
            }
          } catch (error) {
            console.error(`Failed to upload image ${item.index}:`, error)
            return null
          }
        }),
      )

      // Filter out failed uploads
      const validItems = uploadedItems.filter((item) => item !== null)

      if (validItems.length === 0) {
        console.error("No images were successfully uploaded")
        return
      }

      // Save session to Firestore
      await savePathSession({
        uid: user.uid,
        items: validItems,
        targets: targets,
        startedAt: null, // You can track start time if needed
        endedAt: new Date(),
      })

      // Store in sessionStorage for the result page as backup
      sessionStorage.setItem("pathImages", JSON.stringify(itemsToSave))

      const resultUrl = missionId ? `/path-result?missionId=${missionId}` : "/path-result"
      router.push(resultUrl)
    } catch (error) {
      console.error("Error saving path session:", error)
    } finally {
      setIsFinishing(false)
    }
  }

  const handleCameraCapture = async () => {
    if (isMobile) {
      // Mobile: Open camera
      try {
        let stream: MediaStream

        try {
          // First, check if we have permission without triggering a prompt
          const permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName })

          if (permissionStatus.state === "granted") {
            // Permission already granted, directly access camera
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            })
          } else {
            // Need to request permission
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            })
            // Update localStorage to remember permission was granted
            localStorage.setItem("cameraPermissionGranted", "true")
          }
        } catch (permissionError) {
          // Fallback: try the old method if Permissions API fails
          const cameraPermissionGranted = localStorage.getItem("cameraPermissionGranted") === "true"

          if (cameraPermissionGranted) {
            // Try to access camera directly
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            })
          } else {
            // Request permission
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            })
            localStorage.setItem("cameraPermissionGranted", "true")
          }
        }

        setCameraStream(stream)
        setShowCamera(true)

        // Set video stream when modal opens
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        }, 100)
      } catch (error) {
        console.error("Error accessing camera:", error)
        localStorage.setItem("cameraPermissionGranted", "false")
        alert("Unable to access camera. Please check permissions.")
      }
    } else {
      // Desktop: Open file picker
      fileInputRef.current?.click()
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || activeCircle === null) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (ctx) {
      // Set canvas to exactly match the preview size
      const previewSize = 320
      canvas.width = previewSize
      canvas.height = previewSize

      const video = videoRef.current
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight

      // Calculate the crop area to match object-fit: cover behavior
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = videoWidth
      let sourceHeight = videoHeight

      if (videoWidth > videoHeight) {
        // Video is wider - crop horizontally to make it square
        sourceWidth = videoHeight
        sourceX = (videoWidth - videoHeight) / 2
      } else {
        // Video is taller - crop vertically to make it square
        sourceHeight = videoWidth
        sourceY = (videoHeight - videoWidth) / 2
      }

      // Draw the cropped square portion to fill the entire canvas
      ctx.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight, // Source crop area
        0,
        0,
        previewSize,
        previewSize, // Destination (full canvas)
      )

      const quality = 0.8
      const dataUrl = canvas.toDataURL("image/png", quality)

      // Convert to blob and create file with better error handling
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            console.error("Failed to create PNG blob from canvas")
            setValidationError("Failed to capture image. Please try again.")
            return
          }

          const maxSize = 1024 * 1024 // 1MB
          if (blob.size > maxSize) {
            console.warn(`Image too large: ${blob.size} bytes, max: ${maxSize} bytes`)
            // Try with lower quality
            canvas.toBlob(
              async (smallerBlob) => {
                if (!smallerBlob) {
                  setValidationError("Failed to compress image. Please try again.")
                  return
                }
                await processImageFile(smallerBlob, dataUrl)
              },
              "image/png",
              0.5,
            )
            return
          }

          await processImageFile(blob, dataUrl)
        },
        "image/png",
        quality,
      )
    }
  }

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
    setActiveCircle(null)
  }

  const processImageFile = async (blob: Blob, dataUrl: string) => {
    // Verify blob type and size
    console.log(
      "Processing image - Blob type:",
      blob.type,
      "Blob size:",
      blob.size,
      "Size in KB:",
      Math.round(blob.size / 1024),
    )

    try {
      const file = new File([blob], `path-image-${activeCircle}.png`, {
        type: "image/png",
        lastModified: Date.now(),
      })

      if (file.type !== "image/png") {
        console.error("File type mismatch:", file.type)
        setValidationError("Image format error. Please try again.")
        return
      }

      // Verify file properties
      console.log("File created - Type:", file.type, "Size:", file.size, "Name:", file.name)

      // Get coordinates
      const coord = await getCurrentCoord()

      setImages((prev) => {
        const next = [...prev]
        next[activeCircle] = dataUrl
        return next
      })
      setSelectedFiles((prev) => {
        const next = [...prev]
        next[activeCircle] = file
        return next
      })
      setPickedCoords((prev) => {
        const next = [...prev]
        next[activeCircle] = coord
        return next
      })
      setValidated((prev) => {
        const next = [...prev]
        next[activeCircle] = false
        return next
      })

      setValidationError("")
      setLastPickedIndex(activeCircle)
      setOverlay("confirm")
      setFlipped(Array(FIXED_COUNT).fill(false))

      // Close camera
      closeCameraModal()
    } catch (error) {
      console.error("Error processing image file:", error)
      setValidationError("Failed to process image. Please try again.")
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || activeCircle === null) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setValidationError("Please select a valid image file.")
      return
    }

    // Convert file to data URL for preview
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string

      // Create a blob from the file for processing
      const blob = new Blob([file], { type: "image/png" })
      await processImageFile(blob, dataUrl)
    }
    reader.readAsDataURL(file)

    // Reset file input
    event.target.value = ""
  }

  return (
    <AuthGuard redirectTo="/">
      <div className="relative min-h-dvh bg-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-top bg-no-repeat bg-cover"
          style={{ backgroundImage: "url('/images/path/bg2.webp')" }}
        />
        {/* Back Button (fixed) */}
        <div className="absolute left-3 top-3 z-40">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 mx-5 my-5 bg-[rgba(255,204,25,1)] text-white ml-2 mr-2 mt-2 mb-2 hover:bg-[#E9B800]"
            aria-label="Go back"
          >
            <Image
              src="/icon/arrow_left.svg"
              alt="Back"
              width={24}
              height={24}
              className="w-6 h-6"
              style={{
                filter: "brightness(0) invert(1)", // Make the SVG white
              }}
            />
          </Button>
        </div>

        {/* Headline */}
        <div className="absolute z-10 left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <h1 className="font-bold text-[#FFFFFF] leading-tight text-3xl sm:text-4xl">
            Notice the
            <br />
            world as you
            <br />
            walk
          </h1>
        </div>

        {/* Scrollable layer */}
        <div
          ref={scrollAreaRef}
          className={cn(
            "absolute inset-0 z-30 pointer-events-auto",
            scrollable ? "overflow-y-auto overscroll-contain" : "overflow-hidden",
          )}
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
            paddingRight: "clamp(12px, 4vw, 24px)",
          }}
          aria-label="Scrollable circle path"
        >
          <div ref={canvasRef} className="relative" style={{ height: canvasHeight ? `${canvasHeight}px` : "100dvh" }}>
            {circlesLayout.map((c, idx) => {
              const hasImage = Boolean(images[idx])
              const isFlipped = flipped[idx]
              const stain = STAIN_GRADIENTS[idx % STAIN_GRADIENTS.length]
              const prompt = targets[idx] || "Find something"

              return (
                <div
                  key={c.id}
                  className="circle-node absolute"
                  style={{ top: c.top, left: c.left, width: c.size, height: c.size }}
                >
                  {/* Stain behind */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full pointer-events-none transition-all duration-600 ease-out",
                      isFlipped ? "opacity-60" : "opacity-0",
                    )}
                    style={{
                      background: stain,
                      filter: "blur(10px)",
                      transform: isFlipped ? "translate(-6px, 4px) scale(1.1)" : "translate(0px, 0px) scale(0.98)",
                      transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                    aria-hidden="true"
                  />

                  {/* Flippable circle */}
                  <button
                    type="button"
                    onClick={() => handleCircleClick(idx)}
                    className={cn(
                      "relative z-10 w-full h-full rounded-full focus:outline-none transition-transform",
                      "group active:scale-[0.98]",
                    )}
                    style={{ perspective: "1200px" }}
                    aria-label={
                      isFlipped ? `Tap again to choose a photo for circle ${idx + 1}` : `Tap to flip circle ${idx + 1}`
                    }
                  >
                    {/* Flip inner */}
                    <div
                      className="relative w-full h-full rounded-full will-change-transform transition-transform duration-[700ms]"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg) translateZ(0)" : "rotateY(0deg) translateZ(0)",
                        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      {/* Front face: image (shiny overlay removed) */}
                      <div
                        className={cn(
                          "absolute inset-0 rounded-full overflow-hidden",
                          "flex items-center justify-center",
                        )}
                        style={{
                          backfaceVisibility: "hidden",
                          transform: "translateZ(2px)",
                          boxShadow: "0 4px 0 #E9B800",
                        }}
                      >
                        {hasImage ? (
                          <img
                            src={images[idx] || "/placeholder.svg?height=80&width=80&query=circle-preview"}
                            alt={`Circle ${idx + 1} image`}
                            className="w-full h-full object-cover"
                            draggable={false}
                            style={{
                              transform: images[idx] === DEFAULT_IMAGE ? `rotate(${rotateAngles[idx]}deg)` : undefined,
                              transition: "transform 300ms ease-out",
                              transformOrigin: "50% 50%",
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300/90 flex items-center justify-center">
                            <span className="text-[10px] text-gray-700">Tap</span>
                          </div>
                        )}
                      </div>

                      {/* Back face: prompt + large circular photo preview (85% of circle) */}
                      <div
                        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center transition-colors duration-500"
                        style={{
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg) translateZ(2px)",
                          background: "#6CD3FF",
                        }}
                      >
                        <div className="flex flex-col items-center justify-center gap-2 relative z-10 px-3 text-center w-full h-full bg-[rgba(108,211,255,1)] text-white">
                          <span className="mt-2 text-xs sm:text-sm text-gray-800 font-medium leading-tight">
                            {prompt}
                          </span>
                          {images[idx] && images[idx] !== DEFAULT_IMAGE ? (
                            <div
                              className="mx-auto rounded-full overflow-hidden border border-gray-300 shadow-sm"
                              style={{ width: "85%", height: "85%" }}
                            >
                              <img
                                src={images[idx] || "/placeholder.svg"}
                                alt="Chosen preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-700">Tap again to choose</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rim */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background:
                          "conic-gradient(from 180deg at 50% 50%, rgba(0,0,0,0.24), rgba(0,0,0,0.06), rgba(255,255,255,0.4), rgba(0,0,0,0.06), rgba(0,0,0,0.24))",
                        opacity: 0.15,
                        mixBlendMode: "multiply",
                      }}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Finish Bar */}
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div
            className="w-full mx-auto max-w-md bg-white/90 backdrop-blur-md border-gray-200 px-4 border-t-0 pt-3 pl-8 pr-8"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
          >
            <Button
              onClick={handleFinish}
              disabled={isFinishing}
              className="hover:bg-[#50B0FF] text-white rounded-full transition-colors duration-200 disabled:opacity-60 h-14 bg-[rgba(108,211,255,1)] text-xl font-bold w-full"
              style={{ boxShadow: "0 5px 0 #50B0FF" }}
            >
              {isFinishing ? "Saving…" : "Finish"}
            </Button>
          </div>
        </div>

        {/* Overlay: confirm / loading / success */}
        {overlay !== "hidden" && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
            <div
              className={cn(
                "relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100",
                "transition-transform duration-300",
              )}
            >
              <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
                {overlay === "confirm" && lastPickedIndex !== null && images[lastPickedIndex] && (
                  <>
                    <div
                      className="rounded-full overflow-hidden bg-gray-200 shadow-md mx-auto mb-5"
                      style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
                    >
                      <img
                        src={(images[lastPickedIndex] as string) || "/placeholder.svg"}
                        alt="Selected preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="mb-2 text-[rgba(174,121,235,1)] font-bold">Looks good?</p>
                    {validationError && <p className="text-red-600 text-sm">{validationError}</p>}
                  </>
                )}

                {overlay === "loading" && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-gray-700 animate-spin" />
                    </div>
                    <p className="text-[rgba(174,121,235,1)] font-bold">
                      {isFinishing ? "Saving session..." : "Validating..."}
                    </p>
                  </div>
                )}

                {overlay === "success" && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-12 w-12 text-green-600 animate-in zoom-in-50" />
                    </div>
                    <p className="text-green-700 font-medium">{isFinishing ? "Saved!" : "Looks like a match!"}</p>
                  </div>
                )}

                {overlay === "error" && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 font-medium">Error</span>
                    </div>
                    <p className="text-red-600 font-medium">Failed to save session. Please try again.</p>
                  </div>
                )}
              </div>

              {overlay === "confirm" && (
                <div className="px-6 pb-6">
                  <Button
                    onClick={validationError ? closeInvalidAndReset : onConfirm}
                    className="w-full hover:bg-[#50B0FF] text-white rounded-full text-xl font-bold h-14 bg-[rgba(108,211,255,1)]"
                    style={{
                      boxShadow: "0px 4px 0px 0px #50B0FF",
                    }}
                  >
                    {validationError ? "Close" : "Confirm"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {showCamera && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-5"
            style={{
              backgroundImage: "url('/images/bg4.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="rounded-3xl mb-10 object-cover shadow-2xl"
              style={{
                width: "320px",
                height: "320px",
              }}
            />

            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={capturePhoto}
                className="w-20 h-20 bg-[#6CD3FF] rounded-full flex items-center justify-center text-white transition-transform active:scale-95"
                style={{
                  boxShadow: "0 4px 0 0 #50B0FF",
                }}
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>

            <div className="w-full flex justify-center pb-8">
              <button
                onClick={closeCameraModal}
                className="px-8 py-3 bg-[#FF5A6B] text-white rounded-full hover:bg-[#FF4757] transition-colors font-bold"
                style={{
                  boxShadow: "0 4px 0 0 #EB2E58",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input for desktop image selection */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      </div>
    </AuthGuard>
  )
}

function formatDocId(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${y}-${m}-${day}_${h}-${min}-${s}`
}
