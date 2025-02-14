import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { PadState } from "@/types";

const PAD_STATES = ['off', 'low', 'medium', 'high'] as const;

const padVariants = cva(
  "flex items-center justify-center w-10 h-10 rounded-lg outline-none \
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
  onClick?: () => void;
};

export function Pad({ state : numericState = 0, onClick, ...props }: PadProps) {
  const  state = PAD_STATES[numericState];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pad ${state}`}
      className={cn(padVariants({ state }))}
      {...props}
    ></button>
  );
}
