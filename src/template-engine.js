(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AtlasTemplate = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LABELS = Object.fromEntries(`
accessories=액세서리
accent symbol=강조 기호
action type=동작 종류
adult subject=성인 인물
animal inspiration=동물 모티프
art style=그림 스타일
artist=작가
artist influence=참고 작가
artist name=작가 이름
aspect ratio=화면 비율
background=배경
background elements=배경 요소
background color=배경 색상
background gradient=배경 그라데이션
background palette=배경 색상 조합
background style=배경 스타일
band name=밴드 이름
bar name=가게 이름
body text=본문 문구
border decoration=테두리 장식
bottle color=병 색상
bottom banner text=하단 배너 문구
bottom headline=하단 제목
bottom text=하단 문구
brand=브랜드
brand label=브랜드 표기
brand logo=브랜드 로고
brand name=브랜드명
brand reference=참고 브랜드
brand style=브랜드 스타일
brand text=브랜드 문구
call to action text=행동 유도 문구
car=자동차
car model=자동차 모델
cardigan color=카디건 색상
catchphrase=대표 문구
celebrity=유명인
character=캐릭터
character 1 color theme=첫 번째 캐릭터 색상
character 2 color theme=두 번째 캐릭터 색상
character description=캐릭터 설명
character name=캐릭터 이름
character subtext=캐릭터 보조 문구
child subject=아동 인물
city=도시
city name=도시 이름
clothing=의상
collection name=컬렉션 이름
color=색상
colors=색상
color palette=색상 팔레트
color theme=색상 테마
concert date=공연 날짜
corner logo=모서리 로고
country=국가
country name=국가 이름
date=날짜
description=설명
describe costume or armor=의상·갑옷 설명
destination name=여행지 이름
detail left=왼쪽 세부 요소
detail right=오른쪽 세부 요소
discount price=할인 가격
dress=드레스
dress color=드레스 색상
education goal=학습 목표
event name=행사 이름
eye color=눈 색상
face covering=얼굴 가림 장식
flowers=꽃
food=음식
food item=음식 이름
franchise title=작품 시리즈 이름
future evolution concept=미래 진화 콘셉트
game=게임
grid layout=그리드 구성
hair color=머리 색상
hair style=머리 모양
headline=주요 제목
headline text=주요 제목 문구
hero headline=대표 제목
host name=진행자 이름
industry=업종
insect type=곤충 종류
landmark=랜드마크
landmark name=랜드마크 이름
landmark tower=랜드마크 타워
left background logo=왼쪽 배경 로고
left hair color=왼쪽 인물 머리 색상
lighting color=조명 색상
lighting style=조명 스타일
location=장소
logo text=로고 문구
main catchphrase=대표 광고 문구
main statistic=주요 통계
main subject=주요 대상
main text=주요 문구
main title=메인 제목
map title=지도 제목
mascot concept=마스코트 콘셉트
message=메시지
model=모델
monogram letter=모노그램 글자
mood=분위기
product or prop=제품·소품
secondary text=보조 문구
subject action=대상의 행동
wardrobe style=의상 스타일
motif=모티프
mural subject=벽화 주제
name=이름
note text=메모 문구
organism style=생물 표현 스타일
outfit=의상
outfit color=의상 색상
outfit style=의상 스타일
paint finish=도장 마감
painting style=회화 스타일
pajama color=잠옷 색상
person one=첫 번째 인물
person two=두 번째 인물
plant type=식물 종류
plate number=번호판
platform=플랫폼
player name=선수 이름
pose count=포즈 개수
presentation type=자료 형식
primary accent color=주요 강조 색상
primary color=주요 색상
product=제품
product name=제품명
product price=제품 가격
product type=제품 종류
pump color=펌프 색상
quote=인용 문구
reference=참고 자료
reference image=참고 이미지
reference style=참고 스타일
release text=출시 안내 문구
right background logo=오른쪽 배경 로고
right hair color=오른쪽 인물 머리 색상
right panel title=오른쪽 패널 제목
romanization=로마자 표기
romanized name=로마자 이름
scene description=장면 설명
scene theme=장면 주제
scientist name=과학자 이름
screen text=화면 문구
seal text=인장 문구
secondary color=보조 색상
series=시리즈
setting=배경 설정
sheet purpose=시트 용도
shirt text=셔츠 문구
shop name=상점 이름
sign text=간판 문구
skincare product name=스킨케어 제품명
social handle=소셜 계정
sport=스포츠 종목
staircase material=계단 재질
station name=역 이름
style=스타일
sub text=보조 문구
subheading text=소제목
subheadline text=보조 제목 문구
subject=대상
subject gender=인물 성별
subject type=대상 종류
subtitle text=부제 문구
sweatshirt color=스웨트셔츠 색상
tagline=태그라인
tagline line 1=태그라인 첫 줄
tagline line 2=태그라인 둘째 줄
tagline text=태그라인 문구
theme=주제
theme color=주제 색상
title=제목
title text=제목 문구
travel destination=여행지
vehicle name=차량 이름
vertical text=세로 문구
video duration=영상 길이
wall sign text=벽 간판 문구
watermark text=워터마크 문구
website=웹사이트
`.trim().split('\n').map(line => line.split('=')));

  // 대괄호는 배열·문서 제목에도 쓰이므로, 카탈로그에서 확인한 치환 이름만 허용한다.
  const PLACEHOLDER_NAMES = new Set([
    ...Object.keys(LABELS),
    ...`plant / flower|detail 1|detail 2|bee / butterfly / beetle|model action|subject action|product or prop|accent symbol|wardrobe style|background elements|main text|secondary text|subject description|object/creature|city / country|place|domain or category|civilization or location|key prop|magazine name|style notes|scenery|human|palette|famous structure|structure name|machine / device|machine name|brand/product|main product|composition / angle|texture details|surface finish|food-specific features|floating ingredients / motion elements|liquid / splash / drip / powder effect|floating ingredients|motion effect|typography|typography / branding details|var city|local culture / regional design|iconic landmark|local street character|local transit / cultural features|iconic buildings|local culture|city/country name|car name / model|big word|expression|gaze direction|accessory/styling|primary colors|secondary colors|city 1|city 2|city 3|city 4|city 5|city 6|detail 3|landmark 1|landmark 2|landmark 3|atmospheric element 1|atmospheric element 2|city/subject|distinctive features|contextual elements|city/subject name|landmark/subtitle|iconic element|subject-specific colors|city/country|local delicacy|background location or landmark|landmark list|person description|color 1|color 2|team/country|dish name|journey / mission|destination / era|expedition name|route|objective|brand type/industry|list of features/functions|main scene|secondary scene|moving prop|character action|secret detail / easter egg|space type|style keywords|mood keywords|branding tone|key furniture elements|material keywords|render quality|label language|style name|architectural style|geometric essence & period|scene title|what happens|overall story theme|your photo as reference|describe main character in detail|describe second character in detail|describe the interaction|character pose|character name / character identity|facial features / appearance|expression / personality vibe|outfit / costume|hairstyle|hair|accessory|expressions|topic|era|fruit name|type of soda can|ink color|pattern type|athlete 1|athlete 2|athlete 3|athlete 4|stat 1|stat 2|stat 3|stat 4|material 1|material 2|aesthetic style`.split('|'),
    ...`이름|브랜드|브랜드 이름|제품명|제품 이름|음식 이름|음식명|주제|테마|테마/주제|색상|배경 색상|도시 이름|도시 1|도시 2|도시 3|도시 4|도시 5|도시 6|국가|국가 이름|차량 이름|차량|제목|과일 이름|장면 제목|무슨 일이 일어나는지|전체 스토리 주제|주인공을 자세히 설명|두 번째 캐릭터를 자세히 설명|장면|장소|날짜|조명 스타일|낙서 색상|색상 테마|패션 스타일/의상 색상|디저트/음식|캐릭터 이름/캐릭터 아이덴티티|얼굴/외모|헤어스타일|표정/개성|의상/의상|캐릭터 포즈|대표 명소/분위기|대표명소/분위기|주요 가구 요소|재료 키워드|소재 키워드|색상 팔레트|컬러 팔레트|스타일 키워드|분위기 키워드|무드 키워드|브랜딩 톤|공간 유형|공간형|스타일 이름|렌더 품질|라벨 언어|건축 양식|기하학적 본질 및 기간|탄산음료 캔 유형|잉크 색상|패턴 유형|메인 장면|주 장면|보조 장면|움직이는 소품|캐릭터 액션|비밀 디테일/이스터 에그|비밀 디테일 / 이스터 에그|분위기|경기장명|경기장 이름|재료 1|재료 2|미적 스타일`.split('|')
  ]);
  const SECTION_NAMES = new Set(['style', '스타일', 'layout', 'character', 'rendering style', 'negative']);
  // 동아시아 괄호의 대부분은 제목·실제 광고 문구다. 원문에서 확인한 입력 표식만 구별한다.
  const SPECIAL_LABELS = Object.fromEntries(`
CAMERA_MODEL=카메라 모델
USER_IMAGE=참고 이미지
프레임 비율=화면 비율
画幅比例=화면 비율
テーマ/主題=주제
主题=주제
主题/主体=주제·대상
主题：xxx=주제
테마: xxx=주제
주제=주제
颜色=색상
字体=글꼴
식품명=음식 이름
食物名称=음식 이름
外表面描述:质感/颜色/纹理=외부 표면의 질감·색상
内部核心结构描述:最重要的1-2个内部视觉特征=핵심 내부 구조 설명
补充1-2句该食物最具视觉张力的横截面细节描述=음식 단면의 세부 설명
结构01名称=첫 번째 구조 이름
结构02名称=두 번째 구조 이름
结构03名称=세 번째 구조 이름
结构04名称=네 번째 구조 이름
结构05名称=다섯 번째 구조 이름
结构06名称=여섯 번째 구조 이름
成分/数据说明=성분·자료 설명
这个结构在做什么,为什么重要=구조의 역할과 중요성
一句揭示这种食物本质的话,不超过15字=음식의 특징을 담은 짧은 문장
ここに自己紹介=자기소개
여기에 자기 소개=자기소개
ここに名前=이름
ここに色=색상
ここに身長=키
ここに体重=몸무게
ここにセリフ=대사
角色名称=캐릭터 이름
캐릭터 이름=캐릭터 이름
*****=내용
`.trim().split('\n').map(line => line.split('=')));
  const EXTRA_SQUARE_LABELS = Object.fromEntries(`
Japanese/Korean=인물의 국적
fashion style/outfit colors=의상 스타일·색상
desserts/foods=디저트·음식
flowers/ribbons/books/candles/pearls/notebooks=장식·소품
doodle color=낙서 색상
travel=여행 주제
city, country=도시·국가
CHARACTERS described in period accurate clothing=시대에 맞는 의상을 입은 인물
인물=인물
layered dish=층이 있는 음식
GLASSES: e.g. oversized translucent cat-eye glasses / no glasses / chunky black frames=안경
EYES: e.g. sharp green eyes / dark brown eyes=눈
FACE DETAILS: e.g. freckles,, silver ear piercings=얼굴 세부 특징
CHARACTER TYPE / HERO / CREATURE / VILLAIN=캐릭터 유형
CHARACTER NAME / ROLE=캐릭터 이름·역할
AGE / SPECIES / BODY TYPE=나이·종족·체형
PERSONALITY ARCHETYPE=성격 유형
POWER / SKILL / SPECIAL EQUIPMENT=능력·기술·특수 장비
MAIN COLOR=주요 색상
ACCENT COLOR=강조 색상
RUNNING / JUMPING / FLYING / SWINGING / FIGHTING / CASTING POWER / USING EQUIPMENT=액션 동작
weapon / accessories / theme props / IP-style design details=무기·액세서리·소품
IP_1=첫 번째 캐릭터
IP_2=두 번째 캐릭터
IP_3=세 번째 캐릭터
IP_4=네 번째 캐릭터
SUBJECT from the attached photo=첨부 사진 속 대상
CLOTHES from the photo=사진 속 의상
ENVIRONMENT DECORATIONS from LOCATION/SCENE=장소에 맞는 배경 장식
organ=장기
PERSONE=인물
NUMBER OF WORLD CUP TITLES WON=월드컵 우승 횟수
XXX=대상
cultural context=문화적 맥락
Local Language · Translation=현지 언어·번역
playlist=재생목록
Representative attractions/atmosphere=대표 명소·분위기
SCIENTIFIC CONCEPT (e.g.,  CARBON / DNA / GRAVITY)=과학 개념
Description of Fruit Segments/Sacs/Berries=과일 조각·과육·열매 설명
Fruit Branch/Plant=과일 가지·식물
LOCATION'S NATURAL/CULTURAL COLORS=지역의 자연·문화 색상
BREW=음료 종류
wind-up toy / mechanical miniature world=태엽 장난감·기계 미니어처 세계
Name of The Stadium, Location=경기장 이름·위치
Name of The Stadium=경기장 이름
상징적인 선수 또는 순간, 경기장/장소, 국가 색상, 극적인 조명을 포함한 자세한 액션 장면 설명=주요 스포츠 장면 설명
간략한 역사: 도입 당시, 주요 이정표, 어떻게 전국적인 관심을 끌게 되었는가=스포츠의 역사
스포츠가 국가 정체성, 전통, 경쟁, 일상 생활 및 문화를 형성하는 방식=스포츠의 문화적 영향
detailed action scene description with iconic player or moment, stadium/venue, national colors, dramatic lighting=주요 스포츠 장면 설명
brief history: when introduced, key milestones, how it became national obsession=스포츠의 역사
How the sport shapes national identity, traditions, rivalries, daily life, and culture=스포츠의 문화적 영향
name of theorem/paradox=정리·역설 이름
the physicist / the era=물리학자·시대
the core equation / metric tensor / explanatory blazon=핵심 방정식·수학 표현
글꼴=글꼴
Vehicle=차량
image1=참고 이미지
STYLE KEYWORDS: e.g., rounded, 3D, flat, hand-drawn, minimal=스타일 키워드
COLOR STYLE: vibrant, pastel, gradient, monochrome=색상 스타일
디자인 특성: 부드러운 그림자, 대담한 윤곽, 미묘한 질감, 글로우 등=디자인 특성
DESIGN TRAITS: soft shadows, bold outlines, subtle textures, glow, etc.=디자인 특성
Shape — spherical, curved, or elongated=모양
패턴 - 기하학적인 육각형 / 유기적인 물결선 / 식물의 라인아트 / 수평의 능선=패턴
Product Inside=제품 속 내용물
Stem / Leaf / Crown=줄기·잎·상단
Pattern — geometric hexagons / organic wavy lines / botanical line-art / horizontal ridges=패턴
storyboard ref=스토리보드 참고 이미지
char1 ref=첫 번째 캐릭터 참고 이미지
char2 ref=두 번째 캐릭터 참고 이미지
aerospace/solar tracking array=항공우주·태양 추적 장치
outdoor architectural structure=야외 건축 구조
astronomical/solar path diagrams=천문·태양 경로 도식
robotic kinematic wireframes=로봇 운동학 도식
외부 표면 설명: 질감/색상/질감=외부 표면의 질감·색상
내부 코어 구조 설명: 가장 중요한 1-2 내부 시각적 특징=핵심 내부 구조 설명
가장 시각적으로 흥미로운 음식의 단면적 세부정보를 설명하려면 1~2개의 문장을 추가하세요.=음식 단면의 세부 설명
구조 01 이름=첫 번째 구조 이름
구조 02 이름=두 번째 구조 이름
구조 03 이름=세 번째 구조 이름
구조 04 이름=네 번째 구조 이름
구조 05 이름=다섯 번째 구조 이름
구조 06 이름=여섯 번째 구조 이름
성분/자료설명=성분·자료 설명
이 구조의 역할은 무엇이며 왜 중요한가요?=구조의 역할과 중요성
이 음식의 본질을 드러내는 문장, 15단어 이내=음식의 특징을 담은 짧은 문장
scene=장면
Pencil_Shaving=연필 깎인 조각
`.trim().split('\n').map(line => line.split('=')));
  for (const name of Object.keys(EXTRA_SQUARE_LABELS)) PLACEHOLDER_NAMES.add(name.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' '));
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const normalize = name => name.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
  const labelFor = name => own(SPECIAL_LABELS, name) ? SPECIAL_LABELS[name] : own(EXTRA_SQUARE_LABELS, name) ? EXTRA_SQUARE_LABELS[name] : own(LABELS, normalize(name)) ? LABELS[normalize(name)] : name;

  function decodeEscapes(value) {
    return value.replace(/\\([\\"'nrt])/g, (_, character) => ({ n: '\n', r: '\r', t: '\t' }[character] || character));
  }

  /** 인용문 안의 중괄호와 개행을 값으로 보존하며, JSON에서 유래한 이중 이스케이프도 읽는다. */
  function readQuoted(text, start) {
    const escaped = text[start] === '\\';
    const quote = text[start + (escaped ? 1 : 0)];
    if (quote !== '"' && quote !== "'") return null;
    const contentStart = start + (escaped ? 2 : 1);
    let index = contentStart;
    while (index < text.length) {
      if (text[index] === '\\') {
        let end = index;
        while (text[end] === '\\') end++;
        const slashes = end - index;
        if (escaped && text[end] === quote && slashes === 1) {
          return { value: decodeEscapes(decodeEscapes(text.slice(contentStart, index))), end: end + 1 };
        }
        index = end + (text[end] === quote && slashes % 2 === 1 ? 1 : 0);
      } else if (!escaped && text[index] === quote) {
        return { value: decodeEscapes(text.slice(contentStart, index)), end: index + 1 };
      } else {
        index++;
      }
    }
    return null;
  }

  function readArgument(text, start) {
    const attributes = Object.create(null);
    let index = start + '{argument'.length;
    const fail = (reason, preserveRemainder = false) => {
      const close = preserveRemainder ? -1 : text.indexOf('}', index);
      return { end: close === -1 ? text.length : close + 1, error: `위치 ${start + 1}: ${reason}` };
    };
    while (index < text.length) {
      while (/\s/.test(text[index] || '') && index < text.length) index++;
      if (text[index] === '}') {
        if (!own(attributes, 'name') || !attributes.name.trim() || !own(attributes, 'default')) {
          return fail('argument에는 비어 있지 않은 name과 default가 필요합니다.');
        }
        return { end: index + 1, name: attributes.name, defaultValue: attributes.default, kind: 'argument' };
      }
      const attribute = /^[A-Za-z_][\w-]*/.exec(text.slice(index));
      if (!attribute || !['name', 'default'].includes(attribute[0]) || own(attributes, attribute[0])) {
        return fail('argument 속성 형식이 올바르지 않아 원문을 유지했습니다.');
      }
      index += attribute[0].length;
      while (/\s/.test(text[index] || '') && index < text.length) index++;
      if (text[index++] !== '=') return fail('argument 속성의 등호가 누락되었습니다.');
      while (/\s/.test(text[index] || '') && index < text.length) index++;
      const value = readQuoted(text, index);
      if (!value) return fail('argument의 인용부호가 올바르게 닫히지 않았습니다.', true);
      attributes[attribute[0]] = value.value;
      index = value.end;
    }
    return fail('argument의 닫는 중괄호가 누락되었습니다.');
  }

  function readPlaceholder(text, start, jsonLeaf) {
    if (text[start - 1] === '\\' || text[start - 1] === '[' || text[start + 1] === '[') return null;
    const end = text.indexOf(']', start + 1);
    if (end === -1 || end - start > 180) return null;
    const markerName = text.slice(start + 1, end).trim();
    const name = markerName === 'BRAND NAME = CHANGE TO YOUR BRAND' ? 'BRAND NAME' : markerName === '$Pencil_Shaving' ? 'Pencil_Shaving' : markerName;
    if (!name || /[\[\]\n\r"{}|]/.test(name)) return null;
    // 링크 레이블, 각주·참조 정의, 자바스크립트/JSON 배열은 치환 대상이 아니다.
    const followingParenthesis = text[end + 1] === '(' ? /^\(([^)]*)\)/.exec(text.slice(end + 1)) : null;
    const markdownLink = followingParenthesis && (/^\s*(?:[a-z][\w+.-]*:|\/|#|\.\.?\/|<)/i.test(followingParenthesis[1]) || !/[,，]/.test(followingParenthesis[1]));
    if (markdownLink || ['[', ']'].includes(text[end + 1]) || ['!', ']'].includes(text[start - 1])) return null;
    if (text[end + 1] === ':' && /^\s*(?:https?:\/\/|\/|#|\.\.?\/|<[^>]+>|[^\s]+\.[a-z\d]{1,8}(?:\s|$|[?#]))/i.test(text.slice(end + 2))) return null;
    const normalized = normalize(name);
    const explicitInstruction = /^(?:insert|enter|write|type|describe|your)\b/i.test(name)
      || /(?:입력하세요|입력하십시오|이름 삽입|자세히 설명)$/.test(name);
    if (!PLACEHOLDER_NAMES.has(normalized) && !own(SPECIAL_LABELS, name) && !explicitInstruction) return null;
    if (!jsonLeaf && SECTION_NAMES.has(normalized)) {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const nextLine = text.indexOf('\n', end + 1);
      const line = text.slice(lineStart, nextLine === -1 ? text.length : nextLine).trim();
      if (line === text.slice(start, end + 1)) return null;
    }
    return declaration(text, start, { end: end + 1, name, defaultValue: '', kind: 'placeholder' }, jsonLeaf);
  }

  /** 선언의 값과 이후 참조를 함께 갱신하여 새 입력과 기존 예시가 충돌하지 않게 한다. */
  function declaration(text, start, token, jsonLeaf) {
    if (jsonLeaf || text.slice(text.lastIndexOf('\n', start - 1) + 1, start).trim()) return token;
    const separator = /^[ \t]*[:=][ \t]+/.exec(text.slice(token.end));
    if (!separator) return token;
    const valueStart = token.end + separator[0].length;
    const nextLine = text.indexOf('\n', valueStart);
    const valueEnd = nextLine === -1 ? text.length : nextLine;
    const value = text.slice(valueStart, valueEnd);
    if (!value.trim()) return token;
    if (separator[0].includes('=') && (text[valueStart] === '"' || text[valueStart] === "'")) {
      const quoted = readQuoted(text, valueStart);
      if (quoted) return { ...token, defaultValue: quoted.value, end: quoted.end, prefix: text.slice(start, valueStart + 1), suffix: text[valueStart], declared: true };
    }
    return { ...token, defaultValue: value, end: valueEnd, prefix: text.slice(start, valueStart), declared: true };
  }

  function readSpecialPlaceholder(text, start, jsonLeaf) {
    const pairs = { '{': '}', '【': '】', '［': '］', '｛': '｝', '「': '」', '（': '）' };
    if (text.startsWith('(캐릭터 이름)', start)) return { end: start + '(캐릭터 이름)'.length, name: '캐릭터 이름', defaultValue: '', kind: 'placeholder' };
    const opening = text.startsWith('{{', start) ? '{{' : text[start];
    const closing = opening === '{{' ? '}}' : pairs[opening];
    if (!closing || text[start - 1] === '\\') return null;
    const end = text.indexOf(closing, start + opening.length);
    if (end === -1 || end - start > 180) return null;
    const name = text.slice(start + opening.length, end).trim();
    if (!own(SPECIAL_LABELS, name)) return null;
    return declaration(text, start, { end: end + closing.length, name, defaultValue: '', kind: 'placeholder' }, jsonLeaf);
  }

  function scan(text, jsonLeaf) {
    const tokens = [];
    const errors = [];
    let index = 0;
    while (index < text.length) {
      let token;
      if (text[index] === '{' && /^\{argument\b/.test(text.slice(index))) {
        token = readArgument(text, index);
      } else if (text[index] === '[') {
        token = readPlaceholder(text, index, jsonLeaf);
      } else {
        token = readSpecialPlaceholder(text, index, jsonLeaf);
      }
      if (!token) { index++; continue; }
      if (token.error) errors.push(token.error);
      else tokens.push({ ...token, start: index });
      index = token.end;
    }
    return { tokens, errors };
  }

  function jsonValue(text) {
    try {
      const value = JSON.parse(text);
      return value !== null && typeof value === 'object' ? { value } : null;
    } catch (_) {
      return null;
    }
  }

  function mapLeaves(value, transform, path = '$') {
    if (typeof value === 'string') return transform(value, path);
    if (Array.isArray(value)) return value.map((child, index) => mapLeaves(child, transform, `${path}[${index}]`));
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, mapLeaves(child, transform, `${path}[${JSON.stringify(key)}]`)]));
    }
    return value;
  }

  function compile(text) {
    const source = String(text == null ? '' : text);
    const parsed = jsonValue(source);
    const variables = new Map();
    const scans = new Map();
    const errors = [];
    const conflicts = new Map();
    const defaultPriorities = new Map();
    const inspect = (leaf, path) => {
      const result = scan(leaf, Boolean(parsed));
      scans.set(path, result);
      errors.push(...result.errors.map(error => `${path}: ${error}`));
      for (const token of result.tokens) {
        const priority = token.kind === 'argument' ? 2 : token.declared ? 1 : 0;
        if (!variables.has(token.name)) {
          variables.set(token.name, { name: token.name, label: labelFor(token.name), defaultValue: token.defaultValue, kind: token.kind, occurrences: 1 });
          defaultPriorities.set(token.name, priority);
        } else {
          const existing = variables.get(token.name);
          existing.occurrences++;
          if (priority > defaultPriorities.get(token.name)) {
            existing.kind = token.kind;
            existing.defaultValue = token.defaultValue;
            defaultPriorities.set(token.name, priority);
          } else if (priority > 0 && defaultPriorities.get(token.name) === priority && existing.defaultValue !== token.defaultValue) {
            const message = `${token.name}: 같은 변수의 기본값이 달라 첫 번째 기본값을 사용합니다.`;
            conflicts.set(token.name, message);
          }
        }
      }
      return leaf;
    };
    if (parsed) mapLeaves(parsed.value, inspect);
    else inspect(source, '$');
    return { source, parsed, variables, scans, errors, conflicts };
  }

  /**
   * 원문 순서대로 명시된 입력 변수를 수집한다. 같은 이름은 입력 하나와 발생 횟수로 묶는다.
   * JSON 객체·배열은 문자열 값만 검사하며, 해석할 수 없는 argument는 errors로 알리고 보존한다.
   * 서로 다른 기본값이 발견되면 warnings를 추가한다. 명시 입력으로 해소할 수 있는 경고이다.
   * @return {object} variables의 kind는 argument 또는 placeholder이며 occurrences는 정수이다.
   */
  function analyzeTemplate(text) {
    const compiled = compile(text);
    return {
      variables: [...compiled.variables.values()], kind: compiled.parsed ? 'json' : 'text', errors: compiled.errors,
      ...(compiled.conflicts.size ? { warnings: [...compiled.conflicts.values()] } : {})
    };
  }

  /**
   * 명시된 표식만 치환하고 문장의 순서·문장부호·일반 텍스트는 유지한다.
   * @param {object} values 이름별 입력. 없는 값은 첫 기본값을 쓰며, 빈 문자열은 빈칸으로 표시한다.
   * @param {object} options blank가 참이면 모든 명시 변수를 한국어 레이블의 빈칸으로 바꾼다.
   * @return {object} text는 HTML이 아닌 일반 문자열이다. 호출자는 textContent 또는 value로 표시해야 한다.
   */
  function renderTemplate(text, values = {}, { blank = false } = {}) {
    const compiled = compile(text);
    const unresolved = new Set();
    const replacements = new Map();
    for (const variable of compiled.variables.values()) {
      const supplied = values != null && own(values, variable.name);
      const value = blank ? '' : supplied ? String(values[variable.name] == null ? '' : values[variable.name]) : variable.defaultValue;
      if (!value.trim()) {
        replacements.set(variable.name, `[${variable.label}]`);
        unresolved.add(variable.name);
      } else {
        replacements.set(variable.name, value);
        // [character] 같은 원문의 기본값은 보존하되, 실제 내용이 아직 필요함을 알린다.
        if (value === variable.defaultValue && /^\s*\[[^\[\]\n]+\]\s*$/.test(value)) unresolved.add(variable.name);
      }
    }
    const replaceLeaf = (leaf, path) => {
      const parts = [];
      let cursor = 0;
      for (const token of compiled.scans.get(path).tokens) {
        parts.push(leaf.slice(cursor, token.start), token.prefix || '', replacements.get(token.name), token.suffix || '');
        cursor = token.end;
      }
      parts.push(leaf.slice(cursor));
      return parts.join('');
    };
    const output = compiled.parsed
      ? JSON.stringify(mapLeaves(compiled.parsed.value, replaceLeaf), null, 2)
      : replaceLeaf(compiled.source, '$');
    const errors = [...compiled.errors];
    // 이름이 같아도 원문의 기본값이 다를 수 있다. 사용자가 값을 정하면 충돌이 해소된다.
    if (!blank) {
      for (const [name, warning] of compiled.conflicts) {
        if (values == null || !own(values, name)) errors.push(warning);
      }
    }
    return { text: output, unresolved: [...unresolved], errors };
  }

  return Object.freeze({ analyzeTemplate, renderTemplate });
});
