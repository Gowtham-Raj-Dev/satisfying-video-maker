"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  disabled?: boolean;
  ariaLabel?: string;
  onChange: (value: T) => void;
  className?: string;
}

export default function CustomSelect<T extends string = string>({
  value,
  options,
  disabled = false,
  ariaLabel,
  onChange,
  className = "",
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeOpt = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-[#0B0B0C] border text-left transition-colors ${
          open
            ? "border-[#C4FF2E] text-[#F5F5F5]"
            : "border-[#29292D] hover:border-[#3F3F46] text-[#F5F5F5]"
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
          <span className="text-xs font-medium truncate">{activeOpt?.label}</span>
          {activeOpt?.sublabel && (
            <span className="text-[10px] text-[#A1A1AA] truncate shrink-0">{activeOpt.sublabel}</span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#A1A1AA] shrink-0 transition-transform ${
            open ? "rotate-180 text-[#C4FF2E]" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#141416] border border-[#29292D] rounded-md shadow-2xl p-1 space-y-0.5 max-h-60 overflow-y-auto panel-scroll"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                  selected
                    ? "bg-[#1B1B1E] text-[#C4FF2E]"
                    : "text-[#F5F5F5] hover:bg-[#1B1B1E]"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Check className={`w-3 h-3 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate font-medium">{opt.label}</span>
                </div>
                {opt.sublabel && (
                  <span className="text-[10px] text-[#A1A1AA] shrink-0">{opt.sublabel}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
