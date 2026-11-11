# Phase 6A — Final Security and Deployment Preparation

Tarih: 11 Kasım 2026. Mevcut 12 araç korunmuştur. Yeni araç, ürün backend'i, database veya authentication eklenmedi. XLSX importları açılmadı. Deployment, domain kaydı, Git commit/push ve reklam aktivasyonu yapılmadı.

## Production kararı

**NO-GO — genel yayın için hazırlık tamamlanmadı.** Önceki ExcelJS → uuid bağımlılık engeli kaldırıldı: final tam ve production audit sonuçları **0 açık**. Yerel fonksiyonel ve statik hosting uyumluluk kontrolleri başarılıdır. Ancak domain/SITE_URL, sorumlu yayıncı kimliği, gerçek iletişim kanalı, sağlayıcıya özgü hosting veri akışları ve hukuki inceleme eksiktir. Bu eksikler giderilmeden production veya AdSense hazır kararı verilmez.

## 1. ExcelJS analizi ve bağımlılık kararı

Başlangıçtaki kullanım noktaları:

- `src/lib/excel.ts`: yalnızca CSV → XLSX export; string hücreler, başlık stili, sabit sütun genişliği ve frozen header.
- `src/lib/converter.worker.ts`: export modülünün ihtiyaç anında import edilmesi.
- `src/lib/excel.test.ts` ve `e2e/platform.spec.ts`: güvenilir, uygulamanın ürettiği küçük XLSX dosyasını tekrar okuma.
- Uygulamada kullanıcı XLSX dosyasını açan bir yol bulunmuyordu; eski importlar UI/engine/worker düzeyinde kapalıydı.

### Değerlendirilen seçenekler

| Seçenek | Sonuç |
| --- | --- |
| ExcelJS 4.4.0'ı korumak | Registry'deki sürüm hâlâ 4.4.0; uuid zincirindeki iki moderate kayıt sürüyordu. npm'nin 3.4.0 downgrade önerisi güvenli/uyumlu patch kabul edilmedi. |
| Yalnızca uuid override | Browser dağıtımındaki vendored kodu bütünüyle düzelttiğini kanıtlamaz; uygulanmadı. |
| write-excel-file 4.1.1 | İlk aday olarak kuruldu. MIT, export odaklı ve fflate tabanlıydı. Ancak `constructor`, `__proto__`, `toString` gibi düz metinlerde shared-string lookup prototip çakışmasıyla bozuk hücre referansları üretti; bağımsız okuyucu `VALUE_INVALID` hatası verdi. Regresyon testiyle reddedildi ve son bağımlılıklardan kaldırıldı. Bu, yeni bir CVE iddiası değil, yerel olarak tekrarlanan doğruluk bulgusudur. |
| **excel-builder-vanilla 5.3.1** | Seçildi. MIT lisanslı, ESM/TypeScript ve yalnızca export sağlayan, fflate 0.8.3+ kullanan alternatif. Kaynakta shared strings için null-prototype lookup ve own-property denetimi bulundu; problemli metin testi geçti. |

[Seçilen üreticinin kaynak/lisans bilgisi](https://github.com/ghiscoding/excel-builder-vanilla). Registry bakım kaydı 5 Ekim 2026; bu, bağımsız güvenlik sertifikası veya gelecekte bakım garantisi değildir.

### Son bağımlılıklar

- **Runtime eklendi:** exact `excel-builder-vanilla@5.3.1`.
- **Test-only eklendi:** exact `read-excel-file@9.3.14`, çıktıyı farklı bir kütüphaneyle doğrulamak için; exact `fflate@0.8.3`, güvenilir test çıktı ZIP/XML denetimleri için. Runtime üretici de aynı yamalı fflate sürümüne dedupe olur.
- **Kaldırıldı:** `exceljs@4.4.0` ve kullanılmayan alt paketleri; `uuid@8.3.2` zinciri de kalktı. Denenen `write-excel-file` kalmadı.
- `package.json`, lockfile ve uygulama/test kaynaklarında ExcelJS, uuid veya reddedilen writer kullanımı bulunmadığı kontrol edildi. Tarihsel raporlar doğal olarak önceki bağımlılıkları anlatmaya devam eder.
- `npm audit fix --force`, kontrolsüz major yükseltme veya node_modules yaması yapılmadı.

İlk denemede fflate 0.8.2 pin'i ek bir moderate kayıt oluşturdu: [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98), malformed ZIP64 üzerinde unzipSync sonsuz döngüsü. Uyumlu **0.8.3 patch** ile giderildi. Uygulama kullanıcı ZIP/XLSX arşivi açmaz; test okuyucusu yalnızca güvenilir üretilmiş çıktıları okur.

### Export doğruluğu ve sınırlar

- Kullanıcı CSV'si schema taşımaz. **Tarih/sayı gibi görünen veriler dahil tüm hücreler açıkça text metadata ile yazılır**; Excel tarih serisi veya number coercion yapılmaz. `00123`, `1234.50`, `2026-11-11` metin olarak korunur. Bu, önceki ürün davranışıdır.
- Hücre objeleri, style/format veya Formula tipi kullanıcıdan alınmaz. Sabit `metadata.type='text'`, kullanıcıdaki `=`, `+`, `-`, `@`, tab/CR ile başlayan içerikleri formül haline getirmez. XML'de formula elementinin bulunmadığı da kontrol edilir. Ayrı CSV export koruması değiştirilmedi.
- Türkçe/Unicode, boş hücre konumları, XML/HTML benzeri metinler, prototype benzeri değerler, başlık bold/fill, 24 birim sütun genişliği ve frozen header korunur.
- Üretici 5.3.1'in `SheetView.freezePane` metodu serialization için gerekli Pane durumunu tek başına hazırlamıyordu. Aynı sabit parametrelerle **public `Pane.freezePane` API'si de çağrılarak** frozen header üretildi. Private alan veya paket kaynağı değiştirilmedi. İlerideki üretici güncellemelerinde frozen-header regresyon testi korunmalıdır.
- XML 1.0'da geçersiz kontrol karakterleri, BMP FFFE/FFFF ve tek kalan surrogate'lar workbook oluşturulmadan reddedilir; sessizce karakter atılmaz veya bozuk XML indirilmez. EN/TR hata mesajı eklendi. Normal Unicode surrogate çiftleri/emoji geçerlidir.
- Mevcut 5 MiB CSV, 20.000 satır, 1.000 sütun, 200.000 hücre ve 32.767 karakter/hücre sınırları korunur. Export worker içinde ve lazy import ile çalışır. Bunlar sert işletim sistemi bellek bütçesi değildir.
- Microsoft Excel/LibreOffice uygulamasında manuel açılış bu fazda yapılmadı. Doğruluk, bağımsız XLSX okuyucusu ve ZIP/XML assertions ile sınandı; tüm ofis sürümleriyle uyumluluk garantisi verilmez. CR/LF gösterimi okuyucular arasında farklılaşabilir.

## 2. Static export ve hosting uyumluluğu

**Statik export gerçekten üretildi ve çalıştırıldı.** Projede SSR veri gereksinimi, API, Server Action veya kullanıcı dosyasını sunucuya gönderen özellik yok. EN/TR route'ları `generateStaticParams` ile listelenir ve `dynamicParams=false` kullanır. Sitemap/robots route'larına `force-static` eklendi.

- `npm run build`: normal Next.js server build'i korunur; `npm run start` ile çalışır.
- `npm run build:static`: `STATIC_EXPORT=1` ile `output:'export'`, çıktı **out/**.
- `npm run build:static:production`: SITE_URL boşsa build başlamadan reddedilir; dolu origin shared SEO doğrulamasından build sırasında geçer.
- Static exportta Next `headers()` kullanılamadığından yalnızca normal server modunda tanımlıdır. Statik hosting için `public/_headers` güvenlik başlıklarını, `public/_redirects` kök → `/en` geçici 302 yönlendirmesini sağlar.
- Root export HTML'i iki dil bağlantısı içerir; redirect dosyasını desteklemeyen sunucuda boş sayfa yerine fallback bulunur. Genel hostta redirect ayrıca uygulanmalıdır.
- Extensionless URL, `.html` eşlemesi, Next segment/RSC `.txt` dosyaları, worker asset'leri ve gerçek 404 korunmalıdır. Bilinmeyen yolları HTTP 200 yapan SPA fallback önerilmez.
- `.next` iki build modu arasında ortaktır. Modları aynı anda build/test etmeyin. Export build'den sonra `next start` kullanmak için normal build'i tekrar çalıştırın. Final `.next` normal build; `out` domain tanımsız statik preview durumundadır.
- `tsconfig` üretilmiş `out`/artifact/test-report klasörlerini dışlar; uygulama/test strict kuralları gevşetilmedi.

Yerel QA sunucusu `scripts/serve-static.mjs`, yalnızca statik dosya GET/HEAD, clean URL, redirect, 404 ve başlık davranışlarını denemek içindir; ürüne eklenen backend veya production server değildir.

### Önerilen hosting

**Cloudflare Pages statik hosting**, yalnızca `out/` yayınlayacak biçimde uygun hedef olarak önerilir. Build: `npm ci` ardından gerçek SITE_URL ile `npm run build:static:production`; output directory: `out`. Node 24 build ortamı yerelde kullanılan sürümle uyumludur. Functions, Next adapter veya database gerekli değildir. Fiyat/hesap erişimi veya gerçek sağlayıcı davranışı bu fazda test edilmedi.

[Cloudflare statik Next rehberi](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), [başlık dosyası](https://developers.cloudflare.com/pages/configuration/headers/), [statik sayfa sunumu](https://developers.cloudflare.com/pages/configuration/serving-pages/). Başka bir statik sağlayıcıda aynı clean-URL/404/header kuralları ayrıca yapılandırılmalıdır. Normal Next.js server hosting alternatifi de korunmuştur.

Ayrıntılı, canlıya alma yapmayan yönergeler: **DEPLOYMENT.md**.

## 3. Environment variables

| Değişken | Kullanım |
| --- | --- |
| `SITE_URL` | Gerçek HTTPS production origin; **build-time**. Domain henüz alınmadığı için boş kalır. Değişince yeniden build gerekir. |
| `STATIC_EXPORT` | Statik script otomatik olarak `1` verir. Normal Next build'de verilmez. |
| `STATIC_TEST` | Yalnızca Playwright'ın yerel statik sunucuyu seçmesi için `1`. |
| `NODE_VERSION` | Seçilen hosting'in build ortamına ait ayar; önerilen/test edilen major 24. Uygulama secret'ı değildir. |

Bu fazda API anahtarı, DB secret, `NEXT_PUBLIC_SITE_URL`, Analytics/AdSense ID veya sahte iletişim adresi eklenmedi. `.env.example` mevcut boş SITE_URL yaklaşımını korur. Yerel Node **24.22.0** kullanıldı. Production static guard'ın boş origin ile exit 1 vermesi beklenen güvenlik kontrolü olarak doğrulandı.

## 4. SEO ve politika sayfaları

- **12 aktif araç × EN/TR = 24 araç sayfası**, iki ana sayfa ile domain ayarlı sitemap **26 URL**. Kayıt/arama/kategori sayısı değişmedi; yeni araç eklenmedi.
- Mevcut unique title/description, Open Graph, semantic heading, canonical ve en/tr/x-default hreflang altyapısı korunur. Tüm aktif sayfalar ve iç bağlantılar Chromium'da kontrol edildi.
- `scripts/check-static-seo.mjs` gerçek dosya çıktısında 26 aktif URL'nin canonical/hreflang/OG ve sitemap/robots kurallarını kontrol etti. Dört kapalı import ve altı hukuki taslak sayfasının noindex ve sitemap dışı kalması doğrulandı.
- SEO kontrolünde kullanılan `https://tools.acme.dev` **sentetik test origin'idir**. Sahipliği veya canlı hosting'i iddia edilmez. Kontrol sonunda finally bloğunda gerçek/orijinal SITE_URL ile tekrar export yapılır. Bu ortamda boş SITE_URL'e dönüldü; final statik HTML'lerde fixture origin bulunmadığı ayrıca doğrulandı.
- Final preview: noindex/nofollow, robots Disallow, boş sitemap; canonical/hreflang için sahte production adresi yok. Kapalı import ve hukuki taslak sayfalarında ayrıca `noindex, follow` bulunur.
- Gerçek domain ile final hosting üzerindeki canonical, redirects, TLS, 404, robots ve sitemap henüz doğrulanamaz; yayın engelidir.

### EN/TR hukuki altyapı

Yeni sayfalar: `/en/privacy`, `/tr/privacy`, `/en/terms`, `/tr/terms`, `/en/contact`, `/tr/contact`. Footer bağlantıları ve dil geçişleri bulunur. Sayfalar **taslak/hazırlanıyor**, yürürlükte sözleşme veya uygunluk belgesi olarak sunulmaz. Noindex kalır ve sitemap'e eklenmez.

Kullanıcıdan doğrulanan bilgiler: proje Türkiye'de bireysel geliştirici tarafından yürütülür; “CSV Converter / Developer Tools Platform” geçici proje adıdır, kayıtlı şirket/tüzel kişi/marka değildir. Yayıncı kimliği, domain ve iletişim e-postası kesinleşmemiştir. Sahte e-posta, işleyen gibi gösterilen form, şirket veya adres eklenmedi.

Taslaklar kaynak incelemesine dayanır: dosya/girdiler browser worker'da, uygulama upload endpoint'i/hesap/DB yok, sadece tema localStorage'da. İndirme/pano kopyası uygulama dışında kalabilir. Uygulama çerezi, Google Analytics veya AdSense entegrasyonu saptanmadı; aktif gibi yazılmadı. Gerçek host seçilmediğinden IP/erişim logları, sağlayıcı, saklama süresi, lokasyon ve aktarım hakkında doğrulanmamış taahhüt verilmedi. Bunlar sağlayıcı seçiminde tamamlanmalıdır.

KVKK aydınlatmasında veri sorumlusu ve işleme bilgileri tamamlanmalıdır; global hedef bakımından GDPR kapsamı ayrıca değerlendirilmelidir. Kaynaklar: [KVKK aydınlatma yükümlülüğü](https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-), [Avrupa Komisyonu GDPR kapsamı](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en). Metinler hukuki inceleme gerektirir; bu çalışma mevzuata tam uygunluk görüşü değildir.

### AdSense hazırlığı

Özgün araç açıklamaları, kullanım örnekleri, FAQ ve gezinme bulunur. Bunlar tek başına Google onayı sağlamaz. Domain/site sahipliği, nihai gizlilik metni, yayıncı ve gerçek iletişim bilgileri, içerik/publisher politikaları ve sağlayıcı veri akışları tamamlanmalıdır. [Google program politikaları](https://support.google.com/adsense/answer/48182?hl=en) ayrıca incelenmelidir.

İleride reklam etkinleştirilirken ilgili bölgelerde rıza, çerez/depolama, aktarım ve gerekli CMP akışı değerlendirilmelidir; özellikle Google'ın AEA/Birleşik Krallık/İsviçre için [sertifikalı CMP gereksinimleri](https://support.google.com/adsense/answer/13554116?hl=en) dikkate alınmalıdır. Bu fazda reklam/CMP/cookie banner veya uydurma publisher-ID içeren ads.txt eklenmedi; başvuru/onay alınmış gibi davranılmadı.

## 5. Final test sonuçları

| Kontrol | Sonuç |
| --- | --- |
| `npm run lint` | Başarılı, 0 hata/uyarı |
| `npx tsc --noEmit` | Başarılı |
| `npm run test` | **201/201**, 9 dosya |
| `npm run build` | Normal production build başarılı |
| Statik export | Başarılı; configured-origin kontrolü ve domain tanımsız geri dönüş exportu da başarılı |
| Normal Next build Chromium E2E | **82/82**, 41 masaüstü + 41 Pixel 7 emülasyonu; 0 skipped/flaky/başarısız, 58,2 s |
| Statik `out` Chromium E2E | **82/82**, aynı 41+41 senaryo; 0 skipped/flaky/başarısız, 49,8 s |
| `npm audit --json`, `npm audit` | **0 açık**, exit 0 |
| `npm audit --omit=dev` | **0 açık**, exit 0 |
| Lazy-loading/bundle denetimi | Başarılı |
| `git diff --check` | Başarılı; yalnızca Windows LF/CRLF bilgilendirmeleri |

82 senaryo iki farklı sunum biçiminde çalıştırıldı; **164 farklı test** diye sayılmaz. Phase 5.4'ün 197 unit/76 E2E kapsamına dört export unit testi ve proje başına üç E2E senaryosu eklendi. Önceki C# derleme/Lighthouse sonuçları bu fazın yeni ölçümü diye sunulmaz; bu fazda Lighthouse ve manuel ekran okuyucu/gerçek cihaz/ofis yazılımı ölçümü yapılmadı.

Yeni testler: tarih/sayı/boş hücre konumları ve XML karakterleri, prototype benzeri metinler, satır/kolon/hücre/karakter limitleri, XML-geçersiz içerik reddi; iki dilde hukuki taslak/noindex/iletişim doğruluğu; **3.500 veri satırlı CSV** exportu, indirme ve bağımsız okuyucuyla tarih/sayı/formül metni/boş hücre doğrulaması.

İlk statik E2E turu **30 geçti / 52 başarısız** oldu. Trace, Next'in statik gezinmede gövdesiz ve aynı origin'e `HEAD` gönderdiğini gösterdi; eski testler bütün GET dışı istekleri upload sayıyordu. Kontroller GET/HEAD'i ayıracak şekilde düzeltildi; dış origin ve yazan HTTP metotları reddedilmeye devam eder. Uygulama upload yapacak şekilde değiştirilmedi. İlk başarısız sonuç artifact olarak korundu.

Static export sonrası tsc, `out/_next/static/media` içindeki üretilmiş TS dosyalarını kaynak sanıp hata verdi. Üretilmiş `out` ve rapor dizinleri exclude edilerek düzeltildi. İlk alternatifin prototype-cell hatası ve ikinci üreticinin frozen-pane serialization hatası da testlerde yakalandı; final testler bu sorunlar giderildikten sonra çalıştırıldı. Bu ara başarısızlıklar gizlenmedi.

### Bundle ölçümü

Yeni üretici, CSV preview veya başka araçta yüklenmiyor; yalnızca XLSX exportta yükleniyor. SQL formatter lazy loading de korunuyor. Yeni export sırasında eklenen iki JS chunk toplam **67.687 decoded byte / 22.934 byte yerel gzip tahmini**; üretici işaretli ana chunk 65.515 / 21.981 byte. Önceki Phase 5.4 ExcelJS vendor chunk'ı 931.328 / 255.817 byte idi. Kapsamlar adapter/chunk ayrımına göre farklıdır; gerçek sunucu transfer ölçümü veya tüm cihazlar için hız garantisi değildir.

Final tüm statik JS chunk toplamı 1.151.629 decoded byte, 29 chunk; bunların tamamı ilk yükte indirilmez. Gerçek istek sırası ve limitler `artifacts/bundle-summary.json` içinde. İnceleme içerik işaretleri ve ağ istekleriyle yapıldı; tam source-map treemap analizi değildir.

## 6. Kalan güvenlik riskleri ve yayın engelleri

- Bilinen dependency audit kaydı **kalmadı**; audit'in sıfır olması bilinmeyen açık bulunmadığı anlamına gelmez. Güncellemeler ve upstream bakım izlenmelidir. Export-only üreticideki Pane uyumluluk çağrısı sonraki sürümde yeniden değerlendirilmelidir.
- XLSX import kapalı kalır. Export kütüphanesini değiştirmek güvenilir decompression bütçesi olan bir import parser'ı sağlamaz. Kullanıcı arşivini açıp ZIP bomb riskinin çözüldüğü iddia edilmez.
- Native regex worker termination ve limitler korunur; sert OS bellek limiti veya matematiksel linear-time güvence yoktur. Diğer browser worker'lar da kaynak izolasyonu sertifikası değildir.
- Son E2E kapsamındaki sentetik kullanıcı verilerinde beklenmeyen veri aktarımı/log/XSS gözlenmedi. Gelecekte host, analytics, reklam veya CSP değişikliğinde tekrar test gerekir. Gerçek hosting logları henüz bilinmiyor.
- Gerçek domain/SITE_URL yok. Gerçek hostta HTTPS, headers/redirect/404, deployment erişimi, worker/CSP, indeksleme ve log/retention ayarları test edilmedi.
- Yayıncı/veri sorumlusu kimliği, gerçek iletişim, nihai EN/TR hukuki metinler ve KVKK/uygulanabilir GDPR incelemesi eksik. Contact sayfası çalışan kanal iddiasında bulunmaz.
- AdSense henüz entegre/başvurulmuş/onaylanmış değildir. Ürün içeriğinin Google tarafından kabul edileceği garanti edilmez.

## 7. Dosyalar ve kanıtlar

Başlıca değişiklikler: `src/lib/excel.ts`, `src/lib/excel.test.ts`, `src/lib/i18n.ts`, `package.json`, `package-lock.json`, `next.config.ts`, `src/app/page.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/components/platform-shell.tsx`, `src/app/globals.css`, `tsconfig.json`, `playwright.config.ts`, ağ kontrolü ve export reader güncellemeleri içeren mevcut E2E dosyaları, `scripts/check-bundles.mjs`, `README.md`.

Yeni: `src/lib/legal-content.ts`, `src/app/[locale]/[document]/page.tsx`, `e2e/phase6a.spec.ts`, `scripts/build-static.mjs`, `scripts/serve-static.mjs`, `scripts/check-static-seo.mjs`, `public/_headers`, `public/_redirects`, `DEPLOYMENT.md`, bu rapor.

Kanıtlar: `artifacts/phase6a-audit.json`, `artifacts/phase6a-static-initial-e2e.json`, `artifacts/phase6a-static-e2e.json`, `artifacts/phase6a-next-e2e.json`, `artifacts/phase6a-configured-static-seo.json`, `artifacts/bundle-summary.json`, final `test-results/results.json` ve Playwright HTML raporu. Artifacts gitignore kapsamındadır; yalnızca sentetik test verisi kullanıldı.

## Yayın öncesi sıra

1. Domain ve gerçek yayıncı/veri sorumlusu kimliği ile takip edilen iletişim kanalını tamamla.
2. Host seç, log/retention/işleyen/aktarımı belgele; EN/TR hukuki taslakları uzman incelemesiyle sonuçlandır.
3. Gerçek SITE_URL ile authorized production static build oluştur; doğru `out` çıktısını ayır. Preview/test origin'ini yayınlama.
4. Gerçek host üzerinde TLS, redirects, headers, canonical/hreflang/OG, sitemap/robots, 404, worker/export/copy ve veri aktarımı smoke testlerini yap.
5. Ancak ayrıca yetki verildiğinde yayınla; reklam entegrasyonunu ayrı hukuki/politika/performance incelemesiyle ele al. Bu rapor deployment yetkisi veya AdSense onayı değildir.
