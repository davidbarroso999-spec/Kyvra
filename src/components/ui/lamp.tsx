import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const LampContainer = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden z-0",
        className
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0 ">
        <motion.div
          initial={{ opacity: 0.2, width: "15rem" }}
          animate={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 1.5,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-[rgba(102,51,153,0.5)] via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-[100%] left-0 bg-void h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,black,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-void bottom-0 z-20 [mask-image:linear-gradient(to_right,black,transparent)]" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0.2, width: "15rem" }}
          animate={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 1.5,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-[rgba(102,51,153,0.5)] text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute w-40 h-[100%] right-0 bg-void bottom-0 z-20 [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-void h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,black,transparent)]" />
        </motion.div>
        
        {/* Core and glows using highly optimized radial gradients instead of heavy DOM blurs */}
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-void [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)] opacity-80" />
        
        {/* Replace blur-3xl with a radial-gradient background */}
        <div 
          className="absolute inset-auto z-50 h-[400px] w-[600px] -translate-y-1/2 rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, var(--primary) 0%, transparent 60%)' }}
        />
        
        <motion.div
          initial={{ width: "8rem" }}
          animate={{ width: "16rem" }}
          transition={{
            delay: 0.3,
            duration: 1.5,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-64 -translate-y-[6rem] rounded-full opacity-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, var(--primary) 0%, transparent 70%)' }}
        />
        
        <motion.div
          initial={{ width: "15rem" }}
          animate={{ width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 1.5,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-primary opacity-50"
        />

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-void"></div>
      </div>

      <div className="relative z-50 flex -translate-y-[15rem] flex-col items-center">
        {children}
      </div>
    </div>
  );
};
