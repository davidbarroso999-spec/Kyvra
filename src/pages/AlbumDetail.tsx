import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { TrackDuration } from '@/components/ui/TrackDuration';

export function AlbumDetail() {
  const { id } = useParams();
  const { setCurrentTrack, setIsPlaying, setQueue } = useStore();
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

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
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
          <button 
            onClick={handlePlayAlbum}
            className="flex items-center gap-3 px-8 py-4 bg-primary text-void font-sans font-medium rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_var(--glow-purple)] shrink-0"
          >
            <Play size={20} className="fill-current" />
            Tocar Álbum Completo
          </button>
          
          {album.description && (
            <div className="flex-1 w-full md:max-w-2xl bg-surface/30 p-6 rounded-2xl border border-border/50">
              <div className="relative">
                <p className={`text-text-mid font-sans leading-relaxed transition-all duration-300 ${isSynopsisExpanded ? '' : 'line-clamp-3'}`}>
                  {album.description}
                </p>
                {!isSynopsisExpanded && (
                  <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-void/90 to-transparent pointer-events-none" />
                )}
              </div>
              <button 
                onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                className="mt-3 flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {isSynopsisExpanded ? (
                  <>Ver menos <ChevronUp size={16} /></>
                ) : (
                  <>Ler sinopse completa <ChevronDown size={16} /></>
                )}
              </button>
            </div>
          )}
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
              <div className="flex-1 flex flex-col">
                <h3 className="font-medium text-text-high group-hover:text-primary transition-colors">{track.title}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {track.vibe.split(' | ').map((tag: string, idx: number) => (
                    <span key={idx} className="text-[9px] text-text-low uppercase tracking-widest font-mono border border-border/50 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <span className="font-mono text-sm text-text-low">
                <TrackDuration audioUrl={track.audioUrl} defaultDuration={track.duration} />
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
