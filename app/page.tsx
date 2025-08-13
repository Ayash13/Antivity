'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingSlider } from '@/components/onboarding-slider';
import { RedirectIfAuthenticated } from '@/components/redirect-if-auth'
// Removed import of SpaceExplorer from './main/page' - it will now be rendered by the router

export default function RootPage() {
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const router = useRouter();

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
    router.push('/sign-in'); // Navigate to the /sign-in page after onboarding
  };

  // In a real app, you'd likely use a state management solution or local storage
  // to persist the onboarding completion status across sessions.
  // For this example, we'll just show it once per session.

  if (!onboardingCompleted) {
    return (
      <>
        <RedirectIfAuthenticated to="/main" />
        <OnboardingSlider onComplete={handleOnboardingComplete} />
      </>
    );
  }

  // This part will technically not be reached if router.push works immediately,
  // but it's good practice to have a fallback or loading state.
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <p>Loading main app...</p>
    </div>
  );
}
