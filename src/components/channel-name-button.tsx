import React from "react";

interface ChannelNameButtonProps {
  channelName: string;
  onClick: () => void;
  color: string;
}

const ChannelNameButton: React.FC<ChannelNameButtonProps> = ({
  channelName,
  onClick,
  color,
}) => {
  // Use mousedown/up for a "pop" effect instead of persistent focus
  const handleMouseDown = () => {
    document.addEventListener("mouseup", handleMouseUp, { once: true });
  };

  const handleMouseUp = () => {
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <button
      onClick={onClick}
      onMouseDown={handleMouseDown}
      className="flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full border-2 bg-white text-[6px] leading-tight transition-all duration-75 focus:outline-none active:scale-95 dark:bg-gray-800"
      style={{ borderColor: color }}
      aria-label={`Play ${channelName} sample`}
    >
      <span className="w-full px-1 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
        {channelName}
      </span>
    </button>
  );
};

export default ChannelNameButton;
