# Phase 2 Raporu

Tarih: 9 Kasım 2026

## Mimari ve kapsam

Phase 1 raporu, mevcut dosyalar, AGENTS.md ve kurulu Next.js paketinin page/layout/metadata rehberleri incelendi. Mevcut tasarım değişkenleri ve çalışan CSV to Excel parser/export/worker kodu korundu. Yeni paket, backend, database, auth, API upload, Docker veya reklam SDK'sı eklenmedi.

Araç listesi src/lib/tools.ts içinde; ana sayfa, statik araç yolları ve sitemap bu tamamlanmış kayıtları kullanır. Yeni araçlar tool-engine.ts ve tools.worker.ts ile browser worker içinde çalışır. Dosya veya JWT içeriği sunucuya gönderilmez, loglanmaz.

## Eklenen araçlar

1. JSON Formatter & Validator: syntax doğrulama, iki boşlukla girintileme.
2. JSON Minifier: doğrulanmış JSON'u kompakt çıktı olarak üretme.
3. JSON to CSV: nesne dizilerinde alan birleşimi; eksik değerler boş, nested değerler JSON metni; güvenli CSV.
4. CSV to JSON: UTF-8/BOM/Türkçe, otomatik veya manuel ayraç; dolu/benzersiz başlıklar; metin hücreleri.
5. Excel to CSV: XLSX çalışma sayfası seçimi, yalnızca kayıtlı formül sonuçları, CSV injection koruması.
6. Excel to JSON: XLSX satırlarını başlık bazlı metin değerli JSON kayıtlarına dönüştürme.
7. Base64 Encode / Decode: Unicode UTF-8 metin ve standart dolgulu Base64; bozuk/binary metin reddi.
8. JWT Decoder: header/payload çözümleme; signatureVerified=false. İmza, süre, yayıncı, hedef ve güven doğrulanmaz.

Her yeni araçta EN/TR açıklama, kullanım alanı, girdi/dosya alanı, çıktı önizleme, tam çıktı copy/download, reset/iptal, hatalar, How to Use ve FAQ vardır. Mevcut CSV to Excel de çalışmaya devam eder.

## Platform ana sayfası

Online Tools hero, arama, kategori filtreleri, Popular Tools ve All Tools bölümleri eklendi. Popular Tools istatistik iddiası yerine öne çıkan seçki olarak etiketlidir. JSON & Developer Tools, File & Data Converters, Text Tools ve Calculators filtreleri vardır. Hesaplayıcı geliştirilmedi; ilgili filtre açıklayıcı boş durum gösterir. Tamamlanmamış araç kartı/sayfası yoktur.

Mevcut navy/teal palet, responsive CSS, açık/koyu tema, localStorage tema tercihi, klavye odağı, skip link, status/alert, label ve reduced-motion korunur. Dil değişimi araç slug'ını korur.

## URL listesi

| Araç | İngilizce | Türkçe |
| --- | --- | --- |
| Ana sayfa | /en | /tr |
| JSON Formatter | /en/tools/json-formatter | /tr/tools/json-formatter |
| JSON Minifier | /en/tools/json-minifier | /tr/tools/json-minifier |
| JSON to CSV | /en/tools/json-to-csv | /tr/tools/json-to-csv |
| CSV to JSON | /en/tools/csv-to-json | /tr/tools/csv-to-json |
| Excel to CSV | /en/tools/excel-to-csv | /tr/tools/excel-to-csv |
| Excel to JSON | /en/tools/excel-to-json | /tr/tools/excel-to-json |
| Base64 | /en/tools/base64 | /tr/tools/base64 |
| JWT Decoder | /en/tools/jwt-decoder | /tr/tools/jwt-decoder |
| CSV to Excel | /en/tools/csv-to-excel | /tr/tools/csv-to-excel |

Eski CSV aracı /en ve /tr üzerinde, aynı #converter hedefinde hâlâ kullanılabilir. Ana sayfa platforma dönüşürken eski URL kaldırılmadı; redirect gerekmedi. Ayrı SEO sayfası da eklendi. / İngilizceye yönlenir.

Araç başına unique title/description, canonical, en/tr/x-default hreflang, Open Graph ve Twitter metadata var. Sitemap: iki ana sayfa + 18 tamamlanmış araç yolu = 20 URL. Olmayan araç/dil yolları 404.

## Eklenen/değiştirilen dosyalar

Eklenen:

- src/lib/tools.ts: tipli araç kayıtları ve EN/TR içerik.
- src/lib/tool-engine.ts: tüm yeni dönüşümler ve güvenlik sınırları.
- src/lib/tools.worker.ts: browser mesaj protokolü, yerel dosya okuma.
- src/lib/tool-messages.ts: yerelleştirilmiş hatalar.
- src/lib/tool-metadata.ts: ortak SEO üretimi.
- src/lib/tool-engine.test.ts: yeni araç testleri.
- src/components/platform-shell.tsx: header/footer, dil/tema.
- src/components/tool-directory.tsx: arama/filtre/kartlar.
- src/components/tool-workbench.tsx: girdi, worker, preview/copy/download/reset.
- src/app/[locale]/tools/[slug]/page.tsx: statik EN/TR araç sayfaları.
- PHASE2_REPORT.md: bu rapor.

Değiştirilen: src/app/[locale]/page.tsx, src/app/globals.css, src/app/sitemap.ts ve README.md. Phase 1 test ve dönüşüm kaynakları korunmuştur.

## Paketler

Yeni bağımlılık kurulmadı. Mevcut Next.js 16.4.5, React 19.3.0, Papa Parse 5.7.0, ExcelJS 4.4.0, Tailwind 4, TypeScript strict, ESLint ve Vitest 5.1.0 kullanıldı. Kesin sürümler package-lock.json içinde.

## Kontrol sonuçları

- npm run lint: başarılı.
- npx tsc --noEmit: başarılı.
- npm run test: 3 dosyada 89 test başarılı (Phase 1'in 15 testi dahil).
- npm run build: başarılı; 18 EN/TR araç sayfası statik üretildi.
- Production HTTP: iki ana sayfa ve 18 araç yolu 200; robots/sitemap 200; olmayan araç ve /de yolları 404.
- Tüm 18 araç HTML'inde canonical, en/tr hreflang ve Open Graph title doğrulandı. Sitemap 20 loc kaydı içeriyor.
- Testler: her araç için boş ve aşırı büyük girdi; Türkçe/Unicode başarı; JSON syntax/şema/depth/unsafe sayı; CSV headers/quotes/row limit/prototype; Base64 bozuk/binary/dolgu; JWT bozuk parçalar ve verification=false; XLSX corrupt/empty/sheet/cached ve eksik formula result/row limit/ZIP genişleme; CSV injection ve inert HTML.
- Browser host kullanılamadı. Native Chrome kontrolü de mevcut URL'nin güvenilir belirlenememesi nedeniyle Computer Use güvenlik kontrolü tarafından durduruldu. Görsel/mobil/clipboard/download uçtan uca doğrulaması yapılmış kabul edilmez.

## Güvenlik

- Dosya/token gönderen fetch, axios, XMLHttpRequest, console log veya backend endpoint'i yoktur. Next.js statik varlık/sayfa istekleri dosya içeriği taşımaz.
- Kullanıcı içeriği React metni/textarea olarak gösterilir. HTML olarak çalıştırılmaz. Mevcut dangerouslySetInnerHTML yalnızca sabit tema başlangıcıdır.
- Input/file: 5 MiB; table: 20.000 satır, 200.000 hücre, 1.000 sütun; cell: 32.767 karakter; JSON depth: 100 ve 200.000 düğüm; output: 15 MiB.
- XLSX ZIP directory ön kontrolü: beyan edilen genişleme 30 MiB, en fazla 2.000 giriş; çok diskli/şifreli/ZIP64 arşivler desteklenmez. Bu metadata ön kontrolü mutlak kötü amaçlı arşiv izolasyonu değildir.
- CSV header/değerlerinde =/+/-/@ ve whitespace/control ile gizlenmiş tehlikeli hücrelere tek tırnak öneki eklenir. Bu, veriye bilinçli güvenlik öneki ekler.
- XLSX export String hücreler kullanır. XLSX import formülleri çalıştırmaz; kayıtlı sonuçları kullanır, eksik sonucu boş bırakır.
- Object.fromEntries ile __proto__ gibi başlıklar own property olur; global prototype değiştirilmez.
- Reset/girdi değişiminde worker iptal edilir. Revizyon kontrolü eski sonuçları engeller. Download object URL'leri serbest bırakılır.
- JWT yalnızca decode yapar, hiçbir erişim/güven kararı vermez. Base64 şifreleme olarak tanıtılmaz.
- Unsafe integer ve numeric overflow reddedilir; büyük kimlikler string olarak verilmelidir.

## Bilinen eksikler

- Gerçek mobil/ekran okuyucu/görsel/clipboard/browser download testleri bekliyor.
- Yalnızca XLSX; XLS/XLSM/şifreli workbook ve binary Base64 yok. Metinler UTF-8 olmalı.
- Worksheet 1 tabanlı numarayla seçilir; dönüşümden sonra sayfa isimleri gösterilir. Gizli sayfalar workbook sırasında listelenebilir.
- JSON JavaScript sayı modelini kullanır. Unsafe integer/overflow reddedilir; çok hassas ondalıkların birebir korunması garanti edilmez. Duplicate JSON keys için JSON.parse son değeri tutar.
- JSON→CSV dolu nesne dizisi bekler; nested alanları düzleştirmez. CSV/Excel→JSON ilk dolu satırı başlık ve hücreleri metin kabul eder. Excel tarihleri ISO metnidir.
- Kayıtlı XLSX formül sonuçları eski olabilir; yeniden hesaplanmaz/doğrulanmaz.
- Çıktı önizlemesi 50.000 karakterle sınırlı; copy/download tam çıktıdır.
- ZIP genişleme kontrolü beyan edilen dizin boyutlarına dayanır. Kötü amaçlı hazırlanmış ZIP dosyalarına karşı mutlak bellek bütçesi garantisi yoktur; worker ve boyut sınırları riski azaltır.
- NEXT_PUBLIC_SITE_URL hâlâ yer tutucu olabilir; yayından önce gerçek origin ayarlanmalı.
- Phase 1 audit uyarıları için paket yükseltmesi yapılmadı; upstream güvenlik takibi sürmeli.
- AdSense eklenmedi ve onay garantisi verilmez. Gizlilik/çerez/iletişim içerikleri ayrı yayın hazırlığıdır.

## Başlatma

npm run dev

PowerShell: npm.cmd run dev

http://localhost:3000/en veya http://localhost:3000/tr

## Phase 3 önerileri

1. Gerçek tarayıcı uçtan uca, mobil ve erişilebilirlik denetimi.
2. Streaming/gerçek açılmış bayt bütçeli XLSX koruması ve dependency audit güncellemeleri.
3. Worksheet dropdown, duplicate JSON key uyarıları ve hassas sayı desteği.
4. Gerçek alan adı, özgün paylaşım görselleri, gizlilik/iletişim/hakkımızda ve ayrı AdSense hazırlığı.
5. Yeni kategoriler yalnızca sonraki açık kapsamla; bu aşamada hesaplayıcı geliştirilmedi.
