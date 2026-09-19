export function kickNotificationWorker(limit = 10) {
  if (typeof window === "undefined") return;
  fetch("/api/notifications/process", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({limit}),
    keepalive:true,
  }).catch(() => {});
}
