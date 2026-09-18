const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { analyzeTemplate, renderTemplate } = require('../src/template-engine.js');
const { items } = require('../data/catalog.json');

test('브라우저 전역과 CommonJS가 동일한 순수 API를 제공한다', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/template-engine.js'), 'utf8'), context);
  assert.equal(typeof context.AtlasTemplate.analyzeTemplate, 'function');
  assert.equal(context.AtlasTemplate.renderTemplate('[BRAND NAME]', { 'BRAND NAME': '브랜드' }).text, '브랜드');
});

test('같은 argument를 한 입력으로 묶고 모든 위치를 같은 값으로 바꾼다', () => {
  const text = '처음 {argument name="brand name" default="Licious"}, 끝 {argument name="brand name" default="Licious"}!';
  assert.deepEqual(analyzeTemplate(text), {
    variables: [{ name: 'brand name', label: '브랜드명', defaultValue: 'Licious', kind: 'argument', occurrences: 2 }],
    kind: 'text', errors: []
  });
  assert.equal(renderTemplate(text, { 'brand name': '테스트브랜드' }).text, '처음 테스트브랜드, 끝 테스트브랜드!');
  assert.equal(renderTemplate(text).text, '처음 Licious, 끝 Licious!');
  const mixed = '[brand name] / {argument name="brand name" default="Licious"}';
  assert.equal(analyzeTemplate(mixed).variables.length, 1);
  assert.deepEqual(renderTemplate(mixed), { text: 'Licious / Licious', unresolved: [], errors: [] });
});

test('일반 문장의 개행·순서·문장부호와 치환 문자열의 특수 문자를 보존한다', () => {
  const text = ' 첫 줄 🙂\n제품: {argument name="product" default="컵"}\n끝\t. ';
  const value = ' "컵"\n$& $` $\' <img src=x onerror=alert(1)> \\ ';
  assert.equal(renderTemplate(text, { product: value }).text, ' 첫 줄 🙂\n제품: ' + value + '\n끝\t. ');
  assert.equal(renderTemplate('없는 변수: <b>테스트</b>\n [1,2] ').text, '없는 변수: <b>테스트</b>\n [1,2] ');
});

test('argument의 인용부호, 중괄호, 대괄호, 개행 기본값을 안전하게 읽는다', () => {
  const text = String.raw`{argument name="message" default="say \"hi\", {nested}, [example]\nnext"}`;
  assert.equal(analyzeTemplate(text).variables[0].defaultValue, 'say "hi", {nested}, [example]\nnext');
  assert.equal(renderTemplate(text).text, 'say "hi", {nested}, [example]\nnext');
  const escaped = String.raw`{argument name=\"brand name\" default=\"A \\\"quoted\\\" brand\"}`;
  assert.equal(renderTemplate(escaped).text, 'A "quoted" brand');
  const literalNewline = '{argument default="첫 줄\n둘째 줄" name="message"}';
  assert.equal(renderTemplate(literalNewline).text, '첫 줄\n둘째 줄');
});

test('대괄호 기본값을 보존하면서 입력 필요 상태를 안내한다', () => {
  const text = '{argument name="plant type" default="[PLANT / FLOWER]"}';
  assert.equal(analyzeTemplate(text).variables.length, 1);
  assert.deepEqual(renderTemplate(text), { text: '[PLANT / FLOWER]', unresolved: ['plant type'], errors: [] });
  assert.deepEqual(renderTemplate(text, { 'plant type': '' }), { text: '[식물 종류]', unresolved: ['plant type'], errors: [] });
});

test('빈 문자열과 공백 입력 및 빈칸 템플릿은 기본값으로 되돌아가지 않는다', () => {
  const text = '{argument name="brand name" default="Licious"} / {argument name="product name" default="Momos"}';
  assert.deepEqual(renderTemplate(text, { 'brand name': '  ', 'product name': '' }), {
    text: '[브랜드명] / [제품명]', unresolved: ['brand name', 'product name'], errors: []
  });
  assert.deepEqual(renderTemplate(text, { 'brand name': 'NEW', 'product name': 'NEW' }, { blank: true }), {
    text: '[브랜드명] / [제품명]', unresolved: ['brand name', 'product name'], errors: []
  });
});

test('명시된 대괄호 변수만 연결하고 배열·섹션·링크·코드리스트는 보존한다', () => {
  const text = '[BRAND NAME]의 [PRODUCT] / [BRAND NAME]';
  assert.deepEqual(analyzeTemplate(text).variables.map(x => [x.name, x.occurrences]), [['BRAND NAME', 2], ['PRODUCT', 1]]);
  assert.equal(renderTemplate(text, { 'BRAND NAME': 'A', PRODUCT: '컵' }).text, 'A의 컵 / A');
  const nonVariables = '[1,2] ["red","blue"] [red, blue]\n[스타일]\n[STYLE]\n[LAYOUT]\n[CHARACTER]\n[PROJECT CARD]\n[layout_setup]\n[hold|pause]\n[SUBJECT](https://example.com) ![PRODUCT](photo.jpg)\n[BRAND NAME]: https://example.com\n[PRODUCT][reference] [[SUBJECT]] \\[BRAND NAME]';
  assert.deepEqual(analyzeTemplate(nonVariables).variables, []);
  assert.equal(renderTemplate(nonVariables).text, nonVariables);
  const headerCase = items.find(x => x.id === 'character_case24');
  assert.deepEqual(analyzeTemplate(headerCase.ko).variables, []);
  assert.deepEqual(analyzeTemplate(headerCase.original).variables, []);
});

test('JSON의 문자열 값만 재귀 치환하고 key·숫자·불린·배열 순서를 유지한다', () => {
  const source = {
    '{argument name="untouched" default="key"}': '그대로',
    text: '{argument name="brand name" default="Licious"}',
    nested: [{ text: '[BRAND NAME]' }, false, 2, null],
    second: '{argument name="brand name" default="Licious"}'
  };
  const input = '"quoted"\n$& \\ <script>alert(1)</script>';
  const result = renderTemplate(JSON.stringify(source), { 'brand name': input, 'BRAND NAME': input });
  const expected = structuredClone(source);
  expected.text = input;
  expected.second = input;
  expected.nested[0].text = input;
  assert.deepEqual(JSON.parse(result.text), expected);
  assert.equal(analyzeTemplate(JSON.stringify(source)).kind, 'json');
  assert.equal(analyzeTemplate(JSON.stringify(source)).variables.length, 2);
  assert.deepEqual(JSON.parse(renderTemplate('[1,2,true,null]').text), [1, 2, true, null]);
  assert.deepEqual(JSON.parse(renderTemplate('["[STYLE]"]', { STYLE: '수채화' }).text), ['수채화']);
  const overlappingPaths = '{"a.b":"[BRAND NAME]","a":{"b":"[PRODUCT]"}}';
  assert.deepEqual(JSON.parse(renderTemplate(overlappingPaths, { 'BRAND NAME': '브랜드', PRODUCT: '제품' }).text), { 'a.b': '브랜드', a: { b: '제품' } });
});

test('중괄호·동아시아 괄호의 명시 변수만 치환하고 실제 문구와 섹션을 보존한다', () => {
  const text = '【主题】 / 【主题】 / {テーマ/主題} / {CAMERA_MODEL} / {{USER_IMAGE}} / {画幅比例}';
  assert.deepEqual(analyzeTemplate(text).variables.map(x => [x.name, x.occurrences]), [
    ['主题', 2], ['テーマ/主題', 1], ['CAMERA_MODEL', 1], ['USER_IMAGE', 1], ['画幅比例', 1]
  ]);
  assert.equal(renderTemplate(text, { '主题': '달', 'テーマ/主題': '바다', CAMERA_MODEL: 'A7', USER_IMAGE: 'photo.png', '画幅比例': '4:3' }).text,
    '달 / 달 / 바다 / A7 / photo.png / 4:3');
  const fixed = '【总风格】\n【核心结构锁定】\n【일반 스타일】\n「BRAND PRESS 01」 / 「GW連休!」 / 《国家地理》 / {count: 1}';
  assert.deepEqual(analyzeTemplate(fixed).variables, []);
  assert.equal(renderTemplate(fixed).text, fixed);
  assert.equal(renderTemplate('「ここに自己紹介」 （ここに名前）', { 'ここに自己紹介': '안녕하세요.', 'ここに名前': '이름' }).text, '안녕하세요. 이름');
  const json = items.find(x => x.id === 'comparison_case96').original;
  assert.equal(JSON.parse(renderTemplate(json, { USER_IMAGE: '"image"\n.png' }).text).input_image, '"image"\n.png');
  const theme = items.find(x => x.id === 'poster_case50').original;
  const rendered = renderTemplate(theme, { '主题': '나의 주제' }).text;
  assert.ok(!rendered.includes('【主题】'));
  assert.ok(rendered.includes('【总风格】'));
});

test('캐릭터 시트의 명시 변수 열 개를 빠짐없이 요구한다', () => {
  for (const language of ['ko', 'original']) {
    const source = items.find(x => x.id === 'poster_case352')[language];
    const analysis = analyzeTemplate(source);
    assert.equal(analysis.variables.length, 10);
    assert.equal(renderTemplate(source).unresolved.length, 10);
    const values = Object.fromEntries(analysis.variables.map((variable, i) => [variable.name, `선택 ${i}`]));
    const result = renderTemplate(source, values);
    assert.deepEqual(result.unresolved, []);
    assert.doesNotMatch(result.text, /\[[A-Z][^\]\n]*\]/);
  }
});

test('콜론·등호 선언의 기본값과 참조를 연결하되 링크·섹션 표기는 보존한다', () => {
  const source = '[STYLE]: 원래 스타일\n[SUBJECT_DESCRIPTION]: 원래 인물\n\n이후 [STYLE]를 [SUBJECT_DESCRIPTION]에 적용.';
  assert.deepEqual(analyzeTemplate(source).variables.map(v => [v.name, v.defaultValue, v.occurrences]), [
    ['STYLE', '원래 스타일', 2], ['SUBJECT_DESCRIPTION', '원래 인물', 2]
  ]);
  assert.equal(renderTemplate(source, { STYLE: '수채화', SUBJECT_DESCRIPTION: '고양이' }).text,
    '[STYLE]: 수채화\n[SUBJECT_DESCRIPTION]: 고양이\n\n이후 수채화를 고양이에 적용.');
  const equals = '[VAR_CITY] = "Tokyo, Japan"  [NODE 1: BASE_TOPOLOGY] 형태. [VAR_CITY]를 사용.';
  assert.equal(renderTemplate(equals, { VAR_CITY: 'Seoul' }).text,
    '[VAR_CITY] = "Seoul"  [NODE 1: BASE_TOPOLOGY] 형태. Seoul를 사용.');
  assert.equal(analyzeTemplate(equals).variables[0].defaultValue, 'Tokyo, Japan');
  const links = '[BRAND NAME]: https://example.com\n[PRODUCT]: guide.html "제목"\n[SUBJECT]: ../image.png\n[STYLE]\n스타일 설명';
  assert.deepEqual(analyzeTemplate(links).variables, []);
  assert.equal(renderTemplate(links).text, links);
  const inlineColon = 'Study [BRAND NAME]: identify its industry. Tone from [COLOR]: silver.';
  assert.equal(renderTemplate(inlineColon, { 'BRAND NAME': 'Atlas', COLOR: 'gold' }).text,
    'Study Atlas: identify its industry. Tone from gold: silver.');
  for (const id of ['character_case27', 'poster_case370']) {
    const character = items.find(x => x.id === id).original;
    const characterAnalysis = analyzeTemplate(character);
    assert.deepEqual(characterAnalysis.variables.map(v => v.name), ['STYLE', 'SUBJECT_DESCRIPTION']);
    const changed = renderTemplate(character, { STYLE: 'watercolor', SUBJECT_DESCRIPTION: 'a cat' }).text;
    assert.ok(changed.includes('[STYLE]: watercolor'));
    assert.ok(changed.includes('[SUBJECT_DESCRIPTION]: a cat'));
    assert.ok(!changed.includes(characterAnalysis.variables[1].defaultValue));
  }
});

test('추가 명시 표식과 연관 별칭을 지원하고 구체적 예시·아이콘·단계 이름을 입력으로 오인하지 않는다', () => {
  for (const marker of ['[playlist]', '[PERSONE]', '[IP_1]', '[NUMBER OF WORLD CUP TITLES WON]', '[BREW]', '[Name of The Stadium, Location]', '[SCIENTIFIC CONCEPT (e.g.,  CARBON / DNA / GRAVITY)]', '[Product Inside]', '[Stem / Leaf / Crown]']) {
    assert.equal(analyzeTemplate(marker).variables.length, 1, marker);
    assert.equal(renderTemplate(marker).unresolved.length, 1, marker);
  }
  assert.equal(analyzeTemplate('[BRAND NAME = CHANGE TO YOUR BRAND] / [BRAND NAME]').variables.length, 1);
  assert.equal(renderTemplate('[Pencil_Shaving] [$Pencil_Shaving]', { Pencil_Shaving: '붉은 조각' }).text, '붉은 조각 붉은 조각');
  assert.equal(renderTemplate('[PERSONE](스포츠, 음악, 영화)', { PERSONE: '인물' }).text, '인물(스포츠, 음악, 영화)');
  assert.deepEqual(analyzeTemplate('[SUBJECT](https://example.com/a,b)').variables, []);
  assert.equal(renderTemplate('（角色名称） / (캐릭터 이름)', { '角色名称': '소녀', '캐릭터 이름': '기사' }).text, '소녀 / 기사');
  const fixed = '[Chicago bulls] [QUEEN] [Melbourne] [ALGERIA] [УФА] [ball] [paw] [Clock] [NODE 1: BASE_TOPOLOGY] [BASE_TOPOLOGY] [RENDER_ENGINE] [hold|pause]';
  assert.deepEqual(analyzeTemplate(fixed).variables, []);
  assert.equal(renderTemplate(fixed).text, fixed);
});

test('특수 이름은 프로토타입으로 해석하지 않고 입력 키와 JSON 키로 보존한다', () => {
  const text = '{argument name="__proto__" default="safe"} {argument name="constructor" default="safe"}';
  const values = JSON.parse('{"__proto__":"사용자 값","constructor":"생성자"}');
  assert.equal(renderTemplate(text, values).text, '사용자 값 생성자');
  assert.equal(renderTemplate(text, {}, { blank: true }).text, '[__proto__] [constructor]');
  const json = '{"__proto__":"[BRAND NAME]","constructor":false}';
  assert.deepEqual(JSON.parse(renderTemplate(json, { 'BRAND NAME': '안전' }).text), JSON.parse('{"__proto__":"안전","constructor":false}'));
});

test('잘못된 argument는 오류를 보고하고 원문을 그대로 유지한다', () => {
  for (const source of [
    '{argument name="x" default="unterminated}',
    '{argument name="x"}',
    '{argument name="" default="value"}',
    '{argument name="x" default="v" extra="bad"}',
    '{argument name="x}" extra="bad" default="[PRODUCT]"}',
    '{argument name="x" default="bad} [PRODUCT]',
    '{argument name="x" name="y" default="v"}',
    '{argument name="x" default="v"'
  ]) {
    assert.ok(analyzeTemplate(source).errors.length > 0, source);
    assert.equal(renderTemplate(source).text, source);
    assert.deepEqual(analyzeTemplate(source).variables, []);
  }
});

test('반복 변수의 기본값 충돌을 알리고 첫 기본값으로 일관되게 연결한다', () => {
  const source = '{argument name="hair color" default="brown"} / {argument name="hair color" default="black"}';
  assert.equal(renderTemplate(source).text, 'brown / brown');
  assert.equal(analyzeTemplate(source).warnings.length, 1);
  assert.equal(analyzeTemplate(source).errors.length, 0);
  assert.equal(renderTemplate(source).errors.length, 1);
  assert.equal(renderTemplate(source, { 'hair color': 'blue' }).text, 'blue / blue');
  assert.deepEqual(renderTemplate(source, { 'hair color': 'blue' }).errors, []);
  assert.deepEqual(renderTemplate(source, {}, { blank: true }).errors, []);
});

test('시네마틱 치킨 모모스 사례의 변수를 모두 연결하고 기본 태그를 제거한다', () => {
  const source = items.find(x => x.id === 'ui_case117').ko;
  const analysis = analyzeTemplate(source);
  for (const name of ['brand name', 'product name', 'headline text', 'tagline text']) {
    assert.ok(analysis.variables.some(x => x.name === name), name);
  }
  assert.equal(analysis.variables.find(x => x.name === 'brand name').occurrences, 2);
  const rendered = renderTemplate(source, { 'brand name': '테스트브랜드' });
  assert.equal(rendered.text.split('테스트브랜드').length - 1, 2);
  assert.ok(!rendered.text.includes('{argument'));
  const blank = renderTemplate(source, {}, { blank: true });
  assert.deepEqual(blank.unresolved, analysis.variables.map(x => x.name));
  assert.ok(!blank.text.includes('{argument'));
});

test('기존 98개 argument 사례의 기본값·재사용·빈칸 출력에서 태그가 남지 않는다', () => {
  const argumentItems = items.filter(x => /\{argument\b/.test(x.original));
  assert.equal(argumentItems.length, 98);
  const expectedOccurrences = argumentItems.reduce((sum, item) => sum + [...item.ko.matchAll(/\{argument\b/g)].length, 0);
  let occurrences = 0;
  for (const item of argumentItems) {
    for (const language of ['ko', 'original']) {
      const source = item[language];
      const analysis = analyzeTemplate(source);
      if (language === 'ko') occurrences += analysis.variables.filter(x => x.kind === 'argument').reduce((sum, x) => sum + x.occurrences, 0);
      const values = Object.fromEntries(analysis.variables.map((variable, i) => [variable.name, `입력 ${i} "따옴표"\n$& <b>본문</b>`]));
      for (const result of [renderTemplate(source), renderTemplate(source, values), renderTemplate(source, values, { blank: true })]) {
        assert.ok(!result.text.includes('{argument'), item.id + ':' + language);
        if (analysis.kind === 'json') assert.doesNotThrow(() => JSON.parse(result.text), item.id + ':' + language);
      }
      assert.equal(renderTemplate(source, values).unresolved.length, 0, item.id + ':' + language);
    }
  }
  assert.equal(occurrences, expectedOccurrences);
});

test('전체 825개 원문·번역의 렌더링은 구조를 보존하고 입력을 독립적으로 처리한다', () => {
  assert.equal(items.length, 825);
  const warnings = [];
  for (const item of items) {
    for (const language of ['ko', 'original']) {
      const source = item[language];
      const analysis = analyzeTemplate(source);
      const rendered = renderTemplate(source);
      assert.deepEqual(analysis.errors, [], item.id + ':' + language);
      if (analysis.warnings?.length) warnings.push(item.id + ':' + language);
      if (analysis.kind === 'json') {
        const before = JSON.parse(source);
        const after = JSON.parse(rendered.text);
        const shape = value => typeof value === 'string' ? '<string>' : Array.isArray(value) ? value.map(shape) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)])) : value;
        assert.deepEqual(shape(after), shape(before), item.id + ':' + language);
      } else if (analysis.variables.length === 0) {
        assert.equal(rendered.text, source, item.id + ':' + language);
      }
      const values = Object.fromEntries(analysis.variables.map((variable, i) => [variable.name, `값_${i}`]));
      assert.deepEqual(renderTemplate(source, values).errors, [], item.id + ':' + language);
      assert.deepEqual(renderTemplate(source, values).unresolved, [], item.id + ':' + language);
      assert.deepEqual(renderTemplate(source, values, { blank: true }).unresolved, analysis.variables.map(x => x.name), item.id + ':' + language);
    }
  }
  assert.ok(warnings.every(id => ['ui_case115:ko', 'ui_case115:original'].includes(id)), warnings.join(', '));
});
