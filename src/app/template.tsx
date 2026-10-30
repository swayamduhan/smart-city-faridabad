"use client";

import { MotionConfig, motion } from "motion/react";

/** A quick lane-marking sweep between pages: it signals movement without making anyone wait. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    // "user" drops transform animations for people who ask for reduced motion, with the same markup on server and client.
    <MotionConfig reducedMotion="user">
      <motion.div aria-hidden="true" className="fixed inset-x-0 top-14 z-40 h-[5px] origin-left bg-mark" initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: 0 }} transition={{ scaleX: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }, opacity: { delay: 0.35, duration: 0.2 } }} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </MotionConfig>
  );
}
