"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { ProductMediaEntry } from "@/content/product-media";

export function ProductMedia({ media }: { media: ProductMediaEntry }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      queueMicrotask(() => setReducedMotion(true));
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    queueMicrotask(update);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!video.current) return;
    if (visible && media.autoplay && !reducedMotion)
      void video.current.play().catch(() => setFailed(true));
    else video.current.pause();
  }, [media.autoplay, reducedMotion, visible]);

  const hasVideo = Boolean(media.webm || media.mp4);
  return (
    <figure className="product-media" ref={frame}>
      {!hasVideo || failed || reducedMotion ? (
        <picture>
          <source media="(max-width: 600px)" srcSet={media.mobileFallback} />
          <Image
            alt={media.description}
            height={media.height}
            loading="lazy"
            sizes="(max-width: 900px) 100vw, 50vw"
            src={reducedMotion ? media.reducedMotionFallback : media.poster}
            width={media.width}
          />
        </picture>
      ) : (
        <video
          aria-label={media.title}
          autoPlay={media.autoplay}
          controls={!media.autoplay}
          loop={media.loop}
          muted
          onError={() => setFailed(true)}
          playsInline
          poster={media.poster}
          preload="metadata"
          ref={video}
        >
          {media.webm ? <source src={media.webm} type="video/webm" /> : null}
          {media.mp4 ? <source src={media.mp4} type="video/mp4" /> : null}
        </video>
      )}
      <figcaption>
        <strong>{media.title}</strong>
        <span>{media.transcript}</span>
      </figcaption>
    </figure>
  );
}
