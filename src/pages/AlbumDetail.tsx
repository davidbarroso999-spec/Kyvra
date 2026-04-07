import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { useStore } from '@/store/useStore';

const MOCK_ALBUM = {
  id: '1',
  title: 'Espelho das Eras',
  artist: 'Kyvra',
  year: '2023',
  coverUrl: 'https://picsum.photos/seed/album1/800/1040',
  description: 'Uma reflexão sobre o tempo e a memória, gravada nas profundezas do inverno.',
  tracks: [
    { id: '1', title: 'O Despertar', duration: '3:45' },
    { id: '2', title: 'Reflexo Distorcido', duration: '4:12' },
    { id: '3', title: 'Ecos do Passado', duration: '5:30' },
    { id: '4', title: 'Fragmento de Vidro', duration: '2:50' },
    { id: '5', title: 'A Queda', duration: '6:15' },
  ]
};

export function AlbumDetail() {
  const { id } = useParams();
  const { setCurrentTrack, setIsPlaying, setQueue } = useStore();
  
  // In a real app, fetch album by id
  const album = MOCK_ALBUM;

  const handlePlayAlbum = () => {
    const tracksToPlay = album.tracks.map(t => ({
      ...t,
      artist: album.artist,
      coverUrl: album.coverUrl,
      vibe: 'Album Track'
    }));
    setQueue(tracksToPlay);
    setCurrentTrack(tracksToPlay[0]);
    setIsPlaying(true);
  };

  return (
    <div className="w-full min-h-screen pb-32">
      {/* Aurora Hero */}
      <div className="relative w-full h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Blurred Background */}
        <div 
          className="absolute inset-0 z-0 opacity-50"
          style={{
            backgroundImage: `url(${album.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(120px) saturate(1.5)',
            transform: 'scale(1.2)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void z-10" />
        
        <div className="relative z-20 flex flex-col md:flex-row items-center md:items-end gap-8 max-w-5xl mx-auto px-6 w-full mt-20">
          <motion.img 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            src={album.coverUrl} 
            alt={album.title} 
            loading="lazy"
            className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-lg shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
            referrerPolicy="no-referrer"
          />
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center md:text-left flex-1"
          >
            <span className="font-sc text-sm tracking-[0.2em] text-primary mb-2 block">ÁLBUM</span>
            <h1 className="text-5xl md:text-7xl mb-4">{album.title}</h1>
            <div className="flex items-center justify-center md:justify-start gap-4 text-text-mid font-sans">
              <span>{album.artist}</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{album.year}</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{album.tracks.length} faixas</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 mt-12">
        <div className="flex items-center gap-6 mb-12">
          <button 
            onClick={handlePlayAlbum}
            className="flex items-center gap-3 px-8 py-4 bg-primary text-void font-sans font-medium rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_var(--glow-purple)]"
          >
            <Play size={20} className="fill-current" />
            Tocar Álbum Completo
          </button>
          <p className="text-text-mid font-sans max-w-md hidden md:block">
            {album.description}
          </p>
        </div>

        {/* Tracklist */}
        <div className="flex flex-col gap-2">
          {album.tracks.map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="group flex items-center gap-4 py-3 px-4 hover:bg-surface rounded-lg transition-colors border border-transparent hover:border-border"
            >
              <span className="w-6 text-right font-mono text-text-low text-sm group-hover:text-primary">
                {index + 1}
              </span>
              <h3 className="flex-1 font-medium text-text-high">{track.title}</h3>
              <span className="font-mono text-sm text-text-low">{track.duration}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
