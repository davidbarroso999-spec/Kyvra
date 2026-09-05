"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import NeonBorder, { Movement } from "@/components/ui/NeonBorder";

export interface NeonButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  neonColor?: string;
  glow?: number;
  speed?: number;
  borderSize?: number;
  thickness?: number;
  movement?: Movement;
  rounded?: number;
  variant?: "pill" | "rounded" | "square";
  size?: "sm" | "md" | "lg" | "icon";
  active?: boolean;
}

export const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  (
    {
      children,
      className,
      neonColor,
      glow = 0,
      speed = 14,
      borderSize = 45,
      thickness = 2,
      movement = "continuous",
      rounded,
      variant = "pill",
      size = "md",
      active = false,
      disabled,
      ...props
    },
    ref
  ) => {
    // Calculando o rounded baseado na variante ou prop explícita
    const radiusPct =
      typeof rounded === "number"
        ? rounded
        : variant === "pill"
        ? 100
        : variant === "square"
        ? 12
        : 35;

    const variantStyles = {
      pill: "rounded-full",
      rounded: "rounded-xl",
      square: "rounded-lg",
    };

    const sizeStyles = {
      sm: "px-4 py-2 text-xs gap-2 min-h-[36px]",
      md: "px-6 py-3 text-xs sm:text-sm gap-2.5 min-h-[44px]",
      lg: "px-8 py-4 text-sm sm:text-base gap-3 min-h-[52px]",
      icon: "p-3 w-11 h-11 min-h-[44px] justify-center items-center",
    };

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.025 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "relative inline-flex items-center justify-center overflow-visible",
          "bg-transparent text-text-high hover:text-white",
          "font-sans font-medium tracking-wide select-none cursor-pointer",
          "transition-all duration-300 group",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {/* Animated Neon Border */}
        {!disabled && (
          <NeonBorder
            color={neonColor}
            glow={glow}
            speed={speed}
            borderSize={borderSize}
            thickness={thickness}
            movement={movement}
            rounded={radiusPct}
          />
        )}

        {/* Fallback border for disabled or subtle base contour */}
        <div
          className={cn(
            "absolute inset-0 border border-white/10 pointer-events-none transition-colors duration-300 group-hover:border-white/20",
            variantStyles[variant]
          )}
        />

        {/* Inner Content */}
        <div className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
          {children}
        </div>
      </motion.button>
    );
  }
);

NeonButton.displayName = "NeonButton";

export default NeonButton;
