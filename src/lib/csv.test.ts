import { describe, expect, it } from 'vitest';
import { MAX_BYTES, parseCsv, validateFile } from './csv';
describe('CSV parsing', () => {
 it.each([',', ';', '\t'] as const)('detects separator %s and Turkish BOM', d => { expect(parseCsv(`\uFEFFAd${d}Şehir\nÇağrı${d}İstanbul`).rows).toEqual([['Ad', 'Şehir'], ['Çağrı', 'İstanbul']]); });
 it('supports quoted delimiters, escaped quotes, multiline fields and skips empty rows', () => { expect(parseCsv('a,b\n"hello, world","a""b"\n\n"line\nbreak",x').rows).toEqual([['a', 'b'], ['hello, world', 'a"b'], ['line\nbreak', 'x']]); });
 it('uses an explicit separator', () => expect(parseCsv('a;b\nx;y', ';').delimiter).toBe(';'));
 it('supports single columns', () => expect(parseCsv('name\nAli').rows).toEqual([['name'], ['Ali']]));
 it.each(['', '  \n\n'])('rejects empty CSV', s => expect(() => parseCsv(s)).toThrow('empty'));
 it('rejects malformed quotes', () => expect(() => parseCsv('a,b\n"broken,x')).toThrow('malformed'));
 it('rejects mismatched columns', () => expect(() => parseCsv('a,b\nx,y,z', ',')).toThrow('columns'));
 it.each(['a\0b', '\ufffd'])('rejects binary or invalid UTF-8', s => expect(() => parseCsv(s)).toThrow('encoding'));
 it('enforces resource limits', () => { expect(() => parseCsv('x\n'.repeat(20001))).toThrow('limits'); expect(() => parseCsv('x'.repeat(32768))).toThrow('limits'); expect(() => parseCsv(Array(1001).fill('x').join(','), ',')).toThrow('limits'); expect(() => parseCsv(Array(201).fill(Array(1000).fill('x').join(',')).join('\n'), ',')).toThrow('limits'); });
 it('validates file extension and size', () => { expect(() => validateFile({ name: 'x.exe', size: 1 })).toThrow('format'); expect(() => validateFile({ name: 'x.csv', size: 0 })).toThrow('empty'); expect(() => validateFile({ name: 'x.csv', size: MAX_BYTES + 1 })).toThrow('size'); expect(() => validateFile({ name: 'X.CSV', size: MAX_BYTES })).not.toThrow(); });
});
