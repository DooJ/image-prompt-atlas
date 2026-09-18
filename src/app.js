(async () => {
  'use strict';
  const root = document.getElementById('prompt-atlas');
  const $ = id => root.querySelector('#' + id);
  const engine = globalThis.AtlasTemplate;
  try {
    const packed = '__ATLAS_PACKED_DATA__';
    const bytes = Uint8Array.from(atob(packed), c => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data = JSON.parse(await new Response(stream).text());
    const categories = ['상품·광고', '인물·사진', '화풍 변환·복원', '캐릭터·굿즈', '포스터·일러스트', '인포그래픽·학습', 'UI·브랜딩', '스토리보드·공간'];
    const originalsById = new Map(data.items.map(item => [item.id, item]));
    const visibleItems = data.items.filter(item => !item.duplicateOf);
    // 통합 전 주소도 대표 사례로 연결하고, 각 출처 기록은 그대로 보존한다.
    const byId = new Map(data.items.map(item => [item.id, originalsById.get(item.duplicateOf || item.id)]));
    const relatedById = new Map(visibleItems.map(item => [item.id, []]));
    data.items.forEach(item => relatedById.get(item.duplicateOf || item.id).push(item));
    const drafts = new Map();
    let selected = null;
    let language = 'ko';
    let currentAnalysis = null;
    let currentResult = null;

    function displayTitle(item) { return item.displayTitle || item.title; }

    function relatedItems(item) {
      return relatedById.get(item.id);
    }

    function draftFor(item = selected) {
      const key = item.id + ':' + language;
      if (!drafts.has(key)) {
        const template = language === 'original' ? item.originalTemplate || item.original : item.ko;
        drafts.set(key, { template, values: Object.create(null), expectedKind: engine.analyzeTemplate(template).kind });
      }
      return drafts.get(key);
    }

    function structuredOriginal(item) {
      try {
        const parsed = JSON.parse(item.original);
        return parsed !== null && typeof parsed === 'object';
      } catch { return false; }
    }

    function clearCopyStatus() {
      $('atlas-copy-status').textContent = '';
      $('atlas-copy-fallback').hidden = true;
    }

    function updatePreview() {
      const draft = draftFor();
      currentResult = engine.renderTemplate(draft.template, draft.values);
      const commonErrors = [...currentAnalysis.errors];
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
        ? '입력 필요: ' + currentResult.unresolved.map(name => currentAnalysis.variables.find(v => v.name === name)?.label || name).join(', ')
        : incomplete ? '출처 원문이 일부만 공개되어 있습니다. 공개된 부분만 복사할 수 있습니다.'
          : currentAnalysis.variables.length ? '모든 변수 입력 완료 · 복사할 수 있습니다.' : '전체 프롬프트를 확인한 뒤 복사하세요.';
      $('atlas-copy-composed').disabled = Boolean(incomplete || errors.length || currentResult.unresolved.length);
      // 기본값 충돌은 값을 사용하지 않는 빈칸 템플릿의 복사를 막지 않는다.
      const blankResult = engine.renderTemplate(draft.template, draft.values, { blank: true });
      $('atlas-copy-template').disabled = Boolean(commonErrors.length || blankResult.errors.length);
      $('atlas-copy-partial').disabled = !draft.template.trim();
      $('atlas-copy-partial').hidden = !incomplete;
      $('atlas-copy-composed').hidden = incomplete;
      if (incomplete) $('atlas-copy-template').hidden = true;
    }

    function renderVariables() {
      const draft = draftFor();
      currentAnalysis = engine.analyzeTemplate(draft.template);
      const container = $('atlas-fields');
      container.replaceChildren();
      for (const [index, variable] of currentAnalysis.variables.entries()) {
        const wrap = document.createElement('div');
        wrap.className = 'atlas-field';
        const label = document.createElement('label');
        label.className = 'form-label';
        label.htmlFor = 'atlas-variable-' + index;
        label.textContent = variable.label;
        const input = document.createElement('textarea');
        input.id = label.htmlFor;
        input.className = 'form-control';
        input.rows = 2;
        input.value = Object.hasOwn(draft.values, variable.name) ? draft.values[variable.name] : variable.defaultValue;
        input.placeholder = variable.label + ' 입력';
        const hint = document.createElement('span');
        hint.className = 'atlas-variable-hint text-small text-muted';
        hint.id = input.id + '-hint';
        hint.textContent = (variable.label !== variable.name ? variable.name + ' · ' : '') + variable.occurrences + '곳에 반영';
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
      $('atlas-copy-template').hidden = !hasVariables;
      $('atlas-template-note').hidden = !hasVariables;
      updatePreview();
    }

    function renderEditor() {
      clearCopyStatus();
      $('atlas-template').value = draftFor().template;
      $('atlas-language').value = language;
      renderVariables();
      $('atlas-template-details').open = currentAnalysis.variables.length === 0;
      $('atlas-format-note').textContent = currentAnalysis.kind === 'json'
        ? 'JSON의 항목·배열 순서와 값의 형식을 유지합니다. 변수 입력도 JSON 문자열에 맞게 반영됩니다.'
        : structuredOriginal(selected) && language === 'ko'
          ? '한국어 설명의 항목 순서를 유지합니다. 원래 JSON 형식으로 편집·복사하려면 편집 언어에서 원문을 선택하세요.'
          : '전체 문장과 단계의 순서를 유지합니다. 본문에서 대상·문구·스타일을 직접 수정할 수 있습니다.';
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
        const link = document.createElement('a');
        link.href = 'https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/blob/' + data.sha + '/' + candidate.file + '#' + candidate.anchor;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = '통합된 출처 · ' + candidate.id;
        const author = document.createElement('a');
        author.href = candidate.source;
        author.target = '_blank';
        author.rel = 'noopener noreferrer';
        author.textContent = '원 게시물 · ' + candidate.id;
        $('atlas-related-sources').append(link, author);
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
      draftFor().template = $('atlas-template').value;
      clearCopyStatus();
      renderVariables();
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
      renderVariables();
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
      // 공개되지 않은 내용을 만들어 채우지 않고 현재 확인 가능한 본문만 제공한다.
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
