"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatFn?: (value: number) => string;
}

export function AnimatedCounter({ value, duration = 1.5, formatFn }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  const spring = useSpring(0, {
    bounce: 0,
    duration: duration * 1000,
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      const rounded = Math.round(latest);
      setDisplay(formatFn ? formatFn(rounded) : rounded.toLocaleString());
    });
    return unsubscribe;
  }, [spring, formatFn]);

  return (
    <motion.span ref={ref} className="tabular-nums">
      {display}
    </motion.span>
  );
}
