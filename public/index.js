if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New or updated service worker installed.');
              } else {
                console.log('Service worker installed for the first time.');
              }
            }
          };
        };
      }).catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}