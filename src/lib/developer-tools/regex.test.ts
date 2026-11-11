import {describe,expect,it} from 'vitest';
import {advanceRegexIndex,MAX_MATCHES,supportedRegexFlags,testRegex} from './regex';
import {validateRequest} from './contracts';
describe('bounded native regex engine — trusted, nonpathological unit patterns only',()=>{
 it('returns global matches, captures and UTF-16 indices',()=>{const r=testRegex('(a)(b)?','ab a','g').regex;expect(r.count).toBe(2);expect(r.matches[0]).toMatchObject({text:'ab',index:0,end:2,groups:['a','b']});expect(r.matches[1]).toMatchObject({text:'a',index:3,end:4,groups:['a',null]});});
 it('returns only one match without g',()=>expect(testRegex('a','aaa','').regex.count).toBe(1));
 it('handles named groups, Unicode and prototype-like capture names as data',()=>{const r=testRegex('(?<__proto__>\\p{L}+)','Çağrı İzmir 🌍','gu').regex;expect(r.matches[0].namedGroups.__proto__).toBe('Çağrı');expect(r.matches[1].index).toBe(6);expect(({} as Record<string,unknown>).polluted).toBeUndefined();});
 it('supports ignoreCase, multiline and dotAll',()=>{expect(testRegex('ada','ADA','i').regex.count).toBe(1);expect(testRegex('^a$','a\na','gm').regex.count).toBe(2);expect(testRegex('a.b','a\nb','s').regex.matches[0].text).toBe('a\nb');});
 it('supports sticky matching from zero and global sticky contiguous results',()=>{expect(testRegex('a','ba','y').regex.count).toBe(0);expect(testRegex('a','aa ba','gy').regex.count).toBe(2);});
 it('includes named and positional indices only with supported d',()=>{if(supportedRegexFlags().includes('d')){const r=testRegex('(?<name>a)(b)?','a','d').regex.matches[0];expect(r.indices).toEqual({match:[0,1],groups:[[0,1],null],namedGroups:{name:[0,1]}});}else expect(()=>testRegex('a','a','d')).toThrow('regex-unsupported-flag');});
 it('advances global zero-length matches by Unicode code point',()=>{expect(testRegex('','😀a','gu').regex.matches.map(m=>m.index)).toEqual([0,2,3]);expect(testRegex('','😀a','g').regex.matches.map(m=>m.index)).toEqual([0,1,2,3]);expect(advanceRegexIndex('😀',0,true)).toBe(2);expect(advanceRegexIndex('a',1,true)).toBe(2);});
 it('handles empty strings, no matches and end anchors',()=>{expect(testRegex('','','g').regex.count).toBe(1);expect(testRegex('a','','g').regex.count).toBe(0);expect(testRegex('$','abc','g').regex.matches[0].index).toBe(3);});
 it('stops at the match cap without probing another potentially expensive match',()=>{const result=testRegex('a','a'.repeat(MAX_MATCHES+1),'g');expect(result.regex.count).toBe(MAX_MATCHES);expect(result.regex.limited).toBe(true);expect(result.warnings).toContain('regex-match-limit');});
 it.each(['(','[','(?<bad-name>a)'])('reports safe syntax errors %s',pattern=>expect(()=>testRegex(pattern,'x','g')).toThrow('regex-syntax'));
 it.each(['gg','v','x','gii'])('rejects duplicate or unknown flags %s',flags=>expect(()=>testRegex('a','a',flags)).toThrow('regex-flags'));
 it('bounds pattern, byte length and capture counts before execution',()=>{expect(()=>testRegex('a'.repeat(2049),'x','')).toThrow('regex-pattern-limit');expect(()=>testRegex('a','x'.repeat(65537),'')).toThrow('regex-text-limit');expect(()=>testRegex('a','İ'.repeat(32769),'')).toThrow('regex-text-limit');expect(()=>testRegex('()'.repeat(33),'','')).toThrow('regex-capture-limit');expect(testRegex('(?:a)'.repeat(33),'a'.repeat(33),'').regex.count).toBe(1);});
 it('does not count escaped or character-class parentheses as captures',()=>{expect(testRegex('[(]\\(x\\)[)]','((x))','').regex.matches[0].groups).toEqual([]);expect(testRegex('(?<=a)(?<n>b)','ab','').regex.matches[0].groups).toEqual(['b']);});
 it('bounds capture-report amplification with a small linear-time pattern',()=>expect(()=>testRegex('('.repeat(20)+'.*'+')'.repeat(20),'a'.repeat(60000),'')).toThrow('regex-output-limit'));
 it('leaves HTML as literal match data',()=>expect(testRegex('.+','<img src=x onerror=alert(1)>','').regex.matches[0].text).toContain('<img'));
});
it('validates regex job contracts without invoking pattern compilation',()=>{
 expect(()=>validateRequest({version:1,requestId:1,id:'regex-tester',operation:'capabilities'})).not.toThrow();expect(()=>validateRequest({version:1,requestId:1,id:'regex-tester',operation:'test',pattern:'(',input:'',flags:''})).not.toThrow();for(const bad of [{operation:'run'},{operation:'test',pattern:{},input:'',flags:''},{operation:'test',pattern:'a',input:1,flags:''}])expect(()=>validateRequest({version:1,requestId:1,id:'regex-tester',...bad})).toThrow('invalid-request');
});
