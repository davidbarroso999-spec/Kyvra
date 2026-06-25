// Service Worker custom extensions for Kyvra Media Controls and Notification Bar Player

self.addEventListener('notificationclick', (event) => {
  // Closes the notification when clicked (except for actions where we might decide differently, but close() is good practice)
  event.notification.close();

  const action = event.action;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If there's an existing window open, post the action to it and focus it
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'MEDIA_ACTION', action });
          return client.focus();
        }
      }
      
      // 2. If no window exists, open the application and send the action after a brief delay
      if (clients.openWindow) {
        return clients.openWindow('/').then((client) => {
          if (client) {
            // Give the React app some time to load and set up the message listeners
            setTimeout(() => {
              client.postMessage({ type: 'MEDIA_ACTION', action });
            }, 1200);
          }
        });
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Notify our application that the user swiped away/closed the notification
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: 'NOTIFICATION_CLOSED' });
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Handles updating the notification from the foreground or background worker requests
  if (event.data.type === 'UPDATE_MEDIA_NOTIFICATION') {
    const { track, isPlaying } = event.data;
    if (!track) return;

    // Use a helper inside the SW to safely fetch and resolve the image URL
    const getAbsoluteUrl = (url, fallback) => {
      if (!url) return fallback;
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
      // In Service Worker, self.location.origin represents the origin of the PWA
      return self.location.origin + (url.startsWith('/') ? '' : '/') + url;
    };

    const artworkUrl = getAbsoluteUrl(track.coverUrl, '/pwa-512x512.png');

    self.registration.showNotification(track.title, {
      body: track.artist || 'Kyvra',
      icon: artworkUrl,
      badge: artworkUrl,
      image: artworkUrl, // Displays as a beautiful big cover in the Android media panel
      tag: 'kyvra-music-player',
      requireInteraction: false,
      silent: true, // Avoid constantly playing alert sounds on updates/progress
      actions: [
        {
          action: 'previous',
          title: '⏮ Anterior'
        },
        {
          action: isPlaying ? 'pause' : 'play',
          title: isPlaying ? '⏸ Pausar' : '▶ Tocar'
        },
        {
          action: 'next',
          title: '⏭ Próxima'
        },
        {
          action: 'close',
          title: '✕ Fechar'
        }
      ]
    });
  }

  // Handles closing the notification explicitly
  if (event.data.type === 'CLOSE_NOTIFICATION') {
    self.registration.getNotifications({ tag: 'kyvra-music-player' }).then((notifications) => {
      for (const notification of notifications) {
        notification.close();
      }
    });
  }
});
