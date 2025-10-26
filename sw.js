// BAAL OCR Service Worker
// 백그라운드에서 OCR 처리를 담당

const CACHE_NAME = 'baal-ocr-v1';

// Tesseract.js 로드
importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5');

// 진행 중인 작업 관리
let currentTasks = new Map();
let taskIdCounter = 0;

// 서비스워커 설치
self.addEventListener('install', (event) => {
    console.log('[SW] 서비스워커 설치됨');
    self.skipWaiting();
});

// 서비스워커 활성화
self.addEventListener('activate', (event) => {
    console.log('[SW] 서비스워커 활성화됨');
    event.waitUntil(clients.claim());
});

// 메시지 수신
self.addEventListener('message', async (event) => {
    const { type, data, taskId } = event.data;

    console.log('[SW] 메시지 수신:', type);

    try {
        switch (type) {
            case 'PROCESS_IMAGE':
                await processImage(event, data, taskId);
                break;

            case 'STOP_TASK':
                stopTask(taskId);
                break;

            case 'STOP_ALL_TASKS':
                stopAllTasks();
                break;

            case 'CHECK_CLIENTS':
                await checkClients();
                break;
        }
    } catch (error) {
        console.error('[SW] 에러:', error);
        sendMessage(event.source.id, {
            type: 'ERROR',
            taskId: taskId,
            error: error.message
        });
    }
});

// 이미지 OCR 처리
async function processImage(event, data, taskId) {
    const { imageData, language, filename, fileIndex, totalFiles } = data;

    console.log(`[SW] 이미지 처리 시작: ${filename} (${fileIndex}/${totalFiles})`);

    // 작업 등록
    const abortController = new AbortController();
    currentTasks.set(taskId, {
        abortController,
        filename,
        clientId: event.source.id
    });

    try {
        // Blob 생성
        const blob = new Blob([imageData.buffer], { type: imageData.type });

        // Tesseract로 OCR 처리
        // Service Worker에서는 workerPath를 'blob'으로 설정하여 내부 Worker 생성 방지
        const { data: result } = await Tesseract.recognize(
            blob,
            language,
            {
                workerPath: 'blob',
                logger: (m) => {
                    // 작업이 중단되었는지 확인
                    if (abortController.signal.aborted) {
                        throw new Error('Task aborted');
                    }

                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        sendMessage(event.source.id, {
                            type: 'OCR_PROGRESS',
                            taskId,
                            data: {
                                filename,
                                fileIndex,
                                totalFiles,
                                progress,
                                status: 'recognizing'
                            }
                        });
                    } else if (m.status === 'loading language traineddata') {
                        sendMessage(event.source.id, {
                            type: 'OCR_PROGRESS',
                            taskId,
                            data: {
                                filename,
                                fileIndex,
                                totalFiles,
                                status: 'loading_language'
                            }
                        });
                    }
                }
            }
        );

        // 작업 완료
        currentTasks.delete(taskId);

        sendMessage(event.source.id, {
            type: 'IMAGE_COMPLETE',
            taskId,
            data: {
                filename,
                text: result.text,
                fileIndex,
                totalFiles
            }
        });

        console.log(`[SW] 이미지 처리 완료: ${filename}`);

    } catch (error) {
        currentTasks.delete(taskId);

        if (error.message === 'Task aborted') {
            console.log(`[SW] 작업 중단됨: ${filename}`);
            sendMessage(event.source.id, {
                type: 'TASK_STOPPED',
                taskId,
                data: { filename }
            });
        } else {
            throw error;
        }
    }
}

// 특정 작업 중단
function stopTask(taskId) {
    const task = currentTasks.get(taskId);
    if (task) {
        console.log(`[SW] 작업 중단 요청: ${task.filename}`);
        task.abortController.abort();
        currentTasks.delete(taskId);
    }
}

// 모든 작업 중단
function stopAllTasks() {
    console.log('[SW] 모든 작업 중단');
    currentTasks.forEach((task, taskId) => {
        task.abortController.abort();
    });
    currentTasks.clear();
}

// 클라이언트 확인 (열려있는 탭이 없으면 작업 중단)
async function checkClients() {
    const clients = await self.clients.matchAll();

    if (clients.length === 0) {
        console.log('[SW] 열려있는 탭 없음 - 모든 작업 중단');
        stopAllTasks();
    }
}

// 클라이언트에게 메시지 전송
async function sendMessage(clientId, message) {
    try {
        const client = await self.clients.get(clientId);
        if (client) {
            client.postMessage(message);
        }
    } catch (error) {
        console.error('[SW] 메시지 전송 실패:', error);
    }
}

// 주기적으로 클라이언트 상태 확인 (30초마다)
setInterval(async () => {
    if (currentTasks.size > 0) {
        await checkClients();
    }
}, 30000);

console.log('[SW] 서비스워커 로드 완료');
