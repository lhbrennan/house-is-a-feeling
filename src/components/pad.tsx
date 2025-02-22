import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { PadVelocity } from "@/types";
import "@/index.css";

const PAD_COLORS = [
  "violet",
  "violet",
  "cyan",
  "cyan",
  "yellow",
  "yellow",
  "red",
  "red",
] as const;

const PAD_VELOCITIES = ["off", "low", "medium", "high"] as const;

const colorRamps = {
  violet: {
    off: "bg-slate-200",
    low: "bg-violet-200",
    medium: "bg-violet-400",
    high: "bg-violet-600",
  },
  cyan: {
    off: "bg-slate-200",
    low: "bg-cyan-200",
    medium: "bg-cyan-300",
    high: "bg-cyan-500",
  },
  yellow: {
    off: "bg-slate-200",
    low: "bg-yellow-200",
    medium: "bg-yellow-400",
    high: "bg-yellow-600",
  },
  red: {
    off: "bg-slate-200",
    low: "bg-red-200",
    medium: "bg-red-400",
    high: "bg-red-600",
  },
} as const;

type PadProps = {
  state?: PadVelocity;
  color: (typeof PAD_COLORS)[number];
  onClick: (newValue: PadVelocity) => void;
  animate?: boolean;
};

function Pad({
  state: numericState = 0,
  color,
  onClick,
  animate = false,
  ...props
}: PadProps) {
  const state = PAD_VELOCITIES[numericState];

  // Timer ref for mobile long press detection.
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressThreshold = 500; // ms

  const cycleState = (current: PadVelocity): PadVelocity => {
    switch (current) {
      case 0:
        return 3;
      case 3:
        return 2;
      case 2:
        return 1;
      case 1:
      default:
        return 0;
    }
  };

  // Desktop left-click / cmd-click
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.metaKey) {
      onClick(cycleState(numericState));
    } else {
      const newVal = numericState === 0 ? 3 : 0;
      onClick(newVal);
    }
  };

  // Mobile long-press detection
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      onClick(cycleState(numericState));
      longPressTimer.current = null;
    }, longPressThreshold);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      const newVal = numericState === 0 ? 3 : 0;
      onClick(newVal);
    }
  };

  // Right-click --> prevent default, cycle state
  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick(cycleState(numericState));
  };

  const baseClasses =
    "flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg outline-none \
     transition-colors transition-transform duration-150 hover:scale-105";

  const colorClass = colorRamps[color][state];

  return (
    <button
      type="button"
      data-animate={animate.toString()}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={`Pad ${state}`}
      className={cn(baseClasses, colorClass, animate && "pop-animation")}
      {...props}
    />
  );
}

export { Pad, PAD_COLORS };
