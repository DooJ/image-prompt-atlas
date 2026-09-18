(async () => {
  'use strict';
  const root = document.getElementById('prompt-atlas');
  const $ = id => root.querySelector('#' + id);
  const engine = globalThis.AtlasTemplate;
  const structure = globalThis.AtlasPromptStructure;

  const VARIABLE_META = {
    'brand name': { label: '브랜드명 · 회사/서비스', help: '로고와 브랜드 표기, 광고의 주체에 사용합니다. 예: Boime' },
    brand: { label: '브랜드명 · 회사/서비스', help: '로고와 브랜드 표기, 광고의 주체에 사용합니다. 예: Boime' },
    'product name': { label: '제품명 · 광고 대상', help: '실제로 보여줄 상품이나 서비스 이름입니다. 예: Digital Signage' },
    product: { label: '제품명 · 광고 대상', help: '실제로 보여줄 상품이나 서비스 이름입니다. 예: Digital Signage' },
    'headline text': { label: '메인 헤드라인', help: '가장 크게 표시할 핵심 광고 문구입니다.' },
    headline: { label: '메인 헤드라인', help: '가장 크게 표시할 핵심 광고 문구입니다.' },
    'tagline text': { label: '보조 태그라인', help: '헤드라인을 설명하는 짧은 보조 문구입니다.' },
    tagline: { label: '보조 태그라인', help: '헤드라인을 설명하는 짧은 보조 문구입니다.' },
    website: { label: '웹사이트 주소', help: '포스터 하단이나 연락처 영역에 표시할 주소입니다.' }
  };

  try {
    const packed = '__ATLAS_PACKED_DATA__';
    const bytes = Uint8Array.from(atob(packed), character => character.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data = JSON.parse(await new Response(stream).text());
    const categories = ['상품·광고', '인물·사진', '화풍 변환·복원', '캐릭터·굿즈', '포스터·일러스트', '인포그래픽·학습', 'UI·브랜딩', '스토리보드·공간'];
    const originalsById = new Map(data.items.map(item => [item.id, item]));
    const visibleItems = data.items.filter(item => !item.duplicateOf);
    const byId = new Map(data.items.map(item => [item.id, originalsById.get(item.duplicateOf || item.id)]));
    const relatedById = new Map(visibleItems.map(item => [item.id, []]));
    data.items.forEach(item => relatedById.get(item.duplicateOf || item.id).push(item));
    const drafts = new Map();
    let selected = null;
    let language = 'ko';
    let currentAnalysis = null;
    let currentResult = null;

    const normalizeName = name => name.trim().toLocaleLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
    const displayTitle = item => item.displayTitle || item.title;
    const relatedItems = item => relatedById.get(item.id);

    function sourceTemplate(item = selected) {
      return language === 'original' ? item.originalTemplate || item.original : item.ko;
    }

    function draftFor(item = selected) {
      const key = item.id + ':' + language;
      if (!drafts.has(key)) {
        const template = sourceTemplate(item);
        drafts.set(key, {
          template,
          model: structure.createModel(template),
          values: Object.create(null),
          expectedKind: engine.analyzeTemplate(template).kind,
          structureErrors: []
        });
      }
      return drafts.get(key);
    }

    function structuredOriginal(item) {
      try {
        const parsed = JSON.parse(item.originalTemplate || item.original);
        return parsed !== null && typeof parsed === 'object';
      } catch { return false; }
    }

    function clearCopyStatus() {
      $('atlas-copy-status').textContent = '';
      $('atlas-copy-fallback').hidden = true;
    }

    function updatePreview() {
      const draft = draftFor();
      currentAnalysis = engine.analyzeTemplate(draft.template);
      currentResult = engine.renderTemplate(draft.template, draft.values);
      const commonErrors = [...draft.structureErrors, ...currentAnalysis.errors];
      if (!draft.template.trim()) commonErrors.push('프롬프트 본문을 입력해 주세요.');
      if (draft.expectedKind === 'json' && currentAnalysis.kind !== 'json') {
        commonErrors.push('JSON 형식이 올바르지 않습니다. 쉼표·인용부호·괄호를 확인하거나 현재 편집을 되돌려 주세요.');
      }
      const errors = [...new Set([...commonErrors, ...currentResult.errors])];
      const incomplete = selected.sourceStatus === 'incomplete';
      $('atlas-composed').textContent = currentResult.text;
      const status = $('atlas-validation');
      status.dataset.state = errors.length || currentResult.unresolved.length ? 'error' : 'ready';
      status.textContent = errors.length ? errors.join(' ') : currentResult.unresolved.length
        ? '입력 필요: ' + currentResult.unresolved.map(name => currentAnalysis.variables.find(variable => variable.name === name)?.label || name).join(', ')
        : incomplete ? '출처 원문이 일부만 공개되어 있습니다. 공개된 부분만 복사할 수 있습니다.'
          : '대상·구성·스타일 조합 완료 · 복사할 수 있습니다.';
      $('atlas-copy-composed').disabled = Boolean(incomplete || errors.length || currentResult.unresolved.length);
      const blankResult = engine.renderTemplate(draft.template, draft.values, { blank: true });
      $('atlas-copy-template').disabled = Boolean(commonErrors.length || blankResult.errors.length);
      $('atlas-copy-partial').disabled = !draft.template.trim();
      $('atlas-copy-partial').hidden = !incomplete;
      $('atlas-copy-composed').hidden = incomplete;
      $('atlas-copy-template').hidden = incomplete || currentAnalysis.variables.length === 0;
      $('atlas-template-note').hidden = currentAnalysis.variables.length === 0;
    }

    function variableMeta(variable) {
      return VARIABLE_META[normalizeName(variable.name)] || {
        label: variable.label,
        help: `${variable.label}에 사용할 값을 입력합니다.`
      };
    }

    function renderArguments() {
      const draft = draftFor();
      currentAnalysis = engine.analyzeTemplate(draft.template);
      const container = $('atlas-fields');
      container.replaceChildren();
      for (const [index, variable] of currentAnalysis.variables.entries()) {
        const meta = variableMeta(variable);
        const wrap = document.createElement('div');
        wrap.className = 'atlas-field';
        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = 'atlas-variable-' + index;
        label.textContent = meta.label;
        const multiline = variable.defaultValue.includes('\n') || variable.defaultValue.length > 100;
        const input = document.createElement(multiline ? 'textarea' : 'input');
        input.id = label.htmlFor;
        input.className = 'form-control';
        if (!multiline) input.type = 'text';
        else input.rows = 2;
        input.value = Object.hasOwn(draft.values, variable.name) ? draft.values[variable.name] : variable.defaultValue;
        input.placeholder = `${meta.label} 입력`;
        const hint = document.createElement('span');
        hint.className = 'atlas-variable-hint text-small text-muted';
        hint.id = input.id + '-hint';
        hint.textContent = `${meta.help} · 프롬프트 ${variable.occurrences}곳에 반영`;
        input.setAttribute('aria-describedby', hint.id);
        input.addEventListener('input', () => {
          draft.values[variable.name] = input.value;
          clearCopyStatus();
          updatePreview();
        });
        wrap.append(label, input, hint);
        container.append(wrap);
      }
      const hasVariables = currentAnalysis.variables.length > 0;
      $('atlas-variable-section').hidden = !hasVariables;
      $('atlas-no-variables').hidden = hasVariables;
    }

    function syncDraftFromModel() {
      const draft = draftFor();
      const composed = structure.composeModel(draft.model);
      draft.template = composed.text;
      draft.structureErrors = composed.errors;
      $('atlas-template').value = draft.template;
      clearCopyStatus();
      updatePreview();
    }

    function renderSegmentGroup(group) {
      const draft = draftFor();
      const container = $(`atlas-${group}-fields`);
      const fields = structure.fieldsFor(draft.model, group);
      const regularCount = fields.filter(field => !field.extra).length;
      const countText = group === 'content' && currentAnalysis.variables.length > 0
        ? `${currentAnalysis.variables.length}개 아규먼트 · ${regularCount}개 조건`
        : `${regularCount}개 조건`;
      $(`atlas-${group}-count`).textContent = countText;
      container.replaceChildren();
      for (const [index, field] of fields.entries()) {
        const wrap = document.createElement('div');
        wrap.className = 'atlas-segment';
        wrap.dataset.extra = String(field.extra);
        const meta = document.createElement('div');
        meta.className = 'atlas-segment-meta';
        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = `atlas-${group}-${index}`;
        label.textContent = field.extra ? field.label : field.semanticLabel;
        const hint = document.createElement('span');
        hint.className = 'text-small text-muted';
        hint.textContent = field.extra
          ? '원문에 없는 조건이 필요할 때 추가하세요.'
          : field.path ? `JSON 항목 · ${field.label}` : `${field.label} · 원문 순서 유지`;
        meta.append(label, hint);
        const input = document.createElement('textarea');
        input.id = label.htmlFor;
        input.className = 'form-control';
        input.rows = field.extra ? 2 : Math.min(7, Math.max(2, Math.ceil(field.value.length / 110)));
        input.value = field.value;
        input.placeholder = field.extra ? field.label : '이 조건을 수정하세요.';
        input.addEventListener('input', () => {
          field.value = input.value;
          syncDraftFromModel();
        });
        input.addEventListener('change', () => {
          renderArguments();
          updatePreview();
        });
        wrap.append(meta, input);
        container.append(wrap);
      }
    }

    function renderEditor() {
      const draft = draftFor();
      clearCopyStatus();
      $('atlas-template').value = draft.template;
      $('atlas-language').value = language;
      renderArguments();
      for (const group of ['content', 'composition', 'style']) renderSegmentGroup(group);
      $('atlas-template-details').open = false;
      $('atlas-format-note').textContent = draft.model.kind === 'json'
        ? 'JSON 항목을 의미별로 나눴습니다. 키·계층·배열과 숫자·불린 형식은 그대로 유지됩니다.'
        : structuredOriginal(selected) && language === 'ko'
          ? '대상·구성·스타일을 나눠 편집하며 원래 문장 순서로 다시 조합합니다. 원문 JSON은 편집 언어에서 확인할 수 있습니다.'
          : '대상·구성·스타일을 나눠 편집하며 최종 프롬프트는 원래 문장 순서로 다시 조합됩니다.';
      updatePreview();
    }

    function addImages(item) {
      const box = $('atlas-images');
      box.replaceChildren();
      [...new Set(relatedItems(item).flatMap(candidate => candidate.images))].forEach((path, index) => {
        const figure = document.createElement('figure');
        const link = document.createElement('a');
        link.href = 'https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/' + data.sha + '/' + path;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const image = document.createElement('img');
        image.src = 'https://cdn.jsdelivr.net/gh/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts@' + data.sha + '/' + path;
        image.alt = displayTitle(item) + ' · 공개 결과 ' + (index + 1);
        image.loading = 'lazy';
        const caption = document.createElement('figcaption');
        caption.className = 'text-small text-muted';
        caption.textContent = '공개 결과 ' + (index + 1) + ' · 원본 이미지 열기';
        image.addEventListener('error', () => {
          image.hidden = true;
          link.textContent = '이미지를 불러오지 못했습니다. 원본 이미지 열기';
        }, { once: true });
        link.append(image);
        figure.append(link, caption);
        box.append(figure);
      });
    }

    function show(id, updateHash = true) {
      const item = byId.get(id);
      if (!item) return;
      selected = item;
      $('atlas-detail').hidden = false;
      $('atlas-case').value = item.id;
      $('atlas-title').textContent = displayTitle(item);
      $('atlas-mode').textContent = item.mode || '프롬프트 편집';
      $('atlas-id').textContent = item.id;
      $('atlas-source-warning').hidden = item.sourceStatus !== 'incomplete';
      $('atlas-source-warning').textContent = item.sourceStatus === 'incomplete'
        ? '원문 일부만 공개된 사례입니다. ' + (item.sourceNote || '출처의 본문이 중간에서 끊겨 있습니다.') + ' 완성된 프롬프트로 제공할 수 없어 공개된 부분만 확인·복사할 수 있습니다. 아래 원 게시물에서 전체 원문 공개 여부를 확인해 주세요.' : '';
      $('atlas-edit-note').hidden = !item.sourceNote || item.sourceStatus === 'incomplete';
      $('atlas-edit-note').textContent = item.sourceNote || '';
      $('atlas-input').textContent = item.input || '본문의 참조 이미지·자료 요구를 확인해 함께 준비하세요.';
      $('atlas-korean-reference').textContent = item.ko;
      $('atlas-original-title').textContent = '원문 · ' + item.originalTitle;
      $('atlas-original-reference').textContent = item.original;
      $('atlas-output').textContent = item.result || item.title;
      $('atlas-key').textContent = item.key || '';
      $('atlas-repo').href = 'https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/blob/' + data.sha + '/' + item.file + '#' + item.anchor;
      $('atlas-author').href = item.source;
      const related = relatedItems(item).filter(candidate => candidate.id !== item.id);
      $('atlas-duplicates-note').hidden = related.length === 0;
      $('atlas-duplicates-note').textContent = related.length ? '같은 원문으로 등록된 ' + (related.length + 1) + '개 사례를 통합했습니다. 예시 이미지와 각 출처는 함께 보존했습니다.' : '';
      $('atlas-related-sources').replaceChildren();
      related.forEach(candidate => {
        const repository = document.createElement('a');
        repository.href = 'https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/blob/' + data.sha + '/' + candidate.file + '#' + candidate.anchor;
        repository.target = '_blank';
        repository.rel = 'noopener noreferrer';
        repository.textContent = '통합된 출처 · ' + candidate.id;
        const author = document.createElement('a');
        author.href = candidate.source;
        author.target = '_blank';
        author.rel = 'noopener noreferrer';
        author.textContent = '원 게시물 · ' + candidate.id;
        $('atlas-related-sources').append(repository, author);
      });
      renderEditor();
      addImages(item);
      if (updateHash) history.replaceState(null, '', '#' + encodeURIComponent(item.id));
    }

    function filterCases(preferredId) {
      const category = $('atlas-category').value;
      const query = $('atlas-search').value.trim().toLocaleLowerCase();
      const items = visibleItems.filter(item => (category === 'all' || relatedItems(item).some(candidate => candidate.cat === Number(category))) &&
        (!query || relatedItems(item).some(candidate => [displayTitle(candidate), candidate.originalTitle, candidate.id, candidate.ko].some(value => value.toLocaleLowerCase().includes(query)))));
      const picker = $('atlas-case');
      picker.replaceChildren();
      for (const [label, groupItems] of [['대표 사례', items.filter(item => item.featured)], ['전체 사례', items.filter(item => !item.featured)]]) {
        if (!groupItems.length) continue;
        const group = document.createElement('optgroup');
        group.label = label;
        for (const item of groupItems) group.append(new Option((item.sourceStatus === 'incomplete' ? '[원문 일부] ' : '') + displayTitle(item), item.id));
        picker.append(group);
      }
      picker.disabled = !items.length;
      $('atlas-no-results').hidden = items.length > 0;
      $('atlas-search-status').textContent = items.length + '개 사례';
      if (!items.length) {
        $('atlas-detail').hidden = true;
        return;
      }
      const preferredCanonicalId = byId.get(preferredId)?.id;
      const id = items.find(item => item.id === preferredCanonicalId)?.id || items.find(item => item.id === selected?.id)?.id || picker.value;
      show(id);
    }

    async function copyText(text) {
      const status = $('atlas-copy-status');
      const fallback = $('atlas-copy-fallback');
      try {
        await navigator.clipboard.writeText(text);
        fallback.hidden = true;
        status.textContent = '복사했습니다.';
      } catch {
        fallback.hidden = false;
        fallback.value = text;
        fallback.focus();
        fallback.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch { /* 수동 복사 경로를 유지한다. */ }
        status.textContent = copied ? '복사했습니다.' : '선택된 내용을 Cmd+C 또는 Ctrl+C로 복사하세요.';
        if (copied) fallback.hidden = true;
      }
    }

    $('atlas-template').addEventListener('input', () => {
      const draft = draftFor();
      draft.template = $('atlas-template').value;
      draft.structureErrors = [];
      clearCopyStatus();
      updatePreview();
    });
    $('atlas-template').addEventListener('change', () => {
      const draft = draftFor();
      draft.model = structure.createModel(draft.template);
      renderArguments();
      for (const group of ['content', 'composition', 'style']) renderSegmentGroup(group);
      updatePreview();
    });
    $('atlas-language').addEventListener('change', () => {
      language = $('atlas-language').value;
      renderEditor();
    });
    $('atlas-reset').addEventListener('click', () => {
      drafts.delete(selected.id + ':' + language);
      renderEditor();
    });
    $('atlas-clear-fields').addEventListener('click', () => {
      const draft = draftFor();
      for (const variable of currentAnalysis.variables) draft.values[variable.name] = '';
      clearCopyStatus();
      renderArguments();
      updatePreview();
    });
    $('atlas-copy-composed').addEventListener('click', () => {
      updatePreview();
      if (!$('atlas-copy-composed').disabled) void copyText(currentResult.text);
    });
    $('atlas-copy-template').addEventListener('click', () => {
      updatePreview();
      if ($('atlas-copy-template').disabled) return;
      const result = engine.renderTemplate(draftFor().template, draftFor().values, { blank: true });
      if (!result.errors.length) void copyText(result.text);
    });
    $('atlas-copy-partial').addEventListener('click', () => {
      if (selected.sourceStatus === 'incomplete') void copyText(currentResult.text);
    });
    $('atlas-search').addEventListener('input', () => filterCases());
    $('atlas-category').addEventListener('change', () => filterCases());
    $('atlas-case').addEventListener('change', () => show($('atlas-case').value));
    $('atlas-category').append(new Option('전체 · ' + visibleItems.length + '개', 'all'));
    categories.forEach((category, index) => $('atlas-category').append(new Option(category + ' · ' + visibleItems.filter(item => relatedItems(item).some(candidate => candidate.cat === index)).length + '개', index)));
    document.getElementById('atlas-count').textContent = visibleItems.length + '개 프롬프트 · 8개 카테고리 · ' + data.items.length + '개 출처 사례';

    function openHash() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      if (!byId.has(id)) return;
      $('atlas-search').value = '';
      $('atlas-category').value = 'all';
      filterCases(id);
    }
    window.addEventListener('hashchange', openHash);
    const initialId = (() => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; } })();
    filterCases(byId.has(initialId) ? initialId : 'portrait_case171');
  } catch (error) {
    $('atlas-error').hidden = false;
    document.getElementById('atlas-count').textContent = '자료를 불러오지 못했습니다.';
    console.error('프롬프트 아틀라스 초기화 실패', error);
  }
})();
