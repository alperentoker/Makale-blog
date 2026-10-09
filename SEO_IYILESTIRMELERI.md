# LENS — SEO İyileştirmeleri

## Sorunun kök nedeni

Site **tamamıyla istemci-taraflı (CSR) bir React SPA**'dır. Yani sunucunun
tarayıcıya/Google'a ilk döndürdüğü ham HTML'de:

```html
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-....js"></script>
</body>
```

içerik **yok**tur; tüm yazılar JS çalıştıktan sonra oluşur. Google JS
çalıştırabilse de:

- İçerik `robots.txt`/`sitemap.xml` ile keşfedilse bile indeksleme **çok daha
  yavaş** olur ve yeni/az otoriteli sitelerde sayfalar sıklıkla hiç indekslenmez.
- Tarayıcı sekmesinde başlık JS ile güncellense de, sosyal önizlemeler ve
  ilk tarama için sunucu HTML'i boş kalır.

Ayrıca sitemap yalnızca **2 URL** (ana sayfa + 1 makale) içeriyordu; yani Google'a
"burada çok az içerik var" sinyali gidiyordu. Google'ın *"alperen toker"* veya
*"lens"* sorgularında siteyi göstermemesi bunun doğrudan sonucudur.

## Yapılan kod değişiklikleri

### 1. Sunucu taraflı içerik (en önemli)
`server/lib/seoRender.ts` (yeni): Bağımlılıksız, **escape eden** bir
Markdown → anlamsal HTML dönüştürücüsü (`<h1>`, `<h2>`, `<p>`, `<ul>`, `<ol>`,
`<blockquote>`, `<table>`, `<pre><code>`).

`server/routes/seo.ts`:
- **Makale sayfalarında** (`/article/:slug`, `/makale/:slug`): başlık, özet/dek ve
  **tam makale gövdesi** sunucuda HTML'e çevrilip `<div id="root"></div>`'un
  hemen ardına `<noscript id="lens-seo-content">` içinde enjekte edilir. Artık
  JS çalıştırmayan bir bot bile tüm metni görür.
- **Ana sayfada** (`/`): yayınlanmış makalelerin başlık + özet listesi yine
  `<noscript>` içinde sunulur ve RSS bağlantısı eklenir.
- **JSON-LD** zenginleştirildi: makale sayfalarına `BreadcrumbList`, ana sayfaya
  `ItemList` eklendi (mevcut `Blog` + `TechArticle` ile birlikte).
- **RSS 2.0 beslemesi** (`/feed.xml`) eklendi.

> Not: `<noscript>` içeriği normal tarayıcılarda görünmez (kullanıcı deneyimi
> değişmez), yalnızca JS'siz botlara hizmet eder. İçerik her zaman
> `escapeHtml`'den geçtiği için **XSS riski yoktur** (test 20 bunu doğrular).

### 2. Keşfedilebilirlik
- Yeni `/feed.xml` için `nginx.conf`'a backend proxy ve `index.html`'e
  `<link rel="alternate" type="application/rss+xml">` eklendi.
- `robots.txt` artık gizli yolları ifşa etmiyor (güvenlik düzeltmesi).

## ✅ ZORUNLU kod-dışı adımlar (bunlar olmadan Google indekslemez)

Kod değişiklikleri içeriği **indekslenebilir** hale getirir; ancak Google'ın
siteyi taraması/indekslemesi için şunlar şarttır:

1. **Google Search Console (GSC)** — <https://search.google.com/search-console>
   - `lens.atoker.dev` sitesini **Domain** olarak ekle ve DNS TXT kaydıyla
     (Cloudflare üzerinden) doğrula.
   - **Sitemaps** → `https://lens.atoker.dev/sitemap.xml` adresini gönder.
   - **URL Denetimi** → ana sayfa ve makale URL'sini girip **"İndeksleme iste"**.
2. **Bing Webmaster Tools** — aynı sitemap'i gönder (Bing, GSC'den içe aktarabilir).
3. **Site satırları / `site:` kontrolü** — indeksleme genelde 3–14 gün sürer.
   `site:lens.atoker.dev` ile takip et.
4. **Backlink/Marka sinyali** — "lens" çok genel bir kelime; marka sorgusunda
   çıkmak için GSC'de marka adına bağlı tıklama ve dış bağlantı (GitHub, X,
   Medium vb. profillerden `lens.atoker.dev`'e link) gerekir.
5. **Cloudflare "Bot Fight Mode"** açıksa, Googlebot'u engellemediğinden emin ol
   (normalde engellemez; `js challenge` gibi ayarları kontrol et).

## Doğrulama

- `npm test`: **20/20** (yeni SEO render + escape testi dahil).
- `tsc -b`: 0 hata · `oxlint`: temiz.
- Yerel sunucuda gerçek içerikle doğrulandı:
  - Makale ham HTML'inde `<h1>`, paragraf, liste ve tablo `<noscript>` içinde görünüyor.
  - `TechArticle` + `BreadcrumbList` JSON-LD geçerli.
  - Ana sayfa `<noscript>` listesi ve `ItemList` JSON-LD üretiliyor.
  - `/feed.xml` geçerli RSS 2.0 döndürüyor.

## Dağıtım

```bash
npm run build && pm2 restart lens-api
sudo cp nginx.conf /etc/nginx/sites-available/lens && sudo nginx -t && sudo systemctl reload nginx
```
Ardından yukarıdaki GSC adımlarını uygula.
