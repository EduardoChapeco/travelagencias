import { useEffect, useRef } from "react";
import { SectionAnimation } from "@/types/builder";

export function useScrollAnimation(animation: SectionAnimation | undefined) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!animation || !animation.enabled || animation.type === "none") return;

    // Parallax and countUp are handled separately in components
    if (animation.type === "parallax" || animation.type === "countUp") return;

    const el = ref.current;
    if (!el) return;

    // Apply initial opacity/transform for smooth entrance
    el.style.opacity = "0";

    if (animation.trigger === "onLoad") {
      const delay = animation.delay || 0;
      const duration = animation.duration || 600;
      setTimeout(() => {
        el.style.transition = `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
        el.style.opacity = "1";
        el.classList.add(`animate-${animation.type}`);
      }, delay);
      return;
    }

    // trigger === 'onEnter'
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = animation.delay || 0;
            const duration = animation.duration || 600;

            setTimeout(() => {
              el.style.transition = `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
              el.style.opacity = "1";
              el.classList.add(`animate-${animation.type}`);
            }, delay);

            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animation]);

  return ref;
}

export function useParallax(enabled: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const scrolled = window.scrollY;
      const viewHeight = window.innerHeight;

      // Calculate how far the element is from the center of the screen
      const elementCenter = rect.top + rect.height / 2;
      const screenCenter = viewHeight / 2;
      const offset = ((elementCenter - screenCenter) / viewHeight) * 50;

      // Limit/bound the parallax effect to prevent breaking background layouts
      const boundedOffset = Math.max(-60, Math.min(60, offset));
      el.style.transform = `translateY(${boundedOffset}px) scale(1.1)`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial call to align on mount
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [enabled]);

  return ref;
}

export function useCountUp(valueStr: string, enabled: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    // Extract numerical value
    const match = valueStr.match(/\d+/);
    if (!match) {
      el.innerText = valueStr;
      return;
    }

    const targetValue = parseInt(match[0], 10);
    const nonNumericSuffix = valueStr.replace(/\d+/, "");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const start = 0;
            const duration = 1500; // ms
            const frameRate = 1000 / 60; // 60fps
            const totalFrames = Math.round(duration / frameRate);
            let frame = 0;

            const counter = setInterval(() => {
              frame++;
              const progress = frame / totalFrames;
              // Ease-out quad
              const currentVal = Math.round(targetValue * (progress * (2 - progress)));
              el.innerText = `${currentVal}${nonNumericSuffix}`;

              if (frame >= totalFrames) {
                clearInterval(counter);
                el.innerText = valueStr;
              }
            }, frameRate);

            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [valueStr, enabled]);

  return ref;
}
