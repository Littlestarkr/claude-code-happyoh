// HappyOh PDF 도구: 설치형 앱(PWA)용 서비스 워커
// - 앱 화면(pdf-merge.html)은 '인터넷이 되면 최신 것, 안 되면 저장본'으로 연다.
// - 아이콘·글꼴은 저장본을 먼저 쓰고, cdnjs의 PDF 엔진은 저장본을 쓰면서 뒤에서 갱신한다.
// - 이 저장소의 다른 페이지(Janggi.html 등)는 건드리지 않는다.
const CACHE = 'pdf-tool-v1';
const SHELL = ['./pdf-merge.html', './pdf-tool.webmanifest', './pdf-tool-icon-192.png', './pdf-tool-icon-512.png', './pdf-tool-apple-touch-icon.png'];
const STATIC = /\/(pdf-tool-[^/]+\.(png|webmanifest)|fontkit\.umd\.min\.js|noto-sans-kr-korean-400\.ttf)$/;

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k !== CACHE && k.startsWith('pdf-tool-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  // 1) 앱 화면: 네트워크 우선, 실패하면 저장본
  if(url.origin === location.origin && url.pathname.endsWith('/pdf-merge.html')){
    e.respondWith(fetch(req).then(res=>{
      const copy = res.clone(); caches.open(CACHE).then(c=>c.put('./pdf-merge.html', copy)); return res;
    }).catch(()=>caches.match('./pdf-merge.html')));
    return;
  }
  // 2) 아이콘·글꼴: 저장본 우선
  if(url.origin === location.origin && STATIC.test(url.pathname)){
    e.respondWith(caches.match(req).then(hit=>hit || fetch(req).then(res=>{
      const copy = res.clone(); caches.open(CACHE).then(c=>c.put(req, copy)); return res;
    })));
    return;
  }
  // 3) cdnjs의 PDF 엔진: 저장본을 쓰면서 뒤에서 갱신
  if(url.hostname === 'cdnjs.cloudflare.com'){
    e.respondWith(caches.open(CACHE).then(c=>c.match(req).then(hit=>{
      const net = fetch(req).then(res=>{ if(res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(()=>hit);
      return hit || net;
    })));
  }
});
