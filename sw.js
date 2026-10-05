/* K-Fortune Story — Service Worker */
const VER = "kf-v4";   /* v4: /api·/auth 캐시 제외 (옛 캐시에 남은 개인 데이터 비우기) */
const ASSETS = ["./icon-192.png", "./icon-512.png", "./icon-180.png", "./icon-32.png", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;          /* 외부 리소스는 그대로 */
  /* 로그인·개인 데이터는 절대 캐시하지 않음 (항상 네트워크로) */
  if(url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname === "/account.html") return;
  if(req.mode === "navigate" || url.pathname.endsWith(".html")){
    /* HTML: 네트워크 우선 (최신 유지) → 실패 시 캐시 */
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(VER).then(x => x.put(req, c)); return r; })
                .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
  }else{
    /* 정적 자원: 캐시를 먼저 보여주고 뒤에서 새로 받아 갱신 (테마 CSS를 고쳐도 다음 방문엔 반영) */
    e.respondWith(caches.open(VER).then(cache => cache.match(req).then(hit => {
      const net = fetch(req).then(res => { if(res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});

/* 웹 푸시: 서버는 내용 없이 신호만 보냄 → 로그인 쿠키로 오늘 알림 문구를 받아서 표시 */
self.addEventListener("push", e => {
  e.waitUntil(fetch("/api/notice", { credentials: "include" }).then(r => r.json()).catch(() => ({}))
    .then(n => self.registration.showNotification(n.title || "K-Fortune Story", {
      body: n.body || "", icon: "/icon-192.png", badge: "/icon-192.png", data: { url: n.url || "/" }
    })));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow((e.notification.data && e.notification.data.url) || "/"));
});
