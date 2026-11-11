# Phase 5.0 — Yeni geliştirici araçları mimarisi

Tarih: 10 Kasım 2026. Durum: **mimari öneri; uygulama yapılmadı.** Bu fazın tek çıktısı bu belgedir. Uygulama kaynakları, paketler, lockfile, araç kayıtları ve mevcut özellikler değiştirilmedi. Commit/push yapılmadı.

## 1. İnceleme ve mevcut durum

İncelenenler: package.json, src/app, src/components, src/lib, tool registry, iki worker, EN/TR içerikler, metadata/sitemap/robots, Vitest ve Playwright yapılandırmaları ve test kaynakları; PHASE3_REPORT.md ve PHASE3_1_SECURITY_REPORT.md. Çalışma ağacında **Phase 4A raporu bulunamadı**; bu fazın gerçekleştirildiği veya önceki güvenlik engellerinin giderildiği varsayılmadı. Kurulu Next.js paketindeki App Router page rehberi de okundu.

| Alan | Mevcut uygulama |
| --- | --- |
| Stack | Next.js 16.4.5 App Router, React 19.3, strict TypeScript, Tailwind 4 |
| İşlem paketleri | Papa Parse 5.7 ve ExcelJS 4.4; yeni geliştirici aracı kütüphanesi yok |
| Registry | src/lib/tools.ts; tuple definitions → allTools; security-policy filtresi → aktif tools; ToolId slug'lardan türetilir |
| Aktif durum | 7 aktif araç; excel-to-csv ve excel-to-json kapalı, bilgilendirme URL'leri korunur |
| Keşif | ToolDirectory arama/filtre/kartları tools listesinden; popüler seçki ayrıca üç sabit slug kullanır |
| Rota | /[locale]/tools/[slug]; generateStaticParams allTools listesinden; bilinmeyen slug/dil 404 |
| Ortak UI | PlatformHeader/Footer, ToolWorkbench, tool-directory; CSV→Excel için ayrı Converter |
| Genel dönüşüm | tools.worker.ts → runTool(id, input, options); file okuma ve dönüşüm tarayıcıda |
| CSV→Excel | converter.worker.ts parse/export mesajları; export sırasında ExcelJS dinamik yüklenir |
| Worker yaşamı | ToolWorkbench her run için worker yaratır; bitince sonlandırır; değişim/reset/unmount iptal eder; revision stale sonucu engeller |
| Çıktı | Tek text, json/csv/txt uzantısı; textarea preview ilk 50.000 karakter; copy/download tam çıktı |
| Dil | Legacy CSV metinleri i18n.ts; araç adı/açıklama/kullanım registry'de; hatalar tool-messages.ts; UI'nin bir bölümü inline EN/TR |
| SEO | pageMetadata; SITE_URL varsa canonical/hreflang/OG URL; yoksa noindex, kapalı robots ve boş sitemap |
| Sitemap | Yalnızca aktif tools; domain yapılandırıldığında mevcut toplam 16 URL |
| Test | Vitest src/**/*.test.ts; Playwright production server:3100, desktop Chromium + Pixel 7 emülasyonu |

Son raporlanan sonuçlar Phase 3.1'de **90 unit ve 32 E2E testi**. Phase 3'ün önceki 97/28 sayıları bugünkü aktif özellik kapsamını temsil etmez. Bu mimari fazında test/build/audit yeniden çalıştırılmadı; geçmiş rapor sonuçları güncel koşu olarak sunulmaz.

### Mevcut yapının sınırları

- Registry keşfi otomatiktir; çalışma alanı, seçenekler ve runTool switch'i henüz registry tarafından tanımlanan yetenekler değildir. Sadece slug eklemek yeni aracı çalıştırmaz.
- ToolWorkbench tek girdi ve birkaç dönüştürücüye özel seçenek taşır. JSON Diff iki JSON; Regex Tester pattern + flags + test metni ister.
- Result yalnızca metin çıktısıdır. Diff satırları, regex match/capture listeleri ve kod uzantıları için genişletilmelidir.
- JSON parse/structure kontrolü tool-engine.ts içinde private'tır: 5 MiB, derinlik 100, 200.000 düğüm; unsafe integer/overflow reddi vardır. Paylaşılan parser dış API'si yoktur.
- Yeni işlerde iş-zamanı sınırı yoktur. Mevcut worker ayrımı regex ReDoS için tek başına yeterli değildir.
- Metadata, How to Use ve FAQ şablonunda dönüştürücü dili baskındır. Yeni araçlar için özgün EN/TR kullanım ve FAQ içeriği gerekir.
- Bazı testlerde aktif araç/sitemap sayıları sabittir. Yeni araçlar yayımlandığında bağımsız beklenen slug listeleriyle bilinçli olarak güncellenmelidir.

## 2. Mimari karar

**Mevcut registry ve rota korunacak; yeni araçlar ayrı bir developer araç adaptörüyle eklenecek.** Yeni backend, API endpoint, authentication, veritabanı veya yeni kategori gerekmez. Beş araç da mevcut JSON & Developer Tools kategorisine aittir.

```text
Statik registry metadata ─→ katalog / arama / EN-TR / SEO / aktif sitemap
          │
          └─→ mevcut /[locale]/tools/[slug] Server Component
                         │
              mevcut shell + uygun çalışma alanı
                         │
              ortak run/copy/download/reset yaşamı
                         │
              mesaj doğrulama + main-thread deadline
                         │
              dedicated developer worker
                         │
              sabit allowlist ile lazy tool modülü
                         │
              sınırlı text veya structured sonuç
```

Legacy ToolWorkbench, runTool ve converter.worker dış sözleşmeleri korunur. Yeni araçların büyük modülleri legacy engine'e, ana sayfaya veya server metadata modüllerine statik import edilmez. Özellikle ExcelJS yeni araç modüllerinden transitif olarak dahi import edilmez.

### Registry ve otomatik keşif

İlk uygulama adımında registry metadata'sı mevcut slug/ad/kategori alanlarını koruyarak tipli nesnelerle genişletilir; tuple→object geçişi gerekirse ayrı, davranış koruyan adımda yapılır. Önerilen ek alanlar: status, workspace, inputKind, outputKind ve sınırlı seçenek tanımı. İşlev veya kütüphane nesneleri serializable metadata içine konmaz.

| Planlanan slug | Çalışma alanı | Çıktı |
| --- | --- | --- |
| json-diff | İki JSON input + değişiklik listesi | JSON diff raporu (.json) |
| json-to-csharp | JSON input + root class adı | C# sınıfları (.cs) |
| json-to-typescript | JSON input + root type adı | TypeScript tipleri (.ts) |
| sql-formatter | SQL input + açık dialect seçimi | SQL metni (.sql) |
| regex-tester | Pattern/flags + test metni | Match/capture raporu (.json) |

Her slug `/en/tools/{slug}` ve `/tr/tools/{slug}` yollarını kullanır. Planlanan araç bu fazda registry'ye eklenmez. Uygulama sırasında `planned` kayıtlar kullanılırsa katalog, build rotası ve sitemap bunları ayrı ayrı dışlamalıdır; mevcut allTools davranışı planned slug'ları otomatik yayımlamamalıdır. Tamamlanmış araç ancak testleri geçince active olur. İki XLSX import kaydı disabled kalır ve mevcut security-policy engelleri korunur.

Araç yayınlanınca metadata kaydı üzerinden katalog/arama/dil/rota/sitemap keşfedilir; çalışma alanı dispatcher ve worker handler için derleme zamanı exhaustiveness testleri bulunur. Popüler seçki otomatik istatistikmiş gibi değiştirilmez.

## 3. Yeniden kullanılacak bileşenler

| Mevcut parça | Yeni araçlarda kullanım |
| --- | --- |
| PlatformHeader / PlatformFooter | Aynen; dil geçişi slug'ı korur, tema yalnızca tema tercihini saklar |
| ToolDirectory / tools | Aynı arama, kategori, kart ve empty state davranışı |
| pageMetadata / seo / sitemap / robots | Aynı domain güvenlik politikası; yalnızca aktif araçları keşfetme |
| ToolWorkbench input/output yapısı | Mevcut textarea, label, status/alert ve action düzeninden ortak primitive çıkarma |
| Worker revision ve cleanup | Aynı stale-result/reset/unmount yaklaşımı; yeni hook'ta deadline ve protokol doğrulamasıyla genişletme |
| readUtf8 / MAX_BYTES | JSON/text dosyalarının yerel okunması; yeni araca daha düşük sınır koyabilme |
| JSON kontrol mantığı | JSON parse/limit davranışını ortak helper'a kontrollü çıkarma; eski çağrıların sonuçlarını regresyon testleriyle koruma |
| globals.css değişkenleri | Mevcut navy/teal, dark/light, focus, responsive ve reduced-motion |

Copy/download nesne URL cleanup mantığı tek yerde toplanır. Ortak hook/primitive çıkarımı eski input ID'lerini, erişilebilir etiketleri, dosya kabulünü ve test seçicilerini korur. Legacy ekranları bir seferde yeniden yazmak yerine önce yeni adaptör bu ortak parçaları kullanır; eski ekran adaptasyonu ancak davranış eşitliği testleriyle yapılır.

### Code editor kararı

İlk sürüm için **Monaco/CodeMirror gerekmez**. Mevcut monospace textarea temel alınır; spellcheck kapalı, wrap kontrolü, açık label ve erişilebilir hata bölgesi sağlanır. Syntax renklendirme, autocomplete veya çalıştırılabilir preview yoktur. Code output React metni/readonly textarea olarak gösterilir. Diff ve match satırlarında bounded React text node'ları kullanılabilir; HTML string üretimi yapılmaz.

Desktop'ta iki kolon; mobilde girişler ve çıktı dikey sıralanır. Tüm paneller min-width:0 ve kendi yatay scroll'una sahip olur. Diff yalnızca kırmızı/yeşille anlatılmaz: Added/Removed/Changed metni ve semboller de bulunur. Çıktı katlama/pagination ve 50.000 karakter preview sınırı büyük DOM oluşumunu engeller.

Clear girdileri/sonucu temizler; Reset seçenekleri de varsayılana döndürür. İkisi de işi sonlandırır, revision artırır, timer ve object URL'leri serbest bırakır. Input/ayar/dil/route değişiminde eski çıktı kopyalanamaz veya indirilemez. Clipboard başarısızlığı mevcut download alternatifini korur.

## 4. Worker ve mesaj sözleşmesi

Yeni `developer-tools.worker.ts` yalnızca yeni beş aracın dispatch'ini yapar. Her Run için ayrı worker; tek eşzamanlı iş; otomatik her tuşta çalıştırma yok. Regex ayrı çalışma işi olarak aynı dedicated worker girişini kullanabilir: modülün compile ve match işlemleri tamamen worker içindedir.

Önerilen sözleşme, uygulanacak kod değil:

```text
Request = version + requestId + toolId + araç türüne göre discriminated payload
Response = version + requestId + toolId + success/result veya error/code
Result = kind(text | code | diff | matches) + bounded preview/data
         + text/download content + extension + mime + warnings
```

Payload'lar: diff için left/right; generators için json/rootName; SQL için sql/dialect/indent; regex için pattern/flags/testText. Runtime doğrulaması worker'da byte/uzunluk/tür/enum sınırlarından **önce parser çağırmaz**. UI kontrolü ek kolaylıktır; worker kontrolünün yerine geçmez. Bilinmeyen tool/flag/dialect/version açık hata ile reddedilir. Dynamic import yolu kullanıcı string'inden oluşturulmaz; yalnızca sabit handler tablosudur.

Main thread deadline timer'ı worker oluşturulurken başlar; modül başlangıcı da bütçeye dahildir. Timeout'ta main thread worker.terminate çağırır ve geç gelen tüm mesajları requestId/revision ile reddeder. Worker içindeki Promise.race veya setTimeout, bloklanan regex yürütmesini kesme yöntemi sayılmaz. messageerror, onerror ve import hataları input içermeyen sabit kodlarla gösterilir.

Yeni araçlar için hata kodları örneğin invalid-json-left/right, invalid-root, invalid-name, unsupported-dialect, invalid-pattern, invalid-flags, timeout, input-limit, result-limit, engine-unavailable. Ham exception mesajı, stack veya SQL/regex/JSON parçası console/telemetry/UI'ye geri basılmaz. Hata konumu gerekiyorsa yalnızca bounded line/column sayısı taşınır.

### Önerilen ilk kaynak bütçeleri

Bu rakamlar **başlangıç ürün sınırlarıdır; benchmark veya güvenlik garantisi değildir**. Phase 5.1'de Chromium desktop/mobil sonuçlarına göre düşürülebilir; mevcut araç limitleri değiştirilmez.

| Araç | Girdi ve yapısal sınır | Çıktı/iş sınırı |
| --- | --- | --- |
| JSON Diff | İki tarafın toplamı 1 MiB; derinlik 50; toplam 50.000 düğüm | 2.000 değişiklik, 1 MiB çıktı; limitte sessiz eksiltme yerine hata; 5 s lifecycle deadline |
| JSON generators | 1 MiB, derinlik 50, 50.000 düğüm | 200 tip, 5.000 property, 1 MiB kod; 5 s deadline |
| SQL Formatter | 256 KiB ve 10.000 satır | 1 MiB çıktı; 5 s deadline, dialect allowlist |
| Regex Tester | Pattern 2.048 UTF-16 birimi; test metni 64 KiB; flags bounded enum | 1.000 match, match başına 32 capture, 1 MiB rapor; 1 s lifecycle deadline |

Üretim sırasında sonuç/düğüm/type bütçeleri sayılır; önce sınırsız tüm sonucu üretip en sonda boyut kontrolü yapılmaz. Regex'te tek exec çağrısı içinde durdurma yapılamadığı için main-thread worker iptali zorunludur. Worker process belleği veya scheduler için sert bir OS sınırı sunmaz; arka plan timer throttling ve düşük bellek durumları ayrıca sınırlandırma olarak belgelenir.

## 5. Araçlara özel davranış ve güvenlik

### JSON Diff

Yapısal karşılaştırma: nesne key sırası önemsiz, array sırası önemlidir; array elemanları index bazında eşleşir. Minimal edit/LCS veya akıllı move tespiti ilk kapsamda yoktur; böylece karesel array diff maliyetinden kaçınılır. Eksik property ile null, string "1" ile number 1 ayrılır. Sonuç deterministik Added/Removed/Changed kayıtları; path JSON Pointer biçiminde ~ ve / kaçırılarak üretilir. JSON Patch uyumluluğu iddia edilmez.

Object.keys/Object.hasOwn/Map kullanılır; input'lar Object.assign veya spread ile ortak prototiplere merge edilmez. __proto__, constructor ve prototype normal veri anahtarıdır. Iterator ve karşılaştırma bütçeli olmalıdır. Kullanıcı verisi HTML diff şablonuna konmaz.

### JSON to C# Class / JSON to TypeScript

İki araç aynı bounded inference modelini kullanır; dil render'ları ayrıdır. Çıktı yalnızca **örnek veriden tahmini tip**tir; tam JSON Schema, runtime doğrulayıcı veya tüm gerçek verinin garantisi değildir. Kod tarayıcıda eval/Function/dynamic module ile çalıştırılmaz.

İlk kapsam: root object veya dolu object array; root primitive ve root boş array açıklayıcı hata verir. Nesne dizisinde bütün bounded örnekler incelenir; ilk elemana göre tahmin yapılmaz. Eksik alan optional, null nullable; boş nested array TypeScript unknown[] ve C# List<JsonElement> gibi muhafazakâr tipe gider. Tarih/UUID görünümlü string'ler otomatik özel tipe çevrilmez.

TypeScript'te number/string/boolean/null, union ve nested interface/type desteklenir; property adları güvenli string-literal escaping ile korunur. C# için System.Text.Json, nullable reference types varsayımı ve JsonPropertyName attribute'ları belgelenir. Güvenli integer için long, kesirli sayı için double; null/heterojen/çıkarılamayan alanlarda JsonElement veya nullable/optional davranışı açıkça tanımlanır. Decimal hassasiyeti iddia edilmez.

Root type/namespace ve türetilen identifier'lar izinli gramer, keyword kontrolü ve deterministik çakışma çözümü kullanır. İsimler/JSON key'leri ham kod, comment, attribute veya dosya yoluna eklenmez. C# string escaping, TypeScript literal escaping ve kontrol/Unicode satır ayırıcıları ayrı test edilir. Download dosya adı sabit araç adı + allowlist uzantıdır.

Mevcut unsafe integer/overflow reddi korunur. Çok hassas ondalıkların tam korunmadığı ve native JSON.parse'ın duplicate key'de son değeri tuttuğu açıkça belirtilir; JSON Diff bunu tam kaynak-metin diff'i gibi sunmaz. Yeni bir lossless JSON parser bu ilk kapsamda zorunlu değildir; kısıtın kabul edilmediği kullanımda araç yayımlanmaz.

### SQL Formatter

Sadece yerel biçimlendirme yapar; sorgu çalıştırmaz, DB'ye bağlanmaz, SQL güvenliği veya semantik doğruluğu onaylamaz. Kullanıcıya açık küçük bir dialect allowlist'i; generic SQL varsayılanı. Desteklenmeyen procedural syntax için açık hata; sessiz başka dialect'e geçiş yoktur.

Formatter worker içinde lazy yüklenir. Kullanıcının SQL/string/comment verileri formatter parametreleri olarak kalır. Template evaluation, custom callback/function ayarı ve placeholder substitution ilk sürümde açılmaz. Özellikle SQL formatter paketinin parametre replacement kabiliyeti ürün kapsamına alınmaz. Quote/comment içeriği ve keyword casing etkileri fixture testleriyle kontrol edilir.

### Regex Tester

Motor: tarayıcının **native JavaScript RegExp**'i; C#/PCRE/RE2 uyumluluğu iddia edilmez. RegExp constructor pattern derlemek içindir; JavaScript eval veya Function constructor değildir. Pattern compile, flag kontrolünün engine'e bağlı bölümü ve exec döngüsü worker dışında yapılmaz.

İlk flags allowlist'i g/i/m/s/u; duplicate ve bilinmeyen flags reddedilir. g yoksa ilk eşleşme; varsa limitli bütün eşleşmeler. Zero-width match'te index, u modunda code point ve diğer durumda UTF-16 birimi gözetilerek ilerletilir; lastIndex döngüsüne karşı test zorunludur. Match konumları UTF-16 index olarak etiketlenir; lookbehind, named groups ve tarayıcı destek farkları için açıklayıcı hata bulunur.

Native backtracking ReDoS riski taşıyabilir. Regex'i "safe" yapan kara listeye güvenilmez. Düşük pattern/metin sınırı, yalnızca Run ile çalışma, tek worker, main-thread timeout/terminate ve match/çıktı sınırı birlikte uygulanır. Bu yaklaşım linear-time veya mutlak bellek garantisi sunmaz. Timeout/cancel ve UI tepki testleri geçmeden regex active yapılmaz; gerekirse planned kalır. RE2/WASM gelecekte ayrı uyumluluk/maliyet kararıdır, bu fazda zorunlu bağımlılık değildir.

Match highlighting gerekirse input text indexlerinden React text ve mark düğümleri olarak üretilir. Kullanıcı metni içeren HTML replacement, innerHTML veya regex replace callback'inden HTML çıktısı yoktur.

## 6. Gerekli bağımlılıklar

**Phase 5.0'da kurulum yoktur.** Önerilen bütçe:

| Bağımlılık | Karar ve gerekçe |
| --- | --- |
| JSON Diff paketi | Gerekmez; sınırlı index bazlı yapısal diff, yerel algoritma |
| JSON→C#/TS generator | Gerekmez; ortak küçük inference modeli ve iki renderer |
| Code editor / syntax highlighter | Gerekmez; erişilebilir mevcut textarea temeli |
| sql-formatter | Yalnızca SQL Formatter için aday tek production paketi; çok dialect'i elle regex'lerle biçimlendirmek yerine ayrıştırıcı tabanlı formatter. Phase 5.1'de sürüm, license, transitif audit, browser/worker build, bundle boyutu ve eval/Function kullanımı incelenip test edilmeden eklenmez |
| Regex kütüphanesi | İlk sürümde gerekmez; native RegExp + deadline/terminate. Motor sınırlamaları açıkça gösterilir |
| Test araçları | Mevcut Vitest, TypeScript ve Playwright yeterli; yeni runner yok |

sql-formatter resmî README'si browser kullanımı/dialect seçeneklerini ve bazı procedural syntax sınırlamalarını belgeler. Bu mimari öneri paketin tüm sürümlerinin eval-free/açığı yok olduğu iddiası değildir; kesin sürüm Phase 5.1 kabul kapısında seçilir. Kabul başarısızsa SQL Formatter yayımlanmaz; unsafe fallback yazılmaz. CDN'den runtime script veya worker indirme yoktur.

## 7. Yeni dosya ve değişiklik planı

Yollar öneridir; bu fazda oluşturulmadılar.

```text
src/components/tools/
  text-input.tsx                Mevcut textarea/label düzeninden primitive
  output-panel.tsx              Bounded preview, metin/code/diff/match görünümü
  tool-actions.tsx              Copy/download/clear/reset ortak UI
  developer-workbench.tsx       Tek/çift input ve araç seçenek adaptörleri
src/hooks/
  use-tool-job.ts               Revision/requestId, worker ve main deadline yaşamı
  use-tool-output.ts            Blob URL, clipboard ve cleanup
src/lib/developer-tools/
  contracts.ts                  Discriminated request/result ve runtime guard
  limits.ts                     Yeni araca özel budgets
  dispatch.ts                   Sabit lazy import tablosu, registry eşleşmesi
  developer-tools.worker.ts     Worker giriş noktası
  json-validation.ts            Bounded JSON helper, legacy uyumluluk seçeneği
  json-diff.ts                  Bütçeli yapısal karşılaştırma
  infer-types.ts                Ortak inference modeli
  identifiers.ts                İsim/keyword/collision ve literal escaping
  json-to-csharp.ts             C# renderer
  json-to-typescript.ts         TypeScript renderer
  sql-formatter.ts              İncelenmiş paketin dar adaptörü
  regex-tester.ts               Compile/exec/capture ve bounded rapor
  *.test.ts                     Unit/security senaryoları
src/lib/developer-tool-copy.ts  EN/TR açıklama, seçenek, How to Use, FAQ
e2e/developer-tools.spec.ts     Yeni araçların desktop/mobil E2E paketi
```

Mevcut dosyalarda gelecekte sınırlı değişiklikler: tools.ts (kayıtlar/status/workspace), slug page (dispatcher ve özgün içerik), tool-messages.ts (kodların EN/TR karşılığı), tool-workbench.tsx (davranış koruyan primitive/hook çıkarımı), globals.css (gerekli responsive görünümler). Sitemap aynı aktif registry'yi kullanır; yeni rota ağacı açılmaz. security-policy.ts XLSX engelleri gevşetilmez; excel.ts/converter.worker.ts yeni araç uygulaması için değiştirilmez.

## 8. Güvenlik değişmezleri ve kalan riskler

- Kullanıcı JSON/SQL/pattern/metni, örnekleri ve hata payload'ları API'ye gönderilmez; query string, route, localStorage, sessionStorage, IndexedDB veya telemetriye yazılmaz. Sadece mevcut tema tercihi saklanır.
- Yeni modüllerde console, eval, Function constructor, kullanıcıdan import yolu, HTML injection ve kullanıcı girdisinden executable dynamic import yoktur.
- Yeni UI ve error handler'lar açıklama/metin üretir; code preview compile/run etmez. Dosyalar düz text/code olarak indirilir.
- Worker mesajları güvenilir TypeScript nesnesi varsayılmaz; raw boyut/tür/option validation hem UI kolaylığı hem worker güvenliği olarak ayrılır.
- Deep JSON, geniş objeler, çok sayıda generated type/match ve output amplification bütçeleri üretim sırasında uygulanır. Worker isolation, bellek/CPU sandbox'ı diye tanıtılmaz.
- Excel→CSV/JSON UI, engine ve worker engelleri kalır. Yeni registry durumu bu araçları yanlışlıkla active yapamaz.
- Phase 3.1'deki iki moderate ExcelJS/uuid kaydı ve genel NO-GO kararı bu belgeyle çözülmüş değildir; audit bu fazda yenilenmedi. Yeni araç dependency graph'ı ExcelJS içermeyecek; export için mevcut kütüphane riski ayrıca yönetilmeye devam eder.
- SITE_URL ve production hosting engelleri korunur. Phase 5.0 bir yayın onayı değildir.

## 9. Test stratejisi ve kabul kapıları

### Unit / sözleşme

- Registry: her active slug için metadata/workspace/handler; unknown request reddi; planned/disabled araçların katalog/sitemap dışı kalması. Tüm beklenen slug'ları yalnızca aynı registry'den türeten tautolojik testler yerine bağımsız kabul listesi bulunur.
- JSON: boş/bozuk/BOM/Unicode/nested/null/primitive; missing vs null; unsafe numbers; depth/node/byte sınırları; __proto__/constructor ve duplicate key politikasının açık testleri.
- Diff: key sırası, array sırası, ekleme/silme/değişme, pointer escaping, limit ve deterministik çıktı.
- Generators: farklı örnek alanları, optional/null/union, boş array, heterojen array, keyword ve isim çakışması, Türkçe/emoji key, quote/newline/comment injection. TS çıktısı test ortamında mevcut TypeScript compiler API ile type-check edilir; tarayıcıda compile edilmez. C# için golden fixtures ve escaping testleri zorunlu; uygun .NET SDK yoksa compile testinin yapılmadığı raporlanır.
- SQL: dialect allowlist, malformed syntax, quote/comment/string içeriği, Turkish/Unicode, byte/satır/output sınırı; bağımlılığın değerlendirilmiş sürümüyle golden fixture.
- Regex: invalid pattern/flag, duplicate flag, match/no match, Unicode/capture/zero-width, match/output limitleri. Gerçek native regex'in bitmeyebileceği durum aynı Vitest thread'inde çalıştırılmaz; timeout yönetimi fake worker/fake timers ile unit test edilir.
- Hook: reset/unmount/timeout/import error, requestId uyuşmazlığı, stale response, clipboard rejection, object URL ve timer cleanup.

### Chromium E2E

Mevcut desktop ve Pixel 7 projeleri korunur. Beş yeni aracın her birinde geçerli/bozuk/boş/limit girdi; EN/TR slug geçişi; light/dark; label/tab/focus; copy, download içeriği, clear/reset ve mobil overflow test edilir. Diff için iki alan hatası ayrı gösterilir.

Regex ReDoS senaryosu kısa ama zor bir pattern/metinle **yalnızca browser worker** içinde, test runner'ın ayrıca üst süre sınırı altında denenir; timeout'tan sonra UI etkileşimi ve sıradaki normal iş doğrulanır. Büyük zararlı dosya veya ana thread'de kontrolsüz regex çalıştırılmaz. Named group/match metni ve SQL/JSON XSS örnekleri DOM'a HTML olarak giremez.

Beklenmeyen dış servis/non-GET istekleri ve örnek hassas console verisi izlenir; storage'ta input bulunmadığı kontrol edilir. Playwright trace/screenshot'ın test verisi içerebileceği unutulmaz: yalnızca sentetik örnekler kullanılır, gerçek secret/JWT alınmaz.

Mevcut CSV→Excel indirme/formül testleri, yedi araç regresyonları ve iki XLSX importun dosya okuma öncesi reddi zorunlu kalır. Sabit 7/16 beklentileri kademeli active araç listesine göre değiştirilir; kapalı importlar her durumda dışarıda kalır. Beş araç tamamlanırsa 12 active araç ve SITE_URL tanımlıyken 26 sitemap URL'si beklenir; bu sayı bugün mevcut değildir.

### Build, bağımlılık ve performans

Her davranış değişikliğinden sonra uygun testler; tamamlandığında lint, tsc --noEmit, unit, production build ve E2E. SQL paketi için kurulum öncesi/sonrası audit farkı ve mevcut iki uyarıya ek risk kaydı zorunlu. Ana sayfa/JSON araçlarında SQL formatter veya ExcelJS modülünün sırf registry importuyla yüklenmediği build/network incelemesiyle doğrulanır. İki input ve bounded output için mobil ölçüm yapılır; yeni skorlar ölçülmeden eski Lighthouse 100 sonucu devralınmaz.

## 10. Phase 5.1 uygulama planı

1. **Başlangıç doğrulaması:** mevcut 90 unit/32 E2E raporunu yeni koşuyla doğrula; bağımlılık audit'ini yenile; XLSX fail-closed durumunu kaydet. Varsa kullanıcıya ait değişiklikleri koru.
2. **Ortak temel:** mevcut sözleşmeleri kırmadan input/output/actions primitive'leri, job/output hook'ları, tipli request/result, runtime guard, deadline ve sabit lazy dispatch ekle. Yeni URL'leri henüz active yapma.
3. **JSON temeli:** bounded JSON validation extraction ve inference/escaping kuralları; legacy parser davranışı için regresyonlar. JSON Diff'i ilk dikey dilim olarak tamamla.
4. **Kod üreticileri:** ortak model üzerine TS ve C# renderer'larını sırayla uygula; escaping/type-check ve örnek tabanlı çıkarım uyarılarıyla tamamla.
5. **SQL:** sql-formatter'ın kesin sürüm/lisans/audit/browser-worker/CSP uyumluluğunu incele. Kabul edilirse yalnızca worker'da lazy adaptör kur; aksi halde araç planned kalsın.
6. **Regex:** düşük sınırlar ve explicit Run; compile/exec worker içinde; main-thread deadline/terminate, zero-width/capture limit testleri. Süre/iptal ölçümü geçmiyorsa active yapma.
7. **EN/TR ve SEO:** tamamlanan her araç için özgün içerik/FAQ/metadata ve mevcut slug route dispatcher'ı; active durumunu yalnızca kabul testlerinden sonra aç. Yeni araçlara özel rota dosyaları çoğaltma.
8. **Son kabul:** bütün unit/E2E/build kontrolleri; mobil/erişilebilirlik, ağ/storage gizliliği, bundle ve audit farkı; uygulanan özellikler/limitler/kalan riskleri sonraki faz raporunda belirt. Commit/push veya deployment bu planla otomatik yetkilendirilmez.

## 11. Phase 5.0 doğrulaması ve kaynaklar

Bu fazda yalnızca inceleme ve bu belge yazımı yapılmıştır. Paket kurulumu, yeni araç kaydı/uygulaması, test çalıştırma, build, audit, yayın, commit veya push yapılmadı. İnceleme başında Git çalışma ağacı temizdi; son Git kontrolünde yalnızca PHASE5_ARCHITECTURE.md yeni dosyası göründü; mevcut kaynaklarda değişiklik yoktur.

Kaynaklar: kurulu Next.js `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`; yerel Phase 3/3.1 raporları ve yukarıdaki kod yolları. Haricî teknik doğrulama için [SQL Formatter resmî deposu](https://github.com/sql-formatter-org/sql-formatter), [MDN RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp), [MDN Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate) incelendi. Paket sürümü veya güvenlik durumu bu kaynak okumalarıyla sertifikalandırılmadı.
