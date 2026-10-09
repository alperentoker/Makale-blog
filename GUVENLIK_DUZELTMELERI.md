# LENS — Güvenlik Bulguları ve Uygulanan Düzeltmeler

Kaynak kod incelemesi + canlı doğrulama (`https://lens.atoker.dev`) sonucunda
tespit edilen sorunlar ve bunlara uygulanan kalıcı çözümler. Tüm değişiklikler
`server.log` test paketi (19/19), `tsc -b` ve `oxlint` ile doğrulandı; kritik
maddeler yerel bir sunucu üzerinde canlı HTTP istekleriyle de sınandı.

## 🔴 Kritik — Brute-force korumasının atlatılması

**Sorun.** Dağıtım `Cloudflare → Nginx → Node` zinciri kullanıyor ve
`server/index.ts` içinde `app.set('trust proxy', 1)` tanımlıydı. Bu ayar
`X-Forwarded-For` zincirinde **sadece bir atlama** atlayıp durduğu için
`req.ip` gerçek istemci yerine **Cloudflare kenar IP'sine** (veya taklit
edilebilir bir başlığa) karşılık geliyordu. Sonuç: her denemede farklı bir
sahte `X-Forwarded-For` göndererek IP başına sayaç sıfırlanabiliyor, ardı ardına
sınırsız hatalı giriş denemesi yapılabiliyordu. Canlı gözlem (monoton olmayan
`attemptsRemaining: 4,4,3,4,...`) bununla birebir örtüşüyordu.

**Çözüm (`server/net.ts` — yeni; `server/index.ts`).**
- Express'in **fonksiyon tabanlı** `trust proxy` doğrulaması kullanıldı; yalnızca
  döngü yerelindeki (Nginx) ve **Cloudflare kenar IP aralıklarındaki** adımlar
  güvenilir kabul ediliyor (CIDR tabanlı, IPv4 + IPv6).
- Böylece `req.ip`, zincirdeki en sağdaki güvenilmeyen adresi (gerçek istemciyi)
  veriyor; istemcinin gönderdiği sahte önek yok sayılıyor.
- IPv4-eşlenmiş IPv6 adresleri (`::ffff:127.0.0.1`) normalize ediliyor ki
  dual-stack soketlerde güven kontrolü tutarlı olsun ve tüm istemciler **tek
  sayaç paylaşarak kilitlenme (DoS) yaşamasın**.
- İsteğe bağlı `TRUSTED_PROXIES` ortam değişkeniyle ek aralıklar tanımlanabilir.

**Doğrulama.** Farklı sahte `X-Forwarded-For` başlıklarıyla 7 hatalı login:
sayaç 4→3→2→1→0 şeklinde azaldı, 5. denemede `429` + 60 sn kilit döndü.
Ayrıca ayrı bir kontrol sunucusuyla `req.ip`'nin güvenilen zincirde gerçek
istemciye çözüldüğü doğrulandı.

## 🟠 Yüksek — Kalıcı kilit mantığındaki hata

**Sorun.** `recordFailedAttempt`, 6. denemeden sonra `attempts` değerini
`cap (5)` sonrası `6`'ya sabitliyordu; ancak sonraki denemelerde
`lockout_until` **sıfırlanarak** yazılıyordu. 15 dakikalık sert kilidi (10+
deneme) bu şekilde sürekli tazeleniyor ya da bir noktada kilit
kaybediliyordu.

**Çözüm (`server/auth.ts`).** Depolanan `attempts` üst sınırla küçültülürken
`lockout_until` **asla temizlenmiyor**; kilit süresi yalnızca ileri taşınıyor.
Ayrıca istemci anahtarı SHA-256 ile normalize edilerek sabit uzunlukta ve
sınırlı hale getirildi (proxy kaynaklı IP varyantları sayacı sıfırlayamaz,
tablo kayıt sayısı sınırlı kalır). Regresyon testi eklendi (test 16, 17).

## 🟠 Orta — `/og/:slug.png` yol geçişi (path traversal)

**Sorun.** `slug` doğrudan dosya yoluna ekleniyordu
(`path.join(projectRoot, 'public', 'og', ${slug}.png)`).

**Çözüm (`server/routes/seo.ts`).** Slug deseni (`^[a-z0-9][a-z0-9._-]*$`)
doğrulanıyor; ayrıca son yolun `og/` dizini içinde kaldığı
(`path.basename` + `startsWith`) ikinci kez kontrol ediliyor. (Nginx 403 ile
zaten engelliyordu; bu, kod tarafındaki derinlemesine savunmadır.)

## 🟠 Orta — İç hata mesajı sızıntısı (JSON parse)

**Sorun.** Bozuk JSON gövdesi, V8'in ham ayrıştırma mesajını döndürüyordu
(`Expected property name or '}' in JSON at position 1`).

**Çözüm (`server/index.ts`).** Global hata işleyici artık
`entity.parse.failed` / `SyntaxError` durumunda nötr `400 "Geçersiz istek
gövdesi."` döndürüyor; üretimde hiçbir dahili mesaj/yol sızdırılmıyor.

## 🟠 Orta — Yükleme güvenliği (SVG depolanmış XSS)

**Sorun.** `/api/upload`, `image/svg+xml` kabul ediyor ve içeriği doğrulamadan
diske yazıyordu; dosyalar `https://lens.atoker.dev/uploads/...` altından **aynı
origin**'den sunuluyor (nginx `/uploads/` → disk). Yüklenen bir SVG
`<script>` çalıştırabilir.

**Çözüm (`server/routes/upload.ts`, `server/index.ts`, `nginx.conf`).**
- **Magic-byte doğrulaması:** içerik, bildirilen MIME türüyle eşleşmezse reddedilir
  (ör. PNG gibi gizlenmiş script). SVG için yalnızca XML/SVG başlangıcı kabul edilir.
- **SVG sanitizasyonu:** `<script>`, `on*` olay işleyicileri, `javascript:`/`data:`
  URL'leri ve harici referanslar kayıttan önce temizlenir.
- **Sunum başlıkları:** `/uploads/` statik sunumuna `nosniff` + `same-origin`
  eklendi; SVG'ler için `Content-Security-Policy: default-src 'none'; sandbox`
  ile ikinci savunma katmanı (Node + nginx).
- Birim testleri eklendi (test 18, 19).

## 🟡 Düşük — Bilgi ifşası ve sertleştirme

| Bulgu | Çözüm |
|---|---|
| `robots.txt` gizli yolları (`/admin`, `/studio`, `/yonetim`) ifşa ediyordu | Bu satırlar kaldırıldı; `/api/` disallow korundu |
| `X-XSS-Protection` (kullanımdan kalkmış, zararlı olabilir) | Kaldırıldı; yerine `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-Permitted-Cross-Domain-Policies` eklendi |
| CSP'de `script-src 'unsafe-inline'` | `script-src 'self'` yapıldı (+ `object-src 'none'`, `base-uri`, `frame-ancestors`, `form-action`); Vite build'inde inline script yok |
| Harici `fetch` (arXiv/Crossref) zaman aşımı yok → yavaş yanıtta istek asılı kalır | `AbortSignal.timeout(15000)` eklendi |
| HSTS `preload` içermiyordu | Nginx + Node tarafında `includeSubDomains; preload` |

## Doğrulama Özeti

- `npm test`: **20/20 geçti** (güvenlik, Express 5 rota ve sert lockout regresyon testleri dahil).
- `tsc -b`: **0 hata**.
- `oxlint`: temiz.
- Canlı HTTP: statik SPA sunumu, hata maskeleme, robots, `/og` traversal, setup ve **15 dk kilitlenmeli spoof'a dayanıklı brute-force kilidi** doğrulandı.

## Dağıtım Notu

Değişikliklerin canlıya yansıması için: `npm run build` + `pm2 restart lens-api`
ve `nginx.conf` kopyalanıp `nginx -t && systemctl reload nginx`. `dist/` önceden
derlenmiş olduğundan ve `nginx.conf` dosyası repoda tutulduğundan bu adımlar
`deploy.sh` sonrası elle uygulanmalıdır.
