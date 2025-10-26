// OCR Web Worker
// Tesseract.js와 PDF.js를 Worker에서 실행하여 백그라운드 처리

// Tesseract.js 로드
importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5');

// PDF.js 로드
importScripts('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');

// PDF.js Worker 설정
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// 메시지 수신
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    try {
        if (type === 'PROCESS_FILES') {
            await processFiles(data);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error.message
        });
    }
});

async function processFiles({ files, language }) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileNum = i + 1;
        const totalFiles = files.length;

        try {
            // 진행 상태 전송
            self.postMessage({
                type: 'PROGRESS',
                data: {
                    current: fileNum,
                    total: totalFiles,
                    filename: file.name,
                    status: 'processing'
                }
            });

            let text = '';

            if (file.type === 'application/pdf') {
                // PDF 처리
                text = await processPDF(file, fileNum, totalFiles, language);
            } else {
                // 이미지 처리
                text = await processImage(file, fileNum, totalFiles, language);
            }

            results.push({
                filename: file.name,
                text: text
            });

            // 개별 파일 완료 알림
            self.postMessage({
                type: 'FILE_COMPLETE',
                data: {
                    current: fileNum,
                    total: totalFiles,
                    filename: file.name
                }
            });

        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            results.push({
                filename: file.name,
                text: `[오류: ${error.message}]`
            });
        }
    }

    // 전체 완료
    self.postMessage({
        type: 'COMPLETE',
        data: {
            results: results
        }
    });
}

async function processImage(file, fileNum, totalFiles, language) {
    // ArrayBuffer를 Blob으로 변환
    const blob = new Blob([file.arrayBuffer], { type: file.type });

    const { data } = await Tesseract.recognize(
        blob,
        language,
        {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    self.postMessage({
                        type: 'OCR_PROGRESS',
                        data: {
                            current: fileNum,
                            total: totalFiles,
                            filename: file.name,
                            progress: progress,
                            status: 'recognizing text'
                        }
                    });
                } else if (m.status === 'loading language traineddata') {
                    self.postMessage({
                        type: 'OCR_PROGRESS',
                        data: {
                            current: fileNum,
                            total: totalFiles,
                            filename: file.name,
                            status: 'loading language data'
                        }
                    });
                } else if (m.status === 'initializing tesseract') {
                    self.postMessage({
                        type: 'OCR_PROGRESS',
                        data: {
                            current: fileNum,
                            total: totalFiles,
                            filename: file.name,
                            status: 'initializing'
                        }
                    });
                }
            }
        }
    );

    return data.text;
}

async function processPDF(file, fileNum, totalFiles, language) {
    const arrayBuffer = file.arrayBuffer;
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        self.postMessage({
            type: 'PDF_PROGRESS',
            data: {
                current: fileNum,
                total: totalFiles,
                filename: file.name,
                page: pageNum,
                totalPages: pdf.numPages
            }
        });

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });

        // OffscreenCanvas 사용 (Worker에서 Canvas 사용)
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d', { willReadFrequently: true });

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        // Canvas를 Blob으로 변환
        const blob = await canvas.convertToBlob({ type: 'image/png' });

        const { data } = await Tesseract.recognize(
            blob,
            language,
            {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        self.postMessage({
                            type: 'OCR_PROGRESS',
                            data: {
                                current: fileNum,
                                total: totalFiles,
                                filename: file.name,
                                page: pageNum,
                                totalPages: pdf.numPages,
                                progress: progress
                            }
                        });
                    }
                }
            }
        );

        fullText += `\n\n=== 페이지 ${pageNum} ===\n\n${data.text}`;
    }

    return fullText.trim();
}
