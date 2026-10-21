"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption<T> {
  value: T;
  label: string | number;
}

interface SmartDropdownProps<T extends string | number> {
  value: T;
  onChange: (val: T) => void;
  options: DropdownOption<T>[];
  isDarkMode?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * SmartDropdown: Intelligent custom dropdown that calculates available viewport space,
 * automatically decides whether to open upwards or downwards, and computes horizontal
 * transform offsets to prevent edge overflow.
 */
export function SmartDropdown<T extends string | number>({
  value,
  onChange,
  options,
  isDarkMode = false,
  className,
  ariaLabel,
}: SmartDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [positionStyle, setPositionStyle] = useState<{
    placement: "up" | "down";
    style: React.CSSProperties;
  }>({
    placement: "up",
    style: { bottom: "calc(100% + 4px)", left: 0 },
  });

  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const estimatedMenuHeight = options.length * 36 + 16;
    const estimatedMenuWidth = 96;

    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    // Open up if space below is limited (e.g. table footer at bottom of viewport), or space above is greater
    const openUp = spaceBelow < estimatedMenuHeight || spaceAbove > spaceBelow;

    // Horizontal overflow protection
    let leftOffset = 0;
    if (triggerRect.left + estimatedMenuWidth > viewportWidth - 16) {
      leftOffset = viewportWidth - 16 - (triggerRect.left + estimatedMenuWidth);
    }
    if (triggerRect.left + leftOffset < 16) {
      leftOffset = 16 - triggerRect.left;
    }

    setPositionStyle({
      placement: openUp ? "up" : "down",
      style: {
        position: "absolute",
        ...(openUp
          ? { bottom: "calc(100% + 6px)" }
          : { top: "calc(100% + 6px)" }),
        left: `${leftOffset}px`,
        minWidth: `${Math.max(triggerRect.width, 76)}px`,
      },
    });
  }, [options.length]);

  const toggleOpen = () => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    calculatePosition();

    // 1. SCROLLED AWAY: Auto-close immediately on ANY scroll, wheel, or swipe
    const handleScrollOrWheel = () => {
      setIsOpen(false);
    };

    // 2. SWITCH TABS / WINDOWS (UNFOCUSED FROM APP):
    const handleWindowBlur = () => {
      setIsOpen(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsOpen(false);
      }
    };

    // 3. CLICK / TOUCH OUTSIDE:
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // 4. KEYBOARD ESCAPE:
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    // 5. RESIZE
    const handleResize = () => {
      setIsOpen(false);
    };

    // 6. INTERSECTION OBSERVER: If container scrolls out of view or is clipped
    let observer: IntersectionObserver | null = null;
    if (containerRef.current && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.7) {
              setIsOpen(false);
            }
          });
        },
        { threshold: [0, 0.7, 1.0] }
      );
      observer.observe(containerRef.current);
    }

    // Attach listeners
    window.addEventListener("scroll", handleScrollOrWheel, { capture: true, passive: true });
    document.addEventListener("scroll", handleScrollOrWheel, { capture: true, passive: true });
    window.addEventListener("wheel", handleScrollOrWheel, { capture: true, passive: true });
    window.addEventListener("touchmove", handleScrollOrWheel, { capture: true, passive: true });

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrWheel, true);
      document.removeEventListener("scroll", handleScrollOrWheel, true);
      window.removeEventListener("wheel", handleScrollOrWheel, true);
      window.removeEventListener("touchmove", handleScrollOrWheel, true);

      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);

      if (observer) {
        observer.disconnect();
      }
    };
  }, [isOpen, calculatePosition]);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block text-left", className)}
    >
      {/* Hidden synchronized select keeping DOM selector intact for automated tests or forms */}
      <select
        aria-hidden="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        value={value}
        onChange={(e) => {
          const val =
            typeof value === "number" ? Number(e.target.value) : e.target.value;
          onChange(val as T);
        }}
        className="sr-only pointer-events-none"
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom styled trigger button */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-xs font-semibold outline-none transition-all cursor-pointer shadow-2xs select-none",
          className?.includes("w-full") && "w-full",
          isDarkMode
            ? "bg-slate-900 border-slate-700/80 text-slate-200 hover:border-slate-600 hover:bg-slate-800 focus:ring-1 focus:ring-slate-500"
            : "bg-white border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50 focus:ring-1 focus:ring-slate-400",
          isOpen &&
            (isDarkMode
              ? "border-slate-500 ring-1 ring-slate-500"
              : "border-slate-400 ring-1 ring-slate-400")
        )}
      >
        <span>{selected?.label}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
            isOpen &&
              (positionStyle.placement === "up" ? "rotate-0" : "rotate-180")
          )}
        />
      </button>

      {/* Floating Animated Menu with Auto-Positioning & Space Detection */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{
              opacity: 0,
              y: positionStyle.placement === "up" ? 6 : -6,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: positionStyle.placement === "up" ? 6 : -6,
              scale: 0.95,
            }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={positionStyle.style}
            role="listbox"
            className={cn(
              "z-50 rounded-lg border shadow-xl backdrop-blur-md p-1 font-medium text-xs focus:outline-none min-w-[80px]",
              isDarkMode
                ? "bg-slate-900/95 border-slate-700 text-slate-200 shadow-black/60"
                : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/60"
            )}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer",
                    isSelected
                      ? isDarkMode
                        ? "bg-slate-800 text-white font-semibold"
                        : "bg-slate-100 text-slate-900 font-semibold"
                      : isDarkMode
                      ? "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SmartDropdown;
