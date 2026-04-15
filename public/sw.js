self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const title = payload.title || "Neothera reminder";
  const body = payload.body || "Time for your daily check-in.";
  const url = payload.url || "/app";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client && client.url.includes(url)) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
