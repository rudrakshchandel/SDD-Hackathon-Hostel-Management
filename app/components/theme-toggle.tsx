"use client";

import { ThemeMode, useTheme } from "@/lib/theme-context";

const labels: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System"
};

const cycleOrder: ThemeMode[] = ["light", "dark", "system"];

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const onCycleTheme = () => {
    const currentIndex = cycleOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % cycleOrder.length;
    setTheme(cycleOrder[nextIndex]);
  };

  return (
    <button
      type="button"
      onClick={onCycleTheme}
      className="glass-card inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-slate-900"
      aria-label={`Theme: ${labels[theme]}. Click to change theme`}
      title={`Theme: ${labels[theme]} (resolved: ${labels[resolvedTheme]})`}
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300/70 text-[10px] font-semibold"
      >
        {resolvedTheme === "dark" ? "D" : "L"}
      </span>
      <span>{labels[theme]}</span>
    </button>
  );
}
