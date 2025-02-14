import { useRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { PadState } from "@/types";
import "@/index.css";

const PAD_STATES = ["off", "low", "medium", "high"] as const;

const padVariants = cva(
  "flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg outline-none \
   transition-colors transition-transform duration-150 \
   hover:scale-105",
  {
    variants: {
      state: {
        off: "bg-slate-200",
        low: "bg-blue-200",
        medium: "bg-blue-400",
        high: "bg-blue-600",
      },
    },
    defaultVariants: {
      state: "off",
    },
  },
);

type PadProps = {
  state?: PadState;
  onClick: (newValue: PadState) => void;
  animate?: boolean;
};

export function Pad({
  state: numericState = 0,
  onClick,
  animate = false,
  ...props
}: PadProps) {
  const state = PAD_STATES[numericState];

  // Timer ref for mobile long press detection.
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressThreshold = 500; // milliseconds

  const cycleState = (current: PadState): PadState => {
    switch (current) {
      case 0:
        return 3;
      case 3:
        return 2;
      case 2:
        return 1;
      case 1:
        return 0;
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

  return (
    <button
      type="button"
      data-animate={animate.toString()}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={`Pad ${state}`}
      className={cn(padVariants({ state }), animate && "pop-animation")}
      {...props}
    />
  );
}
