"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useScrollStory(stepCount: number) {
  const stepElementsRef = useRef<(HTMLElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  const registerStep = useCallback(
    (index: number) => (element: HTMLElement | null) => {
      stepElementsRef.current[index] = element;
    },
    [],
  );

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries.find((entry) => entry.isIntersecting);

        if (mostVisible?.target instanceof HTMLElement) {
          setActiveStep(Number(mostVisible.target.dataset["storyStep"]));
        }
      },
      {
        rootMargin: "-54% 0px -38% 0px",
        threshold: 0,
      },
    );

    stepElementsRef.current.slice(0, stepCount).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [stepCount]);

  return { activeStep, registerStep };
}
