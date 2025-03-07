import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PatternId } from "@/types";

type PatternChainProps = {
  chainEnabled: boolean;
  setChainEnabled: (enabled: boolean) => void;
  chainLength: number;
  setChainLength: (length: number) => void;
  patternChain: Array<PatternId>;
  setPatternChain: (
    chain: Array<PatternId> | ((prev: Array<PatternId>) => Array<PatternId>),
  ) => void;
  isPlaying: boolean;
  chainMeasure: number;
  measureCounterRef?: React.RefObject<number> | { current: number };
  setChainMeasure?: (measure: number) => void;
};

export function PatternChain({
  chainEnabled,
  setChainEnabled,
  chainLength,
  setChainLength,
  patternChain,
  setPatternChain,
  isPlaying,
  chainMeasure,
  measureCounterRef,
  setChainMeasure,
}: PatternChainProps) {
  const handleChainToggle = (enabled: boolean) => {
    setChainEnabled(enabled);

    // Reset measure counter when toggling chain
    if (measureCounterRef) {
      measureCounterRef.current = 0;
    }

    if (setChainMeasure) {
      setChainMeasure(0);
    }
  };

  const handleChainLengthChange = (value: string) => {
    const newLen = parseInt(value, 10);
    setChainLength(newLen);

    // Reset measure counter when changing chain length
    if (measureCounterRef) {
      measureCounterRef.current = 0;
    }

    if (setChainMeasure) {
      setChainMeasure(0);
    }
  };

  const handlePatternChange = (index: number, value: PatternId) => {
    setPatternChain((prev: PatternId[]) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <div className="relative mt-4">
      <div
        className={`relative flex h-14 items-center overflow-hidden rounded-md border border-solid transition-all duration-300 ease-in-out ${chainEnabled ? "w-full" : "w-[150px]"} `}
      >
        {/* Chain toggle section */}
        <div className="flex h-full w-[150px] shrink-0 items-center px-3">
          <Label className="mr-3 text-sm font-medium">Chain:</Label>
          <Switch checked={chainEnabled} onCheckedChange={handleChainToggle} />
        </div>

        {/* Divider line with animation */}
        <div
          className={`h-14 self-stretch border-l transition-opacity duration-300 ease-in-out ${chainEnabled ? "opacity-100" : "opacity-0"} `}
        ></div>

        {/* Chain options that slide into view */}
        <div
          className={`flex h-full flex-nowrap items-center gap-4 pr-3 pl-4 transition-all duration-300 ease-in-out ${chainEnabled ? "max-w-[2000px] opacity-100" : "max-w-0 overflow-hidden opacity-0"} `}
        >
          <div className="flex shrink-0 items-center space-x-2">
            <Label className="text-sm whitespace-nowrap">Length:</Label>
            <Select
              value={chainLength.toString()}
              onValueChange={handleChainLengthChange}
            >
              <SelectTrigger className="h-8 w-[60px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 5, 6, 7, 8].map((len) => (
                  <SelectItem key={len} value={len.toString()}>
                    {len}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="scrollbar-thin flex flex-nowrap items-center gap-2 overflow-x-auto">
            {Array.from({ length: chainLength }).map((_, i) => {
              const isActiveMeasure = isPlaying && chainMeasure === i;
              return (
                <div
                  key={i}
                  className={`flex flex-shrink-0 items-center space-x-1 rounded p-1 ${
                    isActiveMeasure
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "bg-muted"
                  }`}
                >
                  <Label className="w-4 text-center text-xs leading-none">
                    {i + 1}
                  </Label>
                  <Select
                    value={patternChain[i]}
                    onValueChange={(val) =>
                      handlePatternChange(i, val as PatternId)
                    }
                  >
                    <SelectTrigger className="h-7 w-[55px] px-2 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["A", "B", "C", "D"] as const).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
