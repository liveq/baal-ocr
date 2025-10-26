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
        if (type === 'PROCESS_IMAGE') {
            await processImage(data);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error.message
        });
    }
});

async function processImage({ imageData, language, filename, fileIndex, totalFiles }) {
    try {
        // 진행 상태 전송
        self.postMessage({
            type: 'PROGRESS',
            data: {
                current: fileIndex,
                total: totalFiles,
                filename: filename,
                status: 'processing'
            }
        });

        // ArrayBuffer를 Blob으로 변환
        const blob = new Blob([imageData.buffer], { type: imageData.type });

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
                                current: fileIndex,
                                total: totalFiles,
                                filename: filename,
                                progress: progress,
                                status: 'recognizing text'
                            }
                        });
                    } else if (m.status === 'loading language traineddata') {
                        self.postMessage({
                            type: 'OCR_PROGRESS',
                            data: {
                                current: fileIndex,
                                total: totalFiles,
                                filename: filename,
                                status: 'loading language data'
                            }
                        });
                    } else if (m.status === 'initializing tesseract') {
                        self.postMessage({
                            type: 'OCR_PROGRESS',
                            data: {
                                current: fileIndex,
                                total: totalFiles,
                                filename: filename,
                                status: 'initializing'
                            }
                        });
                    }
                }
            }
        );

        // 완료
        self.postMessage({
            type: 'COMPLETE',
            data: {
                filename: filename,
                text: data.text,
                fileIndex: fileIndex,
                totalFiles: totalFiles
            }
        });

    } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        self.postMessage({
            type: 'ERROR',
            data: {
                filename: filename,
                error: error.message
            }
        });
    }
}
