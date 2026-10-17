import { useEffect, useRef, useState, type RefObject } from "react";

/** Animate only visible content; all values remain available to assistive technology. */
export function CountUp({ value, decimals = 0, suffix = "", duration = 900, className = "" }: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  const [display, setDisplay] = useState(() =>
    typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? value : 0,
  );
  useEffect(() => {
    const element = ref.current;
    if (!element || !Number.isFinite(value)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const settle = () => {
      cancelAnimationFrame(frame);
      setDisplay(value);
      last.current = value;
    };
    const animate = () => {
      observer?.disconnect();
      if (preference.matches) { settle(); return; }
      const from = last.current;
      const start = performance.now();
      const tick = (time: number) => {
        const elapsed = Math.min(1, (time - start) / duration);
        const next = from + (value - from) * (1 - (1 - elapsed) ** 4);
        setDisplay(next);
        last.current = next;
        if (elapsed < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    if (preference.matches || !("IntersectionObserver" in window)) settle();
    else {
      observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) animate(); }, { threshold: .2 });
      observer.observe(element);
    }
    preference.addEventListener("change", settle);
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); preference.removeEventListener("change", settle); };
  }, [value, decimals, duration]);
  const formatted = (number: number) => number.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref} className={className}><span aria-hidden="true">{formatted(display)}{suffix}</span><span className="sr-only">{formatted(value)}{suffix}</span></span>;
}

/** One observer and one passive scroll listener for the current screen. */
export function useSceneMotion(ref: RefObject<HTMLDivElement | null>, screen: string) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animations.push(entry.target.animate([
          { opacity: 0, transform: "translate3d(0, 28px, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ], { duration: 700, delay: Math.min(index * 55, 165), easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }));
      });
    }, { threshold: .08, rootMargin: "0px 0px -24px 0px" });
    root.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    const layers = [...root.querySelectorAll<HTMLElement>("[data-parallax]")];
    let frame = 0;
    const update = () => {
      frame = 0;
      const offsets = layers.map(element => {
        const bounds = element.parentElement?.getBoundingClientRect();
        return bounds ? Math.max(-24, Math.min(24, (innerHeight / 2 - bounds.top - bounds.height / 2) * .07)) : 0;
      });
      layers.forEach((element, index) => element.style.setProperty("--photo-shift", `${offsets[index]}px`));
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const stop = () => {
      observer.disconnect();
      animations.forEach(animation => animation.cancel());
      layers.forEach(element => element.style.removeProperty("--photo-shift"));
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      cancelAnimationFrame(frame);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll, { passive: true });
    preference.addEventListener("change", stop);
    update();
    return () => { stop(); preference.removeEventListener("change", stop); };
  }, [ref, screen]);
}
