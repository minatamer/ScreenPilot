"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const subscribeToObserverAvailability = () => () => undefined;

export function useHeroFeatureReveal(cardCount: number) {
  const cardElementsRef = useRef<(HTMLLIElement | null)[]>([]);
  const observerAvailable = useSyncExternalStore(
    subscribeToObserverAvailability,
    () => typeof IntersectionObserver !== "undefined",
    () => false,
  );
  const [revealedCards, setRevealedCards] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const registerCard = useCallback(
    (index: number) => (element: HTMLLIElement | null) => {
      cardElementsRef.current[index] = element;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!observerAvailable) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const newlyRevealed = entries.flatMap((entry) => {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) {
            return [];
          }

          observer.unobserve(entry.target);
          const cardIndex = Number(entry.target.dataset["featureIndex"]);
          return Number.isInteger(cardIndex) ? [cardIndex] : [];
        });

        if (newlyRevealed.length > 0) {
          setRevealedCards((currentCards) => {
            const nextCards = new Set(currentCards);
            newlyRevealed.forEach((index) => nextCards.add(index));
            return nextCards;
          });
        }
      },
      {
        rootMargin: "0px 0px -6% 0px",
        threshold: 0.15,
      },
    );

    cardElementsRef.current.slice(0, cardCount).forEach((element, index) => {
      if (element) {
        element.dataset["featureIndex"] = String(index);
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [cardCount, observerAvailable]);

  return {
    registerCard,
    revealMode: observerAvailable ? "observing" : "static",
    revealedCards,
  } as const;
}
