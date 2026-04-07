import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';

export function AlbumDetail() {
  const { id } = useParams();
  const { setCurrentTrack, setIsPlaying, setQueue } = useStore();
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlbum() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('albums')
        .select(`
          *,
          tracks (*)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        // Sort tracks by track_number
        const sortedTracks = data.tracks.sort((a: any, b: any) => a.track_number - b.track_number);
        
        setAlbum({
          id: data.id,
          title: data.title,
          artist: 'Kyvra',
          year: data.release_year,
          coverUrl: data.cover_url,
          description: data.description,
          tracks: sortedTracks.map((t: any) => ({
            id: t.id,
            title: t.title,
            duration: t.duration || '0:00',
            audioUrl: t.audio_url,
            vibe: t.vibe || 'Introspectivo',
            lyrics: t.lyrics,
            artist: t.artist || 'Kyvra'
          }))
        });
      }
      setLoading(false);
    }
    fetchAlbum();
  }, [id]);

  const handlePlayAlbum = () => {
    if (!album) return;
    const tracksToPlay = album.tracks.map((t: any) => ({
      ...t,
      artist: t.artist || album.artist,
      coverUrl: album.coverUrl,
      vibe: t.vibe || 'Album Track'
    }));
    setQueue(tracksToPlay);
    setCurrentTrack(tracksToPlay[0]);
    setIsPlaying(true);
  };

  const handlePlayTrack = (track: any) => {
    if (!album) return;
    const trackToPlay = {
      ...track,
      artist: track.artist || album.artist,
      coverUrl: album.coverUrl,
      vibe: track.vibe || 'Album Track'
    };
    
    const allTracks = album.tracks.map((t: any) => ({
      ...t,
      artist: t.artist || album.artist,
      coverUrl: album.coverUrl,
      vibe: t.vibe || 'Album Track'
    }));
    
    setQueue(allTracks);
    setCurrentTrack(trackToPlay);
    setIsPlaying(true);
  };

  if (loading) {
    return <div className="w-full min-h-screen flex items-center justify-center text-primary">Carregando...</div>;
  }

  if (!album) {
    return <div className="w-full min-h-screen flex items-center justify-center text-text-low">Álbum não encontrado.</div>;
  }

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
              onClick={() => handlePlayTrack(track)}
              className="group flex items-center gap-4 py-3 px-4 hover:bg-surface rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
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
