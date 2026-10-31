"use client";

// Magic UI Animated List (https://magicui.design/docs/components/animated-list), adapted to loop
// forever: a new item drops in every `delay` ms and the oldest falls off once `visible` are shown.
// Under prefers-reduced-motion the first `visible` items are shown statically.
import React, { useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { AnimatePresence, motion, useReducedMotion, type MotionProps } from "motion/react";

import { cn } from "@/lib/utils";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  delay?: number;
  visible?: number;
}

export const AnimatedList = React.memo(({ children, className, delay = 1000, visible = 4, ...props }: AnimatedListProps) => {
  const reduced = useReducedMotion();
  // Start full so the card never looks empty; new items then stream in on top.
  const [tick, setTick] = useState(visible - 1);
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (reduced || childrenArray.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), delay);
    return () => clearInterval(id);
  }, [delay, reduced, childrenArray.length]);

  const itemsToShow = useMemo(() => {
    const n = childrenArray.length;
    if (n === 0) return [];
    const out: { key: string; node: React.ReactNode }[] = [];
    const head = reduced ? Math.min(visible, n) - 1 : tick;
    for (let i = head; i > head - visible && i >= 0; i--) out.push({ key: `item-${i}`, node: childrenArray[i % n] });
    return out;
  }, [tick, childrenArray, visible, reduced]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)} {...props}>
      <AnimatePresence initial={false}>
        {itemsToShow.map((item) => (
          <AnimatedListItem key={item.key}>{item.node}</AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
});

AnimatedList.displayName = "AnimatedList";
