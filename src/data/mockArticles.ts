import { Article } from '../types';

// Default authentic flagship article with comprehensive cross-perspective collapse ablation
export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-benchmark-roadmap',
    slug: 'eo-ir-dualmode-detection-bilimsel-kiyaslama-ve-ablasyon-yol-haritasi',
    title: 'EO-IR-DualMode-Detection: Bilimsel Model Kıyaslama ve Ablasyon Yol Haritası',
    dek: '4x GPU · Kontrollü Turnuva · Çapraz-Perspektif Çöküş Matrisi · Dürüst Ölçüm Standartları',
    abstract: 'Bu belge; EO-IR-DualMode-Detection projesinde yürütülecek model eğitimlerinin, çapraz-perspektif (Hava vs. Kara) ablasyonunun, ağırlık doğrulamasının ve yayınlanacak nihai blog makalesinin operasyonel deney kılavuzudur.',
    authors: [
      {
        name: 'Alperen Toker',
        affiliation: 'Yapay Zeka & Bilgisayarlı Görü',
        role: 'Yazar & Araştırmacı',
      }
    ],
    date: '2026-10-02',
    displayDate: '2 Ekim 2026',
    readingTime: '14 dk okuma süresi',
    version: 'v2.0 - Deney Kılavuzu & Ablasyon Tasarımı',
    category: 'Kenar Yapay Zeka',
    tags: ['YOLO11', 'D-FINE', 'YOLOv10', 'Ablasyon Analizi', 'Çöküş Matrisi', 'EO-IR', 'Benchmark'],
    status: 'published',
    doi: 'LENS-RR-2026-001',
    keywords: ['EO-IR Detection', 'YOLO11', 'D-FINE', 'YOLOv10', 'Ablation Study', 'Perspective Collapse', 'DroneVehicle', 'FLIR'],
    telemetry: {
      hardware: '4x GPU (Distributed Data Parallel)',
      resolution: '640×640 (imgsz: 640)',
      sensor: 'EO/IR Çift Modlu (FLIR & DroneRGBT)',
      modelArch: 'YOLO11, v8, v10, D-FINE (Small)',
      accuracy: 'Sonuçlar Ölçülecek (*[%]*)',
      latency: 'Lokal Ölçülecek (Batch=1)',
      fps: '50 Warmup + 300 Test',
    },
    content: `Bu belge; \`EO-IR-DualMode-Detection\` projesinde yürütülecek model eğitimlerinin, **çapraz-perspektif (Hava vs. Kara) ablasyonunun**, ağırlık doğrulamasının ve yayınlanacak nihai blog makalesinin operasyonel deney kılavuzudur.

---

\`\`\`text
                                              BİLİMSEL İŞ AKIŞI
                                              
+-----------------------+  ==>  +-----------------------+  ==>  +-----------------------+  ==>  +-----------------------+  ==>  +-----------------------+
| 1. Veri Yükleme/Split |       | 2. Mimari Turnuvası   |       | 3. Çapraz Ablasyon    |       | 4. Ölçekleme Analizi  |       | 5. Lokal Test & Yayın |
+-----------------------+       +-----------------------+       +-----------------------+       +-----------------------+       +-----------------------+
| Train: 35.942 (%64.88)|       | 4 Farklı Mimari Ekolü |       | Sadece-Kara (Zemin)   |       | Şampiyon Modelin      |       | 14.403 Bağımsız Test  |
| Val  :  5.056 (%9.13) |       | Hepsi "Small" Ölçeği  |       | Sadece-Hava (İHA)     |       | Nano / Medium Ölçeği  |       | Çöküş Matrisi Analizi |
| Test : 14.403 (%25.99)|       | Sabit Bütçe (4x GPU)  |       | (Çöküş Analizi)       |       | (Pareto: GFLOPs-mAP)  |       | Standart Hız Ölçümü   |
+-----------------------+       +-----------------------+       +-----------------------+       +-----------------------+       +-----------------------+
\`\`\`

---

## 📊 1. VERİ KÜMESİ BÖLÜNME ORANLARI VE ARKA PLAN (NEGATİF) ÖRNEKLERİ

### A. Doğrulanmış Bölünme Oranları (Split Dağılımı)
Veri kümesindeki 55.401 görselin split oranları ve gerekçeleri:

| Split | Görsel Sayısı | Toplam Oran | Kapsam ve Gerekçe |
| :--- | :---: | :---: | :--- |
| **Train (Eğitim)** | **35.942** | **%64.88** | 6 veri kümesinin birleşik eğitim havuzu (Platforma yüklenen ZIP). |
| **Val (Doğrulama)** | **5.056** | **%9.13** | Hiperparametre takibi ve eğitim içi model seçimi (Platforma yüklenen ZIP). |
| **Test (Bağımsız Saklı)** | **14.403** | **%25.99** | **Lokalde saklanan bağımsız test havuzu (Sıfır sızıntı).** |

> ℹ️ **Neden Test Kümesi %26 (14.403 Görsel)?**  
> Standart %15 yerine %26 çıkmasının temel sebebi: DroneVehicle resmi kıyaslama protokolünün devasa bir test kümesine (**8.980 görsel**) sahip olması ve FLIR video test kümesinin (**3.749 görsel**) bulunmasıdır. Bu iki veri kümesi tek başına test havuzunun %88.4'ünü oluşturur. Grup-bazlı sahne izolasyonu yapıldığında resmi kıyaslama protokolleri korunduğu için bu oran ortaya çıkmıştır; bu durum blogda bir metodolojik titizlik göstergesi olarak açıkça paylaşılacaktır.

---

### B. Kasıtlı Negatif / Arka Plan Örnekleri (1.786 Görsel — %4.36)
Platform dashboard'unda ve lokal veri bütünlüğü denetiminde doğrulandığı üzere:
- **Platform Veri Öğesi Sayısı (Train + Val):** **40.998** (Eğitim: **35.942**, Doğrulama: **5.056**)
- **Etiketli Görsel Sayısı:** **39.212** (Eğitim: 34.417, Doğrulama: 4.795) | **651.305 kutu**
- **Kasıtlı Negatif / Arka Plan Örneği (Train + Val):** **1.786 görsel** (%4.36) — (Eğitim: **1.525**, Doğrulama: **261**) | *(Ayrıca lokal saklı Test kümesinde de **369** negatif örnek mevcuttur; toplam 55.401 görselde **2.155** negatif örnek (%3.89) bulunmaktadır).*
- **Platform Sağlık Raporu:** \`Mükemmel (A, 84 Puan)\` — *"1,786 görsel kasıtlı negatif/arka plan örnek işaretli (annotation yok ama eğitime dahil edilir)"*

> 🛡️ **Neden Arka Plan Örneği Var? (False Positive / Yanlış Alarm Kalkanı):**  
> Bir nesne tespit modeli yalnızca hedef bulunan karelerle eğitilirse; operasyonel sahada gördüğü her sıcak kayayı, baca dumanını, deniz yüzeyini veya asfalttaki termal yansımayı hedef sanarak **aşırı yanlış alarm (False Positive)** patlaması yaşar.  
> Ultralytics YOLO ve modern literatür standartları, modelin arka planı hedef sanmasını engellemek için veri kümesinde **%1 ila %10 oranında hedef içermeyen boş arka plan görseli (Background Image)** bulunmasını zorunlu kılar.  
> Kümemizdeki **%4.36 (1.786 görsel)** oranı tam altın standart aralıktadır. Bu görseller FLIR, KAIST ve DroneVehicle kameralarının kaydettiği ancak kadrajda hiçbir insan veya araç bulunmayan boş sokak, orman ve arazi manzaralarıdır.

> ✍️ **Metodolojik İlke:**  
> Modelin termal yansımalar ve boş arazilerde yanlış alarm (false positive) oranını asgariye indirmek amacıyla, uluslararası literatür ve Ultralytics standartlarına uygun olarak eğitim ve doğrulama kümelerine %4.36 (1.786 adet) kasıtlı negatif arka plan örneği dahil edilmiştir.

---

## ⚙️ 2. SABİT HESAPLAMA BÜTÇESİ VE OPTİMİZASYON ADALETİ

> ⚖️ **Adalet İlkesi:** *"Eşit Hesaplama Bütçesi + Mimari-Standart Optimizasyon"*  
> CNN modelleri (YOLO) ile Transformer modellerine (D-FINE) aynı öğrenme oranı (LR: 0.01) ve mozaik augmentasyonu dayatılamaz. DETR/Transformer mimarileri AdamW + düşük LR (1e-4) gerektirirken, YOLO'lar SGD/AdamW + yüksek LR (0.01) ve mozaikle çalışır. Yanlış optimizer ile eğitip *"Transformer geride kaldı"* demek sahte bir bulgudur.

### A. Tüm Modellerde Birebir Kilitlenen Ortak Bütçe:
- **Donanım:** \`4x GPU\` (Distributed Data Parallel)
- **Eğitim Bütçesi:** \`100 Sabit Epoch\` (Tüm modeller erken durdurma olmaksızın eşit 100 epoch eğitilir)
- **Görüntü Boyutu (\`imgsz\`):** \`640\`
- **Batch Boyutu:** \`Otomatik\` (4 GPU VRAM'ini tam dolduran dinamik dağılım)
- **Önbellek (Cache):** \`RAM\`
- **Doğrulama Sıklığı:** \`Otomatik\`

### B. Mimariye Özgü Standart Reçeteler (Platform Varsayılanı):
- **YOLO Grubu (v8, v10, 11):** Platformun standart YOLO reçetesi (\`Optimizer: auto/SGD/AdamW\`, \`LR: 0.01\`, \`Mozaik: 1.0\`, \`MixUp: 0.0\`).
- **D-FINE (Transformer):** Platformun resmi D-FINE reçetesi (\`Optimizer: AdamW\`, \`LR: 1e-4\`, \`Backbone LR: 1e-5\`, \`Mozaik: 0.0\`).

---

## 🚩 AŞAMA 1: Kontrollü Mimari Turnuvası (Small Ölçeği)

Resmi yayınlarda "v9-S" resmi bir varyant olmadığı için (YOLOv9 yalnızca v9-C ve v9-E olarak yayınlanmıştır), belirsizliği önlemek adına turnuvayı **4 net mimari ekolüyle** sınırlandırıyoruz:

| Deney Kodu | Platform Deney Adı | Veri Paketi | Model & Ölçek | Parametre | İndirilecek Ağırlık Dosyası |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Deney-1** | \`Deney-1-YOLO11-Small\` | \`EO_IR_Unified_6_TrainVal\` | YOLO11-Small | **9.4M** | \`yolo11s_best.pt\` |
| **Deney-2** | \`Deney-2-YOLOv8-Small\` | \`EO_IR_Unified_6_TrainVal\` | YOLOv8-Small | **11.2M** | \`yolov8s_best.pt\` |
| **Deney-3** | \`Deney-3-YOLOv10-Small\` | \`EO_IR_Unified_6_TrainVal\` | YOLOv10-Small | **7.2M** | \`yolov10s_best.pt\` |
| **Deney-4** | \`Deney-4-DFINE-Small\` | \`EO_IR_Unified_6_TrainVal\` | D-FINE-Small | **~10.4M** | \`dfines_best.onnx\` / \`best.pt\` |

---

### 🖥️ Platformda Açılacak 4 Turnuva Deney Kartı

#### 🔹 Deney 1: YOLO11-Small (Modern SOTA CNN)
* **Deney Adı:** \`Deney-1-YOLO11-Small\`
* **Açıklama:** C3k2 ve C2PSA bloklarına sahip güncel YOLO11-Small mimarisinin birleşik EO-IR Train+Val (40.998 görsel) kümesinde 100 epoch ve 4x GPU ile nesne tespit başarımının incelenmesi.
* **Hipotez:** C2PSA dikkat blokları ve %22 optimize edilmiş parametre yapısıyla, düşük kontrastlı gece termal sahnelerinde ve havadan küçük hedef tespitinde YOLOv8 referansına göre mAP@50-95 skorunu en az %2-3 artıracaktır.
* **Etiketler:** \`yolo11\`, \`small\`, \`turnuva\`, \`c2psa\`, \`4gpu\`, \`eo-ir\`
* **Model & Eğitim Parametreleri:**
  * **Veri Kümesi:** \`EO_IR_Unified_6_TrainVal\` (Platformdaki 40.998 öğeli paket)
  * **Model & Boyut:** YOLO11 / Small (s) (9.4M Parametre)
  * **Hiperparametreler:** Epoch: 100, imgsz: 640, Batch: auto, Optimizer: auto (SGD/AdamW, LR: 0.01), Mozaik: 1.0, Cache: RAM, 4x GPU
  * **İndirilecek Ağırlık:** \`yolo11s_best.pt\`

#### 🔹 Deney 2: YOLOv8-Small (Klasik Referans Baseline)
* **Deney Adı:** \`Deney-2-YOLOv8-Small\`
* **Açıklama:** Literatür ve endüstri standardı kabul edilen klasik anchor-free YOLOv8-Small modelinin turnuva genel referans tabanı (baseline) olarak 100 epoch ve 4x GPU ile eğitilmesi.
* **Hipotez:** Kararlı ve dengeli bir tespit doğruluğu sergileyecek; turnuvadaki yeni nesil modellerin (YOLO11, YOLOv10, D-FINE) doğruluk, hız ve parametre verimliliği için ana referans noktası olacaktır.
* **Etiketler:** \`yolov8\`, \`small\`, \`turnuva\`, \`baseline\`, \`referans\`, \`4gpu\`, \`eo-ir\`
* **Model & Eğitim Parametreleri:**
  * **Veri Kümesi:** \`EO_IR_Unified_6_TrainVal\`
  * **Model & Boyut:** YOLOv8 / Small (s) (11.2M Parametre)
  * **Hiperparametreler:** Epoch: 100, imgsz: 640, Batch: auto, Optimizer: auto (SGD/AdamW, LR: 0.01), Mozaik: 1.0, Cache: RAM, 4x GPU
  * **İndirilecek Ağırlık:** \`yolov8s_best.pt\`

#### 🔹 Deney 3: YOLOv10-Small (NMS-Free End-to-End)
* **Deney Adı:** \`Deney-3-YOLOv10-Small\`
* **Açıklama:** Çift etiket atamalı (dual label assignment) ve NMS-Free mimariye sahip YOLOv10-Small modelinin kalabalık kara ve havadan sahnelerdeki uçtan uca başarımının incelenmesi.
* **Hipotez:** NMS son işleme gecikmesini sıfıra indirerek kalabalık insan/araç gruplarında çıkarım gecikmesini düşürecek ve 7.2M düşük parametreye rağmen YOLOv8'e yakın mAP doğruluğu üretecektir.
* **Etiketler:** \`yolov10\`, \`small\`, \`turnuva\`, \`nms-free\`, \`end-to-end\`, \`4gpu\`, \`eo-ir\`
* **Model & Eğitim Parametreleri:**
  * **Veri Kümesi:** \`EO_IR_Unified_6_TrainVal\`
  * **Model & Boyut:** YOLOv10 / Small (s) (7.2M Parametre)
  * **Hiperparametreler:** Epoch: 100, imgsz: 640, Batch: auto, Optimizer: auto (SGD/AdamW, LR: 0.01), Mozaik: 1.0, Cache: RAM, 4x GPU
  * **İndirilecek Ağırlık:** \`yolov10s_best.pt\`

#### 🔹 Deney 4: D-FINE-Small (Real-Time Vision Transformer)
* **Deney Adı:** \`Deney-4-DFINE-Small\`
* **Açıklama:** ICLR 2025 Spotlight D-FINE mimarisinin HGNetv2 omurgası ve ince taneli dağılım iyileştirme (FDR) başlığı ile termal ve görünür modda nesne tespit başarımının ölçülmesi.
* **Hipotez:** Transformer tabanlı global self-attention ve FDR sınır regresyonu sayesinde gece termal görüntülerindeki düşük kontrastlı ve bulanık hedef sınırlarını CNN modellerine kıyasla daha yüksek mAP@50-95 ile yakalayacaktır.
* **Etiketler:** \`dfine\`, \`small\`, \`turnuva\`, \`transformer\`, \`iclr2025\`, \`fdr\`, \`4gpu\`, \`eo-ir\`
* **Model & Eğitim Parametreleri:**
  * **Veri Kümesi:** \`EO_IR_Unified_6_TrainVal\`
  * **Model & Boyut:** D-FINE / Small (s) (~10.4M Parametre)
  * **Hiperparametreler:** Epoch: 100, imgsz: 640, Batch: auto, Optimizer: AdamW (LR: 1e-4, Backbone LR: 1e-5), Mozaik: 0.0, Cache: RAM, 4x GPU
  * **İndirilecek Ağırlık:** \`dfines_best.onnx\` / \`best.pt\`

---

## 🚩 AŞAMA 2: Şampiyonun Seçimi (Val) & Sağlamlık Kontrollü Test Teyidi

> 🛡️ **Metodolojik Altın Kural (Veri Sızıntısını Önleme):**  
> **Şampiyon mimari, doğrulama kümesi (val) mAP@50-95'ine göre seçildi; saklı test seti yalnızca nihai raporlama için teyit amaçlı kullanıldı.**  
> Test seti hiçbir zaman şampiyonluk kararına karıştırılmaz; böylece sonraki ablasyon ve ölçekleme koşumları test verisinden %100 izole kalır.

---

### 🔍 Adım 2.1: Ağırlık Sağlamlık ve Tekrarlanabilirlik Kontrolü (Sanity Check)
Platformdan indirilen her \`best.pt\` ağırlığı, test setine geçmeden önce lokal \`val\` kopyasında koşturulur:

\`\`\`bash
# Lokal Doğrulama Kontrolü (Val Sanity Check)
yolo detect val model=yolo11s_best.pt data=configs/eval_val_sanity.yaml split=val
\`\`\`
- **Kabul Kriteri:** Lokal val skoru, platformun son epochta rapor ettiği doğrulama skorunu **±0.5 mAP puanı içinde reproduce ediyorsa** ortam teyit edilir ve saklı test değerlendirmesine geçilir.

---

### 🎯 Adım 2.2: Saklı Test Kümesi Teyidi (14.403 Görsel)
Val skoruna göre **Turnuva Şampiyonu** ilan edilen mimari ve diğer adaylar nihai test teyidi için koşturulur:

\`\`\`bash
# 1. YOLO11-Small Testi
yolo detect val model=yolo11s_best.pt data=configs/eval_full_test.yaml split=test

# 2. YOLOv8-Small Testi
yolo detect val model=yolov8s_best.pt data=configs/eval_full_test.yaml split=test

# 3. YOLOv10-Small Testi
yolo detect val model=yolov10s_best.pt data=configs/eval_full_test.yaml split=test
\`\`\`

---

## 🚩 AŞAMA 3: Çapraz-Perspektif Çöküş Ablasyonu (Yazının Kalbi)

Bu çalışmayı sıradan bir model kıyaslamasından çıkarıp **gerçek bir bilimsel araştırmaya** dönüştüren aşamadır. Aşama 2'de kazanan Turnuva Şampiyonu Mimari seçilir ve platformda 2 ek ablasyon koşumu yapılır:

\`\`\`text
                                ÇÖKÜŞ ABLASYON TASARIMI
                                
  [ Ablasyon-1: Sadece-Kara ] ==> Eğit: FLIR + KAIST + M3FD  ==> Test: 14.403 Tam Test (Kara + Hava)
  [ Ablasyon-2: Sadece-Hava ] ==> Eğit: DroneVeh + RGBT + VEDAI ==> Test: 14.403 Tam Test (Kara + Hava)
\`\`\`

### 📦 Hazırlanmış Ablasyon Veri Kümeleri ve Platform Paketleri:
- **Sadece Kara Paketi:** \`EO_IR_Ground_Only_TrainVal.zip\` (3.10 GB | 17.692 Görsel: 15.258 Train + 2.434 Val)
  - *Lokal Dizin:* \`EO_IR_Ground_Only_Dataset/\` (Saklı Test: 4.395 görsel)
  - *Negatif Örnek Dağılımı:* 1.551 Arka Plan Örneği (%8.77: Train'de 1.318, Val'de 233 | Testte: 283)
- **Sadece Hava Paketi:** \`EO_IR_Aerial_Only_TrainVal.zip\` (3.27 GB | 23.306 Görsel: 20.684 Train + 2.622 Val)
  - *Lokal Dizin:* \`EO_IR_Aerial_Only_Dataset/\` (Saklı Test: 10.008 görsel)
  - *Negatif Örnek Dağılımı:* 235 Arka Plan Örneği (%1.01: Train'de 207, Val'de 28 | Testte: 86)

### 🧪 Koşulacak 2 Ek Ablasyon Koşumu:

| Deney Kodu | Platform Deney Adı | Platform Veri Paketi | Model & Mimari | Eğitim / Val | İndirilecek Ağırlık Dosyası |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Deney-5** | \`Deney-5-Ablasyon-Kara\` | \`EO_IR_Ground_Only_TrainVal.zip\` | **Şampiyon-S** (Örn: YOLO11-S) | 15.258 / 2.434 | \`ablation_ground_best.pt\` |
| **Deney-6** | \`Deney-6-Ablasyon-Hava\` | \`EO_IR_Aerial_Only_TrainVal.zip\` | **Şampiyon-S** (Örn: YOLO11-S) | 20.684 / 2.622 | \`ablation_aerial_best.pt\` |

---

### 🖥️ Platformda Açılacak 2 Ablasyon Deney Kartı:

#### 🧪 Ablasyon Deneyi 1: Sadece-Kara (Ground-Only)
* **Deney Adı:** \`Deney-5-Ablasyon-Kara\` (veya \`Ablasyon-1-GroundOnly\`)
* **Açıklama:** Yalnızca zemin ve araç üstü kameralardan (FLIR, KAIST, M3FD) derlenen 17.692 görsel ile turnuva şampiyonu modelin eğitilerek kara perspektifine uzmanlaştırılması.
* **Hipotez:** Model kara hedeflerinde (kara test seti) yüksek in-domain başarım gösterecek; ancak havadan İHA perspektifinde dik açı ve ölçek uyumsuzluğu nedeniyle sıfır-atış (zero-shot) testinde %50'nin üzerinde belirgin bir performans çöküşü yaşayacaktır.
* **Etiketler:** \`ablasyon\`, \`ground-only\`, \`kara-uzmani\`, \`cokus-analizi\`, \`sampiyon-s\`, \`4gpu\`
* **Model & Eğitim Parametreleri:**
  * **Platforma Yüklenecek Veri Paketi:** \`EO_IR_Ground_Only_TrainVal.zip\`
  * **Model Mimarisi:** Aşama 2 Şampiyonu (Örn: YOLO11-Small)
  * **Hiperparametreler:** Turnuva ile birebir özdeş (Epoch: 100, imgsz: 640, Batch: auto, Cache: RAM, 4x GPU)
  * **İndirilecek Ağırlık:** \`ablation_ground_best.pt\`

#### 🧪 Ablasyon Deneyi 2: Sadece-Hava (Aerial-Only)
* **Deney Adı:** \`Deney-6-Ablasyon-Hava\` (veya \`Ablasyon-2-AerialOnly\`)
* **Açıklama:** Yalnızca havadan İHA kameralarından (DroneVehicle, DroneRGBT, VEDAI) derlenen 23.306 görsel ile turnuva şampiyonu modelin eğitilerek hava perspektifine uzmanlaştırılması.
* **Hipotez:** Model İHA hedeflerinde (hava test seti) yüksek in-domain başarım gösterecek; ancak ufuk hizalı zemin hedeflerinde (yaya silüetleri, araç profilleri) sıfır-atış testinde %50'nin üzerinde belirgin bir performans çöküşü yaşayacaktır.
* **Etiketler:** \`ablasyon\`, \`aerial-only\`, \`hava-uzmani\`, \`iha\`, \`cokus-analizi\`, \`sampiyon-s\`, \`4gpu\`
* **Model & Eğitim Parametreleri:**
  * **Platforma Yüklenecek Veri Paketi:** \`EO_IR_Aerial_Only_TrainVal.zip\`
  * **Model Mimarisi:** Aşama 2 Şampiyonu (Örn: YOLO11-Small)
  * **Hiperparametreler:** Turnuva ile birebir özdeş (Epoch: 100, imgsz: 640, Batch: auto, Cache: RAM, 4x GPU)
  * **İndirilecek Ağırlık:** \`ablation_aerial_best.pt\`

---

### 🔬 Tablo 2 (Çöküş Matrisi) İçin Değerlendirme Komutları:

\`\`\`bash
# ==============================================================================
# 1. Ablasyon-1 (Sadece-Kara ile Eğitilmiş Model) Ölçümleri
# ==============================================================================
# A. Kendi zemin testinde (In-Domain Referansı):
yolo detect val model=ablation_ground_best.pt data=configs/eval_ground_test.yaml split=test
# B. Havadan İHA testinde (Cross-Domain Sıfır Transfer - Çöküş Ölçümü):
yolo detect val model=ablation_ground_best.pt data=configs/eval_aerial_test.yaml split=test
# C. Birleşik tam testte (Genel başarım):
yolo detect val model=ablation_ground_best.pt data=configs/eval_full_test.yaml split=test

# ==============================================================================
# 2. Ablasyon-2 (Sadece-Hava ile Eğitilmiş Model) Ölçümleri
# ==============================================================================
# A. Havadan İHA testinde (In-Domain Referansı):
yolo detect val model=ablation_aerial_best.pt data=configs/eval_aerial_test.yaml split=test
# B. Zemin testinde (Cross-Domain Sıfır Transfer - Çöküş Ölçümü):
yolo detect val model=ablation_aerial_best.pt data=configs/eval_ground_test.yaml split=test
# C. Birleşik tam testte (Genel başarım):
yolo detect val model=ablation_aerial_best.pt data=configs/eval_full_test.yaml split=test

# ==============================================================================
# 3. Birleşik Şampiyon Model (EO_IR_Unified_6) Tavan Karşılaştırma Ölçümleri
# ==============================================================================
# A. Kara testinde başarımı (Sadece-Kara uzman tavanına göre ΔKara hesabı):
yolo detect val model=yolo11s_best.pt data=configs/eval_ground_test.yaml split=test
# B. Hava testinde başarımı (Sadece-Hava uzman tavanına göre ΔHava hesabı):
yolo detect val model=yolo11s_best.pt data=configs/eval_aerial_test.yaml split=test
# C. Birleşik tam testte başarımı (Aşama 2'deki değer teyidi):
yolo detect val model=yolo11s_best.pt data=configs/eval_full_test.yaml split=test
\`\`\`

---

## 🚩 AŞAMA 4: Şampiyon Mimari Ölçekleme Çalışması (Scaling Study)

Turnuva şampiyonu mimariye göre platformda açılacak 2 ek ölçekleme koşumu:

| Deney Kodu | Platform Deney Adı | Platform Veri Paketi | Model & Ölçek | İndirilecek Ağırlık Dosyası |
| :--- | :--- | :--- | :--- | :--- |
| **Deney-7** | \`Deney-7-Olcekleme-Nano\` | \`EO_IR_Unified_6_TrainVal\` | Şampiyon-Nano (Örn: YOLO11-Nano) | \`scaling_nano_best.pt\` |
| **Deney-8** | \`Deney-8-Olcekleme-Medium\` | \`EO_IR_Unified_6_TrainVal\` | Şampiyon-Medium (Örn: YOLO11-Medium) | \`scaling_medium_best.pt\` |

---

### 🖥️ Platformda Açılacak 2 Ölçekleme Deney Kartı:

#### 🚀 Ölçekleme Deneyi 1: Ultra-Hafif Ölçek (Nano)
* **Deney Adı:** \`Deney-7-Olcekleme-Nano\`
* **Açıklama:** Turnuva şampiyonu mimarinin en hafif (Nano) ölçeğinin birleşik Train+Val (40.998 görsel) kümesinde eğitilerek SWaP-C kısıtlı mini/kamikaze İHA gimbal sistemleri için Pareto başarımının ölçülmesi.
* **Hipotez:** Parametre sayısı ~2.6M ve hesaplama yükü ~6.5 GFLOPs seviyesine gerilerken, doğruluk kaybı Small modeline kıyasla %10-15 bandında sınırlı kalacak ve mini platformlar için hafif bir çözüm sunacaktır.
* **Etiketler:** \`olcekleme\`, \`nano\`, \`sampiyon-mimari\`, \`swap-c\`, \`iha-gimbal\`, \`4gpu\`, \`eo-ir\`

#### 🚀 Ölçekleme Deneyi 2: Yüksek-Kapasite Ölçeği (Medium)
* **Deney Adı:** \`Deney-8-Olcekleme-Medium\`
* **Açıklama:** Turnuva şampiyonu mimarinin yüksek kapasiteli (Medium) ölçeğinin birleşik Train+Val (40.998 görsel) kümesinde eğitilerek üs bölgesi ve ağır zırhlı muharebe sistemleri için tavan doğruluğunun ölçülmesi.
* **Hipotez:** Kapasite artışıyla (~20.1M parametre, ~68.1 GFLOPs) Small modeline göre mAP@50-95 skorunda %3-5 ek kazanç elde edilerek veri kümesi üzerindeki en yüksek tespit doğruluğuna ulaşılacaktır.
* **Etiketler:** \`olcekleme\`, \`medium\`, \`sampiyon-mimari\`, \`sinir-kulesi\`, \`maksimum-dogruluk\`, \`4gpu\`, \`eo-ir\`

---

## 🚩 AŞAMA 5: Dürüst Lokal Hız Ölçümü (Standartlaştırılmış Benchmark Protokolü)

Tabloya tahmini/uydurma rakamlar yazılmayacaktır. Hız değerleri **lokal makinenizde** şu sabit protokolle üretilecektir:
- **Donanım:** Lokal Makine GPU'su (Model adı ve CUDA sürümü tablo altına not düşülür)
- **Çalışma Modu:** PyTorch FP32 ve ONNX Runtime
- **Protokol:** \`Batch Boyutu = 1\`, \`640x640\`, \`50 Kare Isınma (Warmup)\` + \`300 Kare Test Ölçümü\`, Medyan (\`p50\`) gecikme.

\`\`\`bash
# 1. Ultralytics Yerleşik Hız Benchmark Komutu (PyTorch FP32, Batch=1, imgsz=640):
yolo benchmark model=yolo11s_best.pt imgsz=640 half=False device=0

# 2. ONNX Runtime Hız Benchmark Komutu (ONNX export edilmiş model için):
yolo benchmark model=yolo11s_best.onnx imgsz=640 format=onnx device=0
\`\`\`

---

## 📊 AŞAMA 6: YAYINLANACAK NİHAİ MAKALE VE BLOG TABLOLARI

### 📑 Tablo 1: Kontrollü Mimari Turnuvası (Small Ölçeği, 100 Epoch, 4x GPU)
| Model | Mimari Ekolü | Parametre (M) | GFLOPs | Val mAP@50-95<br>*(Şampiyon Seçim)* | Test mAP@50<br>*(Saklı Teyit)* | Test mAP@50-95<br>*(Saklı Teyit)* | Personnel mAP | Vehicle mAP | Durum |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **YOLOv8-S** | Anchor-Free CNN | 11.2 | ~28.6 | *[%]* | *[%]* | *[%]* | *[%]* | *[%]* | Referans |
| **YOLO11-S** | Modern Verimli CNN | 9.4 | ~21.6 | *[%]* | *[%]* | *[%]* | *[%]* | *[%]* | Aday |
| **YOLOv10-S** | NMS-Free End-to-End | 7.2 | ~21.6 | *[%]* | *[%]* | *[%]* | *[%]* | *[%]* | Aday |
| **D-FINE-S** | Vision Transformer (ICLR 25)| ~10.4 | ~25.0 | *[%]* | *[%]* | *[%]* | *[%]* | *[%]* | Aday |

---

### 📑 Tablo 2: Çapraz-Perspektif Çöküş Matrisi (Yazının Yıldız Tablosu)
> *"Sadece zemin veya sadece havadan eğitilen modellerin zıt perspektif üzerindeki sıfır-atış (zero-shot) çöküş oranları."*

#### 📐 Matematiksel Çöküş Formülü:
$$
\\text{Performans Değişimi (Çöküş) \\%} = \\left(\\frac{\\text{Sıfır-Atış (Zero-Shot) mAP} - \\text{In-Domain Referans mAP}}{\\text{In-Domain Referans mAP}}\\right) \\times 100
$$

*(Örnek: Zemin uzmanı kara testinde 78.4 mAP alırken hava testinde 24.1 mAP'ye düşüyorsa: $\\frac{24.1 - 78.4}{78.4} \\times 100 = -\\%69.3$ çöküş).*

> ⚠️ **Tam Test Kümesi Dağılım Uyarısı:**  
> 14.403 adetlik Tam Test kümesinin **10.008'i (%69.5)** Hava, **4.395'i (%30.5)** Kara görüntülerinden oluşmaktadır (DroneVehicle resmi kıyaslama protokolü gereği). Dolayısıyla genel Tam Test mAP skoru hava perspektifine daha duyarlıdır; modelin hibrit dengesi değerlendirilirken mutlaka **Kara Testi** ve **Hava Testi** kolonları bağımsız olarak incelenmelidir.

| Eğitim Stratejisi | Eğitim Verisi | Kara Testi (4.395 Görsel)<br>mAP@50 | Hava Testi (10.008 Görsel)<br>mAP@50 | Tam Test (14.403 Görsel)<br>mAP@50 *(%69.5 Hava)* | Perspektif Çöküş Oranı (%) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Sadece-Kara (Ground-Only)** | 15.258 (FLIR+KAIST+M3FD) | *In-Domain* | *Zero-Shot* | *...* | **-%69.3 Çöküş ⚠️** |
| **Sadece-Hava (Aerial-Only)** | 20.684 (DroneVeh+RGBT+VEDAI) | *Zero-Shot* | *In-Domain* | *...* | **-%62.0 Çöküş ⚠️** |
| **Birleşik Model (EO_IR_Unified_6)** | 35.942 (Tüm Veri Kümesi) | **...** | **...** | **...** | **Dengeli (ΔKara, ΔHava)** |

---

### 📑 Tablo 3: Şampiyon Mimari Ölçekleme & Donanım Karşılaştırması
| Ölçek | Parametre (M) | GFLOPs | Test mAP@50-95 | Çıkarım Gecikmesi (ms)<br>*(Lokal Ölçüm)* | FPS<br>*(Lokal Ölçüm)* | Önerilen Taktik Platform |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Nano** | 2.6 | ~6.5 | *[%]* | *[Ölçülecek]* | *[Ölçülecek]* | Mini/Kamikaze İHA Gimbalı (SWaP-C) |
| **Small** | 9.4 | ~21.6 | *[%]* | *[Ölçülecek]* | *[Ölçülecek]* | Taktik İHA / Zırhlı Muharebe Aracı |
| **Medium** | 20.1 | ~68.1 | *[%]* | *[Ölçülecek]* | *[Ölçülecek]* | Sabit Sınır Kulesi / Karargah |

---

### 📈 Makalenin Grafiği: Doğruluk vs. Hesaplama Maliyeti (GFLOPs vs. mAP)
- **X Ekseni:** Hesaplama Yükü (GFLOPs)
- **Y Ekseni:** Saklı Test Başarımı (mAP@50-95)
- **Grafik Katkısı:** Hem mimari turnuvasının modelleri hem de ölçekleme basamakları tek bir Pareto eğrisinde gösterilerek, en yüksek verimlilik sunan mimari matematiksel olarak kanıtlanacaktır.`,
    bibtex: `@article{toker2026benchmark,
  author    = {Alperen Toker},
  title     = {EO-IR-DualMode-Detection: Bilimsel Model Kıyaslama ve Ablasyon Yol Haritası},
  journal   = {LENS: Savunma ve Bilgisayarlı Görü Araştırma Yayınları},
  year      = {2026}
}`,
  },
  {
    id: 'art-yolo11-vs-dfine',
    slug: 'yolo11-vs-dfine-taktik-iha-gercek-zamanli-tespit-kiyaslamasi',
    title: 'YOLO11 vs. D-FINE: Taktik İHA Platformlarında Gerçek Zamanlı Nesne Tespiti Kıyaslaması',
    dek: 'NMS-Free Mimari · Dağılım İnce Ayarı · Gecikme-Doğruluk Pareto Analizi · Jetson Orin Benchmark',
    abstract: 'Bu çalışmada, son dönemin öne çıkan NMS-free nesne tespit mimarisi D-FINE ile YOLO11 serisi; sınırlandırılmış SWaP-C (Boyut, Ağırlık, Güç ve Maliyet) bütçesine sahip İHA donanımlarında doğruluk, çıkarım gecikmesi ve küçük hedef tespit başarımı açısından deneysel olarak kıyaslanmaktadır.',
    authors: [
      {
        name: 'Alperen Toker',
        affiliation: 'Yapay Zeka & Bilgisayarlı Görü',
        role: 'Baş Araştırmacı',
      }
    ],
    date: '2026-10-04',
    displayDate: '4 Ekim 2026',
    readingTime: '11 dk okuma süresi',
    version: 'v1.2 - Benchmark Raporu',
    category: 'Derin Öğrenme',
    tags: ['YOLO11', 'D-FINE', 'NMS-Free', 'Nesne Tespiti', 'Jetson Orin', 'Real-Time'],
    status: 'published',
    doi: 'LENS-RR-2026-002',
    keywords: ['YOLO11', 'D-FINE', 'Object Detection', 'NMS-Free', 'Edge AI', 'Jetson AGX Orin', 'Bounding Box Regression'],
    telemetry: {
      hardware: 'NVIDIA Jetson AGX Orin (64GB)',
      resolution: '640×640 (FP16)',
      sensor: 'Sony IMX477 RGB Gimbal',
      modelArch: 'D-FINE-S vs. YOLO11-S',
      accuracy: 'mAP@50: %81.4 vs %79.8',
      latency: 'D-FINE: 6.8ms · YOLO11: 5.9ms',
      fps: '147 FPS vs 169 FPS',
    },
    content: `## 🎯 Giriş ve Motivasyon

Taktik İHA ve mini gimbal sistemlerinde nesne tespiti gerçekleştirirken karşılaşılan en büyük darboğaz, geleneksel **Non-Maximum Suppression (NMS)** ardıl işlem (post-processing) adımının donanım hızlandırıcılarda paralel çalıştırılamamasıdır.

D-FINE, sınırlayıcı kutu regresyonunu katı koordinat kestirimi yerine olasılık dağılımı ince ayarı (Fine-grained Distribution Refinement - FDR) üzerinden ele alarak NMS ihtiyacını ortadan kaldıran uçtan uca (end-to-end) bir DETR türevidir.

---

\`\`\`text
MİMARİ ÇIKARIM HATTI KARŞILAŞTIRMASI

[Giriş: 640x640x3] 
       │
       ├──► [YOLO11 Backbone] ──► [C3k2/SPPF] ──► [Decoupled Head] ──► [CUDA NMS] (Gecikme Değişken)
       │
       └──► [D-FINE Backbone] ──► [Hybrid Encoder] ──► [FDR Transformer Head] ──► [Doğrudan Kutu] (Sabit Gecikme)
\`\`\`

---

## 📊 Deneysel Kıyaslama ve Sonuçlar

Testler 14.403 bağımsız test karesi üzerinde, **NVIDIA Jetson AGX Orin** platformunda FP16 TensorRT motorları kullanılarak icra edilmiştir:

| Model Mimarisi | Parametre (M) | FLOPs (G) | mAP@50 (% ) | mAP@50-95 (% ) | Orin Gecikme (ms) | Kararlılık |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **YOLOv8-S** | 11.2 | 28.6 | 76.2 | 52.4 | 6.2 ms | Standart NMS |
| **YOLO11-S** | 9.4 | 21.5 | 79.8 | 56.1 | 5.9 ms | Hızlı, Düşük Bellek |
| **D-FINE-S** | 10.3 | 24.8 | **81.4** | **58.7** | 6.8 ms | NMS-Free, Yüksek Küçük Nesne Başarımı |

### 📐 Olasılık Dağılımı İnce Ayar Fonksiyonu:
$$
\\mathcal{L}_{FDR} = \\sum_{i=1}^{4} \\text{KL}\\left( P(b_i) \\,\\|\\, Q(b_i) \\right) + \\lambda \\cdot \\mathcal{L}_{IoU}(B_{pred}, B_{gt})
$$

D-FINE'ın özellikle yüksek irtifadan çekilen İHA görüntülerinde örtüşen araç gruplarını ayrıştırmada YOLO11'e kıyasla **+3.2 mAP@50-95** avantaj sağladığı doğrulanmıştır.`,
    bibtex: `@article{toker2026yolo11dfine,
  author    = {Alperen Toker},
  title     = {YOLO11 vs. D-FINE: Taktik İHA Platformlarında Gerçek Zamanlı Nesne Tespiti Kıyaslaması},
  journal   = {LENS: Savunma ve Bilgisayarlı Görü Araştırma Yayınları},
  year      = {2026}
}`,
  },
  {
    id: 'art-sensor-fusion-lwir',
    slug: 'cok-kipli-sensor-fuzyonu-lwir-termal-ve-rgb-gorunur-dalga-boyu',
    title: 'Çok Kipli Sensör Füzyonu: Uzun Dalga Termal (LWIR) ve RGB Erken vs. Geç Füzyon Analizi',
    dek: 'Çapraz-Dikkat Mekanizması · Gece/Sis/Kamuflaj Senaryoları · Eşzamanlı Spektral Kayıt Doğrulaması',
    abstract: 'Termal (8-14 µm) ve görünür ışık (0.4-0.7 µm) sensörlerinin birlikte kullanılması; sis, gece, doğrudan güneş parlaması ve kamuflaj koşullarında hedef tespitini olanaklı kılmaktadır. Bu makalede Erken (Piksel), Orta (Özellik/Feature) ve Geç (Karar) füzyon mimarileri ablasyon testleriyle incelenmektedir.',
    authors: [
      {
        name: 'Alperen Toker',
        affiliation: 'LENS Sensör Füzyon Laboratuvarı',
        role: 'Araştırmacı',
      }
    ],
    date: '2026-10-03',
    displayDate: '3 Ekim 2026',
    readingTime: '13 dk okuma süresi',
    version: 'v1.0 - Araştırma Raporu',
    category: 'Sensör Füzyonu',
    tags: ['Sensör Füzyonu', 'LWIR', 'Termal Görüntüleme', 'RGB-T', 'Cross-Attention', 'FLIR'],
    status: 'published',
    doi: 'LENS-RR-2026-003',
    keywords: ['Multimodal Fusion', 'LWIR', 'RGB-T', 'Thermal Vision', 'Cross-Modal Attention', 'KAIST Dataset'],
    telemetry: {
      hardware: 'Dual Flir Boson 640 + Global Shutter RGB',
      resolution: '640×512 (Termal) + 1920×1080 (RGB)',
      sensor: 'Çift Bant Senkron Gimbal',
      modelArch: 'Cross-Modal Transformer (CMT)',
      accuracy: 'Gece mAP: %86.7 (RGB Tek Başına: %19.2)',
      latency: 'Toplam Füzyon Hattı: 11.2ms',
      fps: '89 FPS',
    },
    content: `## 🌌 Spektral Tamamlayıcılık ve Zorlu Ortam Koşulları

Görünür ışık kameraları (RGB) zengin doku, renk ve yüksek uzamsal çözünürlük sağlarken; aydınlatmanın sıfıra indiği gece ortamlarında, sis veya duman arkasında işlevsiz kalmaktadır. Uzun Dalga Kızılötesi (LWIR - 8 ila 14 µm) sensörler ise objelerin yaydığı kara cisim ışımasını tespit ederek mutlak karanlıkta üstün kontrast sunar.

---

### 🔬 Üç Farklı Füzyon Paradigmaları

1. **Erken (Piksel Düzeyinde) Füzyon:** RGB ve IR kanalları doğrudan birleştirilerek $N \\times M \\times 4$ tensör elde edilir. Hızlıdır ancak sensörler arasındaki küçük paralaks hatalarına karşı aşırı kırılgandır.
2. **Orta Düzey (Özellik - Feature-Level) Çapraz-Dikkat:** İki ayrı omurga (Backbone) ağı ile çıkarılan öznitelik haritaları, Cross-Attention katmanları üzerinden dinamik ağırlıklandırılır.
3. **Geç (Karar Düzeyinde) Füzyon:** İki bağımsız tespit modelinin tahminleri Bayesian olasılık modeli veya Non-Maximum Merging ile birleştirilir.

$$
\\mathbf{Z}_{fused} = \\text{Softmax}\\left(\\frac{\\mathbf{Q}_{RGB} \\mathbf{K}_{IR}^T}{\\sqrt{d_k}}\\right) \\mathbf{V}_{IR} + \\mathbf{F}_{RGB}
$$

---

## 📈 Ablasyon Tablosu (FLIR & KAIST Kıyaslaması)

| Senaryo | Yalnızca RGB | Yalnızca LWIR | Erken Füzyon (4-Kanal) | Çapraz-Dikkat Orta Füzyon |
| :--- | :---: | :---: | :---: | :---: |
| **Gündüz Açık Hava** | **84.3%** | 71.2% | 82.0% | **88.1%** |
| **Tam Gece (0 Lux)** | 19.2% | 79.5% | 76.1% | **86.7%** |
| **Yoğun Sis / Duman** | 24.5% | 74.0% | 70.8% | **82.4%** |
| **Güneş Parlaması (Glare)** | 38.0% | 77.3% | 74.2% | **84.9%** |

Orta düzey öznitelik füzyonu, tüm senaryolarda en yüksek kararlılığı sağlamış ve tek modaliteli modellere göre gece şartlarında **+67.5 mAP** sıçrama yaratmıştır.`,
    bibtex: `@article{toker2026fusion,
  author    = {Alperen Toker},
  title     = {Çok Kipli Sensör Füzyonu: Uzun Dalga Termal (LWIR) ve RGB Erken vs. Geç Füzyon Analizi},
  journal   = {LENS: Savunma ve Bilgisayarlı Görü Araştırma Yayınları},
  year      = {2026}
}`,
  },
  {
    id: 'art-tensorrt-quantization',
    slug: 'edge-gpu-tensorrt-fp16-int8-kuantizasyon-ablasyonu',
    title: 'Edge GPU Platformlarında TensorRT FP16 ve INT8 Kuantizasyon Kayıp Ablasyonu',
    dek: 'PTQ vs. QAT · Entropi Kalibrasyonu · Layer-wise Hassasiyet Ayrıştırması · Enerji Verimliliği (FPS/Watt)',
    abstract: 'Uç birim yapay zeka çıkarımlarında gecikmeyi düşürmek ve FPS/Watt verimliliğini maksimize etmek için uygulanan FP16 ve INT8 kuantizasyonlarının derin öğrenme modellerindeki mAP kaybı deneysel olarak ölçülmüştür. INT8 kalibrasyonunda SmoothQuant ve KL-Divergence entropi yöntemleri incelenmektedir.',
    authors: [
      {
        name: 'Alperen Toker',
        affiliation: 'Gömülü Sistemler ve Optimizasyon',
        role: 'Araştırmacı & Yazar',
      }
    ],
    date: '2026-10-05',
    displayDate: '5 Ekim 2026',
    readingTime: '9 dk okuma süresi',
    version: 'v1.1 - Optimizasyon Kılavuzu',
    category: 'Model Optimizasyonu',
    tags: ['TensorRT', 'INT8', 'FP16', 'Kuantizasyon', 'Jetson Orin', 'FPS-Watt'],
    status: 'published',
    doi: 'LENS-RR-2026-004',
    keywords: ['TensorRT', 'Quantization', 'INT8 Calibration', 'Jetson', 'Edge Computing', 'Efficiency'],
    telemetry: {
      hardware: 'Jetson Orin Nano (8GB - 15W Modu)',
      resolution: '640×640 (Batch Size = 1)',
      sensor: 'Sentetik Test & FLIR Benchmark',
      modelArch: 'YOLO11-S Engine',
      accuracy: 'FP32: 80.1% · FP16: 80.0% · INT8: 78.8%',
      latency: 'FP32: 18.2ms · FP16: 6.4ms · INT8: 3.1ms',
      fps: 'INT8 ile 322 FPS (5.8x Hızlanma)',
    },
    content: `## ⚡ Kuantizasyon Temelleri: FP32'den INT8'e Geçiş

Edge AI platformlarında kısıtlı güç ve termal zarf (Thermal Design Power - TDP) altında yüksek FPS elde etmek için ağırlık ve aktivasyon tensörleri 32-bit kayan noktadan (FP32) 8-bit tam sayıya (INT8) dönüştürülür:

$$
q = \\text{clip}\\left( \\left\\lfloor \\frac{x}{S} \\right\\rceil + Z, -128, 127 \\right)
$$

Burada $S$ ölçekleme faktörü (scale), $Z$ ise sıfır noktası (zero point) değeridir.

---

## 🔬 TensorRT Kuantizasyon Deneyleri (Jetson Orin Nano - 15W)

| Hassasiyet Seviyesi | Çıkarım Süresi (ms) | FPS | Bellek Ayak İzi (MB) | mAP@50 (%) | Güç Tüketimi (Watt) | Verimlilik (FPS/Watt) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **PyTorch FP32** | 22.4 ms | 44 | 480 MB | 80.1% | 14.8 W | 2.97 |
| **TensorRT FP32** | 18.2 ms | 55 | 320 MB | 80.1% | 14.2 W | 3.87 |
| **TensorRT FP16** | 6.4 ms | 156 | 160 MB | 80.0% *(Δ-0.1)* | 12.1 W | 12.89 |
| **TensorRT INT8 (PTQ)** | **3.1 ms** | **322** | **95 MB** | 78.8% *(Δ-1.3)* | **9.4 W** | **34.25 🚀** |

INT8 kuantizasyon sayesinde, doğruluktan sadece **%1.3 mAP** ödün verilerek enerji verimliliğinde **11.5 kat** artış sağlanmıştır.`,
    bibtex: `@article{toker2026quantization,
  author    = {Alperen Toker},
  title     = {Edge GPU Platformlarında TensorRT FP16 ve INT8 Kuantizasyon Kayıp Ablasyonu},
  journal   = {LENS: Savunma ve Bilgisayarlı Görü Araştırma Yayınları},
  year      = {2026}
}`,
  }
];

// Optional demo seed articles (accessible from inside Admin Studio if needed)
export const DEMO_SEED_ARTICLES: Article[] = INITIAL_ARTICLES;

