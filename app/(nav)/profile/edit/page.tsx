"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import {
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from "@/lib/firebase/firestore";
import { uploadProfilePhoto } from "@/lib/firebase/storage";
import { fileToBase64, validateImageFile } from "@/lib/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2 } from "lucide-react";
import Image from "next/image";
import { updateProfile } from "firebase/auth";
import { cn } from "@/lib/utils";

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);
  const [avatarKind, setAvatarKind] =
    useState<UserProfile["avatarKind"]>("image");

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tempAvatarSelection, setTempAvatarSelection] = useState<string | null>(
    null
  );

  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const u = auth?.currentUser;
        if (!u) {
          router.push("/sign-in");
          return;
        }
        const p = await getUserProfile(u.uid);
        if (!p) {
          // If no profile doc exists yet, seed basic values from auth
          setUsername(u.displayName || u.email?.split("@")[0] || "");
          setBio("");
          setCurrentPhotoURL(u.photoURL ?? null);
          setAvatarKind("image");
          setPreview(u.photoURL ?? null);
        } else {
          setUsername(p.username || p.displayName || "");
          setBio((p.bio ?? "") as string);
          setCurrentPhotoURL(p.photoURL ?? null);
          setAvatarKind(p.avatarKind);
          setPreview(p.photoURL ?? null);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function onPickPhoto() {
    setShowPhotoOptions(true);
  }

  function openUpload() {
    setShowPhotoOptions(false);
    fileInputRef.current?.click();
  }

  function openAvatarPicker() {
    setShowPhotoOptions(false);
    setTempAvatarSelection(
      preview && preview.startsWith("/avatar/") ? preview : "/avatar/ava1.webp"
    );
    setShowAvatarPicker(true);
  }

  function closeAvatarPicker() {
    setShowAvatarPicker(false);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.isValid) {
      setError(v.error || "Invalid image");
      e.target.value = "";
      return;
    }
    setError("");
    setSelectedFile(file);
    try {
      const base64 = await fileToBase64(file);
      setPreview(base64);
      setAvatarKind("image");
      setShowAvatarPicker(false);
      setShowPhotoOptions(false);
    } catch {
      setError("Failed to process image.");
      setSelectedFile(null);
    } finally {
      e.target.value = "";
    }
  }

  function validateUsername(name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length < 3) return "Username must be at least 3 characters.";
    if (trimmed.length > 24) return "Username must be at most 24 characters.";
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
      return "Only letters, numbers, and underscores are allowed.";
    return null;
  }

  async function onSave() {
    setError("");
    const u = auth?.currentUser;
    if (!u) {
      router.push("/sign-in");
      return;
    }
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    setSaving(true);
    try {
      let newPhotoURL: string | null = null;

      // 1) Upload new photo using Firebase Storage instead of free image host
      if (selectedFile) {
        newPhotoURL = await uploadProfilePhoto(selectedFile, u.uid);
      } else if (
        preview &&
        preview !== currentPhotoURL &&
        preview.startsWith("https://firebasestorage.googleapis.com/")
      ) {
        newPhotoURL = preview;
      }

      // 3) Build updates
      const updates: Partial<
        Omit<UserProfile, "uid" | "createdAt" | "updatedAt">
      > = {
        username: username.trim(),
        displayName: username.trim(),
        bio: bio.trim(),
      };
      if (newPhotoURL) {
        updates.photoURL = newPhotoURL;
        updates.avatarKind = "image";
      }

      // 4) Firestore update
      await updateUserProfile(u.uid, updates);

      // 5) Also update Firebase Auth profile for consistency
      await updateProfile(u, {
        displayName: username.trim(),
        photoURL: newPhotoURL ?? u.photoURL ?? undefined,
      });

      // 6) Done - navigate back
      router.push("/profile");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarDone() {
    if (!tempAvatarSelection) {
      setShowAvatarPicker(false);
      return;
    }
    setPreview(tempAvatarSelection);
    setSelectedFile(null);
    setAvatarKind("image");
    setShowAvatarPicker(false);
  }

  return (
    <main
      className="min-h-dvh bg-[rgba(226,249,255,1)] text-gray-900"
      style={{
        backgroundImage: 'url("/images/bg3.webp")',
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top center",
      }}
    >
      {/* Header with back */}
      <div
        className="sticky top-0 z-20 border-b border-gray-200"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
      >
        <div className="bg-[rgba(108,211,255,1)]">
          <div className="max-w-xl mx-auto px-4 pt-4 pb-4 flex items-center justify-between">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-[rgba(255,204,25,1)] hover:bg-[#50B0FF] text-white"
              style={{ boxShadow: "0 3px 0 #50B0FF" }}
              aria-label="Back"
            >
              <Image
                src="/icon/arrow_left.svg"
                alt="Back"
                width={20}
                height={20}
                className="brightness-0 invert"
              />
            </Button>
            <span className="text-base text-white sm:text-xl font-bold">
              Edit Profile
            </span>
            <div className="w-10" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="max-w-md mx-auto p-4 pb-28 mt-8">
        <div className="w-full rounded-[40px] bg-white p-6 sm:p-8 shadow-[0_4px_0_#50B0FF]">
          {/* Photo */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "relative w-40 h-40 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center mb-4"
              )}
            >
              {loading ? (
                <div className="flex items-center justify-center w-full h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : (
                <img
                  src={
                    (preview ||
                      currentPhotoURL ||
                      "/avatar/ava1.webp") as string
                  }
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={onPickPhoto}
                className="rounded-full bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] text-white"
                style={{ boxShadow: "0 5px 0 #50B0FF" }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Change photo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {/* Fields */}
          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-[rgba(125,71,185,1)] mb-1.5"
              >
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="h-12 rounded-full bg-slate-100 border-none focus-visible:ring-0 text-center"
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-semibold text-[rgba(125,71,185,1)] mb-1.5"
              >
                Bio
              </label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={200}
                placeholder="Tell something about you (max 200 chars)"
                className="rounded-2xl bg-slate-100 border-none focus-visible:ring-0"
              />
              <div className="mt-1 text-right text-xs text-gray-500">
                {bio.length}/200
              </div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="pt-2">
              <Button
                type="button"
                onClick={onSave}
                disabled={saving || loading || username.trim().length < 3}
                className="w-full h-14 rounded-full bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] text-white font-bold text-lg disabled:opacity-50"
                style={{ boxShadow: "0 5px 0 #50B0FF" }}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {showPhotoOptions && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Change photo options"
        >
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4 animate-in slide-in-from-bottom duration-300 border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-extrabold text-center mb-2 text-[rgba(125,71,185,1)]">
              Change photo
            </h3>

            <Button
              onClick={openAvatarPicker}
              className="w-full h-14 rounded-full text-white text-lg font-semibold bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] flex items-center justify-center space-x-2"
              style={{ boxShadow: "0 5px 0 #50B0FF" }}
            >
              Choose Avatar
            </Button>

            <Button
              onClick={openUpload}
              className="w-full h-14 rounded-full text-white text-lg font-semibold bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] flex items-center justify-center space-x-2"
              style={{ boxShadow: "0 5px 0 #50B0FF" }}
            >
              <Camera className="h-5 w-5" />
              <span>Upload Photo</span>
            </Button>

            <Button
              onClick={() => setShowPhotoOptions(false)}
              className="w-full h-14 rounded-full bg-[#F24B66] hover:bg-[#E13D59] text-white text-xl font-bold"
              style={{ boxShadow: "0 4px 0 #EB2E58" }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Choose avatar"
        >
          <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300 border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[rgba(125,71,185,1)]">
                  Choose Avatar
                </h3>
                <Button
                  onClick={closeAvatarPicker}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500"
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FCaterpillar%20profile%20png.webp?alt=media&token=b0dbf2a1-20f6-4088-b94a-4371649e6258",
                  "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FHappy%20ant%20profile%20png.webp?alt=media&token=73c2e5f8-9d4a-4b2c-8e1f-a5b7c9d2e4f6",
                  "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FLadybug%20profile%20png.webp?alt=media&token=a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FNerd%20ant%20profile%20png.webp?alt=media&token=f9e8d7c6-b5a4-3210-9876-543210fedcba",
                ].map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      setTempAvatarSelection(src);
                    }}
                    className={cn(
                      "relative aspect-square rounded-full overflow-hidden border transition-all",
                      tempAvatarSelection === src
                        ? "border-[rgba(108,211,255,1)] ring-2 ring-[#50B0FF]"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    aria-label="Select avatar"
                  >
                    <img
                      src={src || "/placeholder.svg"}
                      alt="Avatar option"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-3">
                {(() => {
                  const src =
                    "https://firebasestorage.googleapis.com/v0/b/project1-fed7d.appspot.com/o/avatar%2FNonchalant%20ant%20profile%20png.webp?alt=media&token=c5d4e3f2-a1b0-9876-5432-10fedcba9876";
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setTempAvatarSelection(src);
                      }}
                      className={cn(
                        "relative aspect-square rounded-full overflow-hidden border transition-all w-[calc((100%-2.25rem)/4)]",
                        tempAvatarSelection === src
                          ? "border-[rgba(108,211,255,1)] ring-2 ring-[#50B0FF]"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      aria-label="Select avatar"
                    >
                      <img
                        src={src || "/placeholder.svg"}
                        alt="Avatar option"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </button>
                  );
                })()}
              </div>
              <div className="mt-4 flex items-center justify-end gap-3 px-1 flex-col pb-0 pt-8">
                <Button
                  onClick={handleAvatarDone}
                  className="rounded-full bg-[rgba(108,211,255,1)] hover:bg-[#50B0FF] text-white w-64 h-14 text-xl font-bold"
                  style={{ boxShadow: "0 4px 0 #50B0FF" }}
                  disabled={!tempAvatarSelection}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
