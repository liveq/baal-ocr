// 다크모드 토글
const initThemeToggle = () => {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // 로컬스토리지에서 테마 불러오기
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');

            // 테마 저장
            const isDark = body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
};

// 언어 전환
const initLangToggle = () => {
    const langToggle = document.getElementById('langToggle');
    const body = document.body;

    // 로컬스토리지에서 언어 불러오기
    const savedLang = localStorage.getItem('lang') || 'ko';
    body.setAttribute('data-lang', savedLang);
    updateLanguage(savedLang);

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const currentLang = body.getAttribute('data-lang');
            const newLang = currentLang === 'ko' ? 'en' : 'ko';

            body.setAttribute('data-lang', newLang);
            localStorage.setItem('lang', newLang);
            updateLanguage(newLang);
        });
    }
};

// 언어별 텍스트 업데이트
const updateLanguage = (lang) => {
    const elements = document.querySelectorAll('[data-ko][data-en]');
    elements.forEach(el => {
        const text = lang === 'ko' ? el.getAttribute('data-ko') : el.getAttribute('data-en');
        if (text) {
            el.textContent = text;
        }
    });
};

// 파일 크기 포맷팅
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// 토스트 메시지
const showToast = (message, type = 'info', duration = 3000) => {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 토스트 생성
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // 스타일 추가
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#c92a2a' : type === 'success' ? '#2f9e44' : '#1864ab'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    // 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // 자동 제거
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// 로딩 스피너 표시/숨김
const showLoading = () => {
    const existing = document.querySelector('.loading-overlay');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="spinner"></div>
        <p>처리 중...</p>
    `;

    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
    `;

    const style = document.createElement('style');
    style.textContent = `
        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255, 255, 255, 0.3);
            border-top-color: #d4af37;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);
};

const hideLoading = () => {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
};

// 파일 다운로드
const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// 드롭존 초기화 (드래그 앤 드롭 파일 업로드)
const initDropzone = (dropzoneId, fileInputId, onFilesSelected, options = {}) => {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(fileInputId);

    if (!dropzone || !fileInput) {
        console.warn('Dropzone or file input not found');
        return;
    }

    // 기본 옵션
    const config = {
        multiple: true,
        accept: '*/*',
        maxSize: 100 * 1024 * 1024, // 100MB
        maxFiles: 100,
        ...options
    };

    // 파일 입력 설정
    fileInput.multiple = config.multiple;
    if (config.accept !== '*/*') {
        fileInput.accept = config.accept;
    }

    // 드롭존 클릭 시 파일 선택
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // 파일 선택 시
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // 드래그 앤 드롭
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('active');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }, false);

    // 파일 처리
    function handleFiles(files) {
        const fileArray = Array.from(files);

        // 파일 개수 체크
        if (fileArray.length > config.maxFiles) {
            showToast(`최대 ${config.maxFiles}개까지만 업로드 가능합니다.`, 'error');
            return;
        }

        // 파일 크기 체크
        const oversizedFiles = fileArray.filter(file => file.size > config.maxSize);
        if (oversizedFiles.length > 0) {
            const maxSizeMB = Math.round(config.maxSize / 1024 / 1024);
            showToast(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`, 'error');
            return;
        }

        // 파일 타입 체크 (accept가 지정된 경우)
        if (config.accept !== '*/*') {
            const acceptedTypes = config.accept.split(',').map(t => t.trim());
            const invalidFiles = fileArray.filter(file => {
                return !acceptedTypes.some(type => {
                    if (type.startsWith('.')) {
                        return file.name.toLowerCase().endsWith(type.toLowerCase());
                    } else {
                        return file.type.match(type.replace('*', '.*'));
                    }
                });
            });

            if (invalidFiles.length > 0) {
                showToast('지원하지 않는 파일 형식입니다.', 'error');
                return;
            }
        }

        // 콜백 실행
        if (onFilesSelected && typeof onFilesSelected === 'function') {
            onFilesSelected(fileArray);
        }
    }

    return {
        reset: () => {
            fileInput.value = '';
        }
    };
};

// 브라우저 언어 자동 감지
const detectBrowserLanguage = () => {
    const browserLang = navigator.language || navigator.userLanguage;

    // 저장된 언어가 없으면 브라우저 언어 사용
    const savedLang = localStorage.getItem('lang');
    if (!savedLang) {
        const lang = browserLang.startsWith('ko') ? 'ko' : 'en';
        localStorage.setItem('lang', lang);
        return lang;
    }

    return savedLang;
};


// 도구 버튼 초기화
const initToolsToggle = () => {
    const toolsToggle = document.getElementById('toolsToggle');

    if (toolsToggle) {
        // 툴팁 생성
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';

        // 현재 언어에 따라 툴팁 텍스트 설정
        const updateTooltipText = () => {
            const currentLang = document.body.getAttribute('data-lang') || 'ko';
            tooltip.textContent = currentLang === 'ko' ? '더 많은 도구' : 'More Tools';
        };

        updateTooltipText();
        toolsToggle.appendChild(tooltip);

        // 클릭 이벤트
        toolsToggle.addEventListener('click', () => {
            window.open('https://baal.co.kr', '_blank');
        });

        // 언어 변경 시 툴팁 업데이트
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                setTimeout(updateTooltipText, 0);
            });
        }
    }
};

// 푸터 BAAL 링크 툴팁 초기화
const initFooterTooltip = () => {
    const footerLink = document.querySelector('.footer-brand a');

    if (footerLink) {
        // 툴팁 생성
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';

        // 현재 언어에 따라 툴팁 텍스트 설정
        const updateTooltipText = () => {
            const currentLang = document.body.getAttribute('data-lang') || 'ko';
            tooltip.textContent = currentLang === 'ko' ? '더 많은 도구' : 'More Tools';
        };

        updateTooltipText();
        footerLink.appendChild(tooltip);

        // 마우스 호버 이벤트
        footerLink.addEventListener('mouseenter', () => {
            tooltip.classList.add('show');
        });

        footerLink.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });

        // 언어 변경 시 툴팁 업데이트
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                setTimeout(updateTooltipText, 0);
            });
        }
    }
};

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 브라우저 언어 자동 감지
    detectBrowserLanguage();

    initThemeToggle();
    initLangToggle();
    initToolsToggle();
    initFooterTooltip();
});

// 전역 유틸리티 함수 export
window.BaalUtils = {
    formatFileSize,
    showToast,
    showLoading,
    hideLoading,
    downloadFile,
    initDropzone,
    detectBrowserLanguage
};
