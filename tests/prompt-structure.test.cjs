const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../data/catalog.json');
const engine = require('../src/template-engine.js');
const structure = require('../src/prompt-structure.js');

function shape(value) {
  if (typeof value === 'string') return '<text>';
  if (Array.isArray(value)) return value.map(shape);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
  return value;
}

test('전체 825개 한국어·원문을 대상, 구성, 스타일 편집 영역으로 제공한다', () => {
  for (const item of catalog.items) {
    for (const source of [item.ko, item.originalTemplate || item.original]) {
      const model = structure.createModel(source);
      for (const group of ['content', 'composition', 'style']) {
        if (model.kind === 'text') assert.ok(structure.fieldsFor(model, group).length > 0, `${item.id}.${group}`);
      }
      if (model.kind === 'json') assert.ok(model.fields.length > 0, item.id);
      const result = structure.composeModel(model);
      assert.deepEqual(result.errors, [], item.id);
      if (model.kind === 'json') {
        assert.deepEqual(JSON.parse(result.text), JSON.parse(source), item.id);
        assert.deepEqual(shape(JSON.parse(result.text)), shape(JSON.parse(source)), item.id);
      } else {
        assert.equal(result.text, source, item.id);
      }
    }
  }
});

test('구조 영역을 수정해도 아규먼트 연결과 원래 문장 순서를 보존한다', () => {
  const item = catalog.items.find(item => item.id === 'ui_case117');
  const model = structure.createModel(item.ko);
  const beforeVariables = engine.analyzeTemplate(item.ko).variables.map(variable => [variable.name, variable.occurrences]);
  const styleField = structure.fieldsFor(model, 'style').find(field => !field.extra);
  const compositionField = structure.fieldsFor(model, 'composition').find(field => !field.extra);
  styleField.value += ' 선명한 기업용 디지털 사이니지 광고 스타일.';
  compositionField.value += ' 화면 중앙의 제품을 더 크게 배치하세요.';
  const result = structure.composeModel(model);
  assert.deepEqual(result.errors, []);
  assert.ok(result.text.includes('선명한 기업용 디지털 사이니지 광고 스타일.'));
  assert.ok(result.text.includes('화면 중앙의 제품을 더 크게 배치하세요.'));
  assert.deepEqual(engine.analyzeTemplate(result.text).variables.map(variable => [variable.name, variable.occurrences]), beforeVariables);
  const rendered = engine.renderTemplate(result.text, { 'brand name': 'Boime', 'product name': 'Digital Signage', 'headline text': '디지털 사이니지', 'tagline text': '원격 관리', website: 'boime.co.kr' });
  assert.deepEqual(rendered.errors, []);
  assert.equal(rendered.text.split('Digital Signage').length - 1, 3);
});

test('치킨 모모스 사례는 아규먼트와 구성 및 스타일 조건을 동시에 노출한다', () => {
  const item = catalog.items.find(item => item.id === 'ui_case117');
  const model = structure.createModel(item.ko);
  assert.equal(engine.analyzeTemplate(item.ko).variables.length, 5);
  assert.ok(structure.fieldsFor(model, 'content').some(field => !field.extra));
  assert.ok(structure.fieldsFor(model, 'composition').some(field => !field.extra));
  assert.ok(structure.fieldsFor(model, 'style').some(field => !field.extra));
  const visibleText = model.fields.map(field => field.value).join('\n');
  assert.match(visibleText, /\{\{브랜드명\}\}/);
  assert.match(visibleText, /\{\{제품명\}\}/);
  assert.doesNotMatch(visibleText, /\{argument/);
});

test('JSON 설정값을 나눠 수정해도 키, 배열, 숫자와 불린 형식을 보존한다', () => {
  const item = catalog.items.find(item => item.id === 'poster_case107');
  const source = item.originalTemplate || item.original;
  const model = structure.createModel(source);
  assert.equal(model.kind, 'json');
  assert.equal(model.extras.length, 0);
  const stringField = model.fields.find(field => field.type === 'string' && field.value);
  stringField.value += ' revised';
  const result = structure.composeModel(model);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(shape(JSON.parse(result.text)), shape(JSON.parse(source)));
});
