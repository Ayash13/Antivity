"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { auth } from "@/lib/firebase/client";
import {
  getLatestPathSession,
  getPathSessionByDocId,
  type PathSessionDoc,
} from "@/lib/firebase/path-logs";
import { getUserProfile, type UserProfile } from "@/lib/firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "@/lib/firebase/client";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import html2canvas from "html2canvas";
import { useSearchParams } from "next/navigation";
import { updatePersonalMissionStatus } from "@/lib/firebase/missions";

interface PathImageData {
  index: number;
  imageData: string;
  target: string;
  coord: { lat: number; lng: number } | null;
}

export default function PathResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<PathSessionDoc | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState("My Adventure Story");
  const [storyContent, setStoryContent] = useState("Tell your story here...");
  const [isSaving, setIsSaving] = useState(false);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [pathImages, setPathImages] = useState<PathImageData[]>([]);
  const photoboothRef = useRef<HTMLDivElement>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string>("");
  const [missionId, setMissionId] = useState<string | null>(null);

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getTotalDistance = (): number => {
    if (!pathImages || pathImages.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < pathImages.length; i++) {
      const prev = pathImages[i - 1];
      const curr = pathImages[i];

      if (prev.coord && curr.coord) {
        totalDistance += calculateDistance(
          prev.coord.lat,
          prev.coord.lng,
          curr.coord.lat,
          curr.coord.lng
        );
      }
    }

    return totalDistance;
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const handleTakeSelfie = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }, // Use front camera for selfies
      });

      // Create video element to show camera feed
      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Create modal overlay for camera
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('/images/bg4.webp');
        background-size: cover;
        background-position: center;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 60px 20px 40px;
      `;

      video.style.cssText = `
        width: 320px;
        height: 320px;
        border-radius: 24px;
        object-fit: cover;
        transform: scaleX(-1);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      `;

      const captureBtn = document.createElement("button");
      captureBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: white;">
          <path d="M12 9a3 3 0 100 6 3 3 0 000-6zM12 17a5 5 0 110-10 5 5 0 010 10zM20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
        </svg>
      `;
      captureBtn.style.cssText = `
        width: 80px;
        height: 80px;
        background: #6CD3FF;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s ease;
        box-shadow: 0 4px 0 #50B0FF;
      `;

      // Add hover effect
      captureBtn.onmousedown = () => {
        captureBtn.style.transform = "scale(0.95)";
      };
      captureBtn.onmouseup = () => {
        captureBtn.style.transform = "scale(1)";
      };
      captureBtn.onmouseleave = () => {
        captureBtn.style.transform = "scale(1)";
      };

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText = `
        background: #FF5A6B;
        color: white;
        border: none;
        padding: 12px 32px;
        border-radius: 24px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 0 #EB2E58;
      `;

      // Add hover effect for cancel button
      cancelBtn.onmouseenter = () => {
        cancelBtn.style.backgroundColor = "#FF4757";
      };
      cancelBtn.onmouseleave = () => {
        cancelBtn.style.backgroundColor = "#FF5A6B";
      };

      const centerContainer = document.createElement("div");
      centerContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      `;

      centerContainer.appendChild(video);
      centerContainer.appendChild(captureBtn);

      overlay.appendChild(centerContainer);
      overlay.appendChild(cancelBtn);
      document.body.appendChild(overlay);

      captureBtn.onclick = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Set canvas to square dimensions
          canvas.width = 320;
          canvas.height = 320;

          // Calculate crop dimensions to match the preview
          const videoAspect = video.videoWidth / video.videoHeight;
          let sourceWidth, sourceHeight, sourceX, sourceY;

          if (videoAspect > 1) {
            // Video is wider than tall, crop width
            sourceHeight = video.videoHeight;
            sourceWidth = video.videoHeight;
            sourceX = (video.videoWidth - sourceWidth) / 2;
            sourceY = 0;
          } else {
            // Video is taller than wide, crop height
            sourceWidth = video.videoWidth;
            sourceHeight = video.videoWidth;
            sourceX = 0;
            sourceY = (video.videoHeight - sourceHeight) / 2;
          }

          // Mirror the image horizontally and draw the cropped portion
          ctx.scale(-1, 1);
          ctx.drawImage(
            video,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            -320,
            0,
            320,
            320
          );

          const dataUrl = canvas.toDataURL("image/png", 1.0);
          setCapturedSelfie(dataUrl);
        }

        // Cleanup
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(overlay);
      };

      // Handle cancel
      cancelBtn.onclick = () => {
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(overlay);
      };
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const handleImageError = (imageUrl: string, error?: any) => {
    console.error("Failed to load image:", imageUrl, error);
    console.log("Image URL details:", {
      url: imageUrl,
      isFirebaseStorage: imageUrl.includes("firebasestorage.googleapis.com"),
      hasToken: imageUrl.includes("token="),
    });
    setImageErrors((prev) => ({ ...prev, [imageUrl]: true }));
  };

  const handleImageLoad = (imageUrl: string) => {
    console.log("Successfully loaded image:", imageUrl);
    setImageErrors((prev) => ({ ...prev, [imageUrl]: false }));
  };

  const retryImageLoad = (imageUrl: string) => {
    setImageErrors((prev) => ({ ...prev, [imageUrl]: false }));
    // Force reload by adding timestamp
    const img = new Image();
    img.onload = () => handleImageLoad(imageUrl);
    img.onerror = (e) => handleImageError(imageUrl, e);
    img.src =
      imageUrl + (imageUrl.includes("?") ? "&" : "?") + "retry=" + Date.now();
  };

  useEffect(() => {
    async function loadData() {
      try {
        const user = auth?.currentUser;
        if (!user) {
          router.push("/sign-in");
          return;
        }

        const urlMissionId = searchParams.get("missionId");
        if (urlMissionId) {
          setMissionId(urlMissionId);
        }

        if (pathImages.length === 0) {
          const storedImages = sessionStorage.getItem("pathImages");
          if (storedImages) {
            try {
              const parsedImages = JSON.parse(storedImages) as PathImageData[];
              setPathImages(parsedImages);
              console.log(
                "Loaded path images from sessionStorage:",
                parsedImages
              );
            } catch (e) {
              console.error("Failed to parse stored images:", e);
            }
          }
        }

        if (!session) {
          const sessionId = searchParams.get("sessionId");

          const [sessionData, profileData] = await Promise.all([
            sessionId
              ? getPathSessionByDocId(user.uid, sessionId)
              : getLatestPathSession(user.uid),
            getUserProfile(user.uid),
          ]);

          setSession(sessionData);
          setUserProfile(profileData);

          console.log("Session data:", sessionData);
          console.log("Path items:", sessionData?.items);
          console.log("Session ID from URL:", sessionId);
        }
      } catch (e) {
        console.error("Failed to load path result:", e);
        setError("Failed to load your path results");
      } finally {
        setLoading(false);
      }
    }

    if (loading && !session && pathImages.length === 0) {
      loadData();
    }
  }, [searchParams]);

  const handleBack = () => router.push("/main");

  const handleDownload = async () => {
    if (!capturedSelfie) {
      alert("Please take a selfie before saving your path result!");
      return;
    }

    if (!photoboothRef.current || isSaving) return;

    setIsSaving(true);
    try {
      const originalTransform = photoboothRef.current.style.transform;
      photoboothRef.current.style.transform = "scale(1)";

      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(photoboothRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        imageTimeout: 15000,
        removeContainer: true,
        width: 340,
        height: 600,
      });

      photoboothRef.current.style.transform = originalTransform;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob!);
          },
          "image/png",
          0.95
        );
      });

      const user = auth?.currentUser;
      if (!user) throw new Error("User not authenticated");

      const timestamp = Date.now();

      let selfieUrl = "";
      if (capturedSelfie) {
        // Convert base64 to blob
        const selfieResponse = await fetch(capturedSelfie);
        const selfieBlob = await selfieResponse.blob();

        const selfieFileName = `${user.uid}_selfie_${timestamp}.png`;
        const selfieStorageRef = ref(
          storage,
          `path_result/selfies/${selfieFileName}`
        );

        await uploadBytes(selfieStorageRef, selfieBlob);
        selfieUrl = await getDownloadURL(selfieStorageRef);
      }

      const fileName = `${user.uid}_${timestamp}.png`;
      const storageRef = ref(storage, `path_result/${fileName}`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      if (session?.docId) {
        const pathSessionRef = doc(
          db,
          `users/${user.uid}/pathSessions/${session.docId}`
        );
        await updateDoc(pathSessionRef, {
          selfieImageUrl: selfieUrl,
        });

        // Save journal entry without selfie URL
        const journalRef = collection(
          db,
          `users/${user.uid}/pathSessions/${session.docId}/journal`
        );
        await addDoc(journalRef, {
          resultImageUrl: downloadURL,
          storyTitle: storyTitle,
          storyContent: storyContent,
          totalDistance: getTotalDistance(),
          createdAt: new Date(),
          timestamp: timestamp,
        });
      }

      console.log("Path result saved successfully!");

      setResultImageUrl(canvas.toDataURL());
      setShowBottomSheet(true);
    } catch (error) {
      console.error("Error saving path result:", error);
      alert("Failed to save path result. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!resultImageUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(resultImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `path-result-${Date.now()}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "My Path Adventure",
          text: `${
            storyTitle || "My Adventure Story"
          } - I crushed ${getTotalDistance()} today!`,
          files: [file],
        });
      } else {
        // Show a message or copy link to clipboard instead
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(
            `Check out my path adventure: ${
              storyTitle || "My Adventure Story"
            } - I crushed ${getTotalDistance()} today!`
          );
          alert("Adventure details copied to clipboard!");
        } else {
          alert("Sharing not supported on this device");
        }
      }
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Unable to share at this time");
    }
  };

  const handleDone = async () => {
    try {
      const user = auth?.currentUser;
      if (missionId && user) {
        await updatePersonalMissionStatus(user.uid, missionId, true);
        console.log("Personal mission marked as complete:", missionId);
      }

      if (resultImageUrl) {
        // Save to gallery
        const link = document.createElement("a");
        link.download = `path-result-${Date.now()}.png`;
        link.href = resultImageUrl;
        link.click();
      }

      // Navigate back to main page
      router.push("/");
    } catch (error) {
      console.error("Error completing mission:", error);
      router.push("/");
    }
  };

  if (loading) {
    return (
      <AuthGuard redirectTo="/">
        <div className="min-h-dvh flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading your path results...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard redirectTo="/">
        <div className="min-h-dvh flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard redirectTo="/">
      <div
        className="min-h-dvh flex items-center justify-center px-4 py-8"
        style={{
          backgroundImage: "url('/images/bg3.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex flex-col items-center w-full max-w-sm">
          <div
            ref={photoboothRef}
            className="relative overflow-hidden mb-6 mx-auto"
            style={{
              width: "340px",
              height: "600px",
              backgroundImage: "url('/images/bg5.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: "32px",
              transform: `scale(${Math.min(
                1,
                (window.innerWidth - 32) / 328
              )})`,
              transformOrigin: "center",
            }}
          >
            <div className="absolute inset-0 p-6 flex flex-col pb-5">
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20">
                <img
                  src="/images/star-path.webp"
                  alt="Star path"
                  className="h-12 w-auto"
                />
              </div>

              <div className="flex-1 flex justify-center flex-col mb-0">
                <div
                  className="grid grid-cols-2 gap-x-0 gap-y-6 mb-4 mr-0 mt-14"
                  style={{ height: "auto", justifyItems: "center" }}
                >
                  {Array.from({ length: 6 }).map((_, index) => {
                    if (index === 1) {
                      return (
                        <div
                          key={index}
                          className="relative rounded-xl overflow-hidden bg-gray-50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          style={{ width: "120px", height: "120px" }}
                          onClick={handleTakeSelfie}
                        >
                          {capturedSelfie ? (
                            <img
                              src={capturedSelfie || "/placeholder.svg"}
                              alt="Your selfie"
                              style={{
                                width: "120px",
                                height: "120px",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                              <svg
                                className="w-8 h-8 mb-2"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 9a3 3 0 100 6 3 3 0 000-6zM12 17a5 5 0 110-10 5 5 0 010 10zM20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
                              </svg>
                              <span className="text-xs text-center">
                                Tap to selfie
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      const pathIndex = index > 1 ? index - 1 : index;
                      const pathImage = pathImages[pathIndex];

                      return (
                        <div
                          key={index}
                          className="relative rounded-xl overflow-hidden bg-gray-50 shadow-sm"
                          style={{ width: "120px", height: "120px" }}
                        >
                          {pathImage?.imageData ? (
                            <img
                              src={pathImage.imageData || "/placeholder.svg"}
                              alt={`Path image ${pathIndex + 1}`}
                              style={{
                                width: "120px",
                                height: "120px",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">
                                No image
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
              <div className="text-center pb-0 z-10 mx-0">
                <p className="text-white font-bold text-lg mb-0 mt-0">
                  I crushed {formatDistance(getTotalDistance())} today
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mb-8 px-4">
            <input
              type="text"
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              className="text-purple-600 font-bold text-lg mb-2 bg-transparent border-none outline-none text-center w-full placeholder-purple-400 focus:ring-2 focus:ring-purple-300 rounded px-2 py-1"
              placeholder="Your story title..."
              maxLength={50}
            />
            <textarea
              value={storyContent}
              onChange={(e) => setStoryContent(e.target.value)}
              className="text-purple-500 text-sm bg-transparent border-none outline-none text-center w-full placeholder-purple-400 focus:ring-2 focus:ring-purple-300 rounded px-2 py-1 resize-none"
              placeholder="Tell your story here..."
              rows={3}
              maxLength={200}
            />
          </div>

          <Button
            onClick={handleDownload}
            disabled={isSaving || !capturedSelfie}
            className={`w-full max-w-xs h-14 rounded-full text-white font-bold text-xl ${
              !capturedSelfie
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF]"
            }`}
            style={{
              boxShadow: !capturedSelfie
                ? "0 3px 0 #9CA3AF"
                : "0 3px 0 #50B0FF",
              ":hover": {
                boxShadow: !capturedSelfie
                  ? "0 3px 0 #9CA3AF"
                  : "0 3px 0 #50B0FF",
              },
            }}
          >
            {isSaving
              ? "Saving..."
              : !capturedSelfie
              ? "Take Selfie First"
              : "Save"}
          </Button>
        </div>

        {showBottomSheet && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
            <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 animate-slide-up">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>

              <div className="text-center mb-6"></div>

              <div className="mb-6 flex justify-center">
                <img
                  src={resultImageUrl || "/placeholder.svg"}
                  alt="Path result preview"
                  className="w-[220px] h-[420px]"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleDone}
                  className="flex-1 h-14 rounded-full text-white font-bold text-xl bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF]"
                  style={{
                    boxShadow: "0 4px 0 #50B0FF",
                  }}
                >
                  Done
                </Button>

                <Button
                  onClick={handleShare}
                  className="w-14 h-14 rounded-full text-white font-bold bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] flex items-center justify-center"
                  style={{
                    boxShadow: "0 4px 0 #50B0FF",
                  }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
