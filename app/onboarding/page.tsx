import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-forest-900" />}>
      <OnboardingFlow />
    </Suspense>
  );
}
