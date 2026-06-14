import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
    <div className={cn("flex flex-col items-center", className)} ref={lockRef}>
      <div className="combination-lock">
        {Array.from({ length }).map((_, dialIndex) => (
          <div 
            key={`dial-${dialIndex}`} 
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
                return (
                  <div key={`face-${faceIndex}`} className={`face face-${faceIndex}`}>
                    <input
                      type="radio"
                      name={`dial-${dialIndex}`}
                      value={faceNum}
                      checked={values[dialIndex] === faceNum}
                      onChange={() => {}}
                      className={`radio radio-${faceIndex} pointer-events-none`}
                    />
                    <span>{faceNum}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
