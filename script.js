document.addEventListener('DOMContentLoaded', () => {
    console.log('AI 语音助手页面已加载');

    const characterOptions = document.querySelectorAll('.character-options img');
    const selectedCharacterDisplay = document.getElementById('selected-character-display');
    const startSttButton = document.getElementById('start-stt');
    const sttOutput = document.getElementById('stt-output');
    const chatHistory = document.getElementById('chat-history'); // Get chat history element

    let selectedCharacterName = 'AI助手'; // Default assistant name

    // --- Character Selection ---
    characterOptions.forEach(img => {
        img.addEventListener('click', () => {
            characterOptions.forEach(opt => opt.classList.remove('selected'));
            img.classList.add('selected');
            selectedCharacterName = img.alt; // Store selected character's name
            if (selectedCharacterDisplay) {
                selectedCharacterDisplay.innerHTML = `<p>已选择: ${img.alt}</p><img src="${img.src}" alt="${img.alt}" style="width:50px; height:50px;">`;
            }
            console.log(`已选择人物: ${img.dataset.char}`);
            const welcomeMessage = `你好，我是${selectedCharacterName}，很高兴为你服务。你想聊点什么？`;
            addMessageToChat('assistant', welcomeMessage); // Add welcome to chat history
            speak(welcomeMessage);
        });
    });

    // --- Add message to chat history function ---
    function addMessageToChat(sender, message) {
        const messageElement = document.createElement('p');
        messageElement.classList.add('chat-message', sender === 'user' ? 'user-message' : 'assistant-message');
        messageElement.innerHTML = `<strong>${sender === 'user' ? '你' : selectedCharacterName}:</strong> ${message}`;
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Scroll to the bottom
    }

    // --- Text-to-Speech (TTS) ---
    const synth = window.speechSynthesis;
    function speak(text) {
        if (synth.speaking) {
            // Simple queueing: if speaking, try again shortly.
            // A more robust queue would involve an array of utterances.
            setTimeout(() => speak(text), 250);
            console.warn('SpeechSynthesis is busy, retrying shortly.');
            return;
        }
        if (text !== '') {
            const utterThis = new SpeechSynthesisUtterance(text);
            utterThis.onend = function (event) {
                console.log('SpeechSynthesisUtterance.onend');
            }
            utterThis.onerror = function (event) {
                console.error('SpeechSynthesisUtterance.onerror', event);
            }
            utterThis.lang = 'zh-CN';
            synth.speak(utterThis);
        }
    }

    // --- Speech-to-Text (STT) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        startSttButton.addEventListener('click', () => {
            if (synth.speaking) {
                sttOutput.textContent = '请稍等，我还在说话...';
                return;
            }
            try {
                recognition.start();
                sttOutput.textContent = '正在聆听...';
                console.log('语音识别已开始');
            } catch(e) {
                console.error("Error starting recognition: ", e);
                sttOutput.textContent = '错误：无法启动语音识别。';
                if (e.name === 'InvalidStateError') {
                    sttOutput.textContent = '错误：语音识别已在运行中。';
                } else {
                    sttOutput.textContent = '错误：无法启动语音识别。请检查麦克风权限。';
                }
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            sttOutput.textContent = `你说的是: ${transcript}`;
            console.log(`识别结果: ${transcript}`);

            addMessageToChat('user', transcript); // Add user's speech to chat

            // Basic application response
            const response = `你说了：“${transcript}”。我现在还只能简单回复。`;
            addMessageToChat('assistant', response); // Add assistant's response to chat
            speak(response); // Speak the response
        };

        recognition.onspeechend = () => {
            recognition.stop();
            console.log('语音识别已结束');
        };

        recognition.onnomatch = (event) => {
            const noMatchMsg = "抱歉，我没有听清楚。";
            sttOutput.textContent = noMatchMsg;
            // addMessageToChat('assistant', noMatchMsg); // Optionally add to chat
            // speak(noMatchMsg);
            console.log('无法匹配语音');
        };

        recognition.onerror = (event) => {
            let errorMsg = `语音识别错误: ${event.error}`;
            if (event.error === 'no-speech') {
                errorMsg = "我没有听到声音，请再试一次。";
            } else if (event.error === 'audio-capture') {
                errorMsg = "无法捕获麦克风音频。请检查麦克风设置和权限。";
            } else if (event.error === 'not-allowed') {
                errorMsg = "麦克风访问被拒绝。请允许麦克风访问后重试。";
            }
            sttOutput.textContent = errorMsg;
            // addMessageToChat('assistant', errorMsg); // Optionally add to chat
            console.error(`语音识别错误: ${event.error}`);
        };
    } else {
        startSttButton.disabled = true;
        const noSupportMsg = "抱歉，您的浏览器不支持语音识别功能。";
        sttOutput.textContent = noSupportMsg;
        // addMessageToChat('assistant', noSupportMsg); // Optionally add to chat
        console.warn("浏览器不支持 SpeechRecognition");
    }
});
