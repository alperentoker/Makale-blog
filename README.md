# LENS — Alperen Toker'in araştırma notları

Bilgisayarlı görü, termal (LWIR) görüntüleme ve gömülü yapay zekâ üzerine yazdığım teknik makalelerin yayınlandığı site ve onu yöneten küçük CMS.

Canlı adres: https://lens.atoker.dev

## Neler var

**Okuyucu tarafı**
- Markdown tabanlı makale sayfası: KaTeX ile formüller, kod blokları, not/uyarı kutuları.
- Kaydırırken aktif başlığı gösteren içindekiler listesi.
- Önce/sonra görüntü karşılaştırma sürgüsü ve yakınlaştırılabilir görsel görüntüleyici.
- Aranabilir, sıralanabilir tablolar; CSV/JSON olarak indirilebilir.
- Makaleyi iki sütunlu IEEE bildiri düzeninde görüntüleme ve tarayıcıdan PDF olarak yazdırma.
- Başlık, özet, etiket ve içerikte tam metin arama (SQLite FTS5).

**Yönetim paneli** (`/admin`, tek bir yönetici parolasıyla)
- Markdown düzenleyici ve yanında canlı önizleme.
- `.md` veya `.pdf` dosyasından makale içe aktarma; DOI ya da arXiv numarasından künye çekme.
- Taslak / incelemede / yayında durumları. Yalnızca yayındaki makaleler ziyaretçilere görünür.

**SEO**
- `/article/:slug` sayfaları sunucuda başlık, açıklama, canonical, OpenGraph/Twitter etiketleri, JSON-LD ve JavaScript'siz okunabilen içerikle döner.
- `sitemap.xml`, `feed.xml` (RSS) ve her makale için otomatik üretilen 1200×630 paylaşım görseli.
- Slug'ı değişen makalenin eski adresi 301 ile yeni adrese yönlenir.

## Teknik yapı

| Katman | Kullanılan |
|---|---|
| Ön yüz | React 19, Vite, Tailwind CSS, TanStack Query |
| Sunucu | Node.js, Express 5 (`tsx` ile TypeScript) |
| Veri | SQLite (`better-sqlite3`, WAL modu), `data/lens.db` |
| Paylaşım görselleri | `server/og-generator.py` (Python + Pillow) |
| Barındırma | Tek bir VM üzerinde Nginx + PM2, önünde Cloudflare |

```
src/            React uygulaması (bileşenler, Markdown motoru, API istemcisi)
server/         Express API, SEO sayfaları, yükleme, oturum ve testler
server/scripts/ Bakım betikleri (ör. slug değiştirme)
nginx.conf      Sunucudaki Nginx yapılandırmasının birebir kopyası
```

## Yerelde çalıştırma

```bash
npm install
npm run dev        # API :3001 ve Vite :5173 birlikte
```

Uygulama `http://127.0.0.1:5173` adresinde açılır. İlk açılışta `/admin` üzerinden yönetici parolası belirlenir.

```bash
npm test           # sunucu testleri
npm run lint       # oxlint
npm run build      # tip kontrolü + üretim derlemesi
```

## Güvenlik

- Parola `scrypt` ile saklanır. Oturum token'ları veritabanında hash'lenir; çerezler `HttpOnly` ve `SameSite=strict`.
- Başarısız girişlerde IP başına kademeli kilit uygulanır. İstemci IP'si yalnızca Nginx ve Cloudflare'den gelen başlıklara güvenilerek belirlenir.
- Taslaklar API'de, SEO sayfalarında ve paylaşım görsellerinde gizlidir.
- Yüklenen görsellerin içeriği türüyle karşılaştırılır, SVG'ler temizlenir ve kısıtlayıcı bir CSP ile sunulur.
- API yalnızca `127.0.0.1` üzerinde dinler; dışarıya Nginx üzerinden açılır.

## Yayına alma

`main` dalına yapılan her push'ta GitHub Actions lint, test ve build çalıştırır; hepsi geçerse sunucuya SSH ile bağlanıp kodu çeker, derler ve `pm2 restart lens-api` ile yeniden başlatır. Elle güncellemek için sunucuda `./deploy.sh` de kullanılabilir.

Nginx yapılandırması otomatik dağıtılmaz. Kurulum, SSL ve Nginx adımları için [DEPLOY_VPS.md](DEPLOY_VPS.md) dosyasına bakın.

### Bakım

Bir makalenin slug'ını değiştirmek (eski adres 301 ile yönlenir, işlemden önce veritabanı yedeklenir):

```bash
npx tsx server/scripts/rename-slug.ts <mevcut-slug> [yeni-slug]
```
