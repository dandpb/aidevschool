"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface ExpandableTextProps {
  text: string;
  /** approximate number of lines to show when collapsed */
  collapsedLines?: number;
  className?: string;
}

// Cozy expandable text: shows a truncated preview with a "Ler mais" toggle.
// Uses -webkit-line-clamp for the collapsed state.
export function ExpandableText({
  text,
  collapsedLines = 3,
  className = "",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // detect whether the text actually overflows (so we only show the toggle when needed)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // temporarily expand to measure full height
      const prev = el.style.webkitLineClamp;
      el.style.webkitLineClamp = "unset";
      const fullHeight = el.scrollHeight;
      el.style.webkitLineClamp = prev || String(collapsedLines);
      const lineHeight = parseInt(
        getComputedStyle(el).lineHeight,
        10
      ) || 22;
      setClamped(fullHeight > lineHeight * (collapsedLines + 0.5));
    };
    measure();
  }, [text, collapsedLines]);

  return (
    <div className={className}>
      <p
        ref={ref}
        className="text-sm leading-relaxed text-foreground/90"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: expanded ? "unset" : String(collapsedLines),
          overflow: "hidden",
        }}
      >
        {text}
      </p>
      {clamped && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-neon-teal transition hover:text-neon-amber"
        >
          {expanded ? "Ler menos" : "Ler mais"}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
        </button>
      )}
    </div>
  );
}
