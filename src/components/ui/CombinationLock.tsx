import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

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
      // Find the dial that was scrolled
      const target = e.target as HTMLElement;
      const dial = target.closest('.dial');
      if (dial) {
        e.preventDefault(); // Prevent page scroll
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
    // Sensibilidade do arrasto
    if (Math.abs(diff) > 15) {
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
    <div className={cn("flex flex-col items-center select-none", className)} ref={lockRef}>
      {/* High-Contrast Digital Combination Display */}
      <div className="flex gap-2.5 mb-8 relative z-10">
        {values.map((num, i) => (
          <div 
            key={`readout-${i}`} 
            className="w-11 h-14 rounded-lg bg-surface/90 border border-primary/30 flex items-center justify-center font-mono text-2xl font-bold text-primary shadow-[0_0_15px_rgba(168,85,247,0.35)] select-none"
            style={{ textShadow: '0 0 8px rgba(168,85,247,0.6)' }}
          >
            {num}
          </div>
        ))}
      </div>

      {/* 3D Lock with interactive buttons */}
      <div className="combination-lock flex items-center gap-3 sm:gap-6">
        {Array.from({ length }).map((_, dialIndex) => (
          <div key={`dial-column-${dialIndex}`} className="flex flex-col items-center gap-2">
            {/* Increment Arrow (Button) */}
            <button
              type="button"
              onClick={() => incrementRef.current(dialIndex, 1)}
              className="w-10 h-10 rounded-full glass border border-white/10 hover:border-primary/50 text-white/70 hover:text-primary hover:scale-110 active:scale-90 transition-all flex items-center justify-center cursor-pointer pointer-events-auto"
              title="Aumentar dístico"
            >
              <ChevronUp size={20} className="stroke-[2.5]" />
            </button>

            {/* Cylinder / Dial */}
            <div 
              data-index={dialIndex}
              className="dial touch-none cursor-ns-resize"
              onPointerDown={(e) => handlePointerDown(e, dialIndex)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
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
                        isSelected && "face-active text-primary"
                      )}
                    >
                      <input
                        type="radio"
                        name={`dial-${dialIndex}`}
                        value={faceNum}
                        checked={isSelected}
                        onChange={() => {}}
                        className={`radio radio-${faceIndex} pointer-events-none`}
                      />
                      <span>{faceNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Decrement Arrow (Button) */}
            <button
              type="button"
              onClick={() => incrementRef.current(dialIndex, -1)}
              className="w-10 h-10 rounded-full glass border border-white/10 hover:border-primary/50 text-white/70 hover:text-primary hover:scale-110 active:scale-90 transition-all flex items-center justify-center cursor-pointer pointer-events-auto"
              title="Diminuir dístico"
            >
              <ChevronDown size={20} className="stroke-[2.5]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

