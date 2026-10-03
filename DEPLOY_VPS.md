# LENS // lens.alperentoker.com VPS Sunucu Kurulum & Canlıya Alma Kılavuzu

Bu kılavuz, **LENS** platformunu `alperentoker.com` ana alan adınız altında **`lens.alperentoker.com`** alt alan adı (subdomain) olarak VPS sunucunuzda (Ubuntu/Debian) **Plan B (Gerçek CMS + SQLite Veritabanı + Node.js API)** mimarisiyle canlıya almanız için gerekli tüm adımları içerir.

---

## 🌐 1. DNS Ayarı (Domain Yönetim Paneli)

Domaini yönettiğiniz panelde (Cloudflare, Namecheap, GoDaddy, vb.) bir DNS kaydı ekleyin:

| Tür (Type) | İsim (Host / Name) | Değer (Value / Target) | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `lens` | `VPS_SUNUCU_IP_ADRESINIZ` | Otomatik / 300 |

*(Bu sayede `lens.alperentoker.com` doğrudan VPS sunucunuza yönlenir).*

---

## 🔒 2. Mimari & Güvenlik Genel Bakışı

* **Merkezi Veritabanı:** Tüm makaleler ve ayarlar sunucudaki SQLite (`data/lens.db`) veritabanında WAL modunda saklanır. Tüm ziyaretçiler ve cihazlar aynı güncel içeriği görür.
* **Sunucu Tarafı Kimlik Doğrulama:**
  * Parolalar istemcide değil, sunucu tarafında `scrypt` kriptografik hash + 32-byte benzersiz tuz (salt) ile korunur.
  * Oturumlar `HttpOnly`, `SameSite=Strict` çerezler ile yönetilir.
  * Sunucu seviyesinde IP tabanlı kademeli brute-force koruması aktiftir (5 hatalı deneme → 1 dk, 10 hatalı deneme → 15 dk kilitleme).
* **Taslak İzolasyonu:** Yayınlanmamış makaleler (`draft`) kamuya açık API ve sayfalarda filtrelenir; yalnızca doğrulanmış yönetici oturumu ile görülebilir.
* **Erişim Yolları:**
  * `https://lens.alperentoker.com/admin` (veya `/#admin`)
  * Klavyeden <kbd>Alt + A</kbd> veya <kbd>Ctrl + Shift + A</kbd> kısayolu.
  * Sayfa altındaki konsol simgesi.

---

## 🚀 3. Dağıtım Seçenekleri

### Yöntem A: Docker Compose ile Dağıtım (Önerilen)

En kolay, izole ve güvenli yöntemdir. Backend Node.js servisi ve Frontend Nginx servisi tek komutla ayağa kalkar:

```bash
# 1. Projeyi sunucuya çekin
cd /var/www/lens-blog

# 2. Ortam değişkenlerini yapılandırın
cp .env.example .env

# 3. Docker Compose ile derleyin ve başlatın
docker compose up -d --build

# 4. Durumu kontrol edin
docker compose ps
docker compose logs -f
```

Veritabanı sunucudaki `./data/lens.db` dizininde kalıcı olarak saklanır; konteynerler yeniden başlatılsa bile veri kaybı yaşanmaz.

---

### Yöntem B: Doğrudan VPS Üzerinde PM2 + Nginx ile Dağıtım

#### Adım 1: Bağımlılıkları Kurun ve Derleyin

```bash
cd /var/www/lens-blog
npm ci
npm run build
```

#### Adım 2: Backend API Servisini Başlatın (PM2)

```bash
# PM2 kurulu değilse: npm install -g pm2
pm2 start "npm run server" --name lens-api
pm2 save
pm2 startup
```

#### Adım 3: Nginx Yapılandırması

`/etc/nginx/sites-available/lens-alperentoker` dosyasını oluşturun:

```nginx
upstream lens_backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name lens.alperentoker.com;

    root /var/www/lens-blog/dist;
    index index.html;

    server_tokens off;
    client_max_body_size 15M;

    # Güvenlik Başlıkları
    add_header X-Content-Type-Options    "nosniff" always;
    add_header X-Frame-Options           "SAMEORIGIN" always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;

    # Content Security Policy
    add_header Content-Security-Policy   "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self';" always;

    # Gzip Sıkıştırma
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # API Ters Proxy
    location /api/ {
        proxy_pass http://lens_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Dinamik SEO
    location = /sitemap.xml {
        proxy_pass http://lens_backend/sitemap.xml;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location = /robots.txt {
        proxy_pass http://lens_backend/robots.txt;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Statik Varlık Önbellekleme
    location ~* \.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA Yönlendirmesi (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gizli dosyalara erişim engeli
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

Yapılandırmayı etkinleştirin ve Nginx'i yeniden yükleyin:

```bash
sudo ln -sf /etc/nginx/sites-available/lens-alperentoker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 4. Ücretsiz SSL (HTTPS) Kurulumu — Certbot

Let's Encrypt ile tek komutla otomatik SSL sertifikası tanımlayın:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d lens.alperentoker.com
```

Certbot HTTP trafiğini otomatik olarak HTTPS'e yönlendirecektir.

---

## 🛠️ 5. Parola Sıfırlama ve Yedekleme

* **Veritabanı Yedeği:**
  Tek yapmanız gereken `data/lens.db` dosyasını kopyalamaktır:
  ```bash
  cp /var/www/lens-blog/data/lens.db /var/backups/lens_$(date +%F).db
  ```
* **Yönetici Parolasını Sıfırlama:**
  Parolanızı unutursanız, SQLite CLI ile ayarlar tablosundaki hash kaydını silerek ilk kurulum moduna dönebilirsiniz:
  ```bash
  sqlite3 /var/www/lens-blog/data/lens.db "DELETE FROM settings WHERE key LIKE 'master_password%';"
  ```
  Ardından sitede `/#admin` rotasına girdiğinizde sistem sizden yeni parola oluşturmanızı isteyecektir.
