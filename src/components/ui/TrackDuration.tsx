import { useState, useEffect } from 'react';

export function TrackDuration({ audioUrl, defaultDuration }: { audioUrl?: string, defaultDuration?: string }) {
  const [duration, setDuration] = useState(defaultDuration || '0:00');

  useEffect(() => {
    if ((!defaultDuration || defaultDuration === '0:00') && audioUrl) {
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration)) {
          const minutes = Math.floor(audio.duration / 60);
          const seconds = Math.floor(audio.duration % 60);
          setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      });
    } else if (defaultDuration) {
      setDuration(defaultDuration);
    }
  }, [audioUrl, defaultDuration]);

  return <span>{duration}</span>;
}
