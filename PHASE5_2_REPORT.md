# Phase 5.2 — JSON to TypeScript ve SQL Formatter

Tarih: 10 Kasım 2026. Mevcut Phase 5.1 kodu ve raporu incelendi; yalnızca bu fazdaki iki yeni araç eklendi. Önceki değişiklikler korunmuştur. Git commit/push yapılmadı; deployment gerçekleştirilmedi.

## URL ve entegrasyon

| Araç | İngilizce | Türkçe |
| --- | --- | --- |
| JSON to TypeScript | /en/tools/json-to-typescript | /tr/tools/json-to-typescript |
| SQL Formatter | /en/tools/sql-formatter | /tr/tools/sql-formatter |

Mevcut tool registry, Developer kategorisi, arama/kartlar, EN/TR ve light/dark tema kullanılır. Aktif araç sayısı 11'dir. Excel→CSV/JSON importları kapalıdır; fail-closed testleri korunur. Regex Tester eklenmedi.

Sayfalar aynı slug rotasında üretilir. Özgün title/description, kullanım alanı, How to Use ve FAQ içerikleri eklendi. SITE_URL tanımlı üretim build'inde sitemap 24 aktif URL içerir. Tanımsız domain için noindex, kapalı robots ve boş sitemap politikası değişmedi. Gerçek hosting/domain yayını bu görev kapsamında doğrulanmadı.

## JSON to TypeScript

- Interface veya type alias üretimi; özelleştirilebilir root type adı.
- Nested object modelleri, typed array, nested array ve heterojen elemanlar için union type desteği.
- Optional alan stratejileri: yalnızca örneklerde eksik alanlar (varsayılan), tüm alanlar veya tümü zorunlu. Son seçenek eksik örnekleri de zorunlu yaptığı için uyarı verir.
- Null stratejileri: null'u tipte tut (varsayılan) veya null örneğinden unknown çıkar. Unknown daha geniş bir tiptir; kullanıcı uyarılır.
- Empty array → unknown[]. Null-only → varsayılanda null; diğer stratejide unknown. Tarih/UUID veya literal değer tipleri tahmin edilmez.
- Nonempty object array, tek modelin örnekleri olarak değerlendirilir; bütün kayıtların alanları birlikte incelenir. Type alias modu ayrıca primitive, boş veya heterojen array köklerini destekler. Interface modu object veya nonempty object array ister.
- ASCII root identifier grameri/uzunluk ve TypeScript keyword kontrolü. Geçersiz/Unicode/reserved property adları çift tırnak ve güvenli literal escaping ile özgün halleriyle korunur.
- Nested tip adlarına deterministik collision suffix eklenir. Prototype key'leri own property olarak ele alınır; kullanıcı verisi bir runtime nesne prototipine merge edilmez.
- Copy ve .ts download tam çıktıyı içerir. Kod tarayıcıda compile/execute edilmez.

### TypeScript doğruluğu

Vitest içinde gerçek kurulu TypeScript compiler API kullanıldı: strict, noEmit, exactOptionalPropertyTypes ve ES2022 lib. Altı bağımsız generated modül aynı programda kontrol edildi; compiler diagnostic listesi boştu. Örnekler nested object/array/null, optional samples, quoted Unicode/invalid identifier, isim çakışması, constructor adı, injection benzeri key, heterojen root/type alias, unknown null ve required seçeneklerini içerir. Tüm olası JSON kombinasyonlarının derlendiği iddia edilmez.

JSON sayı hassasiyeti JavaScript ile sınırlıdır; unsafe integer/overflow reddedilir. Duplicate JSON key için son değer tutulur. Tipler örnekten çıkarımdır; tam schema veya runtime doğrulama garantisi değildir.

## SQL Formatter — doğrulanmış kapsam

- Öncelikli varsayılan dialect SQL Server Transact-SQL; ikinci seçenek genel SQL.
- Keyword uppercase/lowercase/preserve ve 2/4 boşluk girinti.
- SELECT, DML ve CTE örnekleriyle yerel biçimlendirme.
- String literal/N-prefixed literal, escaped quote, @UserId gibi T-SQL parametreleri, genel SQL :UserId ve positional parametreler için kontrollü seçenekler.
- SQL Server bracket identifier ve escaped ]] ile genel double-quoted identifier korunur.
- Parametre substitution, identifier/function/data-type case dönüşümü veya kullanıcıdan formatter callback/config yükleme açılmadı. Uygulama asla DB bağlantısı kurmaz veya sorgu çalıştırmaz.

### Metin koruma kontrolü

Formatter öncesi ve sonrası sınırlı lexical scan yapılır. Literal, yorum, quoted identifier, parametre ve numeric token text birebir aynı kalmalı; token türü, sayısı ve sırası korunmalıdır. Yalnızca izin verilen SQL keyword'lerinin seçilen casing dönüşümü kabul edilir. Whitespace protected token dışında yeniden düzenlenebilir. Koruma kontrolü başarısızsa sql-preservation hatasıyla **çıktı verilmez**; dönüştürülmüş ama şüpheli içerik indirmeye açılmaz.

Scanner; SQL literal'larını, doubled quote/bracket escapes, line comment ve sınırlı nested block comment'i ayırır. String veya yorum içindeki GO/procedure sözcükleri komut kabul edilmez. Parenthesis kontrolü yalnızca symbol token'larda yapılır; literal/comment içeriği sayılmaz. Bu bir tam SQL Server parser'ı veya semantic equivalence ispatı değildir. Formatter'ın parse etmesi sorgunun geçerli/güvenli olduğunu göstermez; UI'de açık uyarı vardır.

### Stored procedure, GO ve minify kararı

**Stored procedure başarıyla formatlanıyor diye gösterilmedi.** Seçilen kütüphanenin resmî README'si stored procedure desteği olmadığını belirtiyor. CREATE PROCEDURE/PROC, CREATE OR ALTER, ALTER PROCEDURE, function/trigger ve belirli procedural token/bloklar açıkça reddedilir. Unit/E2E stored procedure senaryoları beklenen reddi doğrular; çalıştırma veya başarılı procedure format çıktısı doğrulamaz.

**GO batch desteği açık değildir.** Unquoted GO token için açıklayıcı hata verilir; batch'leri ayrı biçimlendirme önerilir. Muhafazakâr kontrol nedeniyle GO adlı unquoted kolon/alias da reddedilebilir; [GO] veya string/comment içindeki GO korunur. GO repeat count için test vardır; batch split/reassembly algoritması uygulanmadı.

**SQL Minify devre dışıdır.** UI'de unavailable/disabled etiketli buton ve gerekçe vardır. Worker sözleşmesinde sql-minify eylemi bulunmaz. Comment/whitespace silmenin semantik etkileri güvenilir biçimde doğrulanmadığından regex tabanlı minify fallback eklenmedi.

Diğer kapsam dışı yapılar: SQLCMD değişken/direktifleri, prosedürel DECLARE/EXEC/WHILE/BEGIN/IF gibi kod, formatter disable/enable yorum direktifleri, MySQL backtick dialect'i. Bilinen kapsam dışı veya koruma kontrolü başarısız örneklerde hata verilir. Her olası desteklenmeyen SQL yapısını önceden tespit eden tam validator iddiası yoktur; başarılı çıktıda da not-validation uyarısı korunur.

## Kütüphane değerlendirmesi

Kurulan tek doğrudan production bağımlılığı: **sql-formatter 15.9.0** (exact pin). MIT lisansı node_modules/sql-formatter/LICENSE içinde incelendi. Paket bilgisi npm'den kontrol edildi; modified tarihi 23 Eylül 2026. Resmî repository SQL dialect'lerini, ayarları ve kapsam dışı procedure davranışını belgeliyor. Bu veriler bakım değerlendirmesidir; gelecekte bakım veya açık olmayacağı garantisi değildir.

Runtime bağımlılıkları argparse/nearley zincirini içerir; npm toplam 8 paket ekledi. Uygulama CLI'ı çalıştırmaz; ESM formatter worker içinde yalnızca Format SQL eyleminde lazy import edilir. Mevcut ExcelJS ve diğer paketler değiştirilmedi; major/force audit fix kullanılmadı.

İncelenen formatter ESM ve nearley runtime girişinde eval/new Function taraması eşleşme vermedi. Gramer önceden üretilmiştir; kullanıcı custom grammar/regex/callback veremez. Bu sınırlı kaynak taraması bütün transitif paketin her kod yolunun güvenlik sertifikası değildir.

Kurulum sonrası npm audit --json sonucu: **0 critical/high, 2 moderate**. Yeni sql-formatter zincirine ait yeni audit kaydı yok; kalan exceljs/uuid kayıtları önceki fazdan devam ediyor. Kanıt: artifacts/phase5-2-audit.json. Audit bulguları genel yayın onayına dönüştürülmedi.

Kaynaklar: [SQL Formatter resmî README/lisans/kapsam](https://github.com/sql-formatter-org/sql-formatter), kurulu package.json, LICENSE ve dist/esm kaynakları. Resmî README'deki parametre replacement özelliği ürün kapsamına alınmadı; yalnızca sabit paramTypes token tanıma ayarı kullanılır, params değerleri verilmez.

## Editör ve syntax highlighting

Mevcut TextPanel textarea tabanı korunur. Her yeni araçta typed input ve ayrıca açılabilir renklendirilmiş input preview vardır. Çıktı renklendirilmiş code preview; açılabilir plain-text readonly alternatif de sunulur. Bu tam IDE editor/IntelliSense değildir.

Highlight; sabit, bounded lexical tarama ve React text/span düğümleridir. Keyword/string/comment/number renkleri light/dark için tanımlandı. HTML string, dangerouslySetInnerHTML veya input kodunu çalıştırma yoktur. İlk 50.000 karakter ve yaklaşık 5.000 token segmenti sınırı vardır; kalan görüntülenen bölüm plain text olabilir. Renklendirme doğrulayıcı değildir ve tüm dil gramerini kapsamaz. Copy/download hiçbir highlight markup'ı taşımaz.

Mobilde panel dikey sıralanır, code preview kendi yatay scroll'una sahiptir. EN/TR label, option, hata, uyarı, status, kullanım ve FAQ içerikleri mevcuttur.

## Kaynak ve güvenlik sınırları

| Alan | Sınır |
| --- | --- |
| TypeScript JSON | 1 MiB input/output, depth 50, 50.000 düğüm |
| Model üretimi | 200 type, 5.000 alan |
| SQL | 256 KiB input, 10.000 satır, 50.000 token |
| SQL nesting | 100 parantez seviyesi, block comment derinliği 16 |
| SQL output | 1 MiB |
| Job | Worker yaratılışından itibaren 5 saniye main-thread timeout/terminate |

İş değişimi, clear/reset/unmount iptal ve requestId/revision kontrolleri mevcut hook üzerinden devam eder; eski sonuçlar kopyalanmaz. Blob URL cleanup korunur. Lexer/parantez kontrolleri ağır formatter çağrısından öncedir. Worker sert bir OS bellek/CPU sandbox'ı değildir; timer throttling ve parser'ın worst-case maliyeti için mutlak garanti verilmez.

Kullanıcı metni API'ye, console'a veya localStorage'a yazılmaz. Sadece mevcut tema tercihi saklanır. Yeni modüllerde database/network/eval/Function akışı yoktur. CSV→Excel ve diğer araçlar korunur; XLSX importu tekrar açılmadı.

## Test sonuçları

| Kontrol | Sonuç |
| --- | --- |
| npm run lint | Başarılı |
| npx tsc --noEmit | Başarılı |
| npm run test | 7 dosyada **173 test başarılı** |
| npm run build | Başarılı; dört yeni EN/TR URL üretildi |
| npm run test:e2e | **58 Chromium E2E testi başarılı**, desktop + Pixel 7 emülasyonu |
| npm run test:csharp | Önceki C# generator için 8 fixture hâlâ derleniyor; exit code 0 |
| npm audit --json | 2 moderate; yeni bağımlılığa ait ek bulgu yok |

Vitest: nested JSON/array/union, optional/null/unknown/empty array, Unicode/invalid property, keyword root reddi, isim çakışması, gerçek strict compiler kontrolü; input/depth/type/property/output amplification limitleri. SQL string/escaped string/N-literal, comments, params, T-SQL CTE, bracket escaping, genel quoted identifier, keyword case/indent, bozuk korunan token, unbalanced/deep parantez, token/byte/line sınırları. Procedure/GO/directive girdilerinde beklenen ret ve postcondition'da token değiştirme/sıra bozma reddi. Highlight metin eşitliği ve boyut sınırı.

Playwright: iki yeni araç × EN/TR, gerçek worker dönüşümü, syntax span görünürlüğü, copy, gerçek .ts/.sql dosyasının içeriği, clear/reset, dil/slug ve tema geçişi, mobil overflow. TS seçenekleri ve invalid input; SQL CTE/string/comment/param koruması, inert HTML, procedure/GO uyarısı ve disabled minify. Eski platform, JSON Diff, C#, CSV→Excel ve kapalı import regresyonları da pakete dahildir. Yeni örneklerde harici/non-GET ağ veya console'a örnek hassas veri gözlenmedi.

Kanıtlar: src/lib/developer-tools/phase52.test.ts, e2e/phase52.spec.ts, playwright-report/index.html, test-results/results.json. .NET fixture kanıtı artifacts/csharp/result.json. C# assembly çalıştırılmadı. SQL hiçbir DB'de çalıştırılmadı. Gerçek cihaz, WebKit/Firefox, yeni Lighthouse veya tam pentest yapılmadı.

## Dosya özeti

Yeni: src/lib/developer-tools/typescript.ts, sql.ts, sql-lex.ts, highlight.ts, phase52.test.ts; src/lib/phase52-copy.ts; src/components/tools/code-preview.tsx, phase52-workbench.tsx; e2e/phase52.spec.ts; PHASE5_2_REPORT.md.

Güncellenen: contracts.ts, developer-tools.worker.ts, tools.ts; developer-workbench.tsx ve developer-content.tsx dispatcher'ları; globals.css; registry sayısı bekleyen readiness/platform testleri; package.json/lock ve README. Önceki fazların commit edilmemiş dosyaları silinmedi/geri alınmadı.

## Yayın durumu ve kalan sınırlamalar

İki araç test edilen kapsamda tamamlandı. **Bu faz genel production GO onayı değildir:** önceki ExcelJS/uuid riski ve domain/hosting kontrolleri devam eder. Procedure/GO/minify desteği varmış gibi gösterilmez. SQL lexical preservation, DB semantik eşdeğerliği ispatı değildir. JSON inference örnek tabanlı ve JavaScript numeric precision ile sınırlıdır.

Tekrar kontrol: npm run lint; npx tsc --noEmit; npm run test; npm run build; npm run test:e2e. Geliştirme: npm run dev. PowerShell politikası npm.ps1'i engellerse npm.cmd/npx.cmd kullanın. Git commit/push yapılmadı.
