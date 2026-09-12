"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function useSpacePreferences() {
  const [compact, setCompact] = useState(false);
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 760px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => {
      setCompact(narrow.matches);
      setMotion(!reduced.matches && fine.matches);
    };
    update();
    for (const query of [narrow, reduced, fine]) query.addEventListener("change", update);
    return () => { for (const query of [narrow, reduced, fine]) query.removeEventListener("change", update); };
  }, []);
  return { compact, motion };
}

type Artwork = { id: string; title: string; description: string; created_at: string; has_preview?: boolean; sample?: boolean; url?: string; credit?: string; source?: string };

export function PhotoArtwork({ item, index, motion, onOpen }: { item: Artwork; index: number; motion: boolean; onOpen: (trigger: HTMLButtonElement) => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const frame = useRef<number | null>(null);
  const reset = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    for (const property of ["--tilt-x", "--tilt-y", "--pan-x", "--pan-y"]) button.current?.style.removeProperty(property);
  };
  useEffect(() => {
    if (!motion) reset();
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, [motion]);
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (!motion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      button.current?.style.setProperty("--tilt-x", `${-y * 2}deg`);
      button.current?.style.setProperty("--tilt-y", `${x * 2}deg`);
      button.current?.style.setProperty("--pan-x", `${x * 5}px`);
      button.current?.style.setProperty("--pan-y", `${y * 5}px`);
      frame.current = null;
    });
  };
  return <article className="photo-card" style={{ "--order": Math.min(index, 5) } as CSSProperties}>
    <button ref={button} className="photo-button" onClick={event => onOpen(event.currentTarget)} onPointerMove={move} onPointerLeave={reset} onBlur={reset} aria-label={`查看${item.title}`}>
      <img src={item.url || `/api/library/${item.id}${item.has_preview ? "?preview=1" : ""}`} alt={item.title} loading={index < 2 ? "eager" : "lazy"} decoding="async" />
      {item.sample && <span className="sample-label">展示样片</span>}
      <span className="photo-overlay"><span className="photo-name">{item.title}</span><span className="view-mark" aria-hidden="true"><ArrowUpRight size={23} strokeWidth={1.5} /></span></span>
    </button>
    <div className="photo-credit-row">
      <span>{item.sample ? "SAMPLE /" : new Date(item.created_at).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
      {item.sample ? <a className="sample-credit" href={item.source} target="_blank" rel="noreferrer">{item.credit} / Unsplash <ArrowUpRight size={12} /></a> : <span className="photo-description">{item.description || "留下一个片刻"}</span>}
    </div>
  </article>;
}

type Day = { day: string; visits: number; uploads: number };
const level = (count: number) => count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;

export function ActivityGrid({ days, loading, today }: { days: Day[]; loading: boolean; today: string }) {
  const [selectedDay, setSelectedDay] = useState("");
  const [focusDay, setFocusDay] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousCount = useRef<number | null>(null);
  const grid = useMemo(() => {
    const end = new Date(today + "T12:00:00Z");
    const start = new Date(end); start.setUTCDate(end.getUTCDate() - 364);
    const pad = (start.getUTCDay() + 6) % 7;
    const values: Array<{ day: string; count: number } | null> = Array(pad).fill(null);
    const valuesByDay = new Map(days.map(day => [day.day, day.visits + day.uploads]));
    for (let i = 0; i < 365; i++) {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + i);
      const day = date.toISOString().slice(0, 10);
      values.push({ day, count: valuesByDay.get(day) || 0 });
    }
    while (values.length % 7) values.push(null);
    return values;
  }, [days, today]);
  const validDays = grid.filter((day): day is NonNullable<typeof day> => day !== null);
  const count = validDays.reduce((sum, day) => sum + day.count, 0);
  const active = validDays.filter(day => day.count > 0).length;
  const selected = validDays.find(day => day.day === selectedDay);
  const tabStop = validDays.some(day => day.day === focusDay) ? focusDay : today;
  useEffect(() => {
    const increased = previousCount.current !== null && count > previousCount.current;
    previousCount.current = count;
    if (!increased) return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 1100);
    return () => clearTimeout(timer);
  }, [count]);
  const months = Array.from({ length: grid.length / 7 }, (_, i) => {
    const first = grid.slice(i * 7, i * 7 + 7).find(Boolean);
    const previous = i ? grid.slice((i - 1) * 7, i * 7).find(Boolean) : null;
    return first && (!previous || first.day.slice(0, 7) !== previous.day.slice(0, 7)) ? first.day.slice(0, 7).replace("-", ".") : "";
  });
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const current = validDays.findIndex(value => value.day === day);
    let next = current;
    if (event.key === "ArrowUp") next--;
    else if (event.key === "ArrowDown") next++;
    else if (event.key === "ArrowLeft") next -= 7;
    else if (event.key === "ArrowRight") next += 7;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = validDays.length - 1;
    else return;
    event.preventDefault();
    const target = validDays[Math.max(0, Math.min(validDays.length - 1, next))];
    setFocusDay(target.day);
    setSelectedDay(target.day);
    buttons.current[target.day]?.focus({ preventScroll: true });
    buttons.current[target.day]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  return <section className="activity-card" aria-label="过去365天使用记录" data-celebrating={celebrating}>
    <div className="activity-head"><div><h2>创作足迹</h2><p>把值得留下的，放在这里。</p></div><span>过去 365 天 · 北京时间</span></div>
    <p id="activity-keyboard-help" className="sr-only">使用上下方向键移动一天，左右方向键移动一周，Home 和 End 跳到起始和最新日期。</p>
    <div className="heat-scroll"><div className="heat-inner">
      <div className="month-row" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>{months.map((month, index) => <span key={index}>{month}</span>)}</div>
      <div className="heat-wrap"><div className="week-labels" aria-hidden="true">{["一", "", "三", "", "五", "", "日"].map((day, index) => <span key={index}>{day}</span>)}</div>
        <div className="heat-grid" role="group" aria-label="每日活动" aria-describedby="activity-keyboard-help">
          {grid.map((day, index) => day ? <Tooltip key={day.day}><TooltipTrigger asChild><button
            ref={element => { buttons.current[day.day] = element; }}
            className="heat-cell" data-level={level(day.count)} data-today={day.day === today}
            tabIndex={day.day === tabStop ? 0 : -1} aria-label={`${day.day}，${day.count} 次活动${day.day === today ? "，今天" : ""}`}
            onFocus={() => setFocusDay(day.day)} onKeyDown={event => navigate(event, day.day)}
            onClick={() => { setFocusDay(day.day); setSelectedDay(day.day); }}
          /></TooltipTrigger><TooltipContent>{day.day} · {day.count} 次活动</TooltipContent></Tooltip> : <span key={`blank-${index}`} className="heat-cell heat-empty" />)}
        </div>
      </div>
    </div></div>
    <div className="activity-foot"><div><span className="activity-summary" aria-live="polite">{loading ? "正在读取使用记录…" : selected ? `${selected.day} · ${selected.count} 次活动` : <><b>{count}</b> 次活动<span className="summary-dot">·</span><b>{active}</b> 天活跃</>}</span><p>每日首次访问 +1，每次上传 +1</p></div><div className="legend" aria-label="颜色越亮活动越多"><span>少</span>{[0, 1, 2, 3, 4].map(value => <i className="legend-box" data-level={value} key={value} />)}<span>多</span></div></div>
  </section>;
}
