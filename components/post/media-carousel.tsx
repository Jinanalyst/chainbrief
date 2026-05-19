"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type MediaItem = {
  id: string;
  kind: "image" | "video";
  src: string;
  alt?: string;
};

type Props = {
  items: MediaItem[];
  className?: string;
};

// Horizontal-swipe carousel with image counter, fullscreen image view,
// and videos that autoplay only when visible (muted by default).
export function MediaCarousel({ items, className }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState<MediaItem | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const i = Math.round(el.scrollLeft / w);
      setIndex(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!items?.length) return null;

  function scrollTo(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <>
      <div className={cn("relative overflow-hidden rounded-xl border border-tint/10 bg-black", className)}>
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((m) => (
            <div key={m.id} className="relative w-full shrink-0 snap-center">
              {m.kind === "image" ? (
                <button
                  type="button"
                  onClick={() => setFullscreen(m)}
                  className="block aspect-video w-full"
                  aria-label="Open fullscreen"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.src}
                    alt={m.alt ?? ""}
                    className="aspect-video w-full bg-black object-contain"
                  />
                </button>
              ) : (
                <AutoplayVideo src={m.src} />
              )}
            </div>
          ))}
        </div>

        {items.length > 1 ? (
          <>
            <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              {index + 1}/{items.length}
            </div>
            <button
              type="button"
              onClick={() => scrollTo(Math.max(0, index - 1))}
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollTo(Math.min(items.length - 1, index + 1))}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
              aria-label="Next"
            >
              ›
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {items.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-4 bg-white" : "w-1.5 bg-white/50",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {fullscreen ? (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-black/95 p-4"
          onClick={() => setFullscreen(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fullscreen.src} alt={fullscreen.alt ?? ""} className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(null);
            }}
          >
            Close
          </button>
        </div>
      ) : null}
    </>
  );
}

function AutoplayVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          el.play().then(() => setPlaying(true)).catch(() => undefined);
        } else {
          el.pause();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function onTimeUpdate() {
    const el = ref.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  }

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  return (
    <div
      className="group/video relative aspect-video w-full bg-black"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={() => setShowControls((v) => !v)}
    >
      <video
        ref={ref}
        src={src}
        muted={muted}
        playsInline
        loop
        onTimeUpdate={onTimeUpdate}
        className="aspect-video w-full bg-black object-contain"
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 transition-opacity",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="pointer-events-none h-1 flex-1 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full bg-white" style={{ width: `${progress}%` }} />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </div>
  );
}
