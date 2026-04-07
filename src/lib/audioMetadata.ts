// @ts-ignore
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

export function getAudioMetadata(file: File): Promise<{ title?: string; artist?: string; album?: string; genre?: string; lyrics?: string; duration?: string }> {
  return new Promise((resolve) => {
    // Para a duração, podemos usar o elemento de áudio nativo do navegador
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    
    let duration = '';
    audio.addEventListener('loadedmetadata', () => {
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60);
      duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      URL.revokeObjectURL(objectUrl);
      
      // Agora lê as tags ID3
      jsmediatags.read(file, {
        onSuccess: function(tag: any) {
          const tags = tag.tags;
          
          let lyrics = '';
          if (tags.USLT) {
            lyrics = tags.USLT.lyrics;
          } else if (tags.SYLT) {
            // SYLT is synchronized lyrics, usually an array
            lyrics = JSON.stringify(tags.SYLT);
          } else if (tags.TXXX) {
            // Sometimes lyrics are in TXXX
            const txxx = Array.isArray(tags.TXXX) ? tags.TXXX : [tags.TXXX];
            const lyricsTag = txxx.find((t: any) => t.description?.toLowerCase().includes('lyrics'));
            if (lyricsTag) lyrics = lyricsTag.data;
          }

          resolve({
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            genre: tags.genre,
            lyrics: lyrics,
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
  });
}
