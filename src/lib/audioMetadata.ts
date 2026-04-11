// @ts-ignore
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

export function getAudioMetadata(source: File | string): Promise<{ title?: string; artist?: string; album?: string; genre?: string; lyrics?: string; duration?: string; trackNumber?: number }> {
  return new Promise((resolve) => {
    // Para a duração, podemos usar o elemento de áudio nativo do navegador
    const audio = new Audio();
    const isUrl = typeof source === 'string';
    const objectUrl = isUrl ? source : URL.createObjectURL(source);
    
    let duration = '';
    audio.addEventListener('loadedmetadata', () => {
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60);
      duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      if (!isUrl) URL.revokeObjectURL(objectUrl);
      
      // Agora lê as tags ID3
      jsmediatags.read(source, {
        onSuccess: function(tag: any) {
          const tags = tag.tags;
          
          let lyrics = '';
          if (tags.USLT) {
            lyrics = typeof tags.USLT === 'object' ? tags.USLT.lyrics : tags.USLT;
          } else if (tags.lyrics) {
            lyrics = tags.lyrics;
          } else if (tags.SYLT) {
            lyrics = Array.isArray(tags.SYLT) ? tags.SYLT.map((s: any) => s.text).join('\n') : JSON.stringify(tags.SYLT);
          } else if (tags.TXXX) {
            const txxx = Array.isArray(tags.TXXX) ? tags.TXXX : [tags.TXXX];
            const lyricsTag = txxx.find((t: any) => 
              t.description?.toLowerCase().includes('lyrics') || 
              t.user_description?.toLowerCase().includes('lyrics')
            );
            if (lyricsTag) lyrics = lyricsTag.data || lyricsTag.value;
          }

          resolve({
            title: tags.title || '',
            artist: tags.artist || '',
            album: tags.album || '',
            genre: tags.genre || '',
            trackNumber: tags.track ? parseInt(tags.track.split('/')[0]) : undefined,
            lyrics: lyrics || '',
            duration: duration
          });
        },
        onError: function(error: any) {
          console.warn('Error reading tags:', error);
          resolve({ duration }); // Retorna pelo menos a duração
        }
      });
    });
    
    audio.src = objectUrl;
    // For URLs, we might need crossOrigin to read metadata
    if (isUrl) audio.crossOrigin = "anonymous";
  });
}
