"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const subscribeToObserverAvailability = () => () => undefined;

type StoryStepPosition = Readonly<{
  bottom: number;
  index: number;
  top: number;
}>;

export function selectClosestStoryStep(
  positions: readonly StoryStepPosition[],
  viewportHeight: number,
): number {
  const visiblePositions = positions.filter(
    ({ bottom, top }) => bottom > 0 && top < viewportHeight,
  );
  const candidates = visiblePositions.length > 0 ? visiblePositions : positions;
  const viewportCenter = viewportHeight / 2;

  return candidates.reduce(
    (closestStep, position) => {
      const positionCenter = (position.top + position.bottom) / 2;
      const distance = Math.abs(positionCenter - viewportCenter);
      return distance < closestStep.distance
        ? { distance, index: position.index }
        : closestStep;
    },
    { distance: Number.POSITIVE_INFINITY, index: 0 },
  ).index;
}

export function useScrollStory(stepCount: number) {
  const stepElementsRef = useRef<(HTMLElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const observerAvailable = useSyncExternalStore(
    subscribeToObserverAvailability,
    () => typeof IntersectionObserver !== "undefined",
    () => false,
  );

  const registerStep = useCallback(
    (index: number) => (element: HTMLElement | null) => {
      stepElementsRef.current[index] = element;
    },
    [],
  );

  useEffect(() => {
    if (!observerAvailable) {
      return;
    }

    const updateActiveStep = () => {
      const positions = stepElementsRef.current
        .slice(0, stepCount)
        .flatMap((element, index) => {
          if (!element) {
            return [];
          }
          const bounds = element.getBoundingClientRect();
          return [{ bottom: bounds.bottom, index, top: bounds.top }];
        });

      if (positions.length > 0) {
        setActiveStep(selectClosestStoryStep(positions, window.innerHeight));
      }
    };

    const observer = new IntersectionObserver(updateActiveStep, {
      rootMargin: "-46% 0px -46% 0px",
      threshold: 0,
    });

    stepElementsRef.current.slice(0, stepCount).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });
    window.addEventListener("resize", updateActiveStep);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateActiveStep);
    };
  }, [observerAvailable, stepCount]);

  return {
    activeStep,
    registerStep,
    storyMode: observerAvailable ? "observing" : "static",
  } as const;
}
