let medicationReminders = [];
const REMINDERS_STORAGE_KEY = 'medicationReminders';
let activeReminderId = null;

let contacts = []; // Will be populated from backend
// const CONTACTS_STORAGE_KEY = 'addressBookContacts'; // Removed
const BACKEND_URL = 'http://127.0.0.1:5000'; // Backend server address

// Global variables for chat and speech, to be initialized in DOMContentLoaded
let selectedCharacterName = 'AI助手';
let chatHistory = null;
let synth = null;

// --- Add message to chat history function (Global) ---
function addMessageToChat(sender, message) {
    if (!chatHistory) return;
    const messageElement = document.createElement('p');
    messageElement.classList.add('chat-message', sender === 'user' ? 'user-message' : 'assistant-message');
    messageElement.innerHTML = `<strong>${sender === 'user' ? '你' : selectedCharacterName}:</strong> ${message}`;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// --- Text-to-Speech (TTS) (Global) ---
function speak(text) {
    if (!synth) {
        console.error("Speech synthesis not initialized.");
        return;
    }
    if (synth.speaking) {
        synth.cancel();
        setTimeout(() => {
            const utterThis = new SpeechSynthesisUtterance(text);
            utterThis.onend = function (event) {
                console.log('SpeechSynthesisUtterance.onend');
            }
            utterThis.onerror = function (event) {
                console.error('SpeechSynthesisUtterance.onerror', event);
            }
            utterThis.lang = 'zh-CN';
            synth.speak(utterThis);
        }, 100);
    } else {
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
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('AI 语音助手页面已加载');

    chatHistory = document.getElementById('chat-history');
    synth = window.speechSynthesis;

    const characterOptions = document.querySelectorAll('.character-options img');
    const selectedCharacterDisplay = document.getElementById('selected-character-display');
    const startSttButton = document.getElementById('start-stt');
    const sttOutput = document.getElementById('stt-output');

    loadReminders();
    // loadContacts(); // Removed old localStorage load
    fetchContactsFromServer(); // New function to load contacts from backend

    characterOptions.forEach(img => {
        img.addEventListener('click', () => {
            characterOptions.forEach(opt => opt.classList.remove('selected'));
            img.classList.add('selected');
            selectedCharacterName = img.alt;
            if (selectedCharacterDisplay) {
                selectedCharacterDisplay.innerHTML = `<p>已选择: ${img.alt}</p><img src="${img.src}" alt="${img.alt}" style="width:50px; height:50px;">`;
            }
            console.log(`已选择人物: ${img.dataset.char}`);
            const welcomeMessage = `你好，我是${selectedCharacterName}，很高兴为你服务。你想聊点什么？`;
            addMessageToChat('assistant', welcomeMessage);
            speak(welcomeMessage);
        });
    });

    setInterval(checkReminders, 30000);
    console.log('Reminder check interval started.');
    setTimeout(checkReminders, 5000);

    function performWebSearch(query) {
        const searchFeedback = `好的，正在为您搜索 “${query}”。`;
        addMessageToChat('assistant', searchFeedback);
        speak(searchFeedback);
        const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
        setTimeout(() => {
            window.open(searchUrl, '_blank');
            const followupMsg = `已经为您打开了“${query}”的搜索结果。`;
            addMessageToChat('assistant', followupMsg);
            speak(followupMsg);
        }, 1500);
    }

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
            const transcript = event.results[0][0].transcript.trim().toLowerCase();
            sttOutput.textContent = `你说的是: ${transcript}`;
            console.log(`STT Result: ${transcript}, Active Reminder ID: ${activeReminderId}`);
            addMessageToChat('user', transcript);

            if (activeReminderId && (transcript.includes('好的') || transcript.includes('知道') || transcript.includes('收到') || transcript.includes('停止提醒') || transcript.includes('取消提醒') || transcript.includes('吃了'))) {
                acknowledgeReminder(activeReminderId, transcript.includes('停止提醒') || transcript.includes('取消提醒'));
                activeReminderId = null;
            } else if (transcript.startsWith('搜索') || transcript.startsWith('查一下') || transcript.startsWith('帮我查')) {
                let query = transcript.replace(/^搜索|^查一下|^帮我查/, '').trim();
                if (query) {
                    performWebSearch(query);
                } else {
                    const errorMsg = "请告诉我您想搜索什么内容。";
                    addMessageToChat('assistant', errorMsg);
                    speak(errorMsg);
                }
            } else if (transcript.startsWith('提醒我') || transcript.startsWith('设置提醒') || transcript.includes('吃药提醒') || transcript.includes('吃药') || transcript.startsWith('添加提醒')) {
                const time = parseTimeFromTranscript(transcript);
                const dateInfo = parseDateFromTranscript(transcript);
                let medicine = extractMedicineName(transcript);

                if (time && dateInfo.dateString) {
                    setMedicationReminder(transcript, medicine, time, dateInfo.dateString, dateInfo.dayKeyword);
                } else {
                    const errorMsg = "抱歉，我不太明白这个提醒的时间设置。请说清楚日期和时间，例如：“提醒我明天上午9点吃药”。";
                    addMessageToChat('assistant', errorMsg);
                    speak(errorMsg);
                }
            } else if (transcript.startsWith('添加联系人') || transcript.startsWith('存联系人') || (transcript.includes('联系人') && (transcript.includes('电话是') || transcript.includes('号码是')))) {
                parseAndAddContact(transcript);
            } else if (transcript.startsWith('查询联系人') || transcript.startsWith('查找联系人') || transcript.includes('的电话') || transcript.includes('的号码') || transcript.startsWith('找一下联系人') || transcript.startsWith('找联系人')) {
                parseAndFindContact(transcript);
            } else {
                const response = `你说了：“${transcript}”。我现在还只能简单回复。`;
                addMessageToChat('assistant', response);
                speak(response);
            }
        };

        recognition.onspeechend = () => {
            recognition.stop();
            console.log('语音识别已结束');
        };

        recognition.onnomatch = (event) => {
            const noMatchMsg = "抱歉，我没有听清楚。";
            sttOutput.textContent = noMatchMsg;
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
            console.error(`语音识别错误: ${event.error}`);
        };
    } else {
        startSttButton.disabled = true;
        const noSupportMsg = "抱歉，您的浏览器不支持语音识别功能。";
        sttOutput.textContent = noSupportMsg;
        console.warn("浏览器不支持 SpeechRecognition");
    }
});

// --- Reminder Storage Functions ---
function loadReminders() {
    const storedReminders = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (storedReminders) {
        medicationReminders = JSON.parse(storedReminders).map(r => ({
            ...r,
            triggeredThisInstance: false,
        }));
        console.log('Loaded reminders:', medicationReminders);
    }
}

function saveReminders() {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(medicationReminders));
    console.log('Saved reminders:', medicationReminders);
}

// --- Reminder Parsing Helper Functions ---
function parseTimeFromTranscript(text) {
    let hours = null;
    let minutes = 0;
    const timeMatch = text.match(/(上午|下午)?(\d+)[点时](?:(\d+)[分分]?|半)?/);
    if (timeMatch) {
        let H = parseInt(timeMatch[2]);
        const period = timeMatch[1];
        if (timeMatch[3] === '半') minutes = 30;
        else if (timeMatch[3]) minutes = parseInt(timeMatch[3]);
        if (period === '下午' && H >= 1 && H <= 11) H += 12;
        if (period === '上午' && H === 12) H = 0;
        hours = H;
    }
    if (hours !== null && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return null;
}

function parseDateFromTranscript(text) {
    const today = new Date();
    let dateString = null;
    let dayKeyword = null;
    if (text.includes('每天')) { dateString = 'everyday'; dayKeyword = '每天'; }
    else if (text.includes('明天')) {
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        dateString = tomorrow.toISOString().split('T')[0]; dayKeyword = '明天';
    } else if (text.includes('今天')) {
        dateString = today.toISOString().split('T')[0]; dayKeyword = '今天';
    }
    if (!dateString && parseTimeFromTranscript(text)) {
         dateString = today.toISOString().split('T')[0]; dayKeyword = '今天';
    }
    return { dateString, dayKeyword };
}

function extractMedicineName(text) {
    const patterns = [/吃([^的]+药)/, /服用([^的]+药)/, /吃(\S+)/, /服用(\S+)/];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const potentialName = match[1].trim();
            if (potentialName === '药' && text.includes(potentialName+'的')) continue;
            if (potentialName !== '药' && !['提醒','的','设置','我'].includes(potentialName)) return potentialName;
        }
    }
    if (text.includes('吃药') || text.includes('服药')) return '药';
    return '药';
}

async function setMedicationReminder(transcript, medicineName, timeString, dateString, dayKeyword) {
    // Payload for the backend
    const newReminderPayload = {
        medicine: medicineName || '药',
        time: timeString,
        date: dateString,
        frequency: (dateString === 'everyday' ? 'daily' : 'once'),
        originalQuery: transcript
        // Backend will handle id, createdAt, acknowledged status, lastTriggered fields etc.
    };
    try {
        const response = await fetch(`${BACKEND_URL}/reminders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newReminderPayload), // Send payload to backend
        });

        const result = await response.json();

        if (!response.ok) {
            // Error from backend (e.g., validation, server error)
            const errorMsg = result.error || `设置提醒失败 (${response.status})`;
            addMessageToChat('assistant', errorMsg);
            speak(errorMsg);
            return; // Stop further processing
        }

        // Successfully added to backend, result is the created reminder from server
        console.log('Reminder added via API:', result);
        medicationReminders.push(result); // Add the server-confirmed reminder to local array
        // To ensure localStorage is also up-to-date for any logic still relying on it (e.g. immediate checkReminders):
        // This is a temporary measure if other parts of the frontend still read from localStorage for reminders.
        // Ideally, all reminder reads would also go through the backend or a consistent frontend cache.
        localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(medicationReminders));


        let confirmationMsg = `好的，已设置提醒：`;
        if (dayKeyword) { // dayKeyword is from the original parsing, still relevant for confirmation
            confirmationMsg += dayKeyword;
        } else if (result.date !== 'everyday') { // Use result.date for accuracy from server
            try {
                const [year, month, day] = result.date.split('-').map(Number);
                const d = new Date(year, month - 1, day); // Month is 0-indexed
                confirmationMsg += `${d.getMonth() + 1}月${d.getDate()}日`;
            } catch (e) {
                console.error("Error parsing date from backend for confirmation:", e);
                confirmationMsg += result.date; // fallback
            }
        }
        confirmationMsg += ` ${result.time} 服用 ${result.medicine}。`;

        addMessageToChat('assistant', confirmationMsg);
        speak(confirmationMsg);

    } catch (error) {
        console.error('Error setting reminder via API:', error);
        const errorMsg = '抱歉，设置提醒时发生网络错误，请稍后再试。';
        addMessageToChat('assistant', errorMsg);
        speak(errorMsg);
    }
}

// --- Reminder Checking and Announcing Functions ---
async function checkReminders() {
    console.log('Test log from checkReminders for subtask test.'); // Added for subtask test
    try {
        const response = await fetch(`${BACKEND_URL}/reminders/due`);
        if (!response.ok) {
            // Don't spam chat/tts for background check failures, just log
            console.error(`Error fetching due reminders: ${response.statusText} (${response.status})`);
            // Optionally, a subtle UI indication could be added for persistent errors.
            return;
        }
        const dueReminders = await response.json();
        if (dueReminders && dueReminders.length > 0) {
            console.log('Due reminders from server:', dueReminders);
            // Announce each due reminder. Consider if multiple pop up at once,
            // might need a queue or announce one by one with a delay.
            // For now, announce all that are due.
            dueReminders.forEach(reminder => {
                // Check if this reminder (by ID) is already the active one being announced
                // This prevents re-announcing if checkReminders runs quickly multiple times
                // for a reminder that hasn't been acknowledged yet.
                // However, `activeReminderId` is reset after acknowledgement.
                // A more robust approach might involve a temporary "recentlyAnnounced" list.
                // For now, the backend determines "due". If it's still due, it will be returned.
                // Client side logic might be needed if a reminder is announced but user doesn't interact
                // and we don't want it announced *every* checkReminders cycle.
                // The backend's `lastTriggeredDate/Time` is not used in the current /due endpoint logic
                // to filter, but could be.
                // For simplicity of this step, we announce what the backend says is due.
                announceReminder(reminder);
            });
        }
    } catch (error) {
        console.error('Failed to fetch or process due reminders:', error);
        // Avoid user-facing error messages for background checks unless it's a persistent issue.
    }
    // Removed localStorage filtering logic as backend is source of truth for "due"
}

function announceReminder(reminder) { // Reminder object now comes from backend
    console.log("Announcing reminder from backend object:", reminder);
    if (synth && synth.speaking) {
        synth.cancel();
    }
    // Ensure reminder object and its properties are valid
    if (!reminder || !reminder.time || !reminder.medicine) {
        console.error("Invalid reminder object passed to announceReminder:", reminder);
        return;
    }
    const message = `提醒您，现在是 ${reminder.time}，该服用 ${reminder.medicine} 了。您现在方便吗？或者说“好的”来确认。`;
    addMessageToChat('assistant', message);
    speak(message);
    activeReminderId = reminder.id;
}

async function acknowledgeReminder(reminderId, isCancelCommand) {
    try {
        const response = await fetch(`${BACKEND_URL}/reminders/${reminderId}/acknowledge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Optional for POST without body, but good practice
            },
            // No body is sent for this specific acknowledge request as per typical REST patterns
            // where the action is defined by the URL and method.
        });

        const updatedReminder = await response.json(); // Backend returns the updated reminder

        if (!response.ok) {
            const errorMsg = updatedReminder.error || `确认提醒失败 (${response.status})`;
            addMessageToChat('assistant', errorMsg);
            speak(errorMsg);
        } else {
            let ackMessage = "";
            if (isCancelCommand) {
                ackMessage = `好的，关于“${updatedReminder.medicine}”的提醒已处理为取消。`;
                if (updatedReminder.frequency === 'daily') {
                    ackMessage += " 明天会再次提醒您。";
                }
            } else {
                ackMessage = `好的，已记录您 ${updatedReminder.time} 服用“${updatedReminder.medicine}”。`;
            }
            addMessageToChat('assistant', ackMessage);
            speak(ackMessage);

            // Update the local reminders array
            const index = medicationReminders.findIndex(r => r.id === reminderId);
            if (index !== -1) {
                medicationReminders[index] = updatedReminder;
            } else {
                // If not found, maybe it was added in another session, add it. Or re-fetch all.
                // For simplicity here, if it wasn't found, we could log it or add.
                // But since `activeReminderId` was set from an announced reminder, it should be in the local list
                // if `checkReminders` populates `medicationReminders` or if it was just added.
                // Let's assume it will be found if `announceReminder` was called on an item from `medicationReminders`.
                // However, `checkReminders` now fetches from server and doesn't necessarily populate `medicationReminders`
                // unless we explicitly do so after fetching due reminders.
                // For now, let's re-fetch all reminders for simplicity and consistency after ack.
                // This could be optimized later.
                // OR, if announceReminder uses items from a server fetch without putting them in medicationReminders,
                // then we don't need to update a local list here, but other functions relying on medicationReminders
                // for current state would be out of sync.
                // The current `announceReminder` is called by `checkReminders` which gets data from server,
                // but `announceReminder` itself doesn't add to `medicationReminders`.
                // It's better to update or remove the specific reminder in the local `medicationReminders` array.
                // If `medicationReminders` is meant to be a comprehensive local cache, it should be updated.
                 if (index !== -1) {
                    medicationReminders[index] = updatedReminder;
                    // If using localStorage as a cache/for other non-migrated features:
                    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(medicationReminders));
                } else {
                    // This case implies the reminder announced was not from the current local `medicationReminders` list.
                    // This might happen if `checkReminders` announces directly from server results without updating local list.
                    // For now, we'll log this. A full fetch might be better.
                    console.warn(`Acknowledged reminder ID ${reminderId} not found in local cache for update.`);
                    // Optionally, add it if it's a fresh ack for a new reminder not yet in local list
                    // medicationReminders.push(updatedReminder);
                    // localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(medicationReminders));
                }

            }
             // Consider re-fetching all reminders to ensure full consistency,
             // esp. if other parts of app rely on medicationReminders being perfectly in sync.
             // fetchRemindersFromServer(); // If such a function exists for GET /api/reminders
        }
    } catch (error) {
        console.error('Error acknowledging reminder via API:', error);
        addMessageToChat('assistant', '抱歉，确认提醒时发生网络错误。');
        speak('抱歉，确认提醒时发生网络错误。');
    } finally {
        activeReminderId = null; // Clear active reminder ID regardless of outcome
    }
}

// --- Contact Book Functions ---
async function fetchContactsFromServer() {
    try {
        const response = await fetch(`${BACKEND_URL}/contacts`);
        if (!response.ok) {
            throw new Error(`Error fetching contacts: ${response.statusText}`);
        }
        contacts = await response.json();
        console.log('Contacts loaded from server:', contacts);
        // If there's any UI that lists all contacts automatically, update it here.
    } catch (error) {
        console.error('Failed to load contacts from server:', error);
        addMessageToChat('assistant', '抱歉，无法从服务器加载通讯录。请稍后再试。');
        // speak('抱歉，无法从服务器加载通讯录。请稍后再试。'); // Optional speak
    }
}

// function loadContacts() { ... } // Removed
// function saveContacts() { ... } // Removed

async function parseAndAddContact(transcript) {
    let contactName = null;
    let phoneNumber = null;
    // Parsing logic remains similar to what was provided in the prompt
    // For brevity, assuming the existing parsing logic populates contactName and phoneNumber
    const phoneKeywords = ['电话是', '电话号码是', '的电话是', '号码是', '电话', '号码'];
    let keywordFound = null;
    let keywordIndex = -1;

    for (const kw of phoneKeywords) {
        const idx = transcript.lastIndexOf(kw);
        if (idx > -1) {
            keywordFound = kw;
            keywordIndex = idx;
            break;
        }
    }

    const phoneKeywords = ['电话是', '电话号码是', '的电话是', '号码是', '电话', '号码'];
    let keywordFound = null;
    let keywordIndex = -1;

    for (const kw of phoneKeywords) {
        const idx = transcript.lastIndexOf(kw);
        if (idx > -1) {
            keywordFound = kw;
            keywordIndex = idx;
            break;
        }
    }
    if (keywordFound) {
        let potentialNamePart = transcript.substring(0, keywordIndex);
        potentialNamePart = potentialNamePart.replace(/^添加联系人|^存联系人|^联系人/, '').trim();
        potentialNamePart = potentialNamePart.replace(/的$/, '').trim();
        let potentialPhonePart = transcript.substring(keywordIndex + keywordFound.length).trim();
        contactName = potentialNamePart; // This is the parsed name
        const phoneMatch = potentialPhonePart.match(/[\d\s]+/);
        if (phoneMatch) phoneNumber = phoneMatch[0].replace(/\s/g, ''); // This is the parsed number

        // Basic frontend validation (backend will also validate)
        if (!contactName || contactName.length < 1 || contactName.length > 50) contactName = null;
        if (!phoneNumber || !/^\d{7,15}$/.test(phoneNumber)) phoneNumber = null;
    }
    // End of example parsing section

    if (contactName && phoneNumber) {
        try {
            const response = await fetch(`${BACKEND_URL}/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: contactName, phone: phoneNumber })
            });
            const result = await response.json();

            if (!response.ok) {
                const errorMsg = result.error || `添加联系人失败 (${response.status})`;
                addMessageToChat('assistant', errorMsg);
                speak(errorMsg);
                return;
            }

            addMessageToChat('assistant', `好的，已经添加联系人 ${result.name}，电话号码是 ${result.phone}。`);
            speak(`好的，已经添加联系人 ${result.name}，电话号码是 ${result.phone}。`);

            fetchContactsFromServer(); // Refresh the list

        } catch (error) {
            console.error('Error adding contact via API:', error);
            const errorMsg = '抱歉，添加联系人时发生网络错误。';
            addMessageToChat('assistant', errorMsg);
            speak(errorMsg);
        }
    } else {
        const errorMsg = "抱歉，我没有听清楚联系人姓名和电话号码。请尝试说“添加联系人 张三 电话是 13812345678”。";
        addMessageToChat('assistant', errorMsg);
        speak(errorMsg);
    }
}

// addContact function is removed as its logic is now in parseAndAddContact's fetch call.

function parseAndFindContact(transcript) {
    let searchName = null;
    const patterns = [
        /^查询联系人\s*(.+)/i, /^查找联系人\s*(.+)/i, /^找一下联系人\s*(.+)/i,
        /^找联系人\s*(.+)/i, /^(.+?)\s*的电话(?:号码)?(?:是多少)?$/i,
        /^(.+?)\s*的联系方式$/i
    ];

    for (const pattern of patterns) {
        const match = transcript.match(pattern);
        if (match && match[1]) {
            searchName = match[1].trim();
            searchName = searchName.replace(/\s*的电话$/, "").trim();
            searchName = searchName.replace(/\s*的号码$/, "").trim();
            break;
        }
    }

    if (!searchName && transcript.includes('的电话')) {
        searchName = transcript.substring(0, transcript.indexOf('的电话')).trim();
    }
    if (!searchName && transcript.includes('的号码')) {
        searchName = transcript.substring(0, transcript.indexOf('的号码')).trim();
    }

    // Remove any leading command phrases if they are part of the extracted name
    if (searchName) {
        searchName = searchName.replace(/^查询联系人|^查找联系人|^找一下联系人|^找联系人/, "").trim();
    }

    if (searchName) {
        findContact(searchName);
    } else {
        const errorMsg = "抱歉，我没有听清楚您想查询哪个联系人。请尝试说“查询联系人 张三”或“张三的电话号码是多少”。";
        addMessageToChat('assistant', errorMsg);
        speak(errorMsg);
    }
}

function findContact(contactName) {
    if (!contactName || contactName.trim() === "") { // Check for empty search name after trimming
        const errorMsg = "请告诉我您想查询的联系人姓名。";
        addMessageToChat('assistant', errorMsg);
        speak(errorMsg);
        return;
    }

    const foundContact = contacts.find(c => c.name.toLowerCase() === contactName.toLowerCase());

    if (foundContact) {
        const resultMsg = `${foundContact.name} 的电话号码是 ${formatPhoneNumberForSpeech(foundContact.phone)}。`;
        addMessageToChat('assistant', resultMsg);
        speak(resultMsg);
    } else {
        const partialMatches = contacts.filter(c => c.name.toLowerCase().includes(contactName.toLowerCase()));
        if (partialMatches.length === 1) {
            const bestMatch = partialMatches[0];
            const resultMsg = `我找到了 ${bestMatch.name}，他的电话号码是 ${formatPhoneNumberForSpeech(bestMatch.phone)}。您是想找他吗？`;
            addMessageToChat('assistant', resultMsg);
            speak(resultMsg);
        } else if (partialMatches.length > 1) {
            let names = partialMatches.map(c => c.name).join("、");
            const resultMsg = `我找到了多个可能相关的联系人：${names}。请您说出更完整的姓名。`;
            addMessageToChat('assistant', resultMsg);
            speak(resultMsg);
        } else {
            const notFoundMsg = `抱歉，通讯录中没有找到联系人 “${contactName}”。`;
            addMessageToChat('assistant', notFoundMsg);
            speak(notFoundMsg);
        }
    }
}

function formatPhoneNumberForSpeech(phoneNumber) {
    // TTS usually handles digit sequences well. Adding spaces can sometimes help.
    // return phoneNumber.split('').join(' ');
    return phoneNumber;
}
