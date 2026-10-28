# LENS // lens.atoker.dev VPS Sunucu Kurulum & Canlıya Alma Kılavuzu

Bu kılavuz, **LENS** platformunu `atoker.dev` ana alan adınız altında **`lens.atoker.dev`** alt alan adı (subdomain) olarak VPS sunucunuzda (Ubuntu/Debian) **Plan B (Gerçek CMS + SQLite Veritabanı + Node.js API)** mimarisiyle canlıya almanız için gerekli tüm adımları içerir.

---

## 🌐 1. DNS Ayarı (Domain Yönetim Paneli)

Domaini yönettiğiniz panelde (Cloudflare, Namecheap, GoDaddy, vb.) DNS kayıtlarını ekleyin:

| Tür (Type) | İsim (Host / Name) | Değer (Value / Target) | TTL | Açıklama |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `lens` | `VPS_SUNUCU_IP_ADRESINIZ` | Otomatik / 300 | `lens.atoker.dev` LENS sitemize yönlenir |
| **A** | `@` *(isteğe bağlı)* | `VPS_SUNUCU_IP_ADRESINIZ` | Otomatik / 300 | `atoker.dev` ana alan adınız (ayrı portföy/site için) |

*(Bu sayede `lens.atoker.dev` doğrudan VPS sunucunuza yönlenir).*

---

## 🔒 2. Mimari & Güvenlik Genel Bakışı

* **Merkezi Veritabanı:** Tüm makaleler ve ayarlar sunucudaki SQLite (`data/lens.db`) veritabanında WAL modunda saklanır. Tüm ziyaretçiler ve cihazlar aynı güncel içeriği görür.
* **Sunucu Tarafı Kimlik Doğrulama:**
  * Parolalar istemcide değil, sunucu tarafında `scrypt` kriptografik hash + 32-byte benzersiz tuz (salt) ile korunur.
  * Oturumlar `HttpOnly`, `SameSite=Strict` çerezler ile yönetilir.
  * Sunucu seviyesinde IP tabanlı kademeli brute-force koruması aktiftir (5 hatalı deneme → 1 dk, 10 hatalı deneme → 15 dk kilitleme).
* **Taslak İzolasyonu:** Yayınlanmamış makaleler (`draft`) kamuya açık API ve sayfalarda filtrelenir; yalnızca doğrulanmış yönetici oturumu ile görülebilir.
* **Erişim Yolları:**
  * `https://lens.atoker.dev/admin` (veya `/#admin`)
  * Klavyeden <kbd>Alt + A</kbd> veya <kbd>Ctrl + Shift + A</kbd> kısayolu.
  * Sayfa altındaki konsol simgesi.

---

## 🚀 3. VPS Dağıtımı (PM2 + Nginx)

Bu kurulum doğrudan VPS sunucunuz (Ubuntu/Debian) üzerinde Node.js, PM2 process yöneticisi ve Nginx ters proxy ile en yüksek performans ve düşük kaynak tüketimiyle çalışır.

### Adım 1: Projeyi Sunucuya Alın ve Bağımlılıkları Kurun

```bash
# Python Pillow (Dinamik 1200x630 OpenGraph sosyal medya kartları üretimi için)
sudo apt update && sudo apt install python3 python3-pil -y

cd /var/www/lens-blog
git pull origin main
cp .env.example .env
npm ci
npm run build
```

### Adım 2: Backend API Servisini Başlatın (PM2)

```bash
# PM2 kurulu değilse: sudo npm install -g pm2
pm2 start "npm run server" --name lens-api
pm2 save
pm2 startup
```

Veritabanı sunucudaki `./data/lens.db` dosyasında SQLite WAL modunda saklanır; sunucu yeniden başlatılsa bile veri kaybı yaşanmaz.

### Adım 3: SSL Sertifikası ve Nginx Yapılandırması

Repo'daki [`nginx.conf`](nginx.conf), sunucudaki `/etc/nginx/sites-available/lens-atoker` dosyasının birebir kopyasıdır (Certbot TLS blokları dahil). Sunucudaki dosyayı elle düzenlemeyin; değişikliği önce repo'da yapın, sonra kopyalayın. CI deploy'u Nginx yapılandırmasını **güncellemez**.

Yeni bir sunucuda, yapılandırma sertifika dosyalarına başvurduğu için önce sertifikayı alın:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d lens.atoker.dev
```

Ardından yapılandırmayı yedekleyip kopyalayın, test edin ve Nginx'i yeniden yükleyin:

```bash
sudo cp -p /etc/nginx/sites-available/lens-atoker /etc/nginx/lens-atoker.bak-$(date +%Y%m%d) 2>/dev/null || true
sudo cp /var/www/lens-blog/nginx.conf /etc/nginx/sites-available/lens-atoker
sudo ln -sf /etc/nginx/sites-available/lens-atoker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Sertifika yenilemesi `certbot.timer` ile otomatik yapılır (`sudo certbot renew --dry-run` ile test edebilirsiniz).

---

## 🛠️ 4. Parola Sıfırlama ve Yedekleme

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
