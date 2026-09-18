(function (root, factory) {
  'use strict';
  const engine = typeof module === 'object' && module.exports ? require('./template-engine.js') : root.AtlasTemplate;
  const api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AtlasPromptStructure = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine) {
  'use strict';

  const GROUPS = ['content', 'composition', 'style'];
  const GROUP_LABELS = Object.freeze({
    content: '대상·문구',
    composition: '구성·장면 설정',
    style: '스타일·조명·화질'
  });

  const RULES = {
    content: [
      /대상|주인공|인물|사람|여성|남성|캐릭터|제품|상품|음식|음료|브랜드|로고|이름|제목|문구|텍스트|카피|헤드라인|태그라인|표정|행동|자세|포즈|의상|소품|subject|character|person|product|food|drink|brand|logo|name|title|text|copy|headline|tagline|expression|action|pose|outfit|prop/gi
    ],
    composition: [
      /구성|배치|레이아웃|그리드|패널|프레임|전경|중앙|왼쪽|오른쪽|상단|하단|배경|장면|공간|장소|환경|개수|정확히|카메라|렌즈|앵글|시점|원근|화면비|가로세로|composition|layout|grid|panel|frame|foreground|center|left|right|upper|lower|top|bottom|background|scene|setting|location|environment|exactly|camera|lens|angle|perspective|aspect ratio/gi
    ],
    style: [
      /스타일|화풍|미학|분위기|재질|질감|색상|색감|팔레트|조명|빛|그림자|하이라이트|사진|일러스트|렌더|사실적|영화적|선명|디테일|초점|심도|보케|해상도|품질|금지|피하세요|왜곡|아티팩트|style|aesthetic|mood|material|texture|color|palette|lighting|light|shadow|highlight|photography|illustration|render|realistic|cinematic|sharp|detail|focus|depth of field|bokeh|resolution|quality|avoid|negative|artifact/gi
    ]
  };

  const SUBLABELS = {
    content: [
      ['표기 문구·브랜딩', /문구|텍스트|카피|헤드라인|태그라인|로고|브랜드|이름|제목|text|copy|headline|tagline|logo|brand|name|title/i],
      ['대상·외형', /대상|주인공|인물|사람|여성|남성|캐릭터|제품|상품|음식|음료|subject|character|person|product|food|drink/i],
      ['행동·의상·소품', /행동|자세|포즈|표정|의상|소품|action|pose|expression|outfit|prop/i]
    ],
    composition: [
      ['카메라·시점', /카메라|렌즈|앵글|시점|원근|심도|초점|camera|lens|angle|perspective|depth of field|focus/i],
      ['구성·배치', /구성|배치|레이아웃|그리드|패널|프레임|전경|중앙|왼쪽|오른쪽|상단|하단|개수|정확히|화면비|composition|layout|grid|panel|frame|foreground|center|left|right|upper|lower|top|bottom|exactly|aspect ratio/i],
      ['장면·배경', /배경|장면|공간|장소|환경|background|scene|setting|location|environment/i]
    ],
    style: [
      ['조명·색감', /조명|빛|그림자|하이라이트|색상|색감|팔레트|lighting|light|shadow|highlight|color|palette/i],
      ['화질·렌더링', /선명|디테일|초점|해상도|품질|렌더|사실적|sharp|detail|focus|resolution|quality|render|realistic/i],
      ['제외·금지 조건', /금지|피하세요|제외|왜곡|아티팩트|avoid|negative|exclude|distort|artifact/i],
      ['화풍·재질·분위기', /스타일|화풍|미학|분위기|재질|질감|사진|일러스트|영화적|style|aesthetic|mood|material|texture|photography|illustration|cinematic/i]
    ]
  };

  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

  function matchCount(text, rule) {
    const flags = rule.flags.includes('g') ? rule.flags : `${rule.flags}g`;
    return [...text.matchAll(new RegExp(rule.source, flags))].length;
  }

  function score(text, rules) {
    return rules.reduce((total, rule) => total + matchCount(text, rule), 0);
  }

  function classify(text, hint = '') {
    const source = `${hint} ${text}`;
    const scoringSource = source.replace(/\{\{[^{}\n]+\}\}/g, '');
    const scores = Object.fromEntries(GROUPS.map(group => [group, score(scoringSource, RULES[group])]));
    let group = 'content';
    if (scores.composition > scores.content && scores.composition >= scores.style) group = 'composition';
    if (scores.style > scores.content && scores.style > scores.composition) group = 'style';
    const labels = SUBLABELS[group].map(([label, rule]) => ({ label, count: matchCount(scoringSource, rule) }));
    const best = labels.reduce((selected, candidate) => candidate.count > selected.count ? candidate : selected, labels[0]);
    const label = best.count > 0 ? best.label : GROUP_LABELS[group];
    return { group, label };
  }

  function friendlyText(value, tokens, mappings) {
    if (!tokens.length) return value;
    const output = [];
    let cursor = 0;
    for (const token of tokens) {
      const marker = `{{${token.label}}}`;
      output.push(value.slice(cursor, token.start), marker);
      if (!mappings.has(marker)) mappings.set(marker, []);
      mappings.get(marker).push(token.raw);
      cursor = token.end;
    }
    output.push(value.slice(cursor));
    return output.join('');
  }

  function restoreMarkers(value, sourceMappings) {
    const mappings = new Map([...sourceMappings].map(([marker, values]) => [marker, [...values]]));
    return value.replace(/\{\{[^{}\n]+\}\}/g, marker => {
      const queue = mappings.get(marker);
      return queue?.length ? queue.shift() : marker;
    });
  }

  function splitText(value) {
    const pieces = [];
    let start = 0;
    let index = 0;
    const push = (end, suffixEnd) => {
      const body = value.slice(start, end);
      const suffix = value.slice(end, suffixEnd);
      if (body || suffix) pieces.push({ body, suffix });
      start = suffixEnd;
    };
    while (index < value.length) {
      if (value[index] === '\n') {
        let end = index + 1;
        while (value[end] === '\n') end++;
        push(index, end);
        index = end;
        continue;
      }
      if (/[.!?。！？]/.test(value[index])) {
        let punctuationEnd = index + 1;
        while (/[.!?。！？"'”’」』】)]/.test(value[punctuationEnd] || '')) punctuationEnd++;
        let whitespaceEnd = punctuationEnd;
        while (/[ \t]/.test(value[whitespaceEnd] || '')) whitespaceEnd++;
        if (whitespaceEnd > punctuationEnd && punctuationEnd - start >= 90) {
          push(punctuationEnd, whitespaceEnd);
          index = whitespaceEnd;
          continue;
        }
      }
      index++;
    }
    if (start < value.length) push(value.length, value.length);
    return pieces;
  }

  function fieldLabel(path, fallback, counters) {
    const key = path?.length ? path.slice(-2).join(' · ').replace(/[_-]+/g, ' ') : fallback;
    const count = (counters.get(fallback) || 0) + 1;
    counters.set(fallback, count);
    return key && key !== '$' ? key : `${fallback} ${count}`;
  }

  function addField(model, value, suffix, hint, path, type = 'string') {
    if (!value && suffix) {
      const previous = model.fields.at(-1);
      if (previous) previous.suffix += suffix;
      else model.leading += suffix;
      return;
    }
    if (!value) return;
    const classified = classify(value, hint);
    const counterKey = classified.label;
    model.fields.push({
      id: `field-${model.fields.length}`,
      group: classified.group,
      label: fieldLabel(path, counterKey, model.labelCounters),
      semanticLabel: classified.label,
      value,
      suffix,
      path,
      type,
      extra: false
    });
  }

  function createTextModel(source, inspected) {
    const mappings = new Map();
    const friendly = friendlyText(source, inspected.leaves[0]?.tokens || [], mappings);
    const model = { kind: 'text', source, leading: '', fields: [], extras: [], mappings, labelCounters: new Map() };
    for (const piece of splitText(friendly)) addField(model, piece.body, piece.suffix, '', null);
    return model;
  }

  function pathKey(path) {
    return '$' + path.map(part => typeof part === 'number' ? `[${part}]` : `[${JSON.stringify(part)}]`).join('');
  }

  function createJsonModel(source, inspected) {
    const parsed = JSON.parse(source);
    const leafByPath = new Map(inspected.leaves.map(leaf => [leaf.path, leaf]));
    const mappings = new Map();
    const model = { kind: 'json', source, parsed, leading: '', fields: [], extras: [], mappings, labelCounters: new Map() };
    const walk = (value, path = []) => {
      if (Array.isArray(value)) return value.forEach((child, index) => walk(child, [...path, index]));
      if (value !== null && typeof value === 'object') return Object.entries(value).forEach(([key, child]) => walk(child, [...path, key]));
      const type = value === null ? 'null' : typeof value;
      const text = type === 'string'
        ? friendlyText(value, leafByPath.get(pathKey(path))?.tokens || [], mappings)
        : String(value);
      const hint = path.filter(part => typeof part === 'string').join(' ');
      addField(model, text, '', hint, path, type);
    };
    walk(parsed);
    return model;
  }

  function createModel(source) {
    const text = String(source == null ? '' : source);
    const inspected = engine.inspectTemplate(text);
    const model = inspected.kind === 'json' ? createJsonModel(text, inspected) : createTextModel(text, inspected);
    model.extras = GROUPS.map(group => ({
      id: `extra-${group}`,
      group,
      label: group === 'content' ? '대상·문구 조건 추가' : group === 'composition' ? '구성·장면 조건 추가' : '스타일·화질 조건 추가',
      semanticLabel: '선택 입력',
      value: '',
      suffix: '',
      path: null,
      type: 'string',
      extra: true
    }));
    delete model.labelCounters;
    return model;
  }

  function parseTyped(field, errors) {
    if (field.type === 'string') return field.value;
    if (field.type === 'number') {
      const number = Number(field.value);
      if (!Number.isFinite(number)) errors.push(`${field.label}: 숫자를 입력해 주세요.`);
      return Number.isFinite(number) ? number : field.value;
    }
    if (field.type === 'boolean') {
      if (!['true', 'false'].includes(field.value.trim().toLowerCase())) errors.push(`${field.label}: true 또는 false를 입력해 주세요.`);
      return field.value.trim().toLowerCase() === 'true';
    }
    if (field.type === 'null') return field.value.trim() === 'null' ? null : field.value;
    return field.value;
  }

  function setPath(target, path, value) {
    let cursor = target;
    for (let index = 0; index < path.length - 1; index++) cursor = cursor[path[index]];
    cursor[path.at(-1)] = value;
  }

  function extrasText(model) {
    return model.extras.filter(field => field.value.trim()).map(field => field.value.trim()).join('\n\n');
  }

  function composeModel(model) {
    const errors = [];
    let text;
    if (model.kind === 'json') {
      const output = structuredClone(model.parsed);
      const restored = new Map([...model.mappings].map(([marker, values]) => [marker, [...values]]));
      const restore = value => value.replace(/\{\{[^{}\n]+\}\}/g, marker => {
        const queue = restored.get(marker);
        return queue?.length ? queue.shift() : marker;
      });
      for (const field of model.fields) {
        let value = parseTyped(field, errors);
        if (field.type === 'string') value = restore(value);
        setPath(output, field.path, value);
      }
      text = JSON.stringify(output, null, 2);
    } else {
      const friendly = model.leading + model.fields.map(field => field.value + field.suffix).join('');
      text = restoreMarkers(friendly, model.mappings);
    }
    const additions = extrasText(model);
    if (additions) text += `${text.trim() ? '\n\n' : ''}${additions}`;
    return { text, errors };
  }

  function fieldsFor(model, group) {
    return [...model.fields.filter(field => field.group === group), ...model.extras.filter(field => field.group === group)];
  }

  return Object.freeze({ GROUP_LABELS, createModel, composeModel, fieldsFor });
});
