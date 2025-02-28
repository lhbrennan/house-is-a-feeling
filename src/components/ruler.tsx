import { cn } from "@/lib/utils";

type Props = {
  currentStep: number | null;
  numSteps: number; // e.g., 16, 32, etc.
  chainEnabled?: boolean;
  chainMeasure?: number;
};

export function Ruler({ 
  currentStep, 
  numSteps, 
  chainEnabled = false, 
  chainMeasure = 0 
}: Props) {
  const STEPS_PER_BEAT = 4;
  const totalBeats = numSteps / STEPS_PER_BEAT;
  const activeBeat =
    currentStep !== null ? Math.floor(currentStep / STEPS_PER_BEAT) : -1;

  const getGlobalBeatNumber = (beatIndex: number) => {
    if (chainEnabled) {
      return chainMeasure * totalBeats + beatIndex + 1;
    }
    return beatIndex + 1;
  };

  const getAnimationClass = (beatIndex: number) => {
    // Special case: If we're at the last step of a pattern (step 15 in a 16-step pattern)
    // and the active beat is the last beat (beat 3 in a 4-beat pattern),
    // we need to handle it specially to avoid the visual mismatch
    if (currentStep === numSteps - 1 && chainEnabled) {
      // Don't highlight any beat - this prevents the last beat staying highlighted
      // when the numbers change
      return "text-muted-foreground";
    }
    
    if (beatIndex === activeBeat) {
      return "bg-primary text-primary-foreground";
    }
    return "text-muted-foreground";
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
            {getGlobalBeatNumber(beatIndex)}
          </div>
        </div>
      ))}
    </div>
  );
}