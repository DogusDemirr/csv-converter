# Phase 1 Raporu

## Kurulum ve klasör yapısı

Proje doğrudan `C:\Users\LENOVO\OneDrive\Masaüstü\csv-converter` içinde kuruldu. Node v24.22.0; npm 11.19.1. İç içe ikinci proje yoktur. PowerShell politikası nedeniyle npm.cmd/npx.cmd kullanıldı.

```text
src/app/layout.tsx               CSS girişi
src/app/page.tsx                 /en yönlendirmesi
src/app/globals.css              Responsive açık/koyu tasarım ve Tailwind
src/app/[locale]/layout.tsx      Dil bazlı HTML ve ilk tema
src/app/[locale]/page.tsx        /en ve /tr, metadata
src/app/robots.ts                robots.txt
src/app/sitemap.ts               Dil bazlı sitemap
src/components/converter.tsx     Landing ve dönüşüm arayüzü
src/lib/csv.ts                   CSV parsing ve doğrulama
src/lib/excel.ts                 Güvenli XLSX üretimi
src/lib/converter.worker.ts      Tarayıcı worker işlemleri
src/lib/i18n.ts                  EN/TR metinler
src/lib/seo.ts                   Site adresi
src/lib/csv.test.ts              Parser testleri
src/lib/excel.test.ts            XLSX round-trip/güvenlik testi
.env.example                    Üretim alan adı örneği
next.config.ts                  Güvenlik başlıkları ve Next yapılandırması
package.json, package-lock.json, tsconfig.json, eslint.config.mjs
```

## Bağımlılıklar

Next.js 16.4.5, React/React DOM 19.3.0 (kurulumda latest kararlı), Papa Parse 5.7.0, ExcelJS 4.4.0. Geliştirme: TypeScript strict, Tailwind 4, ESLint 9, eslint-config-next, Vitest 5.1.0, @types/papaparse, Node 24 ve React tipleri. Kesin sürümler package-lock.json içinde kayıtlıdır.

## Tamamlanan özellikler

- Navy/teal responsive SaaS landing, header/logo, dil bağlantısı, hero, How It Works, FAQ ve footer.
- İngilizce varsayılan /en; Türkçe /tr. Sistem teması, açık/koyu tema seçimi ve localStorage tercihi.
- Dosya seçimi, drag & drop, uzantı/boş dosya/5 MiB doğrulaması.
- Otomatik ve manuel virgül, noktalı virgül, tab ayracı.
- UTF-8 BOM, Türkçe karakterler, quoted/escaped/multiline alanlar ve boş satır atlama.
- Hatalı tırnak, tutarsız sütunlar, geçersiz/binary kodlama için iki dilde mesajlar.
- Başlık + ilk 20 veri satırı önizlemesi; satır/sütun/ayraç bilgisi, loading, empty, error, temizleme.
- Papa Parse ve ExcelJS dedicated Web Worker içinde çalışır. Dosya içeriği hiçbir endpoint'e gönderilmez. Backend, upload API, database, auth, Docker, analitik veya harici font yoktur.
- XLSX indirme, başlık biçimi, sabit başlık ve sütun genişlikleri. Tüm hücreler String: baştaki sıfırlar korunur, CSV değerleri formüle dönüşmez.
- 20.000 toplam satır, 200.000 hücre, 1.000 sütun, 32.767 karakter/hücre sınırı.
- Klavye odağı, skip link, semantic HTML, label, status/alert ve reduced-motion.
- Title/description, Open Graph, Twitter, canonical, hreflang, sitemap ve robots.
- nosniff, frame DENY, Referrer-Policy ve Permissions-Policy başlıkları.
- Yalnızca tema tercihi saklanır. Dosya temizlenince worker sonlandırılır; indirme URL'leri değişince/unmount'ta revoke edilir.

## Kontrol sonuçları

- npm run lint: başarılı.
- npx tsc --noEmit: başarılı.
- npm run test: 2 dosyada 15 test başarılı.
- npm run build: başarılı; EN/TR, robots ve sitemap üretildi.
- Production HTTP: /en, /tr, robots.txt, sitemap.xml 200; Türkçe HTML lang ve title doğrulandı.
- Test kapsamı: üç ayraç, BOM/Türkçe, quoted/escaped/multiline, tek sütun, boş/bozuk dosya, sütun tutarsızlığı, kodlama, kaynak limitleri; XLSX yeniden okunarak Türkçe, baştaki sıfırlar ve =/+/-/@/tab/CR formül payloadlarının String kalması ve formula alanı taşımaması.
- Browser preview denendi; browser access host kullanılamadığı için görsel ve tarayıcı uçtan uca dosya kontrolü tamamlanamadı.

## Bilinen eksikler

- NEXT_PUBLIC_SITE_URL varsayılanı https://csvconverter.example yer tutucusudur. Yayından önce gerçek alan adıyla değiştirilmelidir.
- npm audit: 10 moderate geçişli uyarı (minimatch/typescript-eslint geliştirme zinciri ve ExcelJS uuid). Uyumlu npm audit fix çalıştırıldı. Kalan öneriler eski ana sürümlere geçiş gerektirdiği için uygulanmadı. Upstream güvenlik güncellemeleri izlenmelidir. Uygulama uuid v3/v5/v6 API'lerini kullanmaz.
- UTF-8 dışındaki eski encoding'ler otomatik dönüştürülmez.
- Tüm hücreler veri tutarlılığı/güvenlik için metindir; otomatik sayı/tarih türü yoktur.
- İlk satır başlık kabul edilir. Düzensiz sütun sayıları reddedilir.
- ExcelJS/XML CR satır sonunu LF olarak normalleştirebilir.
- Gerçek cihaz, ekran okuyucu, görsel ve browser indirme testleri beklemektedir.

## Başlatma

```sh
npm run dev
```

Windows PowerShell: `npm.cmd run dev`. http://localhost:3000/en veya /tr. Production: `npm run build` ardından `npm run start`.

## Phase 2 önerileri

- Gerçek tarayıcı uçtan uca, mobil ve erişilebilirlik testleri.
- Başlık satırı seçeneği, encoding seçimi, isteğe bağlı güvenli sayı/tarih türleri.
- Daha büyük dosyalar için streaming, ilerleme ve iptal arayüzü.
- Gerçek alan adı, sosyal paylaşım görseli ve bağımlılık güvenlik güncellemeleri.
- Diğer dönüştürücüler ayrı kapsamda; bu aşamada yalnızca CSV → Excel vardır.
