"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface SmoothHeightProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * SmoothHeight: Container component that animates collapse/expansion fluidly
 * when children change, table rows are filtered, or page transitions occur.
 */
export function SmoothHeight({ children, className }: SmoothHeightProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const [hasMeasured, setHasMeasured] = useState(false);

  useEffect(() => {
    if (!contentRef.current) return;

    // Immediately measure initial height to ensure fluid number-to-number interpolation
    const initialHeight = contentRef.current.offsetHeight;
    if (initialHeight > 0) {
      setHeight(initialHeight);
      setHasMeasured(true);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const measured = Math.ceil(
          entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height
        );
        if (measured > 0) {
          setHeight(measured);
          setHasMeasured(true);
        }
      }
    });

    resizeObserver.observe(contentRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      transition={{
        duration: hasMeasured ? 0.35 : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn("overflow-hidden", className)}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}

export default SmoothHeight;
