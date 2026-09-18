const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const catalog = JSON.parse(read('data/catalog.json'));
const packed = zlib.gzipSync(JSON.stringify(catalog), { level: 9 }).toString('base64');
const page = read('src/head.html') + read('src/body.html') +
  '<style>\n' + read('src/atlas.css') + '\n</style>\n' +
  '<script>\n' + read('src/template-engine.js') + '\n</script>\n' +
  '<script>\n' + read('src/prompt-structure.js') + '\n</script>\n' +
  '<script>\n' + read('src/app.js').replace('__ATLAS_PACKED_DATA__', packed) + '\n</script>\n</body></html>\n';
if (process.argv.includes('--check')) {
  if (read('index.html') !== page) throw Error('index.html이 소스와 다릅니다. npm run build를 실행하세요.');
  console.log(`배포 파일 일치: ${catalog.items.length}개 사례`);
} else {
  fs.writeFileSync(path.join(root, 'index.html'), page);
  console.log(`index.html 생성: ${catalog.items.length}개 사례, ${Buffer.byteLength(page)} bytes`);
}
