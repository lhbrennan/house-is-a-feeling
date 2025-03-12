import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const calculateSensitivity = (min: number, max: number) => {
  const range = Math.abs(max - min);

  // Base sensitivity that works well for range 0-100
  const baseSensitivity = 0.25;

  if (range <= 1) {
    // For very small ranges (0-1), use a much lower sensitivity
    return baseSensitivity * 0.01 * range;
  } else if (range <= 10) {
    // For small ranges (1-10), scale appropriately
    return baseSensitivity * 0.1;
  } else if (range <= 100) {
    // For medium ranges (10-100), use the standard sensitivity
    return baseSensitivity;
  } else {
    // For very large ranges (>100), increase sensitivity
    return baseSensitivity * (range / 100);
  }
};

// Helper function to quantize a value to the nearest step with proper precision
const quantizeToStep = (
  value: number,
  step: number,
  min: number,
  max: number,
) => {
  if (step <= 0) return Math.max(min, Math.min(max, value));

  // Calculate how many decimal places we need based on the step
  const precision = Math.floor(Math.log10(1 / step)) + 1;
  const factor = Math.pow(10, precision);

  // Round to the nearest step using the determined precision
  let quantizedValue = Math.round(value / step) * step;

  // Fix floating point precision issues
  quantizedValue = Math.round(quantizedValue * factor) / factor;

  // Clamp to range
  return Math.max(min, Math.min(max, quantizedValue));
};

type KnobPosition = "left" | "center" | "right";
type ValueVisibility = "hidden" | "visible" | "onHover";

interface KnobProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  indicatorColor?: string;
  trackColor?: string;
  fillColor?: string;
  valueVisibility?: ValueVisibility;
  valueFormat?: (value: number) => string;
  label?: string;
  position?: KnobPosition;
}

const Knob = React.forwardRef<HTMLDivElement, KnobProps>(
  (
    {
      className,
      value,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      onValueChange,
      onValueCommit,
      size = "md",
      indicatorColor,
      trackColor,
      fillColor,
      valueVisibility = "hidden",
      valueFormat = (val) => `${Math.round(val)}%`,
      label,
      position = "left",
      ...props
    },
    ref,
  ) => {
    // Get the default value based on position for both initial value and reset
    const getDefaultValue = () => {
      switch (position) {
        case "right":
          return max;
        case "center":
          return min + (max - min) / 2;
        case "left":
        default:
          return min;
      }
    };

    // Set initial value, using the provided value prop if defined, otherwise use default
    const getInitialValue = () => {
      if (value !== undefined) return value;
      return getDefaultValue();
    };

    const [localValue, setLocalValue] = useState(getInitialValue());
    const [isHovering, setIsHovering] = useState(false);

    const knobRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startValue = useRef(0);

    // The physical range is always from 7 o'clock (210°) to 5 o'clock (150°)
    // going clockwise, which spans 300 degrees
    const startAngle = 210; // 7 o'clock
    const rangeAngle = 300; // Total range in degrees

    // Update internal state when prop changes
    useEffect(() => {
      if (value !== undefined) {
        setLocalValue(value);
      }
    }, [value]);

    // Convert value to rotation angle
    const getRotation = (val: number) => {
      // Map the value to a position on the 300° arc
      const percent = (val - min) / (max - min);
      return startAngle + percent * rangeAngle;
    };

    // Reset to default value
    const resetToDefault = () => {
      if (disabled) return;

      const resetValue = getDefaultValue();
      setLocalValue(resetValue);

      if (onValueChange) {
        onValueChange(resetValue);
      }

      if (onValueCommit) {
        onValueCommit(resetValue);
      }
    };

    // Get the size class based on the size prop
    const getSizeClass = () => {
      switch (size) {
        case "sm":
          return "w-8 h-8"; // 32px
        case "lg":
          return "w-12 h-12"; // 48px
        case "md":
        default:
          return "w-10 h-10"; // 40px
      }
    };

    // Get indicator height based on size
    const getIndicatorHeight = () => {
      switch (size) {
        case "sm":
          return "h-4";
        case "lg":
          return "h-6";
        case "md":
        default:
          return "h-5";
      }
    };

    // Helper function to calculate point on circle
    const pointOnCircle = (angleInDegrees: number, radius: number = 50) => {
      const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180); // Adjust for CSS coordinates
      const x = 50 + radius * Math.cos(angleInRadians);
      const y = 50 + radius * Math.sin(angleInRadians);
      return { x, y };
    };

    // Create a clip path for the fill
    const getClipPath = () => {
      const percent = (localValue - min) / (max - min);

      if (position === "center") {
        return getCenterFillPath(percent);
      } else if (position === "right") {
        return getRightFillPath();
      } else {
        return getLeftFillPath(percent);
      }
    };

    // Left position fill path (standard, clockwise from 7 o'clock)
    const getLeftFillPath = (percent: number) => {
      if (percent === 0) {
        return "polygon(50% 50%, 50% 50%)";
      }

      // Start building the polygon path
      const points = [];

      // Add center point
      points.push("50% 50%");

      // Calculate fill angles - fill starts at 7 o'clock (210°)
      const fillStartAngle = 210;
      const fillEndAngle = fillStartAngle + percent * rangeAngle;

      // Add start point (7 o'clock)
      const start = pointOnCircle(fillStartAngle);
      points.push(`${start.x}% ${start.y}%`);

      // Add points along the arc
      const numPoints = Math.max(20, Math.floor(rangeAngle / 10)); // One point every 10 degrees
      for (let i = 1; i < numPoints; i++) {
        const angle =
          fillStartAngle + (i * (fillEndAngle - fillStartAngle)) / numPoints;
        const point = pointOnCircle(angle);
        points.push(`${point.x}% ${point.y}%`);
      }

      // Add end point
      const end = pointOnCircle(fillEndAngle);
      points.push(`${end.x}% ${end.y}%`);

      // Close the path
      points.push("50% 50%");

      return `polygon(${points.join(", ")})`;
    };

    // Right position fill path - matching the indicator movement
    const getRightFillPath = (percent: number) => {
      // Get the exact indicator angle
      const indicatorAngle = getRotation(localValue);

      // Start building the polygon path
      const points = [];

      // Add center point
      points.push("50% 50%");

      // For right position, we fill from 5 o'clock (150°) to the indicator position
      const fillStartAngle = 150; // 5 o'clock
      const fillEndAngle = indicatorAngle;

      // Add start point (5 o'clock)
      const start = pointOnCircle(fillStartAngle);
      points.push(`${start.x}% ${start.y}%`);

      // We need to determine if we should go clockwise or counterclockwise
      // based on which path is shorter between 5 o'clock and the indicator

      // Check if going clockwise would cross the 0/360 boundary
      const isCrossingBoundary = fillStartAngle <= 180 && fillEndAngle >= 180;

      // Choose the shortest path
      if (!isCrossingBoundary) {
        // Normal case - go counterclockwise from 5 o'clock to indicator
        const numPoints = Math.max(
          20,
          Math.floor(Math.abs(fillEndAngle - fillStartAngle) / 10),
        );
        for (let i = 1; i < numPoints; i++) {
          const t = i / numPoints;
          const angle = fillStartAngle * (1 - t) + fillEndAngle * t;
          const point = pointOnCircle(angle);
          points.push(`${point.x}% ${point.y}%`);
        }
      } else {
        // Special case - go clockwise (the long way) to avoid crossing the boundary
        const numPoints = Math.max(
          20,
          Math.floor((360 - Math.abs(fillEndAngle - fillStartAngle)) / 10),
        );
        for (let i = 1; i < numPoints; i++) {
          const t = i / numPoints;
          // Going clockwise requires different interpolation
          let angle;
          if (fillStartAngle > fillEndAngle) {
            angle =
              fillStartAngle + t * (360 - (fillStartAngle - fillEndAngle));
            if (angle >= 360) angle -= 360;
          } else {
            angle =
              fillStartAngle - t * (360 - (fillEndAngle - fillStartAngle));
            if (angle < 0) angle += 360;
          }
          const point = pointOnCircle(angle);
          points.push(`${point.x}% ${point.y}%`);
        }
      }

      // Add end point (indicator position)
      const end = pointOnCircle(fillEndAngle);
      points.push(`${end.x}% ${end.y}%`);

      // Close the path
      points.push("50% 50%");

      return `polygon(${points.join(", ")})`;
    };

    // Center position fill path - matching pointer exactly for bi-directional fill
    const getCenterFillPath = (percent: number) => {
      if (percent === 0.5) {
        // At exactly 50%, no fill
        return "polygon(50% 50%, 50% 50%)";
      }

      // Start building the polygon path
      const points = [];

      // Add center point
      points.push("50% 50%");

      // The center position is based on the middle of the range
      const midpoint = min + (max - min) / 2;
      const midpointPercent = 0.5;
      const midpointAngle = 360; // This is our center/neutral position

      if (percent < midpointPercent) {
        // For less than 50%: Fill from midpoint (360°) counterclockwise to the current position
        // Add midpoint as starting point
        const midpointPoint = pointOnCircle(midpointAngle);
        points.push(`${midpointPoint.x}% ${midpointPoint.y}%`);

        // Calculate the angle at the current percentage
        const currentAngle = startAngle + percent * rangeAngle;

        // Add points along the arc from midpoint to current angle
        const numPoints = Math.max(
          10,
          Math.floor(Math.abs(midpointAngle - currentAngle) / 5),
        );
        for (let i = 1; i < numPoints; i++) {
          const t = i / numPoints;
          const angle = midpointAngle - t * (midpointAngle - currentAngle);
          const point = pointOnCircle(angle);
          points.push(`${point.x}% ${point.y}%`);
        }

        // Add indicator position
        const indicator = pointOnCircle(currentAngle);
        points.push(`${indicator.x}% ${indicator.y}%`);
      } else {
        // For more than 50%: Fill from midpoint (360°) clockwise to the current position
        // Add midpoint as starting point
        const midpointPoint = pointOnCircle(midpointAngle);
        points.push(`${midpointPoint.x}% ${midpointPoint.y}%`);

        // Calculate the angle at the current percentage
        const currentAngle = startAngle + percent * rangeAngle;

        // Add points along the arc from midpoint to current angle
        const numPoints = Math.max(
          10,
          Math.floor(Math.abs(currentAngle - midpointAngle) / 5),
        );
        for (let i = 1; i < numPoints; i++) {
          const t = i / numPoints;
          const angle = midpointAngle + t * (currentAngle - midpointAngle);
          const point = pointOnCircle(angle);
          points.push(`${point.x}% ${point.y}%`);
        }

        // Add indicator position
        const indicator = pointOnCircle(currentAngle);
        points.push(`${indicator.x}% ${indicator.y}%`);
      }

      // Close back to center
      points.push("50% 50%");

      return `polygon(${points.join(", ")})`;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      // Only proceed with left click (button 0)
      if (e.button !== 0) return;

      document.body.style.cursor = "grabbing";

      // Set dragging state to true and ensure the value is shown when dragging
      isDragging.current = true;

      // Capture start position and value
      startY.current = e.clientY;
      startValue.current = localValue;

      // Add event listeners to document (not window)
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      // Prevent text selection
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      // Calculate vertical distance moved
      const deltaY = startY.current - e.clientY;

      // Use adaptive sensitivity based on range
      const sensitivity = calculateSensitivity(min, max);

      // Calculate value change - consistent across all positions
      const valueChange = deltaY * sensitivity;

      // Calculate new value based on starting value + change
      let newValue = startValue.current + valueChange;

      // Apply step quantization and range clamping
      newValue = quantizeToStep(newValue, step, min, max);

      // Update local state
      setLocalValue(newValue);

      // Call callback
      if (onValueChange) {
        onValueChange(newValue);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";

        // Remove event listeners
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        // Call commit callback
        if (onValueCommit) {
          onValueCommit(localValue);
        }
      }
    };

    // Handle double click to reset
    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      resetToDefault();
      e.preventDefault();
    };

    // Handle right click to reset
    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
      resetToDefault();
      e.preventDefault(); // Prevent the context menu from appearing
    };

    // Handle hover events
    const handleMouseEnter = () => {
      setIsHovering(true);
    };

    const handleMouseLeave = () => {
      if (!isDragging.current) {
        setIsHovering(false);
      }
    };

    // Handle touch events
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled) return;

      // Show the value while touching (like hovering)
      setIsHovering(true);
      isDragging.current = true;

      // Capture start position and value
      startY.current = e.touches[0].clientY;
      startValue.current = localValue;

      // Add event listeners to document
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("touchcancel", handleTouchEnd);

      // Prevent scrolling
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;

      // Calculate vertical distance moved
      const deltaY = startY.current - e.touches[0].clientY;

      // Use adaptive sensitivity based on range
      const sensitivity = calculateSensitivity(min, max);

      // Calculate value change
      const valueChange = deltaY * sensitivity;

      // Calculate new value based on starting value + change
      let newValue = startValue.current + valueChange;

      // Apply step quantization and range clamping
      newValue = quantizeToStep(newValue, step, min, max);

      // Update local state
      setLocalValue(newValue);

      // Call callback
      if (onValueChange) {
        onValueChange(newValue);
      }

      // Prevent scrolling
      e.preventDefault();
    };

    const handleTouchEnd = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsHovering(false);

        // Remove event listeners
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("touchcancel", handleTouchEnd);

        // Call commit callback
        if (onValueCommit) {
          onValueCommit(localValue);
        }
      }
    };

    // Clean up event listeners on unmount
    useEffect(() => {
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("touchcancel", handleTouchEnd);
      };
    }, []);

    // Determine if we should show the value
    const shouldShowValue =
      valueVisibility === "visible" ||
      (valueVisibility === "onHover" && (isHovering || isDragging.current));

    // Use shadcn default styles if no custom colors provided
    const defaultIndicatorColor = "bg-primary";
    const defaultTrackColor = "bg-secondary";
    const defaultFillColor = "bg-primary/30";

    return (
      <div
        className={cn("flex flex-col items-center", className)}
        ref={ref}
        {...props}
      >
        {label && (
          <div className="text-muted-foreground mb-1 text-xs">{label}</div>
        )}
        <div className="relative">
          <div
            ref={knobRef}
            className={cn(
              "relative rounded-full border shadow-sm select-none",
              "bg-background",
              getSizeClass(),
              disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-grab active:cursor-grabbing",
            )}
            onMouseDown={handleMouseDown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            style={{
              touchAction: "none", // Prevent scroll on touch devices
            }}
            title="Double-click or right-click to reset"
          >
            {/* Track */}
            <div
              className={cn(
                "absolute inset-0.5 rounded-full",
                trackColor || defaultTrackColor,
              )}
            />

            {/* Fill using clip-path */}
            <div
              className={cn(
                "absolute inset-0.5 rounded-full",
                fillColor || defaultFillColor,
              )}
              style={{
                clipPath: getClipPath(),
              }}
            />

            {/* Knob Indicator */}
            <div
              className={cn(
                "absolute w-0.5 rounded-full",
                indicatorColor || defaultIndicatorColor,
                getIndicatorHeight(),
              )}
              style={{
                left: "50%",
                bottom: "50%",
                transformOrigin: "center bottom",
                transform: `translateX(-50%) rotate(${getRotation(localValue)}deg)`,
              }}
            />

            {/* Center dot */}
            <div
              className={cn(
                "bg-background absolute rounded-full border shadow-sm",
                size === "sm"
                  ? "h-1.5 w-1.5"
                  : size === "lg"
                    ? "h-2.5 w-2.5"
                    : "h-2 w-2",
              )}
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>

          {/* Value label positioned right above the knob */}
          {shouldShowValue && (
            <div
              className={cn(
                "absolute rounded px-1 py-0 text-[10px] font-medium",
                "bg-popover text-popover-foreground",
                "transition-opacity duration-150",
                disabled ? "opacity-50" : "opacity-100",
              )}
              style={{
                top: "-1.25rem",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              {valueFormat(localValue)}
            </div>
          )}
        </div>
      </div>
    );
  },
);

Knob.displayName = "Knob";

export { Knob };
