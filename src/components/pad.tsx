import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { PAD_STATES, type PadStates } from "@/constants";

const padVariants = cva(
  "flex items-center justify-center w-10 h-10 rounded-lg outline-none \
   transition-colors transition-transform duration-150 \
   hover:scale-105",
  {
    variants: {
      state: {
        [PAD_STATES.off]: "bg-slate-200",
        [PAD_STATES.low]: "bg-blue-200",
        [PAD_STATES.medium]: "bg-blue-400",
        [PAD_STATES.high]: "bg-blue-600",
      },
    },
    defaultVariants: {
      state: PAD_STATES.off,
    },
  },
);

type PadProps = {
  state?: PadStates;
  onClick?: () => void;
};

export function Pad({ state = "off", onClick, ...props }: PadProps) {
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
