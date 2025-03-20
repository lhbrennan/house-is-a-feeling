import { useRef, useState } from "react";
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

const borderColorRamps = {
  violet: {
    off: "border-violet-400",
    low: "border-violet-400",
    medium: "border-violet-600",
    high: "border-violet-800",
  },
  cyan: {
    off: "border-cyan-400",
    low: "border-cyan-400",
    medium: "border-cyan-500",
    high: "border-cyan-700",
  },
  yellow: {
    off: "border-yellow-400",
    low: "border-yellow-400",
    medium: "border-yellow-600",
    high: "border-yellow-800",
  },
  red: {
    off: "border-red-400",
    low: "border-red-400",
    medium: "border-red-600",
    high: "border-red-800",
  },
};

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
  const [isHovered, setIsHovered] = useState(false);

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
     transition-all duration-75 border-2";

  const colorClass = colorRamps[color][state];
  const borderClass = isHovered
    ? borderColorRamps[color][state]
    : "border-transparent";

  return (
    <button
      type="button"
      data-animate={animate.toString()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={`Pad ${state}`}
      className={cn(
        baseClasses,
        colorClass,
        borderClass,
        animate && "pop-animation",
        isHovered && "scale-105 cursor-pointer",
      )}
      {...props}
    />
  );
}

export { Pad, PAD_COLORS };
