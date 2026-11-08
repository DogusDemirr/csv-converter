# Phase 3 — Production Readiness

Tarih: 9 Kasım 2026. **Durum: Yerel kalite kontrolleri geçti; genel erişime açık production yayını henüz hazır olarak onaylanmadı.** Gerçek domain tanımlanmalı, kalan bağımlılık/ZIP riskleri için yayın kararı verilmeli ve hosting ortamında son kontrol yapılmalıdır. Yeni araç eklenmedi.

## İncelenen kapsam

PHASE1_REPORT.md, PHASE2_REPORT.md, mevcut kaynak kod, AGENTS.md ve kurulu Next.js metadata/404 rehberleri incelendi. Dokuz mevcut aracın dönüşüm mantığı ve production build üzerinde Chromium arayüzleri test edildi. Backend, database, auth, upload API veya reklam SDK'sı oluşturulmadı.

## Yapılan değişiklikler

1. Playwright 1.65.0 ve Chromium 158.0.8127.18 kuruldu. Masaüstü Chromium ve Pixel 7 emülasyonu için 28 E2E kontrolü eklendi. HTML/JSON raporu, başarısızlık screenshot/trace ayarları ve production webServer yapılandırıldı.
2. Lighthouse 13.6.0 ve tekrarlanabilir `npm run perf` script'i eklendi. İki temsilî production sayfası mobil simülasyonla ölçüldü.
3. Domain yer tutucusunun canonical/sitemap/OG URL olarak yayımlanması engellendi. Artık sunucu tarafı `SITE_URL` kullanılır. Tanımsızken noindex/nofollow, robots disallow ve boş sitemap üretilir; canonical/hreflang/og:url üretilmez. Gerçek HTTPS origin ayarlıysa canonical, en/tr/x-default ve sitemap devreye girer. Yer tutucu, HTTP, credentials veya path içeren origin reddedilir.
4. JSON→CSV'de farklı kayıtlarda eksik `__proto__`, `constructor`, `toString` alanlarının Object.prototype üzerinden okunması düzeltildi; yalnızca own property değerleri aktarılır. Regresyon testi eklendi.
5. Dosya okuma `TextDecoder(..., { fatal: true })` ile sıkı UTF-8 doğrulamasına geçirildi. Bozuk baytların sessizce replacement character'a çevrilmesi engellendi. BOM ve Türkçe/emoji testleri korundu.
6. ExcelJS yalnızca XLSX okuma veya Excel export aşamasında dinamik yüklenir. Papa Parse, yeni araç worker'ında yalnızca CSV işlemlerinde yüklenir. Boyut sabitleri ve dosya doğrulaması ayrılarak landing/client bundle'ın sırf dosya doğrulaması için Papa Parse yüklemesi kaldırıldı.
7. Lighthouse'un bulduğu açık tema yardımcı metin kontrastı düzeltildi; CSV file input'a erişilebilir ad eklendi. XLSX input başlığının label hedefi dosya kontrolüne bağlandı.
8. Güvenlik açığı içeren TypeScript ESLint alt bağımlılığı minimatch 11.0.1'e kapsamlı override ile geçirildi. ESLint ve tüm kontroller yeniden geçti. Ana Next.js veya ExcelJS sürümü düşürülmedi.
9. Vitest yalnızca src/**/*.test.ts çalıştıracak biçimde ayrıldı; Playwright testleri unit runner tarafından yüklenmez. README, .env.example ve ignore listeleri güncellendi.

Başlıca yeni dosyalar: `playwright.config.ts`, `e2e/platform.spec.ts`, `vitest.config.mts`, `scripts/lighthouse.mjs`, `src/lib/readiness.test.ts`, `src/lib/file-validation.ts`, `src/lib/limits.ts`.

Değişen kaynaklar: `src/lib/seo.ts`, `tool-metadata.ts`, `tool-engine.ts`, `csv.ts`, iki worker, `src/app/robots.ts`, `sitemap.ts`, `globals.css`, `src/components/converter.tsx`, `tool-workbench.tsx`. Ayrıca package.json/lock, .gitignore, .env.example ve README değişti.

## Son kontrol sonuçları

| Kontrol | Sonuç |
| --- | --- |
| npm run lint | Başarılı |
| npx tsc --noEmit | Başarılı |
| npm run test | 4 dosya, **97 test başarılı** |
| npm run build | Başarılı; EN/TR 18 araç sayfası üretildi |
| npm run test:e2e | **28 başarılı**, 0 skipped/flaky/unexpected; yaklaşık 17 saniye |
| npm run perf | İki mobil Lighthouse ölçümü tamamlandı |
| npm audit | 0 critical/high, **2 moderate** kaldı |
| npm audit --omit=dev | 0 critical/high, **2 moderate** kaldı |

İlk test çalıştırmasında Windows clipboard CRLF normalizasyonu ile Next route announcer'ın ek alert öğesi test seçicilerini etkiledi. Beklentiler satır sonlarını normalize edecek ve uygulamanın hata bölgesini hedefleyecek şekilde düzeltildi. İlk kısıtlı ortam çalıştırması Windows süreç temizliğinde tamamlanamadı; izinli ortamda son koşu tamamlandı ve JSON/HTML raporları üretildi. Son başarılı sonuçlar esas alınmıştır.

## Fonksiyonel ve Playwright kapsamı

- JSON Formatter/Validator, Minifier, JSON→CSV, CSV→JSON, Base64, JWT: gerçek worker dönüşümü, Unicode/Türkçe, tam çıktı copy, gerçek download, reset ve hatalı giriş.
- CSV→Excel: UTF-8 BOM dosya upload, Türkçe preview, gerçek XLSX indirme; indirilen workbook tekrar ExcelJS ile açılarak tehlikeli hücrenin String olması, formül olmaması ve Unicode içeriği doğrulandı.
- Excel→CSV/JSON: gerçek XLSX üretme/upload, cached formül sonucunun aktarımı, formula injection koruması, download ve bozuk workbook hatası.
- Boş dosya, 5 MiB üstü dosya, geçersiz UTF-8; unit testlerde tüm araçlar için boş/aşırı büyük veri ve tablo/JSON sınırları.
- İç içe JSON, null, Türkçe ve emoji, leading zero, prototype isimleri, hatalı CSV quotes/headers, bozuk Base64/JWT ve sayısal taşmalar.
- XSS payload'ı textarea metni olarak kalır; DOM'a img/script olarak eklenmez.
- Büyük JSON dönüşümü worker'da çalışırken reset tıklanır ve çıktı iptal edilir. Bu genel sınırsız dosya performans garantisi değildir.
- Ana sayfa arama, tüm/aktif/boş kategori filtreleri; EN/TR geçişi, araç slug'ının korunması; tema değişimi ve reload sonrası tercihin kalması.
- 20 sayfada tek görünür H1, başlık seviyelerinde atlama olmaması ve mobil horizontal overflow kontrolü.
- Testlerde bütün page request'leri izlenir: beklenmeyen non-GET veya harici ağ isteği görülmedi. Örnek hassas değerler console'da görülmedi; runtime pageerror oluşmadı.

Chromium kurulumu ve çalıştırılması **gerçekten başarılıdır**. Pixel 7 testi emülasyondur; gerçek Android/iOS cihaz, Firefox, WebKit ve manuel ekran okuyucu testi yapılmadı. Clipboard Windows satır sonları normalize edilerek içerik eşitliğiyle kontrol edildi.

Raporlar (git tarafından ignore edilir): `playwright-report/index.html`, `test-results/results.json`. `npm run test:e2e:report` HTML raporunu açar. Başarısız koşular için trace/screenshot ayarları vardır.

## SEO bulguları

- Her ana/araç sayfasının unique title ve description'ı Chromium'da kontrol edildi; OG başlıkları ve EN/TR HTML lang mevcut.
- İç bağlantıların hedefleri HTTP ile kontrol edildi; kırık uygulama bağlantısı bulunmadı. Olmayan araç ve desteklenmeyen dil 404 döndü. Next.js yerleşik 404 kullanılır.
- Başlık hiyerarşisi ve tek görünür H1, masaüstü ve mobilde kontrol edildi. Eski CSV→Excel /en ve /tr üzerindeki #converter bölümünde ve ayrı araç URL'sinde korunur.
- **SITE_URL tanımsızken indeksleme kasıtlı olarak engellenir.** Yer tutucu hiçbir canonical/sitemap/OG URL'sinde canlı origin olarak kullanılmaz.
- Yapılandırılmış origin ile metadataBase/canonical, en/tr/x-default ve 20 URL'li sitemap/robots davranışı unit testleriyle kontrol edildi. Örnek origin yalnızca test verisidir; o alan adına istek/yayın yapılmadı.
- Mevcut E2E paketi güvenli, SITE_URL tanımsız build'i esas alır. Gerçek domain build'i ve hosting üstündeki canonical/redirect/robots/sitemap doğrulaması henüz yapılmadı.
- SITE_URL build sırasında okunur; yalnızca sunucu başlangıcında değişken eklemek, önceden üretilmiş metadata'yı güncellemez. Gerçek origin ile yeniden build gerekir. Önceki NEXT_PUBLIC_SITE_URL artık kullanılmaz.

## Lighthouse ve performans

Production build, loopback bağlantı, Lighthouse varsayılan mobil simülasyonu; iki temsilî EN sayfası, tek koşu. Ölçüm gerçek hosting/Core Web Vitals saha verisi değildir.

| Sayfa | Performance | Accessibility | Best Practices | SEO | FCP / LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /en | 100 | 100 | 100 | 63 | 0.8 s / 0.8 s | 20 ms | 0 |
| /en/tools/json-formatter | 100 | 100 | 100 | 63 | 0.8 s / 0.8 s | 30 ms | 0 |

SEO puanındaki başarısız crawlability kontrolü, noindex/robots disallow nedeniyle beklenir; bunu kaldırıp yer tutucuyla yayın yapılmadı. Başlangıçtaki ana sayfa accessibility 91 idi; kontrast ve file input label düzeltmesiyle 100 oldu. JSON Formatter erişilebilirliği 100 kaldı.

Ana sayfa ölçümünde Script transfer toplamı yaklaşık 163 KB. ExcelJS'in dinamik import edilmesi ve validation bağımlılıklarının ayrılması gereksiz başlangıç yükünü azaltır; önceki sürüm için aynı ortamda karşılaştırmalı benchmark alınmadığından yüzde iyileşme iddia edilmez.

CSV parsing ve Excel üretimi worker'da devam eder. 5 MiB, satır/hücre/derinlik limitleri korunur. Gerçek zayıf cihazlarda en büyük izin verilen XLSX'in bellek tepe noktası ölçülmedi.

Kanıtlar: `artifacts/lighthouse-home.json/html`, `lighthouse-json-formatter.json/html`, `lighthouse-summary.json`. `npm run perf` port 3200 ve Chrome debugging port 9224 kullanır; bu portlar boş olmalıdır. Test sunucuları/tarayıcılar koşu sonunda kapatılır.

## Güvenlik bulguları

- Kaynak taramasında dosya/token içeriği gönderen fetch/axios/XMLHttpRequest veya console log yoktur. Test browser trafiği aynı origin GET istekleriyle sınırlı kaldı. Bu kaynak/test kapsamı, genel bir sızma testi sertifikası değildir.
- HTML execution/eval eklenmedi. Yalnızca sabit tema başlangıcında mevcut dangerouslySetInnerHTML vardır ve kullanıcı verisi içermez.
- CSV dangerous header/cells whitespace/control prefix dahil tek tırnakla etkisizleştirilir. XLSX export String hücreler kullanır. Formüller import sırasında hesaplanmaz; cached sonuç eksikse boş değer aktarılır.
- JWT uyarısı ve signatureVerified=false korunur. Token doğrulama iddiası veya dış servise gönderim yoktur.
- Dosya uzantısı, boyutu, UTF-8 içeriği, JSON/CSV yapısı ve XLSX ZIP metadata'sı denetlenir. Şifreli/ZIP64/çok diskli XLSX desteklenmez.
- XLSX ZIP kontrolü beyan edilen directory boyutuna dayanır; sahte metadata ile mutlak açılmış-bayt/bellek bütçesi garantisi vermez. Bu Phase 2'den kalan risk açıkça korunmuştur; düşmanca arşivler için streaming açılım bütçesi uygulanmadı.
- Audit'te 10 moderate → 2 moderate. Kalan zincir **exceljs → uuid <11.1.1**, GHSA-w5hq-g745-h8pq. Kaynak incelemesinde ExcelJS'in uuid kullanımı conditional formatting için v4'tür; duyurudaki v3/v5/v6 output-buffer yolu uygulamanın mevcut akışında görülmedi. Bu, bağımlılık açığını ortadan kaldırdığı anlamına gelmez.
- npm'nin otomatik force önerisi ExcelJS ana sürümünü geriye düşürür; çalışan özelliği riske atmamak için uygulanmadı. ExcelJS browser dağıtımı önceden bundle edilmiş olduğundan yalnızca uuid override yapmak tüm browser dağıtımını yamaladığı iddiasını desteklemez; bu nedenle kör override yapılmadı.
- minimatch düzeltmesi yalnızca typescript-estree alt bağımlılığında 11.0.1'e uygulanmıştır; lint/build/test başarılıdır.

Audit kanıtları: `artifacts/npm-audit.json`, `npm-audit-production.json`. Kaynaklar: [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Yayına engeller ve kalan sınırlamalar

1. **Kesin engel: Gerçek production domain yok.** SITE_URL tanımlı gerçek origin ile yeniden build alınmadan site indexlenebilir şekilde yayımlanmamalı.
2. **Güvenlik yayın kararı gerekli:** iki moderate production bağımlılık uyarısı kaldı. Upstream yamalı ExcelJS/browser dağıtımı veya doğrulanmış bakım stratejisi seçilmeli; mevcut v4-only kullanım değerlendirmesi yayın sahibince kabul edilmeden temiz güvenlik onayı verilmez.
3. **XLSX düşmanca arşiv riski:** metadata tabanlı açılım kontrolü gerçek bayt bütçeli sandbox değildir. Kamuya açık kullanımda bu sınırlama için açık risk kararı veya ek sertleştirme gerekir.
4. Hosting/TLS/production cache/security header/redirect ve gerçek domain SEO kontrolleri henüz yapılmadı; deployment bu görevde istenmedi ve gerçekleştirilmedi.
5. Gerçek cihaz, Safari/Firefox ve manuel ekran okuyucu testleri yoktur. Lighthouse 100 erişilebilirlik tam WCAG uyum belgesi değildir.
6. JSON sayısal hassasiyet, duplicate key son-değer davranışı, yalnızca XLSX/UTF-8 ve eski cached formül sonuçları gibi Phase 2 sınırlamaları devam eder.

## Yayın öncesi kontrol listesi

- [x] Mevcut dokuz araç için unit ve Chromium E2E kontrolleri.
- [x] Dosya indirme içeriği, clipboard, clear/reset, Unicode ve güvenlik regresyonları.
- [x] ESLint, TypeScript, 97 unit test ve production build.
- [x] 28 masaüstü/mobil Chromium testi; yerel Lighthouse ve audit raporları.
- [x] Placeholder origin kaldırıldı; tanımsız domain için güvenli noindex/robots davranışı.
- [ ] Gerçek HTTPS domain belirle, SITE_URL ayarla ve yeniden production build al.
- [ ] Hosting üzerinde canonical/hreflang/OG URL, 20 sitemap URL'si, robots allow ve HTTP→HTTPS/yönlendirmeleri kontrol et.
- [ ] ExcelJS/uuid uyarısı için düzeltme veya belgeli risk kabulü; XLSX ZIP açılımı için yayın güvenlik kararı.
- [ ] Hosting üzerinde gerçek dosyalarla smoke test ve TLS/security headers kontrolü.
- [ ] Gerçek mobil cihaz, Safari/Firefox ve manuel klavye/ekran okuyucu kontrolü.
- [ ] Reklam yayınından önce gerekli gizlilik/çerez/iletişim içeriklerini ve sağlayıcı koşullarını ayrıca değerlendir.

## Komutlar

```sh
npm run lint
npx tsc --noEmit
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm run perf
npm run test:e2e:report
npm run dev
```

PowerShell yürütme politikası npm.ps1'i engelliyorsa npm.cmd/npx.cmd kullanın. E2E için port 3100 boş olmalıdır. Geliştirme adresi http://localhost:3000/en veya /tr.
