# #19 OCR (텍스트 추출)

**URL:** ocr.baal.co.kr

## 서비스 내용

이미지에서 텍스트 자동 인식 및 추출. 한글/영어/일본어/중국어 등 90+ 언어 지원. PDF 변환. Tesseract.js 기반

## 기능 요구사항

- [ ] 이미지 업로드 (드래그 앤 드롭)
- [ ] 언어 선택:
  - [ ] 한글 (kor)
  - [ ] 영어 (eng)
  - [ ] 한글+영어 (kor+eng)
  - [ ] 일본어 (jpn)
  - [ ] 중국어 간체 (chi_sim)
  - [ ] 중국어 번체 (chi_tra)
  - [ ] 기타 90+ 언어
- [ ] OCR 처리 (Tesseract.js)
- [ ] 추출된 텍스트 표시 (편집 가능)
- [ ] 신뢰도 표시 (%)
- [ ] 복사 버튼 (클립보드)
- [ ] 텍스트 파일 다운로드 (.txt)
- [ ] JSON 다운로드 (좌표 포함)
- [ ] 진행률 표시 (상세)
- [ ] 이미지 전처리 옵션:
  - [ ] 그레이스케일
  - [ ] 대비 증가
  - [ ] 노이즈 제거
- [ ] PDF 지원 (페이지별 추출)

## 경쟁사 분석 (2025년 기준)

### 인기 사이트 TOP 5

1. **OnlineOCR.net** - 가장 인기
   - 강점: 46개 언어, PDF/Word 출력, 무료
   - 약점: 15MB 제한, 시간당 15페이지

2. **Free Online OCR** - 간단한 UI
   - 강점: 완전 무료, 빠름
   - 약점: 정확도 낮음, 기능 제한적

3. **i2OCR** - 다국어 강함
   - 강점: 100+ 언어, PDF 지원
   - 약점: 광고 많음, 느림

4. **NewOCR.com** - 단순함
   - 강점: 간단, 무료
   - 약점: 정확도 낮음, UI 구식

5. **OCR.space** - API 제공
   - 강점: API, 25000자/월 무료
   - 약점: 서버 업로드 필요

### 우리의 차별화 전략

- ✅ **완전 무료** - 제한 없음
- ✅ **브라우저 기반** - 서버 업로드 불필요, 프라이버시
- ✅ **90+ 언어** - Tesseract.js v5 (최신)
- ✅ **PDF 지원** - 페이지별 추출
- ✅ **편집 가능** - 추출 후 즉시 수정
- ✅ **JSON 출력** - 좌표 데이터 포함
- ✅ **다크모드** 지원
- ✅ **한글 최적화** - 전처리 옵션

## 주요 라이브러리

### Tesseract.js v5 (추천!)

오픈소스 OCR 엔진 (Tesseract C++ → JavaScript)

```html
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5"></script>
```

또는 NPM:
```bash
npm install tesseract.js
```

### 기본 사용법

```javascript
import Tesseract from 'tesseract.js';

async function recognizeText(imageFile, language = 'eng') {
  try {
    // OCR 실행
    const { data } = await Tesseract.recognize(
      imageFile,
      language,
      {
        logger: (m) => {
          // 진행률 업데이트
          if (m.status === 'recognizing text') {
            const percent = Math.round(m.progress * 100);
            updateProgress(`텍스트 인식 중: ${percent}%`);
          }
        }
      }
    );

    // 결과 텍스트
    const text = data.text;
    const confidence = data.confidence; // 신뢰도 (0-100)

    console.log('추출된 텍스트:', text);
    console.log('신뢰도:', confidence.toFixed(2) + '%');

    return { text, confidence, data };

  } catch (error) {
    console.error('OCR 실패:', error);
    showToast('텍스트 인식에 실패했습니다.', 'error');
    throw error;
  }
}

// 사용 예
const fileInput = document.getElementById('image-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    showLoading('이미지 분석 중...');
    try {
      const result = await recognizeText(file, 'kor+eng');
      document.getElementById('result-text').value = result.text;
      showToast(`완료! 신뢰도: ${result.confidence.toFixed(1)}%`, 'success');
      hideLoading();
    } catch (error) {
      hideLoading();
    }
  }
});
```

### Worker를 사용한 성능 개선

```javascript
import { createWorker } from 'tesseract.js';

let worker = null;

// Worker 초기화 (재사용)
async function initWorker(language = 'eng') {
  if (worker) {
    await worker.terminate();
  }

  worker = await createWorker(language, 1, {
    logger: (m) => {
      console.log(m);
      if (m.status === 'loading tesseract core') {
        updateProgress('Tesseract 엔진 로딩 중...');
      } else if (m.status === 'initializing tesseract') {
        updateProgress('초기화 중...');
      } else if (m.status === 'loading language traineddata') {
        updateProgress(`${language} 언어 데이터 로딩 중...`);
      } else if (m.status === 'initializing api') {
        updateProgress('API 준비 중...');
      } else if (m.status === 'recognizing text') {
        const percent = Math.round(m.progress * 100);
        updateProgress(`텍스트 인식: ${percent}%`);
      }
    }
  });

  return worker;
}

// OCR 실행 (Worker 재사용)
async function recognizeWithWorker(imageFile, language = 'eng') {
  if (!worker) {
    await initWorker(language);
  }

  const { data } = await worker.recognize(imageFile);

  return {
    text: data.text,
    confidence: data.confidence,
    words: data.words, // 단어별 정보
    lines: data.lines  // 줄별 정보
  };
}

// 페이지 언로드 시 Worker 종료
window.addEventListener('beforeunload', async () => {
  if (worker) {
    await worker.terminate();
  }
});
```

### 다국어 지원

```javascript
// 언어 코드 매핑
const languageCodes = {
  'korean': 'kor',
  'english': 'eng',
  'korean+english': 'kor+eng',
  'japanese': 'jpn',
  'chinese-simplified': 'chi_sim',
  'chinese-traditional': 'chi_tra',
  'spanish': 'spa',
  'french': 'fra',
  'german': 'deu',
  'russian': 'rus',
  'arabic': 'ara',
  'vietnamese': 'vie',
  'thai': 'tha'
};

// UI 언어 선택
const langSelector = document.getElementById('language-selector');
langSelector.addEventListener('change', async (e) => {
  const lang = languageCodes[e.target.value];

  if (worker) {
    showToast('언어 변경 중... (언어 데이터 다운로드)', 'info');
    await worker.loadLanguage(lang);
    await worker.initialize(lang);
    showToast('언어 변경 완료!', 'success');
  }
});

// 다중 언어 인식
async function recognizeMultiLanguage(imageFile, languages = ['kor', 'eng']) {
  const langString = languages.join('+'); // 'kor+eng'
  const result = await recognizeWithWorker(imageFile, langString);
  return result;
}
```

### 이미지 전처리 (정확도 향상)

```javascript
// Canvas를 이용한 이미지 전처리
async function preprocessImage(file, options = {}) {
  const {
    grayscale = true,
    contrast = 1.5,
    denoise = false
  } = options;

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // 그레이스케일 변환
  if (grayscale) {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
    }
  }

  // 대비 증가
  if (contrast !== 1) {
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, factor * (pixels[i] - 128) + 128));
      pixels[i + 1] = Math.max(0, Math.min(255, factor * (pixels[i + 1] - 128) + 128));
      pixels[i + 2] = Math.max(0, Math.min(255, factor * (pixels[i + 2] - 128) + 128));
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Blob로 변환
  const preprocessedBlob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  URL.revokeObjectURL(img.src);
  return preprocessedBlob;
}

// 사용 예
const originalFile = e.target.files[0];
const preprocessed = await preprocessImage(originalFile, {
  grayscale: true,
  contrast: 1.5
});
const result = await recognizeText(preprocessed, 'kor');
```

### JSON 출력 (좌표 포함)

```javascript
async function recognizeWithCoordinates(imageFile, language = 'eng') {
  const { data } = await worker.recognize(imageFile);

  // 단어별 좌표
  const words = data.words.map(word => ({
    text: word.text,
    confidence: word.confidence,
    bbox: word.bbox, // { x0, y0, x1, y1 }
    baseline: word.baseline
  }));

  // 줄별 좌표
  const lines = data.lines.map(line => ({
    text: line.text,
    confidence: line.confidence,
    bbox: line.bbox,
    words: line.words.length
  }));

  return {
    text: data.text,
    confidence: data.confidence,
    words: words,
    lines: lines
  };
}

// JSON 다운로드
function downloadJSON(data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ocr-result.json';
  link.click();
  URL.revokeObjectURL(url);
}
```

### PDF 지원 (pdf.js 통합)

```html
<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.269/build/pdf.min.js"></script>
```

```javascript
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.269/build/pdf.worker.min.js';

// PDF를 이미지로 변환
async function pdfToImages(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const images = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // 고해상도

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });

    images.push({ pageNum, blob });
  }

  return images;
}

// PDF OCR (전체 페이지)
async function recognizePDF(pdfFile, language = 'eng') {
  showToast('PDF를 이미지로 변환 중...', 'info');
  const images = await pdfToImages(pdfFile);

  const results = [];

  for (let i = 0; i < images.length; i++) {
    const { pageNum, blob } = images[i];
    updateProgress(`페이지 ${pageNum} / ${images.length} 처리 중...`);

    const result = await recognizeText(blob, language);
    results.push({
      page: pageNum,
      text: result.text,
      confidence: result.confidence
    });
  }

  // 전체 텍스트 합치기
  const fullText = results.map(r => `\n--- 페이지 ${r.page} ---\n${r.text}`).join('\n');

  return {
    fullText,
    pages: results
  };
}
```

## UI/UX 디자인 패턴

### 화면 구성

```
┌─────────────────────────────────┐
│  OCR (텍스트 추출)                │
│  이미지/PDF에서 텍스트 자동 인식   │
├─────────────────────────────────┤
│  1️⃣ 언어 선택                     │
│  [한글] [영어] [한글+영어]        │
│  [일본어] [중국어] [기타 ▼]       │
├─────────────────────────────────┤
│  2️⃣ 이미지 업로드                 │
│  ┌───────────────────────────┐  │
│  │  🖼️ 드래그 앤 드롭         │  │
│  │  또는 클릭하여 선택         │  │
│  │  이미지 / PDF 지원         │  │
│  └───────────────────────────┘  │
│  ☑ 그레이스케일  ☑ 대비 증가     │
├─────────────────────────────────┤
│  3️⃣ 처리 진행률                   │
│  [━━━━━━━●──────] 75%          │
│  텍스트 인식 중...               │
├─────────────────────────────────┤
│  4️⃣ 결과 (편집 가능)              │
│  ┌───────────────────────────┐  │
│  │ 추출된 텍스트가 여기에      │  │
│  │ 표시됩니다. 편집 가능합니다.│  │
│  │                           │  │
│  └───────────────────────────┘  │
│  신뢰도: 85.3%                   │
│  단어 수: 42개                   │
│                                 │
│  [복사] [TXT 다운로드] [JSON]    │
└─────────────────────────────────┘
```

### 진행률 단계별 메시지

```javascript
const progressMessages = {
  'loading tesseract core': 'Tesseract 엔진 로딩 중...',
  'initializing tesseract': '초기화 중...',
  'loading language traineddata': '언어 데이터 다운로드 중...',
  'initializing api': 'OCR API 준비 중...',
  'recognizing text': '텍스트 인식 중...'
};

function updateProgress(status, progress = 0) {
  const message = progressMessages[status] || status;
  const percent = Math.round(progress * 100);

  document.getElementById('progress-text').textContent = message;
  document.getElementById('progress-bar').style.width = percent + '%';
  document.getElementById('progress-percent').textContent = percent + '%';
}
```

### 주요 기능 순서

1. 언어 선택 (한글/영어/기타)
2. 이미지 업로드 (또는 PDF)
3. 전처리 옵션 (그레이스케일, 대비)
4. OCR 처리 (진행률 표시)
5. 결과 확인 및 편집
6. 다운로드 (TXT/JSON)

## 난이도 & 예상 기간

- **난이도:** 어려움 (Tesseract.js, PDF 처리, 성능 최적화)
- **예상 기간:** 3일
- **실제 기간:** (작업 후 기록)

## 개발 일정

- [ ] Day 1 오전: UI 구성, 이미지 업로드, Tesseract.js 통합
- [ ] Day 1 오후: 기본 OCR (영어), 진행률 표시
- [ ] Day 2 오전: 다국어 지원 (한글, 일본어, 중국어), Worker 최적화
- [ ] Day 2 오후: 이미지 전처리 (그레이스케일, 대비), 정확도 개선
- [ ] Day 3 오전: PDF 지원 (pdf.js 통합), 페이지별 추출
- [ ] Day 3 오후: JSON 출력, 좌표 데이터, 테스트, 최적화

## 트래픽 예상

⭐⭐⭐ 높음 - "OCR, 이미지 텍스트 추출" 검색량 높음 (학생, 직장인)

## SEO 키워드

- OCR
- 이미지 텍스트 추출
- 사진 글자 인식
- 한글 OCR
- 무료 OCR
- PDF 텍스트 추출
- Text Recognition
- Tesseract

## 이슈 & 해결방안

### 실제 문제점 (경쟁사 분석 & Tesseract.js 기반)

1. **처리 속도가 매우 느림 (30초~1분)**
   - 원인: Tesseract 엔진이 CPU 집약적
   - 해결: Worker 사용 (백그라운드 처리)
   - 해결: 진행률 상세 표시로 체감 대기 시간 감소
   - 해결: 이미지 크기 제한 (2000px)
   - 코드:
     ```javascript
     const MAX_DIMENSION = 2000;

     async function resizeIfNeeded(file) {
       const img = new Image();
       img.src = URL.createObjectURL(file);
       await img.decode();

       if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
         URL.revokeObjectURL(img.src);
         return file; // 원본 사용
       }

       showToast('이미지가 큽니다. 처리 속도 향상을 위해 리사이즈합니다.', 'info');

       const canvas = document.createElement('canvas');
       const ratio = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height);
       canvas.width = img.width * ratio;
       canvas.height = img.height * ratio;

       const ctx = canvas.getContext('2d');
       ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

       const blob = await new Promise((resolve) => {
         canvas.toBlob(resolve, 'image/png');
       });

       URL.revokeObjectURL(img.src);
       return blob;
     }

     // 사용 예
     const originalFile = e.target.files[0];
     const optimizedFile = await resizeIfNeeded(originalFile);
     const result = await recognizeText(optimizedFile, 'kor');
     ```

2. **한글 인식 정확도가 낮음**
   - 원인: Tesseract 한글 모델 한계
   - 해결: 이미지 전처리 (그레이스케일, 대비 증가)
   - 해결: 깨끗한 이미지 사용 권장
   - 코드:
     ```javascript
     // 한글 최적화 전처리
     async function preprocessForKorean(file) {
       const img = new Image();
       img.src = URL.createObjectURL(file);
       await img.decode();

       const canvas = document.createElement('canvas');
       canvas.width = img.width;
       canvas.height = img.height;
       const ctx = canvas.getContext('2d');

       ctx.drawImage(img, 0, 0);

       const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
       const pixels = imageData.data;

       // 그레이스케일 + 대비 증가
       for (let i = 0; i < pixels.length; i += 4) {
         const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;

         // 대비 증가 (1.5배)
         const contrasted = ((gray - 128) * 1.5) + 128;
         const clamped = Math.max(0, Math.min(255, contrasted));

         pixels[i] = pixels[i + 1] = pixels[i + 2] = clamped;
       }

       ctx.putImageData(imageData, 0, 0);

       const blob = await new Promise((resolve) => {
         canvas.toBlob(resolve, 'image/png');
       });

       URL.revokeObjectURL(img.src);
       return blob;
     }

     // UI 안내
     const tips = [
       '인쇄된 텍스트에서 가장 정확합니다.',
       '손글씨는 인식되지 않습니다.',
       '깨끗하고 선명한 이미지를 사용하세요.',
       '배경과 글자의 대비가 클수록 좋습니다.'
     ];
     ```

3. **언어 데이터 다운로드 시간 (각 5-15MB)**
   - 원인: traineddata 파일 크기
   - 해결: 첫 실행 시 언어 데이터 캐싱 (브라우저 캐시)
   - 해결: 다운로드 진행률 표시
   - 코드:
     ```javascript
     import { createWorker } from 'tesseract.js';

     const workerCache = new Map();

     async function getWorker(language) {
       if (workerCache.has(language)) {
         return workerCache.get(language);
       }

       const worker = await createWorker(language, 1, {
         logger: (m) => {
           if (m.status === 'loading language traineddata') {
             const percent = Math.round(m.progress * 100);
             updateProgress(`${language} 언어 데이터 다운로드: ${percent}%`);
           }
         },
         // 캐싱 활성화
         cacheMethod: 'refresh'
       });

       workerCache.set(language, worker);
       return worker;
     }

     // 언어 변경 시
     async function changeLanguage(newLang) {
       showToast('언어 데이터를 다운로드하는 중... (최초 1회)', 'info');
       const worker = await getWorker(newLang);
       showToast('언어 변경 완료!', 'success');
       return worker;
     }
     ```

4. **손글씨 인식 불가**
   - 원인: Tesseract는 인쇄된 텍스트 전용
   - 해결: 사용자에게 명확히 안내
   - 해결: 손글씨 감지 시 경고
   - 코드:
     ```javascript
     // UI 경고 메시지
     const warningMessage = `
       ⚠️ 주의사항:
       - 인쇄된 텍스트만 인식됩니다.
       - 손글씨는 인식되지 않습니다.
       - 깨끗하고 선명한 이미지를 사용하세요.
     `;

     // 신뢰도 낮으면 경고
     async function checkConfidence(result) {
       if (result.confidence < 50) {
         showToast('신뢰도가 낮습니다. 이미지 품질을 확인하세요.', 'warning');
         showToast('손글씨는 인식되지 않습니다.', 'info');
       }
     }
     ```

5. **메모리 부족 (대용량 이미지 또는 PDF)**
   - 원인: Tesseract + 대용량 이미지
   - 해결: 파일 크기 제한 (10MB)
   - 해결: PDF는 페이지별 순차 처리
   - 코드:
     ```javascript
     const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

     function validateFile(file) {
       if (file.size > MAX_FILE_SIZE) {
         showToast('파일이 너무 큽니다. (최대 10MB)', 'error');
         return false;
       }
       return true;
     }

     // PDF 순차 처리
     async function processPDFSequentially(pdfFile, language) {
       const images = await pdfToImages(pdfFile);
       const results = [];

       for (let i = 0; i < images.length; i++) {
         const { pageNum, blob } = images[i];

         try {
           updateProgress(`페이지 ${pageNum} / ${images.length}`);
           const result = await recognizeText(blob, language);
           results.push(result);

           // 메모리 정리
           URL.revokeObjectURL(blob);
           await new Promise(resolve => setTimeout(resolve, 500));

         } catch (error) {
           console.error(`페이지 ${pageNum} 처리 실패:`, error);
         }
       }

       return results;
     }
     ```

6. **다중 컬럼 텍스트 인식 오류**
   - 원인: Tesseract가 좌→우 순서로만 읽음
   - 해결: PSM (Page Segmentation Mode) 설정
   - 해결: 사용자에게 안내
   - 코드:
     ```javascript
     // PSM 설정
     const psmModes = {
       '자동': '3',        // AUTO
       '단일 컬럼': '4',   // Single column
       '단일 블록': '6',   // Single block
       '단일 줄': '7',     // Single line
       '단일 단어': '8',   // Single word
       '단일 문자': '10'   // Single character
     };

     // Worker 설정
     await worker.setParameters({
       tessedit_pageseg_mode: psmModes['자동']
     });

     // UI 안내
     showToast('다중 컬럼 텍스트는 순서가 뒤섞일 수 있습니다.', 'info');
     ```

7. **특수 문자 인식 오류**
   - 원인: 특수 문자 학습 데이터 부족
   - 해결: 결과 텍스트 수동 편집 가능
   - 해결: 신뢰도 표시로 검증 필요성 알림
   - 코드:
     ```javascript
     // 단어별 신뢰도 표시
     function highlightLowConfidence(words) {
       return words.map(word => {
         if (word.confidence < 60) {
           return `<span class="low-confidence" title="신뢰도: ${word.confidence.toFixed(1)}%">${word.text}</span>`;
         }
         return word.text;
       }).join(' ');
     }

     // CSS
     // .low-confidence {
     //   background-color: yellow;
     //   cursor: help;
     // }
     ```

8. **흐릿한 이미지에서 정확도 급감**
   - 원인: 이미지 품질 저하
   - 해결: 샤프닝 필터 적용
   - 해결: 사용자에게 고품질 이미지 권장
   - 코드:
     ```javascript
     // 샤프닝 필터
     function sharpenImage(imageData) {
       const pixels = imageData.data;
       const width = imageData.width;
       const height = imageData.height;

       // 샤프닝 커널 (3x3)
       const kernel = [
         0, -1,  0,
        -1,  5, -1,
         0, -1,  0
       ];

       const output = new Uint8ClampedArray(pixels);

       for (let y = 1; y < height - 1; y++) {
         for (let x = 1; x < width - 1; x++) {
           for (let c = 0; c < 3; c++) { // RGB only
             let sum = 0;
             for (let ky = -1; ky <= 1; ky++) {
               for (let kx = -1; kx <= 1; kx++) {
                 const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                 const kIdx = (ky + 1) * 3 + (kx + 1);
                 sum += pixels[idx] * kernel[kIdx];
               }
             }
             const outIdx = (y * width + x) * 4 + c;
             output[outIdx] = Math.max(0, Math.min(255, sum));
           }
         }
       }

       return new ImageData(output, width, height);
     }

     // 전처리 옵션에 추가
     // ☑ 샤프닝 (흐릿한 이미지)
     ```

9. **PDF 처리 시 메모리 초과**
   - 원인: 전체 페이지 이미지 동시 로드
   - 해결: 페이지별 순차 처리 + 메모리 정리
   - 코드:
     ```javascript
     async function processPDFWithMemoryManagement(pdfFile, language) {
       const arrayBuffer = await pdfFile.arrayBuffer();
       const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

       const results = [];

       for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
         try {
           updateProgress(`페이지 ${pageNum} / ${pdf.numPages} 처리 중...`);

           // 페이지 렌더링
           const page = await pdf.getPage(pageNum);
           const viewport = page.getViewport({ scale: 1.5 });

           const canvas = document.createElement('canvas');
           canvas.width = viewport.width;
           canvas.height = viewport.height;
           const ctx = canvas.getContext('2d');

           await page.render({
             canvasContext: ctx,
             viewport: viewport
           }).promise;

           const blob = await new Promise((resolve) => {
             canvas.toBlob(resolve, 'image/png');
           });

           // OCR 실행
           const result = await recognizeText(blob, language);
           results.push({
             page: pageNum,
             text: result.text,
             confidence: result.confidence
           });

           // 메모리 정리
           URL.revokeObjectURL(blob);
           canvas.width = 0;
           canvas.height = 0;

           // 다음 페이지 전 대기
           await new Promise(resolve => setTimeout(resolve, 500));

         } catch (error) {
           console.error(`페이지 ${pageNum} 처리 실패:`, error);
           results.push({
             page: pageNum,
             text: '',
             error: error.message
           });
         }
       }

       return results;
     }
     ```

10. **회전된 이미지 인식 실패**
    - 원인: 텍스트가 기울어짐
    - 해결: 이미지 회전 기능 제공
    - 해결: 자동 회전 감지 (선택사항)
    - 코드:
      ```javascript
      // 이미지 회전
      function rotateImage(blob, degrees) {
        return new Promise(async (resolve) => {
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          await img.decode();

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // 회전 각도에 따라 캔버스 크기 조정
          const rad = degrees * Math.PI / 180;
          const sin = Math.abs(Math.sin(rad));
          const cos = Math.abs(Math.cos(rad));
          canvas.width = img.width * cos + img.height * sin;
          canvas.height = img.width * sin + img.height * cos;

          // 중심으로 이동 후 회전
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(rad);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);

          canvas.toBlob(resolve, 'image/png');
          URL.revokeObjectURL(img.src);
        });
      }

      // UI 회전 버튼
      document.getElementById('rotate-btn').addEventListener('click', async () => {
        currentImage = await rotateImage(currentImage, 90);
        previewImage(currentImage);
      });

      // Tesseract 자동 회전 감지 (OSD)
      await worker.detect(image); // Orientation and Script Detection
      ```

## 통합 전략

### 문서 디지털화 워크플로우

**메시지:**
- "종이 문서를 디지털로"
- "책/메모 텍스트 추출"

**워크플로우:**
1. 문서 사진 촬영 (또는 스캔)
2. ocr.baal.co.kr에서 텍스트 추출
3. 편집 및 복사
4. 워드/노트 앱에 붙여넣기

### 다른 도구와 연계

**translate.baal.co.kr (번역, 향후):**
- OCR 추출 → 번역

**txt.baal.co.kr (텍스트 도구, 향후):**
- OCR 추출 → 텍스트 정리/분석

## 추가 기능 (선택사항)

### 1. 언어 자동 감지

```javascript
// Tesseract 언어 감지
async function detectLanguage(imageFile) {
  const { data } = await Tesseract.detect(imageFile);
  const detectedLang = data.script; // 'Latin', 'Han', 'Hangul', etc.

  const langMap = {
    'Latin': 'eng',
    'Han': 'chi_sim',
    'Hangul': 'kor',
    'Hiragana': 'jpn',
    'Katakana': 'jpn'
  };

  return langMap[detectedLang] || 'eng';
}

// 사용 예
const detectedLang = await detectLanguage(imageFile);
showToast(`감지된 언어: ${detectedLang}`, 'info');
```

### 2. 테이블 인식 (실험적)

```javascript
// 단순 테이블 추출 (좌표 기반)
function extractTable(data) {
  const lines = data.lines.sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const rows = [];
  let currentRow = [];
  let lastY = -1;

  lines.forEach(line => {
    if (lastY === -1 || Math.abs(line.bbox.y0 - lastY) > 10) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      lastY = line.bbox.y0;
    }
    currentRow.push(line.text);
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}
```

### 3. 히스토리 저장

```javascript
const history = JSON.parse(localStorage.getItem('ocr-history') || '[]');
history.unshift({
  date: new Date().toISOString(),
  filename: file.name,
  language: language,
  textLength: result.text.length,
  confidence: result.confidence
});
localStorage.setItem('ocr-history', JSON.stringify(history.slice(0, 10)));
```

## 개발 로그

### 2025-10-25
- 프로젝트 폴더 생성
- README.md 작성
- **경쟁사 분석 완료:**
  - OnlineOCR.net, Free Online OCR, i2OCR, NewOCR.com, OCR.space 조사
  - 대부분 제한적 또는 서버 업로드 필요
  - 차별화: 완전 무료, 브라우저 기반, 90+ 언어
- **라이브러리 조사 완료:**
  - Tesseract.js v5 (추천) - 오픈소스, 90+ 언어
  - pdf.js 통합 - PDF 페이지별 이미지 변환
  - Best practices: Worker 사용, 이미지 전처리, 진행률 표시
- **실제 이슈 파악:**
  - 처리 속도 느림, 한글 정확도 낮음, 언어 데이터 다운로드
  - 손글씨 불가, 메모리 부족, 다중 컬럼 오류
- **UI/UX 패턴:**
  - 언어 선택, 전처리 옵션, 진행률 상세 표시
  - 편집 가능한 결과, 신뢰도 표시, JSON 출력

## 참고 자료

- [Tesseract.js GitHub](https://github.com/naptha/tesseract.js)
- [Tesseract.js 공식 문서](https://tesseract.projectnaptha.com/)
- [Tesseract OCR (원본)](https://github.com/tesseract-ocr/tesseract)
- [PDF.js GitHub](https://github.com/mozilla/pdf.js)
- [Tesseract Language Data](https://github.com/tesseract-ocr/tessdata)
- [OCR Best Practices](https://nanonets.com/blog/ocr-accuracy/)
