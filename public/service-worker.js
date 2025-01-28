// (A) INSTANT WORKER ACTIVATION
self.addEventListener("install", evt => self.skipWaiting());
 
// (B) CLAIM CONTROL INSTANTLY
self.addEventListener("activate", evt => self.clients.claim());
 
// (C) LISTEN TO PUSH
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon,
    image: data.image,
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received:', event);
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});