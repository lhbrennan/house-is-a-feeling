import { cn } from "@/lib/utils";

type Props = {
  currentStep: number | null;
  numSteps: number; // e.g., 16, 32, etc.
};

export function Ruler({ currentStep, numSteps }: Props) {
  const STEPS_PER_BEAT = 4;
  const totalBeats = numSteps / STEPS_PER_BEAT;
  const activeBeat =
    currentStep !== null ? Math.floor(currentStep / STEPS_PER_BEAT) : -1;

  const getAnimationClass = (beatIndex: number) => {
    if (beatIndex === activeBeat) {
      return "text-white bg-black";
    }
    return "text-gray-500";
  };

  return (
    <div
      style={{ gap: "clamp(6px, 3vw, 20px)" }}
      className="absolute top-[-25px] left-0 flex h-6 w-full pr-1.5 pl-1.5"
    >
      {Array.from({ length: totalBeats }).map((_, beatIndex) => (
        <div
          key={beatIndex}
          style={{ width: `${100 / totalBeats}%` }}
          className="flex justify-start transition-colors duration-300"
        >
          <div
            className={cn(
              getAnimationClass(beatIndex),
              "flex h-[16px] w-[40px] items-center justify-center rounded text-xs",
            )}
          >
            {beatIndex + 1}
          </div>
        </div>
      ))}
    </div>
  );
}
