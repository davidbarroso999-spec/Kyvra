import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getAlbums } from '@/lib/apiCache';
import { AlbumSlider } from '@/components/ui/AlbumSlider';

export function Albums() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlbums() {
      const { data, error } = await getAlbums();

      if (error) {
        console.error("Error fetching albums:", error);
      }

      if (data) {
        setAlbums(data.map((a: any) => ({
          id: a.id,
          title: a.title,
          year: a.release_year,
          coverUrl: a.cover_url,
          description: a.description,
          tracks: a.tracks?.[0]?.count || 0
        })));
      }
      setLoading(false);
    }
    fetchAlbums();
  }, []);

  return (
    <div className="w-full pt-32 px-6 pb-32 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 flex items-end justify-between border-b border-border pb-8"
      >
        <div>
          <span className="font-sc text-[11px] tracking-[0.3em] text-primary block mb-3">RELÍQUIAS SONORAS</span>
          <h1 className="text-5xl md:text-7xl leading-none">Álbuns</h1>
        </div>
        <span className="font-mono text-xs text-text-low pb-2 hidden md:block">
          {albums.length} {albums.length === 1 ? 'relíquia' : 'relíquias'}
        </span>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="skeleton skeleton-md aspect-[1/1.3] w-full mb-4" />
              <div className="skeleton h-5 w-3/4 mb-2" style={{ borderRadius: 'var(--radius-sm)' }} />
              <div className="skeleton h-3 w-1/2" style={{ borderRadius: 'var(--radius-sm)' }} />
            </div>
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-border to-transparent" />
          <p className="font-sc text-xs tracking-[0.3em] text-text-low">O ARQUIVO ESTÁ SILENCIOSO</p>
          <p className="font-display text-text-low text-lg">Nenhuma relíquia encontrada</p>
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-border to-transparent" />
        </div>
      ) : (
        <div className="-mx-6">
          <AlbumSlider albums={albums} />
        </div>
      )}
    </div>
  );
}
