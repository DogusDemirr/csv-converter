export function isXlsxImport(id: string) { return id === 'excel-to-csv' || id === 'excel-to-json'; }
export function requireEnabledTool(id: string) { if (isXlsxImport(id)) throw new Error('xlsx-disabled'); }
export const xlsxNotice = {
 en: 'XLSX import is temporarily unavailable. The current parser cannot enforce a reliable decompression memory budget. Your file will not be read. CSV, JSON and CSV to Excel tools remain available.',
 tr: 'XLSX içe aktarma geçici olarak kapalıdır. Mevcut ayrıştırıcı güvenilir bir açılım bellek bütçesi uygulayamıyor. Dosyanız okunmayacaktır. CSV, JSON ve CSV → Excel araçları kullanılabilir.'
};
