"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
const MotionContext = createContext(true);

export function GalleryScene({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const syncVisibility = () => setVisible(document.visibilityState === "visible");
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return <MotionContext.Provider value={visible}>
    <div className="gallery-experience" data-paused={!visible}>
      <AmbientLighting running={visible}/>
      {children}
    </div>
  </MotionContext.Provider>;
}

function AmbientLighting({ running }: { running: boolean }) {
  const lightRef = useRef<HTMLDivElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = lightRef.current;
    if (!light || !running) return;
    let frame = 0;
    const pointer = { x: window.innerWidth * .22, y: window.innerHeight * .22 };
    const current = { ...pointer };
    const draw = () => {
      current.x += (pointer.x - current.x) * .08;
      current.y += (pointer.y - current.y) * .08;
      light.style.transform = `translate3d(${current.x - 350}px, ${current.y - 350}px, 0)`;
      atmosphereRef.current?.style.setProperty("--landscape-pointer-x", `${(current.x / window.innerWidth - .5) * 38}px`);
      atmosphereRef.current?.style.setProperty("--landscape-pointer-y", `${(current.y / window.innerHeight - .5) * 16}px`);
      if (Math.abs(current.x - pointer.x) + Math.abs(current.y - pointer.y) > .1) {
        frame = requestAnimationFrame(draw);
      } else frame = 0;
    };
    const move = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!frame) frame = requestAnimationFrame(draw);
    };
    window.addEventListener("pointermove", move, { passive: true });
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, [running]);

  return <div className="atmosphere" ref={atmosphereRef} aria-hidden="true">
    <div className="landscape-parallax"><div className="landscape-scene"><img src="/backgrounds/quiet-meadow.webp" alt="" decoding="async"/></div></div>
    <div className="pointer-light" ref={lightRef}/>
    <div className="atmosphere-vignette"/>
  </div>;
}

export function MotionPhoto({ children, featured, source, index }: {
  children: ReactNode; featured: boolean; source: string; index: number;
}) {
  const enabled = useContext(MotionContext);
  const ref = useRef<HTMLElement>(null);
  const frameRef = useRef(0);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) element.dataset.revealed = "true";
      }
    }, { threshold: .08 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = ref.current;
    const stop = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      target.current = { x: 0, y: 0 };
      current.current = { x: 0, y: 0 };
      element?.style.setProperty("--tilt-x", "0deg");
      element?.style.setProperty("--tilt-y", "0deg");
      element?.style.setProperty("--parallax-x", "0px");
      element?.style.setProperty("--parallax-y", "0px");
      if (element) element.dataset.pointer = "false";
    };
    if (!enabled || !inView) stop();
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [enabled, inView]);

  const animate = () => {
    const element = ref.current;
    if (!element) { frameRef.current = 0; return; }
    current.current.x += (target.current.x - current.current.x) * .11;
    current.current.y += (target.current.y - current.current.y) * .11;
    const { x, y } = current.current;
    element.style.setProperty("--tilt-x", `${-y * 5.5}deg`);
    element.style.setProperty("--tilt-y", `${x * 5.5}deg`);
    element.style.setProperty("--parallax-x", `${-x * 18}px`);
    element.style.setProperty("--parallax-y", `${-y * 12}px`);
    element.style.setProperty("--shine-x", `${(x + 1) * 50}%`);
    element.style.setProperty("--shine-y", `${(y + 1) * 50}%`);
    if (Math.abs(x - target.current.x) + Math.abs(y - target.current.y) > .001) {
      frameRef.current = requestAnimationFrame(animate);
    } else frameRef.current = 0;
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    target.current = {
      x: Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)),
      y: Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)),
    };
    event.currentTarget.dataset.pointer = "true";
    if (!frameRef.current) frameRef.current = requestAnimationFrame(animate);
  };
  const leave = () => {
    target.current = { x: 0, y: 0 };
    if (ref.current) ref.current.dataset.pointer = "false";
    if (enabled && !frameRef.current) frameRef.current = requestAnimationFrame(animate);
  };

  return <article ref={ref} className={`photo-card motion-photo ${featured ? "featured-photo" : ""}`}
    data-in-view={inView} style={{ animationDelay: `${featured ? 100 : 100 + index % 2 * 120}ms` }}
    onPointerMove={move} onPointerLeave={leave}>
    <div className="photo-aura" aria-hidden="true"><img src={source} alt="" loading={featured ? "eager" : "lazy"}/></div>
    {children}
  </article>;
}
