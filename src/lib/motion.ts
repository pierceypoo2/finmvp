/** Shared Framer Motion spring presets — Apple-grade snappy, not bouncy. */

export const springSnappy = { type: "spring" as const, damping: 28, stiffness: 380 };
export const springGentle = { type: "spring" as const, damping: 34, stiffness: 260 };
export const easeOut = { duration: 0.25, ease: [0.22, 1.0, 0.36, 1.0] as const };

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: easeOut,
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.45, ease: [0.22, 1.0, 0.36, 1.0] as const },
};
