"use client";

import type { MouseEvent } from "react";
import { useCallback, useEffect, useRef } from "react";

const ANCHOR_SCROLL_DURATION_MS = 900;
const NO_ACTIVE_SCROLL = () => undefined;

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function isPlainPrimaryClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

export function useDeliberateAnchorScroll(targetId: string) {
  const cancelActiveScrollRef = useRef<() => void>(NO_ACTIVE_SCROLL);

  useEffect(
    () => () => {
      cancelActiveScrollRef.current();
    },
    [],
  );

  return useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || !isPlainPrimaryClick(event)) {
        return;
      }

      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      event.preventDefault();
      cancelActiveScrollRef.current();

      const startScrollY = window.scrollY;
      const targetScrollY = startScrollY + target.getBoundingClientRect().top;
      const scrollDistance = targetScrollY - startScrollY;
      let animationFrameId = 0;
      let startedAt: number | undefined;

      const finish = () => {
        window.cancelAnimationFrame(animationFrameId);
        window.removeEventListener("keydown", cancel);
        window.removeEventListener("pointerdown", cancel);
        window.removeEventListener("touchstart", cancel);
        window.removeEventListener("wheel", cancel);
        cancelActiveScrollRef.current = NO_ACTIVE_SCROLL;
      };

      const cancel = () => {
        finish();
      };

      const animate = (timestamp: number) => {
        startedAt ??= timestamp;
        const elapsed = timestamp - startedAt;
        const progress = Math.min(elapsed / ANCHOR_SCROLL_DURATION_MS, 1);
        const nextScrollY =
          startScrollY + scrollDistance * easeInOutCubic(progress);

        window.scrollTo({
          behavior: "instant",
          left: 0,
          top: nextScrollY,
        });

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(animate);
          return;
        }

        finish();
      };

      cancelActiveScrollRef.current = cancel;
      window.addEventListener("keydown", cancel, { once: true });
      window.addEventListener("pointerdown", cancel, { once: true });
      window.addEventListener("touchstart", cancel, { once: true });
      window.addEventListener("wheel", cancel, { once: true });
      animationFrameId = window.requestAnimationFrame(animate);
    },
    [targetId],
  );
}
