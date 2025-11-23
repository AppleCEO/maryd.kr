// Google Apps Script Web App URL (설정 시 시트로 저장됩니다). 비워두면 mailto 폴백 사용
const SUBMIT_ENDPOINT = "https://script.google.com/macros/s/AKfycbzW0Mtto5z2z_Fp6iKT75mlytKn-z4j0V7qlQPMUo95upsl7onkhgbB3oI62NWcWDhhbg/exec";

async function fetchImageAsBase64(url) {
    try {
        const proxyUrl = `https://node-ai-cqn3.vercel.app/api/proxy-image?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image via proxy: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image as Base64:", error);
        return null;
    }
}

async function refineDescriptionWithChatGPT({ imageUrl, q1, q2, q3, q4, q5 }) {
    // 서버가 있을 때만 시도 (GitHub Pages 등 정적 환경에서는 생략)
    if (location.hostname.endsWith('github.io') || location.protocol === 'file:') return;
    try {
        const resp = await fetch('/describe-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl, q1, q2, q3, q4, q5 })
        });
        if (!resp.ok) return;
        const json = await resp.json();
        if (json && json.description) {
            document.getElementById('result-text').innerText = json.description;
        }
    } catch {}
}

function generateKoreanDescription({ q1, q2, q3, q4, q5 }) {
    const trimAll = (s) => (s || "").toString().trim();
    q1 = trimAll(q1); q2 = trimAll(q2); q3 = trimAll(q3); q4 = trimAll(q4); q5 = trimAll(q5);

    const openers = [
        `${q2} 소재로 제작한 ${q1}`,
        `${q1}에 ${q2}의 질감을 살린 디자인`,
        `고급스러운 ${q2} ${q1}`
    ];
    const focuses = [
        `${q3}를 핵심 포인트로`,
        `${q3} 디테일을 중심으로`,
        `${q3}의 아름다움을 강조하여`
    ];
    const styles = [
        `${q4} 무드로`,
        `${q4} 감성을 담아`,
        `${q4} 분위기를 유지하며`
    ];
    const inspirations = [
        `'${q5}'에서 영감을 받아`,
        `'${q5}' 모티프를 반영해`,
        `'${q5}'의 이미지로부터 착안해`
    ];
    const finishes = [
        `라인과 비율을 균형 있게 조정해 손끝에서 느껴지는 완성도를 높였습니다.`,
        `착용 시 편안함과 존재감이 조화를 이루도록 구조와 광택을 세심히 다듬었습니다.`,
        `일상과 특별한 순간 모두에서 자연스럽게 빛나도록 표면 처리와 형태를 정교하게 설계했습니다.`
    ];

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const parts = [
        pick(openers),
        pick(focuses),
        pick(styles),
        pick(inspirations)
    ];
    // 문장 구성
    const sentence1 = `${parts[0]}으로, ${parts[1]} ${parts[2]} ${parts[3]} 디자인했습니다.`
        .replace(/\s+/g, ' ').replace(/\s,/, ',');
    const sentence2 = pick(finishes);

    return `${sentence1} ${sentence2}`;
}
// Simple chat wizard questions
const chatQuestions = [
    '어떤 종류의 액세서리를 원하시나요? (예: 반지, 목걸이, 귀걸이)',
    '주된 재료는 무엇으로 할까요? (예: 금, 은, 원석)',
    '디자인의 핵심 포인트나 장식은 무엇인가요? (예: 탄생석, 특정 문양)',
    '전체적인 스타일은 어떤 느낌이었으면 하나요? (예: 심플, 화려, 빈티지)',
    '디자인에 영감을 줄 만한 것이 있나요? (예: 좋아하는 영화, 특정 장소)'
];
const chatAnswers = [];
const messagesEl = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

function smoothScrollToLoading() {
    const el = document.getElementById('loading');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function smoothScrollToResult() {
    const el = document.getElementById('result-container');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function appendMessage(text, role = 'bot') {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function askNext() {
    const idx = chatAnswers.length;
    if (idx < chatQuestions.length) {
        appendMessage(chatQuestions[idx], 'bot');
        chatInput.placeholder = '답변을 입력하세요';
    } else {
        // Fill form inputs and trigger generate
        document.getElementById('q1').value = chatAnswers[0] || '';
        document.getElementById('q2').value = chatAnswers[1] || '';
        document.getElementById('q3').value = chatAnswers[2] || '';
        document.getElementById('q4').value = chatAnswers[3] || '';
        document.getElementById('q5').value = chatAnswers[4] || '';
        appendMessage('답변 감사합니다. 디자인을 생성합니다...', 'bot');
        // 로딩 표시로 스크롤 이동
        document.getElementById('loading').style.display = 'block';
        smoothScrollToLoading();
        // 직접 생성 함수 트리거
        await generateDesign();
    }
}

async function submitChat() {
    const value = chatInput.value.trim();
    if (!value || chatInput.disabled) return;

    appendMessage(value, 'user');
    chatAnswers.push(value);
    chatInput.value = '';
    chatInput.disabled = true;
    chatSend.disabled = true;

    await new Promise(r => setTimeout(r, 300)); // 잠시 대기
    await askNext();

    // 마지막 질문이 아니면 다시 활성화
    if (chatAnswers.length < chatQuestions.length) {
        chatInput.disabled = false;
        chatSend.disabled = false;
        chatInput.focus();
    }
}

chatSend.addEventListener('click', submitChat);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !chatInput.disabled) submitChat();
});

// Boot chat
appendMessage('안녕하세요! 몇 가지 질문에 답해주시면 맞춤 디자인을 만들어 드릴게요.', 'bot');
askNext();

async function sendRequestEmail() {
    const contact = document.getElementById('contact').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const imageUrl = document.getElementById('result-image').src;
    const q1 = document.getElementById('q1').value;
    const q2 = document.getElementById('q2').value;
    const q3 = document.getElementById('q3').value;
    const q4 = document.getElementById('q4').value;
    const q5 = document.getElementById('q5').value;

    if (!contact) {
        alert('연락처를 입력해주세요.');
        return;
    }

    const sendButton = document.getElementById('send-request');
    sendButton.disabled = true;
    sendButton.textContent = '전송 중...';

    try {
        // 1. Google Apps Script (SUBMIT_ENDPOINT)
        if (SUBMIT_ENDPOINT) {
            console.log("Attempting to send via Google Apps Script...");
            // Google Apps Script는 보통 redirect 응답을 하므로, 'no-cors' 모드로 요청하고 응답을 기다리지 않습니다.
            await fetch(SUBMIT_ENDPOINT, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact, notes, imageUrl, q1, q2, q3, q4, q5 })
            });
            
            // 성공으로 간주하고 UI 처리
            sendButton.textContent = '요청 완료';
            alert('요청이 성공적으로 전송되었습니다.');
            return;
        }

        // 2. Local Node.js Server (개발 환경용)
        if (!(location.hostname.endsWith('github.io') || location.protocol === 'file:')) {
            console.log("Attempting to send via local server...");
            const response = await fetch('/send-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact, notes, imageUrl, q1, q2, q3, q4, q5 })
            });

            if (response.ok) {
                sendButton.textContent = '요청 완료';
                alert('요청이 성공적으로 전송되었습니다.');
                return;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.details || '로컬 서버에서 요청 처리에 실패했습니다.');
            }
        }
        
        // 3. 모든 방법 실패 시 최종 폴백
        throw new Error('메일 전송 기능이 설정되지 않았습니다. maryd.co.kr@gmail.com 으로 직접 문의해주세요.');

    } catch (error) {
        console.error('sendRequestEmail error:', error);
        alert(`오류가 발생했습니다: ${error.message}`);
        sendButton.disabled = false;
        sendButton.textContent = '요청하기';
    }
}

document.getElementById('send-request').addEventListener('click', sendRequestEmail);

async function generateDesign() {
    const q1 = document.getElementById('q1').value;
    const q2 = document.getElementById('q2').value;
    const q3 = document.getElementById('q3').value;
    const q4 = document.getElementById('q4').value;
    const q5 = document.getElementById('q5').value;

    if (!q1 || !q2 || !q3 || !q4 || !q5) {
        alert('모든 질문에 답변해주세요.');
        return;
    }

    const loading = document.getElementById('loading');
    const resultContainer = document.getElementById('result-container');
    const resultTitle = document.getElementById('result-title');
    const resultText = document.getElementById('result-text');
    const resultImage = document.getElementById('result-image');

    // 채팅 입력 잠시 비활성화
    chatSend.disabled = true;
    chatInput.disabled = true;
    loading.style.display = 'block';
    resultContainer.style.display = 'none';

    smoothScrollToLoading();

    try {
        const endpointUrl = 'https://node-ai-cqn3.vercel.app/api/generate-image';

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q1, q2, q3, q4, q5 })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error(response.statusText || '서버에서 응답을 받지 못했습니다.');
            }
            throw new Error(errorData.details || errorData.error || '이미지 생성에 실패했습니다.');
        }

        const data = await response.json();

        resultContainer.style.display = 'block';
        smoothScrollToResult();
        const imageUrl = data.imageUrl;
        resultImage.src = imageUrl;
        const base64Data = await fetchImageAsBase64(imageUrl);
        
        if (base64Data) {
            document.getElementById('image-base64-data').value = base64Data;
        } else {
            console.warn("Base64 변환 실패. 이메일에 이미지가 첨부되지 않을 수 있습니다.");
        }
        
        resultContainer.style.display = 'block';
        resultTitle.style.display = 'block';
        resultText.style.display = 'none';
        resultImage.classList.add('loading-placeholder');
        smoothScrollToResult();

        resultImage.src = data.imageUrl;
        resultImage.onload = () => {
            resultImage.classList.remove('loading-placeholder');
            document.getElementById('contact-form').style.display = 'block';
        };
        
        refineDescriptionWithChatGPT({ 
            imageUrl: data.imageUrl, q1, q2, q3, q4, q5 
        });

    } catch (error) {
        console.error('Error:', error);
        let errorMessage = error.message || '디자인 생성에 실패했습니다. 다시 시도해주세요.';
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4B2323;
            border: 2px solid #fff;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            z-index: 1000;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #fff;">⚠️ 오류 발생</h3>
            <p style="margin: 0 0 16px 0; color: #fff; line-height: 1.5;">${errorMessage}</p>
            <button onclick="this.parentElement.remove()" style="
                background: #fff;
                color: #4B2323;
                border: none;
                border-radius: 8px;
                padding: 8px 16px;
                cursor: pointer;
                font-weight: 600;
            ">확인</button>
        `;
        
        document.body.appendChild(errorDiv);
    } finally {
        chatSend.disabled = false;
        chatInput.disabled = false;
        loading.style.display = 'none';
    }
}
    