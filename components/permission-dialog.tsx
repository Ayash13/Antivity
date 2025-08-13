"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Camera, MapPin, X } from "lucide-react"

interface PermissionDialogProps {
  isOpen: boolean
  onClose: () => void
}

const PERMISSIONS_STORAGE_KEY = "app_permissions_granted"

const savePermissionsToStorage = (location: boolean, camera: boolean) => {
  localStorage.setItem(
    PERMISSIONS_STORAGE_KEY,
    JSON.stringify({
      location,
      camera,
      timestamp: Date.now(),
    }),
  )
}

const getPermissionsFromStorage = () => {
  try {
    const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.log("Error reading permissions from storage:", error)
  }
  return null
}

export const checkIfPermissionsAlreadyGranted = () => {
  const stored = getPermissionsFromStorage()
  if (!stored) return false

  // If we have stored permissions and they're both granted, trust them
  return stored.location && stored.camera
}

export const validateBrowserPermissions = async () => {
  try {
    // Check location permission
    const locationResult = await navigator.permissions.query({ name: "geolocation" as PermissionName })
    const locationGranted = locationResult.state === "granted"

    // Check camera permission more efficiently
    let cameraGranted = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      cameraGranted = true
    } catch {
      cameraGranted = false
    }

    return { location: locationGranted, camera: cameraGranted }
  } catch {
    return { location: false, camera: false }
  }
}

export function PermissionDialog({ isOpen, onClose }: PermissionDialogProps) {
  const [locationGranted, setLocationGranted] = useState(false)
  const [cameraGranted, setCameraGranted] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    const stored = getPermissionsFromStorage()
    if (stored) {
      setLocationGranted(stored.location)
      setCameraGranted(stored.camera)
    }
  }, [])

  const requestLocationPermission = async () => {
    setIsRequesting(true)
    try {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName })
      if (result.state === "granted") {
        setLocationGranted(true)
      } else {
        // Request permission by trying to get location
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              setLocationGranted(true)
              resolve()
            },
            () => reject(),
            { enableHighAccuracy: true, timeout: 5000 },
          )
        })
      }
    } catch (error) {
      console.log("Location permission denied")
    } finally {
      setIsRequesting(false)
    }
  }

  const requestCameraPermission = async () => {
    setIsRequesting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach((track) => track.stop())
      setCameraGranted(true)
    } catch (error) {
      console.log("Camera permission denied")
    } finally {
      setIsRequesting(false)
    }
  }

  useEffect(() => {
    if (locationGranted && cameraGranted) {
      savePermissionsToStorage(locationGranted, cameraGranted)
    }
  }, [locationGranted, cameraGranted])

  const handleContinue = () => {
    savePermissionsToStorage(locationGranted, cameraGranted)
    onClose()
  }

  if (!isOpen) return null

  const allPermissionsGranted = locationGranted && cameraGranted

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[rgba(108,211,255,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-[rgba(108,211,255,1)] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">!</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[rgba(125,71,185,1)] mb-2">Permissions Required</h2>
          <p className="text-[rgba(174,121,235,1)] text-sm">
            We need access to your camera and location to help you explore the world around you.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Location Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  locationGranted ? "bg-green-100" : "bg-[rgba(108,211,255,0.1)]"
                }`}
              >
                <MapPin className={`w-5 h-5 ${locationGranted ? "text-green-600" : "text-[rgba(108,211,255,1)]"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Location</h3>
                <p className="text-sm text-gray-600">Track your walking path</p>
              </div>
            </div>
            {locationGranted ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            ) : null}
          </div>

          {/* Camera Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  cameraGranted ? "bg-green-100" : "bg-[rgba(108,211,255,0.1)]"
                }`}
              >
                <Camera className={`w-5 h-5 ${cameraGranted ? "text-green-600" : "text-[rgba(108,211,255,1)]"}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Camera</h3>
                <p className="text-sm text-gray-600">Capture photos during walks</p>
              </div>
            </div>
            {cameraGranted ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          {!allPermissionsGranted && (
            <Button
              onClick={async () => {
                if (!locationGranted) await requestLocationPermission()
                if (!cameraGranted) await requestCameraPermission()
              }}
              disabled={isRequesting}
              className="w-full bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] text-white rounded-full py-3 font-bold text-lg"
              style={{ boxShadow: "0 4px 0 0 #50B0FF" }}
            >
              {isRequesting ? "Requesting..." : "Allow All Permissions"}
            </Button>
          )}

          {allPermissionsGranted ? (
            <Button
              onClick={handleContinue}
              className="w-full bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] text-white rounded-full py-3 font-bold text-lg"
              style={{ boxShadow: "0 4px 0 0 #50B0FF" }}
            >
              Continue
            </Button>
          ) : (
            <button
              onClick={handleContinue}
              className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>

        {!allPermissionsGranted && (
          <p className="text-center text-xs text-gray-500 mt-3">
            You can enable permissions later in your browser settings
          </p>
        )}
      </div>
    </div>
  )
}
