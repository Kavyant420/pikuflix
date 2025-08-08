
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://kavyant420.github.io/pikuflix/')
  );
});
