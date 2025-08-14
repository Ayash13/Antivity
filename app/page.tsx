"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingSlider } from "@/components/onboarding-slider";
import { RedirectIfAuthenticated } from "@/components/redirect-if-auth";
import { DesktopLanding } from "@/components/desktop-landing";

export default function RootPage() {
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
    router.push("/sign-in");
  };

  if (!isMobile) {
    return <DesktopLanding />;
  }

  if (!onboardingCompleted) {
    return (
      <>
        <RedirectIfAuthenticated to="/main" />
        <OnboardingSlider onComplete={handleOnboardingComplete} />
      </>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <p>Loading main app...</p>
    </div>
  );
}
