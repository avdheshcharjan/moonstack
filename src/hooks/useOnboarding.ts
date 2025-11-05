/**
 * useOnboarding Hook
 * 
 * Manages onboarding state using localStorage to track whether
 * the user has seen the onboarding flow.
 */

import { useEffect, useState } from 'react';

const ONBOARDING_SEEN_KEY = 'moonstack_onboarding_seen';
const ONBOARDING_SKIP_KEY = 'moonstack_onboarding_skip';

export function useOnboarding() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(true); // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check localStorage on mount
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
    const skipped = localStorage.getItem(ONBOARDING_SKIP_KEY) === 'true';
    
    setHasSeenOnboarding(seen || skipped);
    setIsLoading(false);
  }, []);

  const markOnboardingAsSeen = () => {
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    setHasSeenOnboarding(true);
  };

  const setDontShowAgain = () => {
    localStorage.setItem(ONBOARDING_SKIP_KEY, 'true');
    setHasSeenOnboarding(true);
  };

  const shouldShowOnboarding = () => {
    return !hasSeenOnboarding && !isLoading;
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_SEEN_KEY);
    localStorage.removeItem(ONBOARDING_SKIP_KEY);
    setHasSeenOnboarding(false);
  };

  return {
    hasSeenOnboarding,
    isLoading,
    markOnboardingAsSeen,
    setDontShowAgain,
    shouldShowOnboarding,
    resetOnboarding,
  };
}


