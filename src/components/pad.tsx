import { useRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { PadState } from "@/types";

const PAD_STATES = ['off', 'low', 'medium', 'high'] as const;

const padVariants = cva(
  "flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg outline-none \
   transition-colors transition-transform duration-150 \
   hover:scale-105",
  {
    variants: {
      state: {
        "off": "bg-slate-200",
        "low": "bg-blue-200",
        "medium": "bg-blue-400",
        "high": "bg-blue-600",
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
};

export function Pad({ state: numericState = 0, onClick, ...props }: PadProps) {
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

  // Desktop: normal click toggles on/off; meta key (or right click) cycles velocity.
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.metaKey) {
      onClick(cycleState(numericState));
    } else {
      const newVal = numericState === 0 ? 3 : 0;
      onClick(newVal);
    }
  };

  // Mobile: start a timer on touch start for long press.
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      onClick(cycleState(numericState));
      longPressTimer.current = null;
    }, longPressThreshold);
  };

  // If the touch ends quickly, treat it as a quick tap.
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      const newVal = numericState === 0 ? 3 : 0;
      onClick(newVal);
    }
  };

  // Prevent default context menu and instead use right click to cycle on desktop.
  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick(cycleState(numericState));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={`Pad ${state}`}
      className={cn(padVariants({ state }))}
      {...props}
    ></button>
  );
}