// Raster derivatives of our repository-native SVG; no remote images.
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const svg=await readFile('public/nexutool-mark.svg','utf8');
const browser=await chromium.launch({headless:true});
try {
 await mkdir('public/icons',{recursive:true});const page=await browser.newPage({deviceScaleFactor:1});
 for(const size of [64,192,512]){
  await page.setViewportSize({width:size,height:size});await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
  const png=await page.screenshot({omitBackground:true});
  if(size!==64)await writeFile(`public/icons/nexutool-${size}.png`,png);
  else{const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=64;header[7]=64;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);await writeFile('src/app/favicon.ico',Buffer.concat([header,png]));}
 }
}finally{await browser.close();}
