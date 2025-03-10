import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface KnobProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  // Optional custom styling
  size?: "sm" | "md" | "lg";
  indicatorColor?: string;
  trackColor?: string;
  fillColor?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  label?: string;
}

const Knob = React.forwardRef<HTMLDivElement, KnobProps>(
  (
    {
      className,
      value,
      defaultValue = 0,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      onValueChange,
      onValueCommit,
      size = "md",
      indicatorColor = "bg-primary",
      trackColor = "bg-gray-200",
      fillColor = "bg-primary/30",
      showValue = false,
      valueFormat = (val) => `${Math.round(val)}%`,
      label,
      ...props
    },
    ref,
  ) => {
    const [localValue, setLocalValue] = useState(
      value !== undefined ? value : defaultValue,
    );
    const knobRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startValue = useRef(0);

    // Update internal state when prop changes
    useEffect(() => {
      if (value !== undefined) {
        setLocalValue(value);
      }
    }, [value]);

    // Convert value to rotation angle (7 o'clock = 0%, 5 o'clock = 100%)
    // 7 o'clock is 210 degrees, 5 o'clock is 150 degrees (crossing zero/360)
    const getRotation = (val: number) => {
      const percent = (val - min) / (max - min);
      return 210 + 300 * percent; // 300 degrees of rotation range
    };

    // Reset to default value
    const resetToDefault = () => {
      if (disabled) return;

      const resetValue = defaultValue;
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
          return "h-4"; // Increased from h-3
        case "lg":
          return "h-6"; // Increased from h-5
        case "md":
        default:
          return "h-5"; // Increased from h-4
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
      // If value is at minimum, return empty clip path
      if (localValue === min) {
        return "polygon(50% 50%, 50% 50%)";
      }

      // Calculate percentage
      const percent = (localValue - min) / (max - min);

      // Define angles (7 o'clock = 210 degrees, 5 o'clock = 150 degrees past 0/360)
      const startAngle = 210; // 7 o'clock position
      const maxAngle = 300; // Total rotation range
      const endAngle = startAngle + percent * maxAngle;

      // Start building the polygon path
      const points = [];

      // Add center point
      points.push("50% 50%");

      // Calculate the exact point at 7 o'clock (210 degrees)
      const start = pointOnCircle(startAngle);
      points.push(`${start.x}% ${start.y}%`);

      // Add points along the arc for a smooth curve
      const numPoints = Math.max(20, Math.floor(percent * 60)); // More points for longer arcs

      for (let i = 1; i < numPoints; i++) {
        const angle = startAngle + (i * (endAngle - startAngle)) / numPoints;
        const point = pointOnCircle(angle);
        points.push(`${point.x}% ${point.y}%`);
      }

      // Add the end point
      const end = pointOnCircle(endAngle);
      points.push(`${end.x}% ${end.y}%`);

      // Close back to center
      points.push("50% 50%");

      return `polygon(${points.join(", ")})`;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      // Only proceed with left click (button 0)
      if (e.button !== 0) return;

      document.body.style.cursor = "grabbing";

      // Capture start position and value
      startY.current = e.clientY;
      startValue.current = localValue;
      isDragging.current = true;

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

      // Calculate how much to change the value (pixels to value)
      // Higher number = more rotation per pixel of movement
      const sensitivity = 0.25; // Lower value for more precise control with larger knobs
      const valueChange = deltaY * sensitivity;

      // Calculate new value based on starting value + change
      let newValue = startValue.current + valueChange;

      // Apply step quantization
      if (step > 0) {
        newValue = Math.round(newValue / step) * step;
      }

      // Clamp to range
      newValue = Math.max(min, Math.min(max, newValue));

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

    // Handle touch events
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled) return;

      // Capture start position and value
      startY.current = e.touches[0].clientY;
      startValue.current = localValue;
      isDragging.current = true;

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

      // Calculate how much to change the value
      const sensitivity = 0.25;
      const valueChange = deltaY * sensitivity;

      // Calculate new value based on starting value + change
      let newValue = startValue.current + valueChange;

      // Apply step quantization
      if (step > 0) {
        newValue = Math.round(newValue / step) * step;
      }

      // Clamp to range
      newValue = Math.max(min, Math.min(max, newValue));

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

    return (
      <div
        className={cn("flex flex-col items-center gap-2", className)}
        ref={ref}
        {...props}
      >
        {label && <div className="text-muted-foreground text-xs">{label}</div>}
        <div
          ref={knobRef}
          className={cn(
            "bg-card relative rounded-full border shadow-sm select-none",
            getSizeClass(),
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-grab active:cursor-grabbing",
          )}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          style={{
            touchAction: "none", // Prevent scroll on touch devices
          }}
          title="Double-click or right-click to reset"
        >
          {/* Track */}
          <div className={cn("absolute inset-0.5 rounded-full", trackColor)} />

          {/* Fill using clip-path */}
          <div
            className={cn("absolute inset-0.5 rounded-full", fillColor)}
            style={{
              clipPath: getClipPath(),
            }}
          />

          {/* Knob Indicator */}
          <div
            className={cn(
              "absolute w-0.5 rounded-full",
              indicatorColor,
              getIndicatorHeight(),
            )}
            style={{
              left: "50%",
              bottom: "50%", // Changed from top positioning to bottom positioning
              transformOrigin: "center bottom", // Changed transform origin to bottom center
              transform: `translateX(-50%) rotate(${getRotation(localValue)}deg)`,
            }}
          />

          {/* Center dot */}
          <div
            className={cn(
              "bg-card absolute rounded-full border shadow-sm",
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

        {showValue && (
          <div className="text-xs font-medium">{valueFormat(localValue)}</div>
        )}
      </div>
    );
  },
);

Knob.displayName = "Knob";

export { Knob };
