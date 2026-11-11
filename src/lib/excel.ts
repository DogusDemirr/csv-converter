import { Workbook, createExcelFile } from 'excel-builder-vanilla';
import { validateExportRows } from './limits';
export async function exportExcel(rows: string[][]) {
  validateExportRows(rows);
  // XML 1.0 forbids these code points. Reject instead of emitting corrupt XML.
  const invalidXml = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF\uD800-\uDFFF]/u;
  if(rows.some(row=>row.some(value=>invalidXml.test(value)))) throw new Error('xml');
  // CSV has no schema. Never infer Formula, Number or Date from user text.
  const workbook = new Workbook();
  const sheet = workbook.createWorksheet({name:'CSV data'});
  const header = workbook.getStyleSheet().createFormat({font:{bold:true,color:'FFFFFFFF'},fill:{type:'pattern',patternType:'solid',fgColor:'FF0F766E'}});
  sheet.setData(rows.map((row,index)=>row.map(value=>({value:String(value),metadata:{type:'text',...(index===0?{style:header.id}:{})}}))));
  sheet.freezePane(0,1,'A2');
  // v5.3.1's SheetView setter doesn't initialize Pane's serialization state.
  // Initialize it through the public Pane method as well (no private mutation).
  sheet.sheetView.pane.freezePane(0,1,'A2');
  sheet.setColumns(Array.from({length:Math.max(...rows.map(row=>row.length))},()=>({width:24})));
  workbook.addWorksheet(sheet);
  const bytes = await createExcelFile(workbook,'Uint8Array');
  return new Uint8Array(bytes).buffer;
}
