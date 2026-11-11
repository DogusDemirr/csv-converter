# Phase 5.3 — Regex Tester

Tarih: 11 Kasım 2026. İstenen Regex Tester mevcut platforma eklendi. Yeni npm paketi veya backend eklenmedi. Mevcut araçlar korundu; Excel→CSV/JSON importları kapalı kaldı. Git commit/push veya deployment yapılmadı.

## URL ve platform

- /en/tools/regex-tester
- /tr/tools/regex-tester

Mevcut tool registry, Developer kategorisi, arama, EN/TR içerik, Header/Footer, tema, metadata ve worker hook'u kullanıldı. Aktif araç sayısı 12; gerçek SITE_URL tanımlı build'de 26 aktif sitemap URL'si bulunur. Domain tanımsızken noindex, kapalı robots ve boş sitemap politikası devam eder. Gerçek domain/hosting yayını bu fazda yapılmadı.

## Tamamlanan özellikler

- Pattern input; / ayraçları olmadan native JavaScript RegExp source kabul edilir.
- Test string editor; boş pattern ve boş metin geçerlidir.
- g, i, m, s, u, y, d checkbox'ları. Destek, güvenilir boş pattern'lerle ayrı worker'da sorgulanır; desteklenmeyen flag kapalı görünür. Sorgulama hatasında retry bulunur.
- Eşleşme vurgulama ve sayısı; zero-length sonuçlar için görsel çubuk.
- Sıralı capture groups, named capture groups, başlangıç/bitiş index ve d varsa positional/named capture aralıkları.
- Index birimi UTF-16 olarak açıkça belirtilir. Unmatched capture alanları raporda null olur.
- g yoksa ilk eşleşme; g varsa bounded global tarama. y tek başına index 0'dan başlar; g+y kesintisiz sticky eşleşmeler döndürür.
- Copy matches, ek olarak JSON rapor download; Clear girdileri/sonucu temizler ve flag'leri korur, Reset g varsayılana döner. İkisi de aktif eşleştirme işini iptal eder.
- Regex syntax, unsupported/duplicate flag, boyut/capture/output limitleri, engine ve timeout için yerelleştirilmiş hata mesajları.
- EN/TR açıklama, kullanım adımları ve FAQ; light/dark ve responsive düzen.

İlk 100 match vurgulanır/listelenir; matched text 500 ve capture detayları 2.000 preview karakteriyle sınırlıdır. JSON preview 50.000 karakterdir. Copy/download, 1 MiB sınırı içindeki tam raporu içerir. Bu görünüm sınırları hesaplama limitlerinin yerine geçmez.

## ReDoS değerlendirmesi ve worker tasarımı

**Native JavaScript RegExp backtracking yapabilir. Küçük bir pattern ve kısa metin de katastrofik süre üretebilir. Input uzunluğu kontrolü ReDoS'u tek başına çözmez.** Bu araç linear-time regex motoru veya tam güvenlik sandbox'ı olarak tanıtılmaz. PCRE/.NET uyumluluğu iddia edilmez.

1. Kullanıcı pattern'inin compile ve exec işlemleri yalnızca dedicated developer worker'da yapılır. Ana UI thread kullanıcı pattern'iyle RegExp oluşturmaz/çalıştırmaz.
2. Her Run yeni worker kullanır. Önceki iş, input/flag değişimi, clear/reset ve unmount'ta sonlandırılır. Eski sonuçlar requestId/revision kontrolüyle reddedilir.
3. Regex işleri için main-thread timer, worker yaratılışından itibaren **1.500 ms** deadline uygular. Timeout callback worker.terminate çağırır ve UI'ye timeout gösterir. Worker içindeki timer/Promise.race, bloklanan exec'i durdurma yöntemi olarak kullanılmaz.
4. Mevcut JSON/C#/TS/SQL işlerindeki 5.000 ms süresi değiştirilmedi.
5. Worker kimliği kontrolü eklenerek sonlanmış eski bir worker'ın sıraya girmiş error/timer callback'inin başarılı/sonraki işe hata yazması engellendi.
6. Flag capability probe ayrı, kullanıcı girdisi içermeyen worker işidir; 3 saniye timeout, cleanup ve retry vardır. Worker constructor hatası da UI'de yönetilir.
7. Syntax hatasının ham exception mesajı pattern içerebileceğinden dışarı döndürülmez; sabit regex-syntax kodu kullanılır. Diğer worker hataları da sabit allowlist üzerinden yerelleştirilir.

### Limitler

| Kaynak | Sınır / davranış |
| --- | --- |
| Pattern | 2.048 UTF-16 birimi |
| Test metni | 64 KiB UTF-8, ayrıca en fazla 65.536 UTF-16 birimi |
| Capture groups | 32; syntax-aware sınırlı ön sayım ve exec sonrası kontrol |
| Match | 1.000 |
| JSON rapor | 1 MiB; record eklenmeden ve son serialization sonrası kontrol |
| Eşleştirme yaşamı | 1,5 saniye main-thread deadline |
| Capability probe | 3 saniye, yalnızca sabit flag denemeleri |

1.000 match'e ulaşıldığında başka bir exec çağrısı yapılmadan durulur; report.limited=true ve görünür uyarı verilir. **Daha fazla eşleşme olabilir**; sayı kesin toplam diye gösterilmez. Çok büyük capture raporunda eksik rapor yerine output-limit hatası döner.

Global zero-length match'te lastIndex bir UTF-16 birimi ilerletilir; u flag'iyle surrogate pair varsa tek code point ilerlenir. Metin sonundaki boş eşleşme dahil edilir. Bu, empty match sonsuz döngüsünü önler; pattern'in tek bir exec içinde çok uzun sürmesini çözmez. O durum dış worker timeout'una tabidir.

Ön capture sayımı escaped parantezleri, character class'ları ve noncapturing/lookaround gruplarını ayırır; named capture'lar sayılır. Bu bir regex complexity/linearity doğrulayıcısı değildir. Compile işlemi de worker'dadır.

## Güvenlik sınırlarının anlamı

- Worker ana thread'den ayrı yürütme ve sonlandırma sağlar; sert OS bellek/CPU bütçesi sağlamaz. Regex compile veya exec geçici bellek tüketimi, engine hataları ve process kaynak baskısı tamamen ortadan kaldırılmış değildir.
- Browser scheduler, background timer throttling, CPU yükü ve otomasyon overhead'i nedeniyle 1.500 ms gerçek zamanda kesin yanıt/CPU serbest bırakma garantisi değildir. Background-tab davranışı bu fazda ölçülmedi.
- Eval, Function constructor, kullanıcıdan module/worker URL'si veya runtime script indirme yoktur. RegExp constructor JS kodu evaluate etmek için kullanılmaz.
- Input ve pattern localStorage/sessionStorage'a, API'ye veya console'a gönderilmez. Yalnızca mevcut tema tercihi saklanır.
- Match highlighting, input string'in engine indexlerine göre slice edilip React text/mark düğümleri olarak gösterilmesidir; HTML string/innerHTML kullanılmaz. Named group anahtarları Object.fromEntries ile own property olur; __proto__ global prototype değiştirmez.
- Test raporlarında yalnızca sentetik test pattern/metni bulunur; gerçek kullanıcı secret/token verisi kullanılmadı.
- Mevcut iki ExcelJS/uuid audit kaydı bu fazda giderilmiş değildir; dependency değişimi/audit yeniden koşusu yapılmadı. XLSX importu açılmadı, SQL minify/procedure/GO kısıtları değişmedi.

## Test sonuçları

| Kontrol | Sonuç |
| --- | --- |
| npm run lint | Başarılı |
| npx tsc --noEmit | Başarılı |
| npm run test | **8 dosya, 194 test başarılı** |
| npm run build | Başarılı; iki yeni EN/TR URL üretildi |
| npm run test:e2e | **70 başarılı**, 0 skipped/unexpected/flaky; Chromium desktop + Pixel 7 emülasyonu |

### Vitest

Yeni regex testleri yalnızca küçük, bilinen ve patolojik olmayan pattern'leri senkron Node motorunda çalıştırır. Katastrofik örnek unit runner thread'inde çalıştırılmaz.

Kapsam: geçerli/syntax hatalı pattern; global/ilk eşleşme; i/m/s/u/y/d; sticky index davranışı; named group ve prototype benzeri isim; Türkçe/Unicode/emoji; boş input/pattern; end anchor; zero-length global ilerleme; 1.000 match cap; duplicate/unsupported flag; pattern/metin/capture limitleri; capture output amplification; HTML'nin metin olarak kalması; worker mesaj türü/operation doğrulaması.

d testleri motor flag desteği varsa capture aralıklarını kontrol eder; destek yoksa unsupported-flag reddi kontrol edilir. Browser engine özellikleri tüm ortamlarda varmış gibi varsayılmaz.

### Chromium E2E

- EN/TR sayfa, gerçek worker, Unicode named captures, highlight ve UTF-16 index; d mevcutsa named capture indices.
- Copy matches raporunun JSON içerik eşitliği; clear/reset farkı; tema ve dil/slug geçişi; mobil horizontal overflow; input'un storage/log/network'e gitmediğine ilişkin sentetik kontroller.
- Syntax error, Unicode zero-length çubukları, çok fazla eşleşmede bounded report ve ilk 100 highlight; XSS metninin img/script düğümüne dönüşmemesi.
- Capability başlangıç hatası/retry ve desteklenmeyen flag seçeneklerinin disabled olması (worker stub ile simüle edilen ortam dalları).
- Deterministik timeout testinde message döndürmeyen/geciktiren fake worker kullanılır; terminate sayısı ve timeout'tan sonra deliberately teslim edilen eski result/error mesajlarının yok sayılması doğrulanır. Bu test gerçek CPU baskısı ölçümü değildir.
- Önceki JSON/SQL/C#/CSV akışları ve kapalı XLSX import regresyonları pakete dahildir.

### Gerçek, küçük ReDoS deneyi

Yalnızca browser worker içinde `^(a+)+$` ve **32 adet a + ! (toplam 33 karakter)** kullanıldı. Büyük zararlı dosya üretilmedi. Test runner üst sınırı 15 saniyedir. Theme butonuyla ana UI etkileşimi kontrol edildi; sonrasında Reset ve yeni worker'da a+ / aaaa eşleşmesi başarılı oldu.

Her iki Chromium projesinde gözlenen sonuç **worker-timeout**:

| Proje sırası | Otomasyonun ölçtüğü toplam süre | Sonuç |
| --- | --- | --- |
| Desktop Chromium | 1.991 ms | Timeout, UI etkileşimi ve sonraki iş başarılı |
| Pixel 7 Chromium emülasyonu | 1.974 ms | Timeout, UI etkileşimi ve sonraki iş başarılı |

Bu süreler click/başlangıç, polling ve UI overhead'ini içerir; çıplak regex CPU süresi veya tam 1,5 saniyede kaynak bırakıldığının ölçümü değildir. Test, gelecekte farklı bir engine bu küçük örneği bounded biçimde tamamlayabilirse count=0 sonucunu da kabul edecek şekilde yazılmıştır; **bu koşuda iki sonuç da timeout olmuştur**.

Kanıtlar: test-results/results.json içindeki controlled-redos-result attachment'ları ve artifacts/phase5-3-redos.json. Tam E2E koşusu yaklaşık 47 saniyede tamamlandı. Playwright HTML raporu: playwright-report/index.html.

Gerçek Android/iOS cihaz, Safari/Firefox, background tab timer davranışı, OS-level bellek profili, çok büyük saldırı girdisi veya tam penetrasyon testi yapılmadı. Yeni Lighthouse ölçümü veya önceki C# derleme fixture koşusu bu fazda yapılmadı; eski sonuçlar yeni doğrulama diye sunulmaz.

## Dosyalar

Yeni:

- src/lib/developer-tools/regex.ts: limitler, flag desteği, capture ön kontrolü, native matching, bounded rapor.
- src/lib/developer-tools/regex.test.ts: unit/güvenlik senaryoları.
- src/lib/regex-copy.ts: EN/TR içerik ve hata/uyarılar.
- src/hooks/use-regex-capabilities.ts: worker tabanlı flag probe, retry/cleanup.
- src/components/tools/regex-workbench.tsx: input, highlight, capture/index, copy/clear/reset ve kullanım/FAQ.
- e2e/regex.spec.ts: gerçek worker, deterministik timeout, küçük ReDoS ve mobil kontroller.
- PHASE5_3_REPORT.md.

Güncellenen: tools.ts registry; developer contracts/worker; use-developer-job timeout/identity guard; developer workbench/content dispatcher'ları; globals.css; aktif araç/sitemap sayısı testleri; README. Yeni npm paketi kurulmadı, package.json/lock bu faz için değiştirilmedi. Önceki fazlardan kalan commit edilmemiş değişiklikler korundu.

## Çalıştırma ve yayın durumu

```sh
npm run dev
npm run lint
npx tsc --noEmit
npm run test
npm run build
npm run test:e2e
```

PowerShell politikası npm.ps1'i engellerse npm.cmd/npx.cmd kullanılabilir. Bu araç test edilen kapsamda tamamlandı; genel production GO onayı verilmedi. Önceki domain/hosting ve dependency risk kararları devam eder. Commit/push yapılmadı.
