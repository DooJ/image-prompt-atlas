const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const byId = new Map(catalog.items.map(item => [item.id, item]));
const allowed = new Set(['title', 'ko', 'input', 'mode', 'result', 'sourceNote', 'sourceStatus', 'originalTemplate']);
const before = new Map(catalog.items.map(item => [item.id, JSON.stringify(item)]));
// 후속 연결 교정은 B 검토본을 바탕으로 A에 추가했으므로 마지막에 적용한다.
for (const file of ['corrections-b.json', 'corrections-a.json', 'corrections-source.json']) {
  const corrections = JSON.parse(fs.readFileSync(path.join(root, 'audit', file), 'utf8'));
  for (const [id, patch] of Object.entries(corrections)) {
    const item = byId.get(id);
    if (!item) throw Error(`존재하지 않는 사례: ${id}`);
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'notes') continue;
      if (!allowed.has(key)) throw Error(`출처 원문·식별자는 수정할 수 없습니다: ${id}.${key}`);
      if (typeof value !== 'string' || !value.trim()) throw Error(`빈 교정값: ${id}.${key}`);
      item[key] = value;
    }
  }
}
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`${catalog.items.filter(item => before.get(item.id) !== JSON.stringify(item)).length}개 사례에 교정 반영`);
