import type { EntryMode } from "@screenpilot/contracts/interview/entry-mode";
import type {
  InsightCard,
  InsightStatus,
} from "@screenpilot/contracts/interview/insight-card";
import type { NormalizedCv } from "@screenpilot/contracts/interview/normalized-cv";
import type { TopicProgress } from "@screenpilot/contracts/interview/topic-progress";
import type { TranscriptTurn } from "@screenpilot/contracts/interview/transcript-turn";
import {
  type CSSProperties,
  type PointerEventHandler,
  useId,
  useRef,
  useState,
} from "react";

import { Badge, type BadgeTone } from "@/shared/ui/badge";

import {
  compareInsightBoardCards,
  INSIGHT_CATEGORY_METADATA,
} from "./insight-category-metadata";

type InsightBoardProps = Readonly<{
  cv?: NormalizedCv | undefined;
  entryMode: EntryMode;
  insights: readonly InsightCard[];
  topicProgress: readonly TopicProgress[];
  transcript: readonly TranscriptTurn[];
}>;

const STATUS_LABELS: Readonly<Record<InsightStatus, string>> = {
  appearing: "Organizing",
  confirmed: "Confirmed",
  corrected: "Corrected",
  needs_clarification: "Needs clarification",
};

const MOBILE_TOPICS_PER_SLIDE = 4;
const CAROUSEL_SWIPE_THRESHOLD_PX = 44;
const CAROUSEL_AXIS_LOCK_THRESHOLD_PX = 8;
const CAROUSEL_EDGE_RESISTANCE = 0.28;
const CAROUSEL_INTERACTIVE_TARGET_SELECTOR =
  "a, button, input, select, textarea, summary, [role='button'], [contenteditable='true']";

type CarouselDirection = "next" | "previous";

type CarouselSwipeOptions = Readonly<{
  currentSlide: number;
  onSlideChange: (slide: number) => void;
  totalSlides: number;
}>;

interface CarouselPointerGesture {
  axis: "horizontal" | "pending" | "vertical";
  dragX: number;
  pointerId: number;
  startX: number;
  startY: number;
}

type CarouselViewportStyle = CSSProperties & {
  "--sp-carousel-page-gap-offset"?: string;
  "--sp-carousel-slide-offset": string;
};

function carouselViewportStyle(
  activeSlide: number,
  includesPageGap = false,
): CarouselViewportStyle {
  return {
    ...(includesPageGap
      ? {
          "--sp-carousel-page-gap-offset":
            activeSlide === 0
              ? "0px"
              : `calc(0px${" - var(--sp-space-2)".repeat(activeSlide)})`,
        }
      : {}),
    "--sp-carousel-slide-offset": `${String(activeSlide * -100)}%`,
  };
}

function topicCarouselPosition(topicIndex: number): CSSProperties {
  const topicIndexWithinSlide = topicIndex % MOBILE_TOPICS_PER_SLIDE;
  const slideIndex = Math.floor(topicIndex / MOBILE_TOPICS_PER_SLIDE);

  return {
    gridColumn: slideIndex * 2 + (topicIndexWithinSlide % 2) + 1,
    gridRow: Math.floor(topicIndexWithinSlide / 2) + 1,
  };
}

function isCarouselInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(CAROUSEL_INTERACTIVE_TARGET_SELECTOR) !== null
  );
}

function useCarouselSwipe<TElement extends HTMLElement>({
  currentSlide,
  onSlideChange,
  totalSlides,
}: CarouselSwipeOptions) {
  const carouselViewportRef = useRef<TElement>(null);
  const pointerGesture = useRef<CarouselPointerGesture | undefined>(undefined);

  const resetDragVisuals = () => {
    const carouselViewport = carouselViewportRef.current;
    if (!carouselViewport) {
      return;
    }

    carouselViewport.dataset["dragging"] = "false";
    carouselViewport.style.setProperty("--sp-carousel-drag-x", "0px");
  };

  const onPointerDown: PointerEventHandler<TElement> = (event) => {
    if (
      event.pointerType === "mouse" ||
      isCarouselInteractiveTarget(event.target)
    ) {
      return;
    }

    pointerGesture.current = {
      axis: "pending",
      dragX: 0,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const onPointerMove: PointerEventHandler<TElement> = (event) => {
    const gesture = pointerGesture.current;
    if (gesture?.pointerId !== event.pointerId) {
      return;
    }

    const horizontalDistance = event.clientX - gesture.startX;
    const verticalDistance = event.clientY - gesture.startY;
    if (gesture.axis === "pending") {
      if (
        Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) <
        CAROUSEL_AXIS_LOCK_THRESHOLD_PX
      ) {
        return;
      }

      gesture.axis =
        Math.abs(horizontalDistance) > Math.abs(verticalDistance)
          ? "horizontal"
          : "vertical";

      if (gesture.axis === "horizontal") {
        const pointerCaptureTarget: {
          setPointerCapture?: (pointerId: number) => void;
        } = event.currentTarget;
        pointerCaptureTarget.setPointerCapture?.(event.pointerId);
      }
    }

    if (gesture.axis !== "horizontal") {
      return;
    }

    event.preventDefault();
    const isPullingPastStart = currentSlide === 0 && horizontalDistance > 0;
    const isPullingPastEnd =
      currentSlide === totalSlides - 1 && horizontalDistance < 0;
    gesture.dragX =
      isPullingPastStart || isPullingPastEnd
        ? horizontalDistance * CAROUSEL_EDGE_RESISTANCE
        : horizontalDistance;

    const carouselViewport = carouselViewportRef.current;
    if (!carouselViewport) {
      return;
    }

    carouselViewport.dataset["dragging"] = "true";
    carouselViewport.style.setProperty(
      "--sp-carousel-drag-x",
      `${String(gesture.dragX)}px`,
    );
  };

  const onPointerUp: PointerEventHandler<TElement> = (event) => {
    const gesture = pointerGesture.current;
    pointerGesture.current = undefined;

    if (gesture?.pointerId !== event.pointerId) {
      return;
    }

    const pointerCaptureTarget: {
      hasPointerCapture?: (pointerId: number) => boolean;
      releasePointerCapture?: (pointerId: number) => void;
    } = event.currentTarget;
    if (pointerCaptureTarget.hasPointerCapture?.(event.pointerId)) {
      pointerCaptureTarget.releasePointerCapture?.(event.pointerId);
    }

    resetDragVisuals();
    if (
      gesture.axis !== "horizontal" ||
      Math.abs(gesture.dragX) < CAROUSEL_SWIPE_THRESHOLD_PX
    ) {
      return;
    }

    const requestedSlide =
      gesture.dragX < 0 ? currentSlide + 1 : currentSlide - 1;
    const boundedSlide = Math.min(
      Math.max(requestedSlide, 0),
      Math.max(totalSlides - 1, 0),
    );

    if (boundedSlide !== currentSlide) {
      onSlideChange(boundedSlide);
    }
  };

  const onPointerCancel: PointerEventHandler<TElement> = () => {
    pointerGesture.current = undefined;
    resetDragVisuals();
  };

  return {
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    ref: carouselViewportRef,
  };
}

type CarouselControlsProps = Readonly<{
  currentSlide: number;
  label: string;
  onNext: () => void;
  onPrevious: () => void;
  totalSlides: number;
}>;

function CarouselArrow({
  direction,
}: Readonly<{ direction: "next" | "previous" }>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d={direction === "previous" ? "m14.5 5-7 7 7 7" : "m9.5 5 7 7-7 7"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function CarouselControls({
  currentSlide,
  label,
  onNext,
  onPrevious,
  totalSlides,
}: CarouselControlsProps) {
  if (totalSlides <= 1) {
    return null;
  }

  return (
    <div
      aria-label={`${label} slideshow controls`}
      className="sp-insight-carousel-controls"
      role="group"
    >
      <button
        aria-label={`Previous ${label}`}
        disabled={currentSlide === 0}
        onClick={onPrevious}
        type="button"
      >
        <CarouselArrow direction="previous" />
      </button>
      <span aria-atomic="true" aria-live="polite">
        {currentSlide + 1} of {totalSlides}
      </span>
      <button
        aria-label={`Next ${label}`}
        disabled={currentSlide === totalSlides - 1}
        onClick={onNext}
        type="button"
      >
        <CarouselArrow direction="next" />
      </button>
    </div>
  );
}

function statusTone(status: InsightStatus): BadgeTone {
  if (status === "needs_clarification") {
    return "warning";
  }
  if (status === "confirmed") {
    return "success";
  }
  return "coral";
}

function topicLabel(topicKey: TopicProgress["topicKey"]): string {
  return topicKey
    .replace("relevant_experience_summary", "experience")
    .replace("motivation_and_next_role", "motivation")
    .replace("location_work_arrangement", "work arrangement")
    .replace("compensation_expectation", "compensation")
    .replace("english_use_context", "English use")
    .replace("clarifications_and_followups", "follow-ups")
    .replaceAll("_", " ");
}

function topicStatusLabel(status: TopicProgress["status"]): string {
  return status.replaceAll("_", " ");
}

function InsightEvidence({
  cv,
  insight,
  transcript,
}: Readonly<{
  cv?: NormalizedCv | undefined;
  insight: InsightCard;
  transcript: readonly TranscriptTurn[];
}>) {
  const candidateTurns = insight.evidenceTurnIds.flatMap((turnId) => {
    const turn = transcript.find((candidate) => candidate.id === turnId);
    return turn ? [turn] : [];
  });
  const cvFacts = insight.cvFactIds.flatMap((factId) => {
    const fact = cv?.facts.find((candidate) => candidate.id === factId);
    return fact ? [fact] : [];
  });
  const evidenceCount = candidateTurns.length + cvFacts.length;
  const evidenceContentId = useId();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        aria-controls={evidenceContentId}
        aria-expanded={expanded}
        className="sp-insight-card__evidence-toggle"
        onClick={() => {
          setExpanded((currentExpanded) => !currentExpanded);
        }}
        type="button"
      >
        Evidence <span>{evidenceCount}</span>
      </button>
      <div
        className="sp-insight-card__evidence-content"
        hidden={!expanded}
        id={evidenceContentId}
      >
        {cvFacts.map((fact) => (
          <blockquote key={`cv-${fact.id}`}>
            <span>CV</span>
            <p>{fact.statement}</p>
          </blockquote>
        ))}
        {candidateTurns.map((turn) => (
          <blockquote key={`turn-${turn.id}`}>
            <span>Candidate · turn {turn.sequence + 1}</span>
            <p>{turn.text}</p>
          </blockquote>
        ))}
        {insight.correctionReason ? (
          <p className="sp-insight-card__correction-note">
            Correction note: {insight.correctionReason}
          </p>
        ) : null}
      </div>
    </>
  );
}

function InsightCardView({
  cv,
  insight,
  isCarouselActive,
  transcript,
}: Readonly<{
  cv?: NormalizedCv | undefined;
  insight: InsightCard;
  isCarouselActive: boolean;
  transcript: readonly TranscriptTurn[];
}>) {
  const categoryMetadata = INSIGHT_CATEGORY_METADATA[insight.category];

  return (
    <article
      className="sp-insight-card"
      data-category={insight.category}
      data-carousel-active={isCarouselActive ? "true" : "false"}
      data-status={insight.status}
      role="listitem"
    >
      <div aria-hidden="true" className="sp-insight-card__mark">
        {categoryMetadata.mark}
      </div>
      <div className="sp-insight-card__body">
        <header>
          <p>{insight.label}</p>
          <Badge tone={statusTone(insight.status)}>
            {STATUS_LABELS[insight.status]}
          </Badge>
        </header>
        <p className="sp-insight-card__value">{insight.value}</p>
        <div className="sp-insight-card__meta">
          <Badge>{insight.source}</Badge>
          {insight.status === "corrected" ? (
            <span>Candidate updated</span>
          ) : null}
          <InsightEvidence cv={cv} insight={insight} transcript={transcript} />
        </div>
      </div>
    </article>
  );
}

export function InsightBoard({
  cv,
  entryMode,
  insights,
  topicProgress,
  transcript,
}: InsightBoardProps) {
  const coveredTopics = topicProgress.filter(
    (progress) => progress.status === "covered",
  ).length;
  const orderedInsights = [...insights].sort(compareInsightBoardCards);
  const [requestedInsightSlide, setRequestedInsightSlide] = useState(0);
  const [requestedTopicSlide, setRequestedTopicSlide] = useState(0);
  const [insightSlideDirection, setInsightSlideDirection] =
    useState<CarouselDirection>("next");
  const [topicSlideDirection, setTopicSlideDirection] =
    useState<CarouselDirection>("next");
  const activeInsightSlide = Math.min(
    requestedInsightSlide,
    Math.max(orderedInsights.length - 1, 0),
  );
  const topicSlideCount = Math.ceil(
    topicProgress.length / MOBILE_TOPICS_PER_SLIDE,
  );
  const activeTopicSlide = Math.min(
    requestedTopicSlide,
    Math.max(topicSlideCount - 1, 0),
  );
  const selectInsightSlide = (nextSlide: number) => {
    setInsightSlideDirection(
      nextSlide > activeInsightSlide ? "next" : "previous",
    );
    setRequestedInsightSlide(nextSlide);
  };
  const selectTopicSlide = (nextSlide: number) => {
    setTopicSlideDirection(nextSlide > activeTopicSlide ? "next" : "previous");
    setRequestedTopicSlide(nextSlide);
  };
  const insightSwipeHandlers = useCarouselSwipe<HTMLDivElement>({
    currentSlide: activeInsightSlide,
    onSlideChange: selectInsightSlide,
    totalSlides: orderedInsights.length,
  });
  const topicSwipeHandlers = useCarouselSwipe<HTMLDivElement>({
    currentSlide: activeTopicSlide,
    onSlideChange: selectTopicSlide,
    totalSlides: topicSlideCount,
  });

  return (
    <section aria-labelledby="insight-board-title" className="sp-insight-board">
      <header className="sp-insight-board__header">
        <div>
          <p>Live candidate evidence</p>
          <h2 id="insight-board-title">What ScreenPilot understood</h2>
        </div>
        <Badge tone="coral">
          {insights.length} {insights.length === 1 ? "note" : "notes"}
        </Badge>
      </header>

      {insights.length === 0 ? (
        <div className="sp-insight-board__empty" role="status">
          <span aria-hidden="true">+</span>
          <div>
            <strong>Ready for candidate evidence</strong>
            <p>
              {entryMode === "conversation_first"
                ? "Cards appear only after your final spoken answers."
                : "Grounded CV notes and confirmed answers will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div
          {...insightSwipeHandlers}
          aria-label="Candidate insight cards"
          aria-live="polite"
          className="sp-insight-board__rail"
          data-carousel-direction={insightSlideDirection}
          role="list"
          style={carouselViewportStyle(activeInsightSlide)}
        >
          <div className="sp-insight-board__rail-track">
            {orderedInsights.map((insight, index) => (
              <InsightCardView
                {...(cv ? { cv } : {})}
                insight={insight}
                isCarouselActive={index === activeInsightSlide}
                key={insight.id}
                transcript={transcript}
              />
            ))}
          </div>
        </div>
      )}

      <CarouselControls
        currentSlide={activeInsightSlide}
        label="candidate note"
        onNext={() => {
          selectInsightSlide(activeInsightSlide + 1);
        }}
        onPrevious={() => {
          selectInsightSlide(activeInsightSlide - 1);
        }}
        totalSlides={orderedInsights.length}
      />

      <div className="sp-insight-board__topics">
        <header>
          <strong>Conversation coverage</strong>
          <span>{coveredTopics} covered</span>
        </header>
        {topicProgress.length === 0 ? (
          <p>Topics will update as candidate answers are confirmed.</p>
        ) : (
          <div
            {...topicSwipeHandlers}
            className="sp-insight-board__topics-viewport"
            data-carousel-direction={topicSlideDirection}
            style={carouselViewportStyle(activeTopicSlide, true)}
          >
            <ul aria-label="Interview topic progress">
              {topicProgress.map((progress, index) => (
                <li
                  data-carousel-active={
                    Math.floor(index / MOBILE_TOPICS_PER_SLIDE) ===
                    activeTopicSlide
                      ? "true"
                      : "false"
                  }
                  data-status={progress.status}
                  key={progress.topicKey}
                  style={topicCarouselPosition(index)}
                >
                  <span>{topicLabel(progress.topicKey)}</span>
                  <small>{topicStatusLabel(progress.status)}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
        <CarouselControls
          currentSlide={activeTopicSlide}
          label="coverage topics"
          onNext={() => {
            selectTopicSlide(activeTopicSlide + 1);
          }}
          onPrevious={() => {
            selectTopicSlide(activeTopicSlide - 1);
          }}
          totalSlides={topicSlideCount}
        />
      </div>
    </section>
  );
}
