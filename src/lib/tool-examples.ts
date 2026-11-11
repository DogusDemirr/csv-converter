export const toolExamples = {
 'csv-to-excel': ['name,id\nÇağrı,001', 'XLSX: name | id\nÇağrı | 001 (text)'],
 'json-formatter': ['{"name":"Ada","active":true}', '{\n  "name": "Ada",\n  "active": true\n}'],
 'json-minifier': ['{\n  "name": "Ada"\n}', '{"name":"Ada"}'],
 'json-to-csv': ['[{"name":"Ada","id":"001"}]', 'name,id\nAda,001'],
 'csv-to-json': ['name;id\nÇağrı;001', '[{"name":"Çağrı","id":"001"}]'],
 base64: ['Çağrı', 'w4dhxJ9yxLE='],
 'jwt-decoder': ['eyJhbGciOiJub25lIn0.eyJuYW1lIjoiQWRhIn0.', 'Payload: {"name":"Ada"}\nSignature verified: false'],
 'json-diff': ['Before: {"enabled":false}\nAfter: {"enabled":true}', 'Changed /enabled: false → true'],
 'json-to-csharp': ['{"name":"Ada","id":1}', 'public int Id { get; set; }\npublic string Name { get; set; } = default!;'],
 'json-to-typescript': ['{"id":1,"tags":["qa","api"]}', 'export interface Root {\n  id: number;\n  tags: string[];\n}'],
 'sql-formatter': ['select [Name] from [Users] where [Id]=@Id;', 'SELECT\n  [Name]\nFROM\n  [Users]\nWHERE\n  [Id] = @Id;'],
 'regex-tester': ['Pattern: (?<word>\\p{L}+)\nFlags: gu\nText: Çağrı İzmir', '2 matches\n0..5: Çağrı, word=Çağrı\n6..11: İzmir, word=İzmir'],
} as const;

export const legacySteps = {
 'csv-to-excel': [['Choose a UTF-8 CSV file, including files with a BOM.', 'Review the separator and table preview, then convert and download the XLSX. Values remain text.'], ['BOM içerebilen UTF-8 CSV dosyanızı seçin.', 'Ayracı ve tablo önizlemesini kontrol edip XLSX olarak indirin. Değerler metin olarak kalır.']],
 'json-formatter': [['Paste an API response or JSON configuration.', 'Run validation and inspect the indented structure. Correct syntax errors before copying.'], ['API yanıtını veya JSON yapılandırmasını yapıştırın.', 'Doğrulamayı çalıştırıp girintili yapıyı inceleyin. Kopyalamadan önce sözdizimi hatalarını düzeltin.']],
 'json-minifier': [['Paste a JSON document containing optional whitespace.', 'Run the minifier and copy or download compact JSON; spaces inside strings remain unchanged.'], ['Boşluklar içeren JSON belgenizi yapıştırın.', 'Küçültmeyi çalıştırıp çıktıyı kopyalayın veya indirin; metin içindeki boşluklar korunur.']],
 'json-to-csv': [['Provide a nonempty array of JSON objects and choose the delimiter.', 'Review the generated columns and download CSV. Dangerous spreadsheet prefixes receive an apostrophe.'], ['Boş olmayan JSON nesne dizisini girin ve ayracı seçin.', 'Oluşturulan sütunları kontrol edip CSV indirin. Tehlikeli tablo başlangıçlarına tek tırnak eklenir.']],
 'csv-to-json': [['Paste or select CSV with a unique header row.', 'Select the delimiter or use automatic detection. Run the tool; cell values remain strings, including leading zeros.'], ['Benzersiz başlık satırı bulunan CSV yapıştırın veya seçin.', 'Ayracı seçin veya otomatik tespiti kullanın. Çalıştırın; baştaki sıfırlar dahil hücre değerleri metin olarak kalır.']],
 base64: [['Choose Encode for Unicode text or Decode for Base64 input.', 'Run the operation and review the result before copying. Base64 is an encoding, not encryption.'], ['Unicode metin için Kodla, Base64 girdisi için Çöz işlemini seçin.', 'İşlemi çalıştırıp kopyalamadan önce sonucu inceleyin. Base64 kodlamadır, şifreleme değildir.']],
 'jwt-decoder': [['Paste a three-part JWT; use synthetic tokens when exploring.', 'Inspect the decoded header and payload. Never treat this output as signature or authorization verification.'], ['Üç parçalı JWT yapıştırın; denemelerde sentetik token kullanın.', 'Çözülen başlığı ve yükü inceleyin. Bu çıktıyı imza veya yetki doğrulaması olarak kullanmayın.']],
} as const;
