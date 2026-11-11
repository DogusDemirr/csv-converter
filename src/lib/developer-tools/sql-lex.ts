export type SqlToken={kind:'word'|'number'|'literal'|'identifier'|'parameter'|'comment'|'symbol';text:string;start:number};
const word=/[\p{L}_#$][\p{L}\p{N}_#$]*/uy;
const parameter=/@@?[\p{L}_#$][\p{L}\p{N}_#$]*/uy;
const number=/(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/iy;
export function sqlTokens(sql:string):SqlToken[]{
 const tokens:SqlToken[]=[];let i=0;
 function add(kind:SqlToken['kind'],start:number){tokens.push({kind,start,text:sql.slice(start,i)});if(tokens.length>50000)throw new Error('sql-limit');}
 while(i<sql.length){const start=i;const c=sql[i];if(/\s/u.test(c)){i++;continue;}
  if(sql.startsWith('--',i)){i+=2;while(i<sql.length&&!/[\r\n]/.test(sql[i]))i++;add('comment',start);continue;}
  if(sql.startsWith('/*',i)){i+=2;let depth=1;while(i<sql.length&&depth){if(sql.startsWith('/*',i)){if(++depth>16)throw new Error('sql-unsupported');i+=2;}else if(sql.startsWith('*/',i)){depth--;i+=2;}else i++;}if(depth)throw new Error('sql-invalid');add('comment',start);continue;}
  const national=(c==='N'||c==='n')&&sql[i+1]==="'";const quote=national?"'":c;
  if(quote==="'"||quote==='"'||quote==='['){if(national)i++;i++;const close=quote==='['?']':quote;let closed=false;while(i<sql.length){if(sql[i]===close){i++;if(sql[i]===close){i++;continue;}closed=true;break;}i++;}if(!closed)throw new Error('sql-invalid');add(quote==="'"?'literal':'identifier',start);continue;}
  if(c==='`'||c==='\\'||sql.startsWith('$(',i))throw new Error('sql-unsupported');
  parameter.lastIndex=i;const p=parameter.exec(sql);if(p){i=parameter.lastIndex;add('parameter',start);continue;}
  if(c===':'&&/[\p{L}_]/u.test(sql[i+1]??'')){i+=2;while(i<sql.length&&/[\p{L}\p{N}_]/u.test(sql[i]))i++;add('parameter',start);continue;}
  number.lastIndex=i;const n=number.exec(sql);if(n){i=number.lastIndex;add('number',start);continue;}
  word.lastIndex=i;const w=word.exec(sql);if(w){i=word.lastIndex;add('word',start);continue;}
  if(c==='?'){i++;add('parameter',start);continue;}
  const op=/^(?:<>|!=|<=|>=|!<|!>|::|:=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|\|\||<<|>>)/.exec(sql.slice(i,i+2));i+=op?op[0].length:1;add('symbol',start);
 }
 return tokens;
}
export const SQL_KEYWORDS=new Set('SELECT FROM WHERE AND OR NOT AS JOIN LEFT RIGHT FULL INNER OUTER CROSS APPLY ON WITH UNION ALL DISTINCT GROUP BY ORDER HAVING ASC DESC TOP OFFSET FETCH NEXT ROWS ROW ONLY INSERT INTO VALUES UPDATE SET DELETE OUTPUT CASE WHEN THEN ELSE END NULL IS IN LIKE BETWEEN EXISTS OVER PARTITION ROW_NUMBER COUNT SUM AVG MIN MAX CAST CONVERT TRY_CONVERT COALESCE NULLIF CREATE ALTER DROP TABLE VIEW INDEX PRIMARY KEY FOREIGN REFERENCES INT INTEGER BIGINT SMALLINT TINYINT BIT VARCHAR NVARCHAR CHAR NCHAR TEXT NTEXT DECIMAL NUMERIC FLOAT REAL DATE DATETIME DATETIME2 TIME UNIQUEIDENTIFIER XML RETURNING LIMIT TRUE FALSE COLLATE ASC DESC EXCEPT INTERSECT PERCENT TIES RECURSIVE'.split(' '));
