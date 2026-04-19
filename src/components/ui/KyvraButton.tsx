import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "motion/react";
import { ReactNode } from "react";

interface KyvraButtonProps extends HTMLMotionProps<"button"> {
  isActive?: boolean;
  showLed?: boolean;
  ledColor?: "red" | "purple" | "white";
  variant?: "primary" | "icon" | "album" | "player";
  children: ReactNode;
}

export function KyvraButton({
  children,
  className,
  isActive = false,
  showLed = false,
  ledColor = "red",
  variant = "primary",
  ...props
}: KyvraButtonProps) {
  const ledStyles = {
    red: "bg-[#ff2020] shadow-[0_0_12px_3px_rgba(255,32,32,0.8)]",
    purple: "bg-[#9d4edd] shadow-[0_0_12px_3px_rgba(157,78,221,0.8)]",
    white: "bg-[#ffffff] shadow-[0_0_12px_3px_rgba(255,255,255,0.8)]",
  };

  const ledOffStyle = "bg-[#111] shadow-[inset_0_1px_3px_rgba(0,0,0,1)]";

  // Player and Primary variants get the full hardware treatment
  const isHardware = variant === "primary" || variant === "player" || variant === "album";

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative flex items-center justify-center overflow-hidden transition-all duration-300 group",
        isHardware && [
          "border border-white/5",
          "shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),_inset_0_-1px_1px_rgba(255,255,255,0.05),_0_6px_10px_rgba(0,0,0,0.5)]",
          "hover:border-white/10 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),_inset_0_-1px_1px_rgba(255,255,255,0.1),_0_8px_16px_rgba(0,0,0,0.6)]"
        ],
        variant === "album" ? "bg-primary text-void font-sans font-medium" :
        className && className.includes("bg-") ? "" : "bg-[#0a0a0a]", // Se passou bg- dinâmico, não sobrepor
        variant === "icon" && "text-text-low hover:text-text-high",
        className
      )}
      {...props}
    >
      {/* Noise filter */}
      {isHardware && (
        <div 
          className="absolute inset-0 opacity-[0.25] mix-blend-overlay pointer-events-none" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")' }}
        />
      )}
      
      {/* LED Indicator */}
      {showLed && (
        <div className={cn(
          "absolute right-2 top-2 z-20 transition-all duration-500 rounded-full",
          "w-1.5 h-1.5",
          isActive ? ledStyles[ledColor] : ledOffStyle
        )} />
      )}

      {/* Surface reflection */}
      {isHardware && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[inherit]" />
      )}

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
    </motion.button>
  );
}
