# LENS // Alperen Toker — Savunma Sanayii & Bilgisayarlı Görü Araştırma Platformu

IEEE, Distill.pub ve Stripe Press kalitesinde tasarlanmış; savunma sistemleri, kızılötesi termal görü, veri mühendisliği ve gömülü kenar yapay zeka (Edge AI) için **Anti-AI Editoryal Blog & Makale Yayın Platformu (CMS & Reader)**.

---

## 🎯 Tasarım Manifestosu & İsviçre Tipografisi

- **Anti-AI Görsel Kimlik:** Basmakalıp neon mor degradeler, yüzen kartlar ve anlamsız ikonlar yerine; insan zanaatı, doğal sıcak kağıt tonları (`#FBFBFA`), derin mürekkep siyahları (`#121316`), arduvaz kenarlıklar (`#E2E4E8`) ve taktik donanma laciverti (`#1E3A8A`).
- **Tipografi Hiyerarşisi:**
  - *Editoryal Başlıklar & Gövde:* Newsreader / Georgia (Optik boyutlandırma, drop cap desteği).
  - *Kullanıcı Arayüzü:* Inter / Plus Jakarta Sans.
  - *Kod & Formüller:* JetBrains Mono & KaTeX LaTeX motoru.
- **Altın Oran Okuma Alanı:** 68–72 karakter genişliğinde `max-w-prose` satır düzeni ile gözü yormayan editoryal ritim.

---

## 🚀 Çekirdek Özellikler

### 1. Ziyaretçi & Okuyucu Deneyimi (Article Reader)
- **Dinamik Sticky TOC (İçindekiler Çubuğu):** Okuyucu aşağı kaydırdıkça aktif başlığı (H2, H3) fısıltı sessizliğinde vurgulayan ve tek tıkla pürüzsüz kaydıran içindekiler gezgini.
- **İnteraktif Before/After Sürgüsü:** Ham 14-bit LWIR termal sensör görüntüsü ile yapay zeka tarafından kalibre edilmiş YOLOv9 hedef tespiti ve telemetri arayüzünü dokunmatik sürgü ile yan yana kıyaslama.
- **KaTeX LaTeX Matematik Desteği:** Termal Stefan-Boltzmann emisyon denklemleri, IoU kayıp fonksiyonları ve uzamsal-zamansal korelasyon matrisleri.
- **İnteraktif Veri Tabloları:** Gerçek zamanlı arama, sütun bazlı sıralama (mAP, gecikme, watt) ve tek tıkla **CSV** / **JSON** dışa aktarma araçları.
- **Medya & Sensör Lightbox:** Sensör çıktıları için tam ekran yakınlaştırma (Zoom In/Out), kaydırma (Pan) ve görüntü indirme.
- **BibTeX, IEEE ve APA Alıntı Kartı:** Makale sonunda tek tıkla kopyalanabilir BibTeX kod bloğu, IEEE/APA referansları ve `.bib` dosyası indirme.
- **Web / IEEE PDF İkili Görünüm Anahtarı:**
  - *Web Modu:* Akıcı editoryal Markdown okuma deneyimi.
  - *IEEE PDF Modu:* İki sütunlu akademik bildiri düzeni (running header, abstract, keywords, 2-column body) ve tarayıcıdan doğrudan baskı / PDF kaydetme desteği.

### 2. Yönetim Stüdyosu (Admin Studio & CMS)
- **Akıllı İçe Aktarma (Smart Ingestion):**
  - Sürükle-bırak ile `.pdf` veya `.md` yükleme.
  - `pdf.js` tabanlı otomatik başlık, dek, özet (abstract), yazar, tarih ve etiket tespiti.
- **Çift Pencereli Canlı Düzenleyici (Live Split-Screen):**
  - Sol panel: Markdown kaynak düzenleyicisi, hızlı sözdizimi araç çubuğu (H2, H3, Formül `$x$`, Not `[!Note]`, Uyarı `[!Uyarı]`, Kod bloğu).
  - Sağ panel: Birebir gerçek sayfa tasarımıyla eşzamanlı canlı önizleme.
- **Zen / Odaklanma Modu:** Dikkati dağıtan tüm öğeleri gizleyen tam ekran minimalist yazma ortamı.
- **Canlı SEO & Sosyal Kart Önizleyici:** Google SERP arama sonucu snippet'i ve 1200x630 Twitter/X & LinkedIn paylaşım kartı canlı simülasyonu.
- **Yayın Durumu Yönetimi:** Taslak (*Draft*), İncelemede (*Under Review*) ve Yayında (*Published*) durumları. Yayınlandığında kutlama konfeti animasyonu.
- **Sunucu Kalıcılığı (SQLite & Node.js API):** Düzenlemeler, yeni makaleler ve taslaklar sunucu tarafındaki SQLite (`data/lens.db`) veritabanında saklanır; tüm ziyaretçiler ve cihazlar aynı merkezi arşivi görür.
- **Kademeli Güvenlik:** `scrypt` hash, HttpOnly oturum çerezleri, IP tabanlı brute-force koruması ve taslak izolasyonu (yalnızca yayınlanmış içerik kamuya açıktır).

---

## 🛠️ Kurulum ve Çalıştırma

### Yerel Geliştirme (Full-Stack)

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu ve Backend API'yi birlikte başlat
npm run dev

# Veya ayrı terminallerde:
# Terminal 1 (Backend API :3001): npm run dev:server
# Terminal 2 (Frontend :5173):     npm run dev:client
```

Geliştirme sunucusu `http://127.0.0.1:5173/`, Backend API `http://127.0.0.1:3001/` adresinde çalışır.

### VPS Canlıya Alma (PM2 + Nginx)

Sistem konteyner gerektirmeden doğrudan VPS üzerinde yerel PM2 ve Nginx ile çalışır:

```bash
# Derleme ve PM2 başlatma
npm run build
pm2 start "npm run server" --name lens-api

# Tek tıkla güncelleme ve dağıtım betiği:
./deploy.sh
```

Detaylı sunucu ve SSL kurulum adımları için [DEPLOY_VPS.md](DEPLOY_VPS.md) dosyasına bakabilirsiniz.

