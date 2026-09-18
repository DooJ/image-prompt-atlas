const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../data/catalog.json');
const engine = require('../src/template-engine.js');

test('전수 점검 기록이 전체 사례를 중복·누락 없이 포함한다', () => {
  const checked = [...require('../audit/review-a.json').checkedIds, ...require('../audit/review-b.json').checkedIds];
  assert.equal(checked.length, catalog.items.length);
  assert.equal(new Set(checked).size, checked.length);
  assert.deepEqual([...checked].sort(), catalog.items.map(item => item.id).sort());
});

test('825개 사례의 필수 본문·출처·분류·이미지는 누락 없이 유지한다', () => {
  assert.equal(catalog.items.length, 825);
  assert.equal(new Set(catalog.items.map(item => item.id)).size, 825);
  assert.equal(new Set(catalog.items.map(item => item.cat)).size, 8);
  for (const item of catalog.items) {
    for (const key of ['id', 'title', 'ko', 'original', 'originalTitle', 'input', 'mode', 'file', 'anchor', 'source']) {
      assert.ok(typeof item[key] === 'string' && item[key].trim(), `${item.id}.${key}`);
    }
    assert.match(item.ko, /[가-힣]/, item.id);
    assert.doesNotMatch(item.ko, /⟦\s*9\d{5}\s*⟧|ZXQ\d+QXZ|\uFFFD/, item.id);
    assert.match(item.id, /^[a-z-]+_case\d+$/);
    assert.match(item.source, /^https:\/\//);
    assert.match(item.file, /^(README\.md|cases\/[a-z-]+\.md)\?plain=1$/);
    assert.match(item.anchor, /^L\d+$/);
    assert.ok(item.images.length > 0, item.id);
    assert.ok(item.images.every(image => /^images\/[a-z\d_./-]+$/i.test(image)), item.id);
    assert.equal('reuse' in item, false, '분류가 의미를 바꾼 옛 조각 데이터를 사용하지 않는다.');
  }
});

test('확인 불가능한 원문은 명시하며 정상 완성본으로 처리하지 않는다', () => {
  const incomplete = catalog.items.filter(item => item.sourceStatus === 'incomplete');
  assert.equal(incomplete.length, 21);
  for (const item of incomplete) assert.ok(item.sourceNote?.trim(), item.id);
  assert.equal(catalog.items.find(item => item.id === 'poster_case374').sourceStatus, 'incomplete');
  assert.equal(catalog.items.find(item => item.id === 'ui_case117').sourceStatus, undefined);
});

test('동일 원문만 대표화하고 다른 동명 프롬프트는 고유한 표시 이름을 갖는다', () => {
  const normalized = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const byId = new Map(catalog.items.map(item => [item.id, item]));
  const visible = catalog.items.filter(item => !item.duplicateOf);
  const duplicates = catalog.items.filter(item => item.duplicateOf);
  assert.equal(duplicates.length, 7);
  assert.equal(visible.length, 818);
  assert.equal(new Set(visible.map(item => normalized(item.displayTitle || item.title))).size, visible.length);
  for (const item of duplicates) {
    const canonical = byId.get(item.duplicateOf);
    assert.ok(canonical, item.id);
    assert.notEqual(item.id, canonical.id);
    assert.equal(canonical.duplicateOf, undefined);
    assert.equal(normalized(item.original), normalized(canonical.original), item.id);
    assert.equal(item.sourceStatus, canonical.sourceStatus, item.id);
  }
});

test('한국어 JSON은 원문의 키·계층·배열 순서·숫자·불린 정보를 보존한다', () => {
  function shape(value) {
    if (typeof value === 'string') return '<text>';
    if (Array.isArray(value)) return value.map(shape);
    if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
    return value;
  }
  for (const item of catalog.items) {
    const original = item.originalTemplate || item.original;
    if (engine.analyzeTemplate(item.original).kind === 'json') {
      assert.equal(engine.analyzeTemplate(original).kind, 'json', item.id + ' 교정된 원문 JSON 문법 오류');
    }
    if (engine.analyzeTemplate(original).kind !== 'json') continue;
    assert.equal(engine.analyzeTemplate(item.ko).kind, 'json', item.id + ' 한국어 JSON 복원 누락');
    assert.deepEqual(shape(JSON.parse(item.ko)), shape(JSON.parse(original)), item.id);
  }
});

test('시네마틱 음식 광고의 오역·제품명 중복·독립 웹사이트 입력을 교정한다', () => {
  const item = catalog.items.find(item => item.id === 'ui_case117');
  assert.ok(item.ko.includes('냉동'));
  assert.ok(!item.ko.includes('겨울왕국'));
  const result = engine.renderTemplate(item.ko, { 'brand name': '새 브랜드', 'product name': '새 제품', website: 'example.com' });
  assert.equal(result.text.split('새 브랜드').length - 1, 2);
  assert.equal(result.text.split('새 제품').length - 1, 3);
  assert.ok(!result.text.includes('CHICKEN MOMOS'));
  assert.ok(!result.text.includes('licious.com'));
  assert.ok(result.text.includes('example.com'));
});

test('서로 다른 인물의 머리 색상은 별개 변수로 편집한다', () => {
  const item = catalog.items.find(item => item.id === 'ui_case115');
  for (const source of [item.ko, item.originalTemplate]) {
    assert.ok(source);
    assert.deepEqual(engine.analyzeTemplate(source).errors, []);
    assert.deepEqual(engine.renderTemplate(source).errors, []);
    const values = engine.analyzeTemplate(source).variables.map(variable => variable.defaultValue);
    assert.deepEqual(values, ['dark brown', 'black']);
  }
});

test('교정된 한국어·원문 편집본의 입력 수가 같고 특수문자 입력을 처리한다', () => {
  for (const item of catalog.items) {
    const sources = [item.ko, item.originalTemplate || item.original];
    const analyses = sources.map(source => engine.analyzeTemplate(source));
    assert.equal(analyses[0].variables.length, analyses[1].variables.length, item.id);
    for (const [index, source] of sources.entries()) {
      const analysis = analyses[index];
      assert.deepEqual(analysis.errors, [], item.id);
      const values = Object.fromEntries(analysis.variables.map((variable, n) => [variable.name, `사용자 값 ${n} "인용" \\ 경로\n새 줄`]));
      const result = engine.renderTemplate(source, values);
      assert.deepEqual(result.errors, [], item.id);
      assert.deepEqual(result.unresolved, [], item.id);
      if (analysis.kind === 'json') assert.doesNotThrow(() => JSON.parse(result.text), item.id);
    }
  }
});

test('낙서 사진의 변수 선언과 본문 예시가 함께 변경된다', () => {
  const item = catalog.items.find(item => item.id === 'portrait_case296');
  for (const source of [item.ko, item.originalTemplate]) {
    const variables = engine.analyzeTemplate(source).variables;
    assert.equal(variables.length, 9);
    const result = engine.renderTemplate(source, Object.fromEntries(variables.map((variable, index) => [variable.name, `새 값 ${index}`])));
    assert.doesNotMatch(result.text, /kashmir|wooden interior|Focus mode on|keep going/i);
  }
});
