"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./splash.css";

const introDuration = 2800;
const landingDuration = 650;
const tickCount = 60;
const statusMessages = [
  "Warming up",
  "Finding dark stores near you",
  "Stocking the shelves",
  "Ready in a tick",
];

export function SplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "intro" | "leaving">("hidden");
  const logo = useRef<HTMLImageElement>(null);
  const eligible = useRef<boolean | undefined>(undefined);
  const skip = useRef<() => void>(() => {});

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    if (eligible.current === undefined) {
      const replay = new URLSearchParams(window.location.search).get("splash") === "1";
      try {
        eligible.current = replay || !sessionStorage.getItem("ttm_splash_v2");
        if (eligible.current) sessionStorage.setItem("ttm_splash_v2", "true");
      } catch {
        eligible.current = true;
      }
    }
    if (!eligible.current) return;

    let ended = false;
    let exitTimer: number | undefined;
    let flyingLogo: HTMLImageElement | undefined;
    let flight: Animation | undefined;
    let destination: HTMLElement | null = null;

    const clearFlight = () => {
      flight?.cancel();
      flyingLogo?.remove();
      destination?.removeAttribute("data-splash-docking");
    };

    function landLogo() {
      const image = logo.current;
      const target = document.querySelector<HTMLElement>(".customer-logo-tile");
      if (!image?.naturalWidth || !target || target.closest("[inert]") || typeof image.animate !== "function") return false;

      const start = image.getBoundingClientRect();
      const end = target.getBoundingClientRect();
      if (!start.width || !end.width || end.bottom <= 0 || end.top >= window.innerHeight) return false;

      destination = target;
      const copy = image.cloneNode() as HTMLImageElement;
      copy.className = "ttm-splash-flying-logo";
      copy.alt = "";
      copy.setAttribute("aria-hidden", "true");
      Object.assign(copy.style, {
        top: `${start.top}px`,
        left: `${start.left}px`,
        width: `${start.width}px`,
        height: `${start.height}px`,
      });
      flyingLogo = copy;
      document.body.append(copy);
      destination.setAttribute("data-splash-docking", "");

      flight = copy.animate([
        { transform: "translate(0, 0) scale(1)" },
        { transform: `translate(${end.left - start.left}px, ${end.top - start.top}px) scale(${end.width / start.width})` },
      ], { duration: landingDuration, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" });

      return true;
    }

    function dismiss(animateLanding: boolean) {
      if (ended) return;
      ended = true;
      window.clearTimeout(introTimer);
      const reduceMotion = motion.matches;
      const isFlying = animateLanding && !reduceMotion && landLogo();
      setPhase(reduceMotion ? "hidden" : "leaving");
      exitTimer = window.setTimeout(() => {
        clearFlight();
        setPhase("hidden");
      }, isFlying ? landingDuration : reduceMotion ? 0 : 220);
    }

    function motionChanged() {
      if (!motion.matches) return;
      if (!ended) dismiss(false);
      else {
        clearFlight();
        setPhase("hidden");
      }
    }

    setPhase("intro");
    const introTimer = window.setTimeout(() => dismiss(true), introDuration);
    skip.current = () => dismiss(false);
    motion.addEventListener("change", motionChanged);

    return () => {
      window.clearTimeout(introTimer);
      window.clearTimeout(exitTimer);
      motion.removeEventListener("change", motionChanged);
      clearFlight();
      skip.current = () => {};
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div className="ttm-splash" data-phase={phase}>
      <div className="ttm-splash-glow" aria-hidden="true" />
      <div className="ttm-splash-stage" aria-hidden="true">
        <div className="ttm-splash-ring">
          {Array.from({ length: tickCount }, (_, index) => (
            <span key={index} className="ttm-splash-tick"
              style={{ "--splash-angle": `${index * 360 / tickCount}deg`, "--splash-tick-delay": `${900 + index * 28}ms` } as CSSProperties} />
          ))}
          <div className="ttm-splash-tile">
            <img ref={logo} src="/logo.png" className="ttm-splash-logo" alt="" width={1024} height={1024} fetchPriority="high" />
          </div>
        </div>
        <div className="ttm-splash-wordmark">
          <p>TIKK TIKK <strong>MART</strong></p>
          <span>Last minute saver</span>
        </div>
      </div>

      <p role="status" className="sr-only">Opening Tikk Tikk Mart</p>
      <div className="ttm-splash-status" aria-hidden="true">
        {statusMessages.map((message, index) => (
          <span key={message} style={{ "--splash-message-delay": `${1140 + index * 395}ms` } as CSSProperties}>{message}</span>
        ))}
      </div>
      <button type="button" aria-label="Skip intro" className="ttm-splash-skip" onClick={() => skip.current()} tabIndex={phase === "intro" ? 0 : -1} />
    </div>
  );
}
