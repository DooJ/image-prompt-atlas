const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const organization = JSON.parse(fs.readFileSync(path.join(root, 'audit/organization.json'), 'utf8'));
const byId = new Map(catalog.items.map(item => [item.id, item]));
const normalized = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
for (const item of catalog.items) {
  delete item.duplicateOf;
  delete item.displayTitle;
}
// 수동 대조한 동일 원문만 통합하며, 자료 자체는 출처 확인을 위해 남긴다.
for (const group of organization.duplicateGroups) {
  const canonical = byId.get(group.canonicalId);
  if (!canonical || canonical.duplicateOf) throw Error('대표 사례를 확인하세요: ' + group.canonicalId);
  for (const id of group.duplicateIds) {
    const duplicate = byId.get(id);
    if (!duplicate || id === canonical.id || duplicate.duplicateOf) throw Error('중복 사례를 확인하세요: ' + id);
    if (normalized(duplicate.original) !== normalized(canonical.original)) throw Error('원문이 다른 사례는 통합할 수 없습니다: ' + id);
    duplicate.duplicateOf = canonical.id;
  }
}
const titleGroups = new Map();
for (const item of catalog.items.filter(item => !item.duplicateOf)) {
  const title = normalized(item.title);
  if (!titleGroups.has(title)) titleGroups.set(title, []);
  titleGroups.get(title).push(item);
}
for (const group of titleGroups.values()) {
  if (group.length > 1) group.forEach((item, index) => { item.displayTitle = item.title + ' ' + (index + 1); });
}
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`${catalog.items.filter(item => !item.duplicateOf).length}개 프롬프트 표시 · ${catalog.items.filter(item => item.displayTitle).length}개 동명 사례 번호 부여`);
