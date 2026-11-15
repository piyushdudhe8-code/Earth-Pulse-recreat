"use client";

import { useState } from "react";

type TooltipProps = {
  label: string;
  explanation: string;
};

export default function Tooltip({ label, explanation }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="tooltip">
      <button
        className="tooltip__button"
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {label}
      </button>
      {isOpen && (
        <span className="tooltip__content" role="status">
          {explanation}
        </span>
      )}
    </span>
  );
}
