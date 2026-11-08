# Phase 3.1 — Security Hardening

Tarih: 9 Kasım 2026. **Yayın kararı: NO-GO.** XLSX import saldırı yüzeyi kapatıldı; kalan yedi araç testlerden geçti. İki moderate bağımlılık kaydı hâlâ mevcut ve gerçek production domain/hosting kontrolleri tamamlanmadı. Bu rapor tam sızma testi veya sınırsız kaynak güvenliği garantisi değildir.

## 1. Dependency audit

`npm audit --json` ve `npm audit` yeniden çalıştırıldı. Sonuç: **0 critical, 0 high, 2 moderate**. İki kayıt aynı kök açığın bağımlı pakete yansımasıdır; iki bağımsız CVE değildir.

| Audit kaydı | Kurulu sürüm | Zincir | Açık / gerçek erişilebilirlik | Güncelleme kararı |
| --- | --- | --- | --- | --- |
| uuid | 8.3.2 | uygulama → exceljs@4.4.0 → uuid@8.3.2 | GHSA-w5hq-g745-h8pq / CVE-2026-41907: v3/v5/v6 API'lerinde dış output buffer için sınır kontrolü eksikliği. İncelenen ExcelJS kaynak kodu yalnızca v4 kullanıyor; uygulama bu API'leri veya kullanıcı kontrollü output buffer/offset sunmuyor. Mevcut akışta istismar yolu tespit edilmedi; kütüphane yine etkilenmiş sürümde. | Düzeltilmiş 11.1.1 mevcut; 8→11 major değişikliktir. Kör override yapılmadı. |
| exceljs | 4.4.0 | uygulama → exceljs → uuid | uuid bağımlılığı nedeniyle audit kaydı. Bu kayıtta ayrı bir ExcelJS CVE'si yok. Uygulama yalnızca kontrollü CSV verisinden XLSX üretmeye devam ediyor; untrusted XLSX import kapalı. | npm registry güncel ExcelJS sürümünü 4.4.0 olarak döndürdü. Güvenli bir uyumlu patch/minor yükseltme bulunamadı. |

Analiz kanıtları:

- `npm ls exceljs uuid jszip --all`: ExcelJS 4.4.0, uuid 8.3.2, JSZip 3.10.2.
- `npm view exceljs version`: 4.4.0.
- `npm view uuid@11.1.1 engines exports --json`: Node/browser import ve require girişleri mevcut. Bu, bütün ExcelJS entegrasyonunun major yükseltmeyle uyumlu olduğuna tek başına kanıt değildir.
- `node_modules/exceljs/lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js`: uuid v4 kullanır. Advisory'nin etkilenen v3/v5/v6 output-buffer yolu uygulamada görülmedi.
- ExcelJS package.json browser alanı `dist/exceljs.min.js` hazır bundle'ını gösterir. Yalnızca npm uuid override'ı bu gömülü browser kodunu yeniden derlemez. Audit'i sıfırlayıp browser'ın yamalandığını iddia etmek doğru olmaz.

**Uygulanan dependency güncellemesi: yok.** Mevcut bulgular için güvenli/uyumlu patch seçeneği yok; açık değerlendirilmeden major yükseltme, kütüphane düşürme veya node_modules yaması yapılmadı. Phase 3'te uygulanmış typescript-estree/minimatch 11.0.1 düzeltmesi korundu. `npm audit fix --force` **çalıştırılmadı**. npm'nin önerisi ExcelJS'i 3.4.0'a düşürdüğü için uygulanmadı.

Güvenli sonraki seçenek: upstream yamalı ExcelJS/browser dağıtımı veya uuid 11.1.1+ kullanan, yeniden üretilmiş ve test edilmiş bakım/fork dağıtımı. İkincisi ayrı uyumluluk/bundle doğrulaması gerektirir; bu fazda yapılmış kabul edilmez.

Kaynak: [uuid güvenlik duyurusu](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Denetim kanıtları: `artifacts/phase3-1-audit.json`, `artifacts/phase3-1-audit.txt`. Audit açık bulduğu için exit code 1 beklenir; audit başarısızlığı gizlenmedi.

## 2. XLSX kaynak güvenliği değerlendirmesi

İncelenen eski import hattı: `runTool` → workbookRows → `ExcelJS.Workbook.xlsx.load` → `JSZip.loadAsync` → `entry.async(...)`.

| Kontrol | Önceki durum | Güvenlik sonucu / karar |
| --- | --- | --- |
| Sıkıştırılmış dosya boyutu | 5 MiB | Faydalı giriş sınırı; ZIP bomb çözümü değildir. |
| ZIP genişleme boyutu | Directory beyanına göre 30 MiB, 2.000 giriş | Beyan edilen boyut güvenilir gerçek açılmış-bayt bütçesi değildir; yanlış beyan veya parser kaynak tüketimini tamamen engellemez. |
| Satır/kolon/hücre | 20.000 / 1.000 / 200.000 | Kontroller workbook yüklendikten sonra, yalnızca seçili sayfa için yapılıyordu. Diğer sayfalar/shared strings/media/XML yükleme maliyetini açılımdan önce sınırlamaz. |
| JSZip kontrolü | CompressedObject sonunda data_length eşitliği kontrolü | Kod end olayında boyut uyuşmazlığını tespit eder; açılım boyunca uygulama bütçesini aşınca erken durduran bir limit değildir. |
| Bellek | Tam workbook ve açılmış içerik belleğe alınır | Kullanılan ExcelJS load yolunda güvenilir toplam bellek/açılım limiti saptanmadı. |
| Worker | Ana UI thread dışında işlem | UI ayrımı ve iptal sağlar; tarayıcı işleminin toplam belleğini güvenilir biçimde sınırlamaz. |
| Formüller | Cached sonuç; eksikse boş; hesaplama yok | Formül çalıştırma engeli kaynak tüketimi riskini çözmez. |
| Bozuk/şifreli dosya | Hata yakalama ve ZIP metadata kontrolü | Hata yakalama, hata oluşmadan önceki kaynak tüketimini garanti altına almaz. |

Kaynak incelemesi: `node_modules/exceljs/lib/xlsx/xlsx.js`, `node_modules/jszip/lib/compressedObject.js`. ExcelJS yükleme çağrısına açılmış-byte/memory bütçesi geçirilmediği, entry.async ile tam girdilerin materyalize edildiği doğrulandı. Büyük bir ZIP bomb üretilmedi veya tarayıcıya açtırılmadı.

## 3. XLSX import kararı ve düzeltmeler

**Excel → CSV ve Excel → JSON geçici olarak devre dışı.** Bu bir ZIP bomb parser yaması değil, riskli işlemin uygulamadan kaldırılmasıdır.

- Mevcut EN/TR URL'leri korunur; yalnızca iki dilli güvenlik açıklaması ve aktif araçlara dönüş bağlantısı gösterilir.
- Input/file seçimi, dönüştürme veya indirme kontrolü oluşturulmaz; bu sayfalarda worker başlatılmaz.
- Aktif katalog/arama sayısı 7'dir. İki import aracı aktif katalogdan çıkarılır; sitemap yalnızca 7 araç × 2 dil + 2 ana sayfa = 16 URL içerir (SITE_URL yapılandırıldıysa). SITE_URL yokken boş sitemap devam eder.
- Kapalı sayfalarda domain ayarlı olsa da `noindex, follow` zorlanır.
- `security-policy.ts` ve registry aktif/pasif ayrımı eklenir. Normal UI'ye yanlışlıkla ToolWorkbench geçirilse bile güvenlik açıklaması döner.
- Worker'ın ilk kontrolü `requireEnabledTool` olur. File.size veya okuma metotlarına erişmeden `xlsx-disabled` döner.
- `runTool` düzeyinde de engel vardır. Eski ArrayBuffer import parametresi kaldırıldı. `workbookRows` ve metadata tabanlı ZIP ön kontrolü uygulama işlem kodundan kaldırıldı; yanıltıcı bir ZIP bomb koruması olarak tutulmadı.
- Uygulama kaynaklarında XLSX load/import çağrısı kalmadı. Testlerde yalnızca uygulamanın ürettiği küçük güvenilir export dosyasını tekrar okumak için load/readFile kullanılır. ExcelJS bağımlılığının kendi içinde import API kodu bulunması, uygulamanın bunu kullanıma açtığı anlamına gelmez.

**Çalışmaya devam eden araçlar:** CSV → Excel, JSON Formatter/Validator, JSON Minifier, JSON → CSV, CSV → JSON, Base64 Encode/Decode ve JWT Decoder.

CSV → Excel exportuna, workbook oluşturulmadan önce doğrudan giriş kontrolü eklendi: boş tablo reddi, 20.000 satır, 1.000 kolon, toplam 200.000 hücre ve 32.767 karakter/hücre. Var olan 5 MiB CSV, parsing ve worker sınırları korundu. XLSX export kullanıcı arşivini açmaz; hücreler String olarak kalır. Kontrollü boyutlarla çalışsa da sabit bir bellek üst sınırı ölçülmüş/garanti edilmiş değildir.

## 4. Güvenlik testleri ve doğrulama

| Komut | Sonuç |
| --- | --- |
| npm run lint | Başarılı, warning/error yok |
| npx tsc --noEmit | Başarılı |
| npm run test | **5 dosya, 90 test başarılı** |
| npm run build | Başarılı; aktif ve kapalı bilgilendirme URL'leri üretildi |
| npm run test:e2e | **32 test başarılı**, Chromium desktop + Pixel 7 emülasyonu; 0 skipped/flaky/unexpected |
| npm audit --json / npm audit | **2 moderate**; 0 high/critical; exit code 1 |

Unit test sayısının 97'den 90'a inmesi, artık sunulmayan XLSX import başarı/sonradan-limit testlerinin çıkarılıp fail-closed güvenlik testleriyle değiştirilmesindendir. Aktif CSV/JSON/Base64/JWT ve Phase 1 export testleri korunur. Kapalı özelliği başarıyla dönüştürüyormuş gibi test etme veya testleri skip etme yapılmadı.

Yeni/doğrulanan senaryolar:

- Küçük geçerli XLSX, boş buffer, bozuk PK başlığı: direct engine her durumda xlsx-disabled ile reddeder. Bu dosyalar dekomprese edilmez.
- Worker'da fake File okuma metotları spy ile izlenir; 0 byte, 3 byte ve 5 MiB üstü beyan edilen dosyalarda hiç çağrılmaz. Büyük dosyayı temsil etmek için gerçek zararlı dosya üretilmez.
- Aşırı satır/kolon/hücre/karakter: kontrollü, sınırlı sentetik dizilerle export giriş doğrulaması; boş export reddi. Satır/hücre senaryoları dosyayı açıp sonradan durdurmak yerine güvenilir export öncesi kontrol edilir.
- CSV formula injection: =/+/-/@, whitespace/control prefix, null-byte prefix; CSV export tek tırnak koruması ve XLSX String hücreleri.
- HTML/XSS metni, geçersiz JSON, Türkçe/Unicode/emoji, nested/null ve bozuk UTF-8: mevcut regresyon ve Chromium testleri.
- Aktif yedi araçta gerçek worker dönüşümleri, copy/download/reset; CSV → Excel indirilip tekrar okunarak formül olmaması.
- EN/TR iki kapalı import URL'sinde upload input ve run button yok; worker başlamıyor; noindex mevcut; katalog linkleri yok. Her iki Chromium viewport'unda doğrulandı.
- E2E sırasında beklenmeyen harici/non-GET istek veya örnek hassas verinin console'a yazılması gözlenmedi.
- Sitemap testleri kapalı import URL'lerinin bulunmadığını kontrol eder.

Kanıtlar: `src/lib/security.test.ts`, güncellenen tool-engine/readiness testleri, `e2e/platform.spec.ts`, `test-results/results.json`, `playwright-report/index.html`. Test raporları artifacts/test-results dizinlerinde ignore edilir.

Gerçek çok büyük kötü amaçlı ZIP açtırma, gerçek cihaz bellek profili, çoklu tarayıcı ve tam penetrasyon testi yapılmadı. Bu fazda Lighthouse yeniden çalıştırılmadı; önceki puanlar yeni güvenlik değişikliklerinin ölçümü gibi sunulmaz.

## 5. Değişen dosyalar

- Yeni: `src/lib/security-policy.ts`, `src/lib/security.test.ts`, `PHASE3_1_SECURITY_REPORT.md`.
- Güncellenen: `src/lib/tools.ts`, `tool-engine.ts`, `tools.worker.ts`, `limits.ts`, `excel.ts`, `tool-engine.test.ts`, `readiness.test.ts`.
- UI/SEO: `src/components/tool-workbench.tsx`, `src/app/[locale]/tools/[slug]/page.tsx`; sitemap aktif registry'yi kullandığı için artık kapalı yolları otomatik dışlar.
- E2E ve README güncellendi. Phase 3'ten kalan henüz commit edilmemiş dosyalar silinmedi veya geri alınmadı.
- Bu fazda yeni bağımlılık yüklenmedi, mevcut paket sürümleri değiştirilmedi.

## 6. Kalan riskler ve GO / NO-GO

**XLSX import: NO-GO.** Tekrar açılma şartları: açılım sırasında gerçek cumulative byte bütçesi, erken durdurma, tüm girdiler/sayfalar/shared strings/media için kaynak sınırları, XML/sparse dimension kötüye kullanım testleri, worker iptali ve ölçülmüş bellek davranışı. Yalnızca ZIP header veya dosya boyutu kontrolü yeterli değildir. Kolay bir environment flag ile yeniden açma seçeneği eklenmedi.

**Yedi aktif aracın yerel regresyon durumu: GO.** Test edilen akışlar çalışır; bu, genel production yayınına koşulsuz onay değildir.

**Genel production yayını: NO-GO.** Kalan bağımlılık uyarısı için yamalı browser dağıtımı veya yetkili yayın sahibinin belgeli risk kabulü gereklidir. Mevcut akışta v3/v5/v6 kullanımına rastlanmaması riski azaltır, audit temizliği sağlamaz. Gerçek SITE_URL ile build, hosting/TLS/SEO/security headers ve gerçek cihaz smoke kontrolleri de hâlâ gereklidir. Domain tanımsızken noindex/robots disallow davranışı korunur.

JSON sayısal hassasiyet, duplicate key son-değer davranışı, sınırlı dosya boyutları ve Web Worker'ın mutlak bellek sandbox'ı olmaması gibi belgeli sınırlamalar devam eder. JWT yalnızca decode eder, doğrulama yapmaz. Dosyalar sunucuya yüklenmez.
