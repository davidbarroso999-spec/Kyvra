import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function Albums() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlbums() {
      const { data, error } = await supabase
        .from('albums')
        .select(`
          *,
          tracks (count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching albums:", error);
      }

      if (data) {
        setAlbums(data.map(a => ({
          id: a.id,
          title: a.title,
          year: a.release_year,
          coverUrl: a.cover_url,
          description: a.description,
          tracks: a.tracks[0].count
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
        className="mb-16 text-center"
      >
        <span className="font-sc text-[11px] tracking-[0.3em] text-primary block mb-4">RELÍQUIAS SONORAS</span>
        <h1 className="text-5xl md:text-7xl">Álbuns</h1>
      </motion.div>

      {loading ? (
        <div className="flex justify-center text-primary">Carregando...</div>
      ) : albums.length === 0 ? (
        <div className="text-center text-text-low">Nenhum álbum encontrado no arquivo.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {albums.map((album, index) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/reliquias/${album.id}`} className="group block">
                <div className="relative aspect-[1/1.3] rounded-lg overflow-hidden mb-4 bg-deep">
                  <img 
                    src={album.coverUrl} 
                    alt={album.title} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-void/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <span className="text-primary font-sc text-sm tracking-widest block mb-2">EXPLORAR</span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full">
                    <span className="font-mono text-xs text-text-high">{album.tracks} faixas</span>
                  </div>
                </div>
                <h3 className="text-2xl font-display text-text-high group-hover:text-primary transition-colors">{album.title}</h3>
                <p className="text-text-low font-mono text-sm mt-1 mb-3">{album.year}</p>
                {album.description && (
                  <p className="text-text-mid text-sm leading-relaxed italic line-clamp-3 border-l-2 border-primary/30 pl-3">
                    {album.description}
                  </p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
