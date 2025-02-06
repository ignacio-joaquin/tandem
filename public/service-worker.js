// (A) INSTANT WORKER ACTIVATION
self.addEventListener("install", evt => {
  console.log('Service Worker installing.');
  evt.waitUntil(self.skipWaiting());
});
 
// (B) CLAIM CONTROL INSTANTLY
self.addEventListener("activate", evt => {
  console.log('Service Worker activating.');
  evt.waitUntil(self.clients.claim());
});
 
// (C) LISTEN TO PUSH
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon,
      image: data.image,
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received:', event);
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
