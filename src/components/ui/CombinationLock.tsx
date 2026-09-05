import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ShieldCheck } from 'lucide-react';

interface CombinationLockProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function CombinationLock({ length = 4, value, onChange, className }: CombinationLockProps) {
  const safeValue = (value || '').padEnd(length, '0').slice(0, length);
  const values = safeValue.split('');
  
  const valueRef = useRef(safeValue);
  valueRef.current = safeValue;

  const incrementRef = useRef((dialIndex: number, amount: number) => {
    const vals = valueRef.current.split('');
    let val = parseInt(vals[dialIndex]) + amount;
    if (val > 9) val = 0;
    if (val < 0) val = 9;
    
    vals[dialIndex] = val.toString();
    onChange(vals.join(''));
  });

  const lockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = lockRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const dial = target.closest('.dial');
      if (dial) {
        e.preventDefault();
        e.stopPropagation();
        const dialIndexStr = dial.getAttribute('data-index');
        if (dialIndexStr !== null) {
          const dialIndex = parseInt(dialIndexStr, 10);
          incrementRef.current(dialIndex, e.deltaY > 0 ? -1 : 1);
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const dragRef = useRef<{ index: number; lastY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, dialIndex: number) => {
    dragRef.current = { index: dialIndex, lastY: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    
    const diff = dragRef.current.lastY - e.clientY;
    if (Math.abs(diff) > 14) {
      incrementRef.current(dragRef.current.index, diff > 0 ? 1 : -1);
      dragRef.current.lastY = e.clientY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      dragRef.current = null;
    }
  };

  return (
    <div className={cn("flex flex-col items-center select-none w-full max-w-sm", className)} ref={lockRef}>
      {/* Mechanical Vault Capsule / Chassis */}
      <div className="w-full relative rounded-2xl bg-gradient-to-b from-[#14141d] via-[#0d0d12] to-[#0a0a0e] p-5 sm:p-6 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]">
        
        {/* Hardware details: Machined Hex Bolts */}
        <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-[#2a2a35] border border-white/10 shadow-inner" />
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#2a2a35] border border-white/10 shadow-inner" />
        <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-[#2a2a35] border border-white/10 shadow-inner" />
        <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-[#2a2a35] border border-white/10 shadow-inner" />

        {/* Chassis Plate Header */}
        <div className="flex items-center justify-between pb-4 mb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.25em] text-text-low uppercase">
              CYPHER LOCK 04
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-text-low/60 uppercase">
            <ShieldCheck size={12} className="text-primary/70" />
            <span>ALINHAMENTO ATIVO</span>
          </div>
        </div>

        {/* 3D Rolling Object Container with Horizontal Optical Reticle */}
        <div className="relative flex items-center justify-center py-2">
          
          {/* Left Alignment Needle / Marker */}
          <div className="absolute -left-1.5 sm:-left-2 top-1/2 -translate-y-1/2 z-20 flex items-center pointer-events-none">
            <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-primary filter drop-shadow-[0_0_6px_var(--primary)]" />
          </div>

          {/* Right Alignment Needle / Marker */}
          <div className="absolute -right-1.5 sm:-right-2 top-1/2 -translate-y-1/2 z-20 flex items-center pointer-events-none">
            <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-primary filter drop-shadow-[0_0_6px_var(--primary)]" />
          </div>

          {/* Center Optical Horizon Guide (Combinação em Foco) */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[48px] border-y border-primary/25 bg-primary/[0.03] pointer-events-none z-10 shadow-[0_0_15px_rgba(168,85,247,0.1)]" />

          {/* Dials Column Group */}
          <div className="combination-lock flex items-center gap-2.5 sm:gap-4 relative z-10">
            {Array.from({ length }).map((_, dialIndex) => (
              <div key={`dial-column-${dialIndex}`} className="flex flex-col items-center gap-2">
                
                {/* Upper Increment Ratchet Button */}
                <button
                  type="button"
                  onClick={() => incrementRef.current(dialIndex, 1)}
                  className="w-10 h-8 rounded-md bg-[#181822] hover:bg-[#222232] active:bg-primary/20 border border-white/10 hover:border-primary/50 text-text-mid hover:text-primary transition-all flex items-center justify-center cursor-pointer shadow-sm group"
                  title="Girar para cima"
                  aria-label={`Aumentar dígito ${dialIndex + 1}`}
                >
                  <ChevronUp size={16} className="stroke-[2.5] transition-transform group-hover:-translate-y-0.5" />
                </button>

                {/* 3D Rolling Cylinder (O ÚNICO LUGAR DA SENHA) */}
                <div 
                  data-index={dialIndex}
                  className="dial touch-none cursor-ns-resize rounded-lg select-none"
                  onPointerDown={(e) => handlePointerDown(e, dialIndex)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      incrementRef.current(dialIndex, 1);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      incrementRef.current(dialIndex, -1);
                    }
                  }}
                  title="Role com o mouse ou arraste para alterar"
                >
                  <div className="nonagon pointer-events-none">
                    {Array.from({ length: 10 }).map((_, faceIndex) => {
                      const faceNum = faceIndex.toString();
                      const isSelected = values[dialIndex] === faceNum;
                      return (
                        <div 
                          key={`face-${faceIndex}`} 
                          className={cn(
                            "face", 
                            `face-${faceIndex}`,
                            isSelected && "face-active"
                          )}
                        >
                          <input
                            type="radio"
                            name={`dial-${dialIndex}`}
                            value={faceNum}
                            checked={isSelected}
                            onChange={() => {}}
                            className={`radio radio-${faceIndex} pointer-events-none`}
                            aria-hidden="true"
                          />
                          <span className="tabular-nums font-mono">{faceNum}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lower Decrement Ratchet Button */}
                <button
                  type="button"
                  onClick={() => incrementRef.current(dialIndex, -1)}
                  className="w-10 h-8 rounded-md bg-[#181822] hover:bg-[#222232] active:bg-primary/20 border border-white/10 hover:border-primary/50 text-text-mid hover:text-primary transition-all flex items-center justify-center cursor-pointer shadow-sm group"
                  title="Girar para baixo"
                  aria-label={`Diminuir dígito ${dialIndex + 1}`}
                >
                  <ChevronDown size={16} className="stroke-[2.5] transition-transform group-hover:translate-y-0.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chassis Subtitle / Instruction */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center text-center">
          <p className="text-[11px] font-mono text-text-low tracking-wide flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-primary/60" />
            Role os tambores ou use as setas para alinhar o código
          </p>
        </div>
      </div>
    </div>
  );
}


