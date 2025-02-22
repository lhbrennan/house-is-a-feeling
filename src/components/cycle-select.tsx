import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from "@radix-ui/react-icons";

export const CYCLE_SELECT_COLORS = [
  "oklch(0.541 0.281 293.009)",
  "oklch(0.541 0.281 293.009)",
  "oklch(0.715 0.143 215.221)",
  "oklch(0.715 0.143 215.221)",
  "oklch(0.681 0.162 75.834)",
  "oklch(0.681 0.162 75.834)",
  "oklch(0.577 0.245 27.325)",
  "oklch(0.577 0.245 27.325)",
];

type CycleSelectProps = {
  options: string[];
  selectedSampleIdx: number;
  onChange: (newSampleIdx: number) => void;
  color?: string;
  dotSize?: number;
  onDotClick?: () => void;
  className?: string;
};

export function CycleSelect({
  options,
  selectedSampleIdx,
  onChange,
  color = 'black',
  dotSize = 16,
  onDotClick,
  className,
}: CycleSelectProps) {
  const selectedValue = options[selectedSampleIdx];

  // State to track the animation direction (+1: next, -1: previous)
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handlePrev = () => {
    if (options.length < 2) return;
    setDirection(-1);
    const newIndex = (selectedSampleIdx - 1 + options.length) % options.length;
    onChange(newIndex);
  };

  const handleNext = () => {
    if (options.length < 2) return;
    setDirection(1);
    const newIndex = (selectedSampleIdx + 1) % options.length;
    onChange(newIndex);
  };

  // Left click triggers both onDotClick and opens the popover.
  const handleLeftClick = () => {
    onDotClick?.();
    setIsPopoverOpen(true);
  };

  // Right click only triggers onDotClick (without opening the popover).
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onDotClick?.();
  };

  // Framer Motion animation variants for the dot.
  const variants = {
    initial: (direction: number) => ({
      x: direction === 1 ? 40 : -40,
      opacity: 0,
    }),
    animate: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction === 1 ? -40 : 40,
      opacity: 0,
    }),
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center justify-center">
        {/* Left arrow */}
        <button
          onClick={handlePrev}
          disabled={options.length < 2}
          className="cursor-pointer px-2 py-1 disabled:opacity-50"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {/* Dot container wrapped in a controlled Popover */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <div
              onClick={handleLeftClick}
              onContextMenu={handleRightClick}
              className="relative h-8 w-8 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={selectedSampleIdx}
                    className="rounded-full"
                    style={{
                      backgroundColor: color,
                      width: dotSize,
                      height: dotSize,
                    }}
                    custom={direction}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                </AnimatePresence>
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="max-h-60 overflow-auto">
              {options.map((sample, idx) => (
                <div
                  key={sample}
                  onClick={() => {
                    onChange(idx);
                    setIsPopoverOpen(false);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between p-2 hover:bg-gray-200",
                    selectedValue === sample && "bg-gray-200 font-semibold",
                  )}
                >
                  <span>{sample}</span>
                  {selectedValue === sample && (
                    <ArrowLeftIcon className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Right arrow */}
        <button
          onClick={handleNext}
          disabled={options.length < 2}
          className="cursor-pointer px-2 py-1 disabled:opacity-50"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
