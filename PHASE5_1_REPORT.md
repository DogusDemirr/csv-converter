# Phase 5.1 — JSON Diff ve JSON to C# Class

Tarih: 10 Kasım 2026. Bu aşamada yalnızca istenen iki araç uygulanmıştır. TypeScript generator, SQL Formatter ve Regex Tester eklenmedi. Git commit/push yapılmadı. Mevcut PHASE5_ARCHITECTURE.md incelendi ve korundu.

## URL'ler ve platform entegrasyonu

| Araç | İngilizce | Türkçe |
| --- | --- | --- |
| JSON Diff | /en/tools/json-diff | /tr/tools/json-diff |
| JSON to C# Class | /en/tools/json-to-csharp | /tr/tools/json-to-csharp |

İki araç mevcut developer kategorisi, tool registry, ana sayfa kartları, arama ve kategori filtresine bağlandı. EN/TR açıklama, kullanım adımları, FAQ, hata ve uyarılar eklendi. PlatformHeader/Footer, tema/dil geçişleri, tasarım değişkenleri ve mevcut editor-grid/workbench stilleri yeniden kullanıldı. TextPanel primitive'i her iki yeni araca ortak girdi/çıktı paneli sağlar.

Mevcut dinamik slug rotası kullanılır; ayrı rota ağacı oluşturulmadı. Metadata ve sitemap mevcut registry üzerinden çalışır. Aktif araç sayısı 9, kapalı XLSX import sayısı 2. Gerçek SITE_URL tanımlı build'de sitemap 20 aktif URL içerir; domain yokken mevcut noindex/kapalı robots/boş sitemap politikası korunur. Yeni sayfalarda tek görünür H1, özgün title/description ve OG metadata bulunur. Gerçek domain üzerindeki canonical/hreflang yayını yapılmadı.

## JSON Diff

- İki JSON input paneli; yan yana önce/sonra değerleri ve Added/Removed/Changed etiketleri.
- Object property sırası yok sayılır; nested object değerleri karşılaştırılır.
- Array'lerde sıra önemlidir; elemanlar index bazında karşılaştırılır. Son eleman ekleme/silme ve tip değişiklikleri raporlanır. LCS/move tespiti veya JSON Patch uyumluluğu iddia edilmez.
- Eksik alan, null, false, 0 ve boş string ayrılır. 1 ve 1.0 ayrıştırılmış aynı sayı kabul edilir.
- JSON Pointer yollarında / → ~1, ~ → ~0 escaping; kök boş pointer olarak raporda, okunabilir kök etiketiyle UI'de gösterilir.
- Sol/sağ JSON syntax hataları ayrılır. Clear iki girdiyi temizler; Swap girdileri yer değiştirip eski sonucu iptal eder.
- Tam fark raporu JSON olarak kopyalanır/indirilir. UI ilk 100 farkı, her path'in ilk 200 ve değerin ilk 2.000 karakterini gösterir. Tam rapor preview alanı 50.000 karakterle sınırlı; copy/download tam çıktıdır.
- Sonuç sırası deterministiktir. Prototype isimleri normal own property olarak ele alınır; global prototype değiştirilmez.

## JSON to C# Class

- Root object veya dolu object array kabul edilir; bütün bounded örnekler birlikte incelenir.
- Nested JSON nesneleri, aynı namespace içinde ayrı model sınıfları olarak üretilir; object array, nested list ve null list elemanları desteklenir.
- Property adları güvenli ASCII PascalCase'e çevrilir. Geçersiz/boş/non-Latin isimler güvenli fallback, sayıyla başlayanlar Value öneki kullanır. İsim çakışmalarına deterministik suffix eklenir.
- C# keyword class/namespace adları @ ile kaçırılır. Aynı isimli sınıflar ve sınıf adıyla çakışan üyeler ayrılır. Framework tipleri global:: ile nitelenir. System sınıf adı ve System/Microsoft namespace'leri çakışmayı önlemek için reddedilir.
- Class name ve namespace özelleştirilebilir; namespace boş bırakılabilir. Adlar ASCII gramer/uzunluk sınırıyla doğrulanır; input ham kod olarak eklenmez.
- Nullable reference types ve System.Text.Json JsonPropertyName attribute seçenekleri bağımsızdır. Attribute açıkken özgün JSON key'i güvenli C# literal olarak korunur. Kapalıyken yeniden adlandırılmış property'lerin JSON eşleşmesi garanti edilmez; görünür uyarı verilir.
- Clear girdiyi/çıktıyı temizler; Reset seçenekleri de varsayılana döndürür. Tam kod kopyalanır veya json-to-csharp.cs olarak indirilir.

### Tip stratejisi

| Girdi | Çıktı |
| --- | --- |
| string | string; tarih/UUID tahmini yok |
| boolean | bool |
| 32-bit aralığında integer | int |
| Diğer güvenli JavaScript integer | long |
| Kesirli number | double; IEEE 754 hassasiyet uyarısı |
| object | Ayrı model class |
| array | global::System.Collections.Generic.List<T> |
| Null veya eksik tipli alan | Uygun nullable değer tipi; NRT açıksa reference type'a ? |
| Null-only | JsonElement?; tip belirsizliği uyarısı |
| Empty array | List<JsonElement>; eleman tipi belirsizliği uyarısı |
| Heterojen tipler | JsonElement fallback; array'de List<JsonElement>; görünür uyarı |

int/long örnekleri birlikte bulunursa long, tam/kesirli sayılar birlikteyse double seçilir. Boş root array ve primitive root, örnek model çıkarımı yapılamadığı için reddedilir. Empty object boş bir sınıf oluşturabilir.

Exact decimal/arbitrary precision iddia edilmez. Unsafe integer ve taşma reddedilir; yüksek hassasiyetli kimlik/finansal değerler string olarak verilmelidir. Native JSON.parse duplicate key'de son değeri tutar; bu davranış UI'de belgelenir. Örnek veriden üretilen kod tam bir JSON Schema veya tüm gerçek verinin tip doğrulaması değildir.

## Worker ve kaynak sınırları

Yeni developer-tools.worker.ts yalnızca bu iki aracı çalıştırır. Modüller sabit allowlist üzerinden dinamik yüklenir; ExcelJS/Papa Parse yeni araç işlem modüllerine import edilmez. Legacy engine/worker sözleşmesi korunur; LegacyToolId ayrımı yeni araçları legacy switch'e göndermeyi tip düzeyinde engeller.

Mesajlar version/requestId ve discriminated payload taşır; worker runtime tür/opsiyon kontrolü yapar. Kullanıcıya ham exception/stack yerine sabit yerelleştirilmiş hata kodu döner. Bilinmeyen araç ve obje graph payload reddedilir.

| Sınır | Değer |
| --- | --- |
| Input | 1 MiB; Diff'te iki girdi toplamı |
| JSON derinliği | 50 |
| Düğüm | 50.000; Diff'te toplam |
| Çıktı | 1 MiB; üretim sırasında budget kontrolü |
| Fark | En fazla 2.000 |
| C# model/property | En fazla 200 sınıf / 5.000 property |
| İş yaşam süresi | Worker oluşturulmasından itibaren 5 saniye |

Main-thread timer timeout'ta worker'ı terminate eder. Girdi/ayar değişimi, swap, clear/reset ve unmount çalışan işi iptal eder; requestId/revision eski yanıtları reddeder. Object URL'leri değişim/unmount'ta revoke edilir. Bu mekanizma sert OS bellek sandbox'ı veya gerçek zamanlı CPU garantisi değildir; arka plan timer throttling ve tarayıcı bellek limitleri devam eder.

JSON yalnızca text olarak alınır; cyclic JavaScript object graph worker sözleşmesinden geçmez. $ref anahtarları çözülmez, veri olarak kalır. Ayrıştırılan JSON ağacı derinlik/düğüm kontrolünden geçmeden recursive diff/inference çağrılmaz. Ana UI thread'de JSON parse/diff/codegen yapılmaz.

## Test sonuçları

| Kontrol | Sonuç |
| --- | --- |
| npm run lint | Başarılı |
| npx tsc --noEmit | Başarılı |
| npm run test | 6 test dosyası, **135 test başarılı** |
| npm run build | Başarılı; dört yeni EN/TR araç URL'si üretildi |
| npm run test:e2e | **46 Chromium test başarılı**; desktop + Pixel 7 emülasyonu |
| npm run test:csharp | **8 fixture derlendi**, exit code 0, hata/diagnostic yok |

Unit kapsamı: nested object/array, property sırası, null/false/0/empty string, array sırası, JSON Pointer escaping, Unicode/emoji, invalid JSON, cyclic payload reddi, deep nesting, toplam input/node limitleri, fark sayısı, uzun path amplification, generated attribute output amplification, null/optional/list/numeric inference, duplicate isimler, C# keyword ve name injection, escaped literal, attribute/NRT seçenekleri, root kısıtları, sınıf/property limitleri.

Chromium kapsamı: iki araç × EN/TR; input ve gerçek worker dönüşümü; copy ve indirme dosya içeriği; dil/slug geçişi; light/dark toggle; mobil yatay taşma; clear/swap/reset; seçenekler ve fallback uyarıları; hatalı input; XSS metninin inert kalması. Mevcut CSV/JSON/Base64/JWT akışları ve iki XLSX importun kapalı kaldığı testler de geçti.

Timeout E2E kontrolü, **mesaj döndürmeyen test worker stub'ı** kullanarak 5 saniyelik UI timeout ve cancel/reset davranışını doğrular. Gerçek kötü niyetli sonsuz işlem çalıştırılmadı; bu test gerçek tarayıcı CPU/bellek izolasyonu ölçümü değildir.

### Gerçek C# derleme testi

Makinede .NET 8/9 SDK mevcut. scripts/check-csharp.mjs, mevcut TypeScript compiler'ıyla güvenilir generator kaynaklarını Node'da yüklenebilir test modüllerine dönüştürür, sekiz sentetik JSON örneğinden .cs fixture üretir ve kurulu Roslyn csc ile derler. NuGet paketi indirme veya backend oluşturma yoktur.

- Compiler SDK: 9.0.201.
- Reference pack: .NET 8.0.32.
- Language: C# 8.
- Nullable ve diğer compiler uyarıları hata olarak ele alınır; yalnızca kullanıcı seçimi escaped lowercase type adları için CS8981 bilinçli olarak hariç tutulur.
- Nested/list/numeric/nullable, missing/null, boş/heterojen diziler, çakışan isimler, keyword root/namespace, attribute injection/Unicode, options-off, framework adı JsonElement ve namespace'siz örnekler derlendi.
- Üretilen assembly **çalıştırılmadı**; JSON deserialize/serialize round-trip veya her olası girdi için compile doğruluğu iddia edilmez.

Kanıtlar: artifacts/csharp/Case*.cs, GeneratedModels.dll ve result.json; Playwright playwright-report/index.html ve test-results/results.json. Artifact dizinleri mevcut ignore kurallarına tabidir.

## Dosyalar ve bağımlılıklar

Yeni:

- src/lib/developer-tools/json.ts, json-diff.ts, csharp.ts, contracts.ts, developer-tools.worker.ts, developer-tools.test.ts.
- src/lib/developer-tool-copy.ts.
- src/hooks/use-developer-job.ts.
- src/components/tools/text-panel.tsx, developer-workbench.tsx, developer-content.tsx.
- e2e/developer-tools.spec.ts.
- scripts/check-csharp.mjs.
- PHASE5_1_REPORT.md.

Değişen: tools.ts; slug page dispatcher; globals.css; legacy tool-engine/tools.worker/ToolWorkbench tip importları; ilgili registry count/regresyon beklentileri; package.json içine test:csharp script'i; README.

Yeni npm bağımlılığı kurulmadı; package-lock.json değiştirilmedi. Heavy editor, diff paketi, C# generator paketi veya backend eklenmedi. Mimari belgesindeki legacy UI'den kapsamlı hook extraction yerine mevcut bileşen ve stilleri koruyan ayrı developer adaptörü seçildi; çalışan legacy ekranlar yeniden yazılmadı. JSON helper yeni araçların daha dar limitleri içindir; eski parser davranışı değiştirilmedi.

## Güvenlik ve kalan sınırlamalar

- Kullanıcı girdileri API'ye gönderilmez, console'a loglanmaz ve localStorage'a yazılmaz. Yalnızca tema tercihi mevcut politikayla saklanır. E2E'lerde örnek hassas veri ve beklenmeyen ağ istekleri kontrol edildi; bu tam pentest değildir.
- Code output compile/run edilmez; React metni/textarea'dır. eval, Function constructor veya kullanıcıdan import yolu yoktur. İndirilen dosya adları sabittir.
- C# string literal escaping ASCII dışını Unicode kaçışına çevirir; bidi/control/line separators ve emoji surrogate çiftleri güvenli literal olur. İsimler kod grameriyle sınırlandırılır.
- Excel→CSV/JSON engelleri değiştirilmedi. ExcelJS bağımlılık riski için yeni import veya sürüm değişikliği yapılmadı.
- Phase 3.1'deki iki moderate bağımlılık uyarısı bu fazda giderilmiş değildir; audit yeniden çalıştırılmadı. Yeni dependency eklenmemesi mevcut uyarıların çözüldüğü anlamına gelmez.
- Production domain/hosting onayı verilmedi; SITE_URL tanımsız güvenli SEO davranışı devam eder.
- Gerçek Android/iOS, Safari/Firefox, manuel ekran okuyucu testi ve yeni Lighthouse ölçümü yapılmadı. Pixel 7 sonucu emülasyondur.
- .NET 8 referansıyla C# 8 fixture derlemesi doğrulandı; tüm .NET hedefleri veya her C# girdi kombinasyonu test edilmedi.
- UI output preview sınırlıdır, tam çıktı kopyalama/indirmede bulunur. Limit aşımında sessiz eksik rapor yerine hata döner.

## Çalıştırma

```sh
npm run dev
npm run lint
npx tsc --noEmit
npm run test
npm run build
npm run test:e2e
npm run test:csharp
```

PowerShell yürütme politikası npm.ps1'i engelliyorsa npm.cmd/npx.cmd kullanın. C# testi Windows'ta kurulu .NET SDK/reference pack gerektirir; DOTNET_ROOT tanımlıysa o yol kullanılır. Test script'i mevcut Windows ortamı için hazırlanmıştır. Git commit/push ve deployment yapılmadı.
