/* K-Fortune Story — Service Worker */
const VER = "kf-v1";
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
  if(req.mode === "navigate" || url.pathname.endsWith(".html")){
    /* HTML: 네트워크 우선 (최신 유지) → 실패 시 캐시 */
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(VER).then(x => x.put(req, c)); return r; })
                .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
  }else{
    /* 정적 자원: 캐시 우선 */
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      const c = res.clone(); caches.open(VER).then(x => x.put(req, c)); return res;
    })));
  }
});
