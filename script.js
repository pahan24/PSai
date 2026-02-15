/**
 * Gemini AI - Premium Web Application
 * 
 * SECURITY NOTE:
 * The API key is stored client-side for demonstration purposes.
 * In a production environment, this key should be secured on a backend server 
 * to prevent authorized access and quota abuse.
 * NEVER expose real API keys in public repositories or client-side code.
 */

const API_KEY = "AIzaSyAtE4ZBO8NKMXL-U4mLBC7GsTMFwjSllfE"; // In production, fetch this from// Constants
// API Proxy handled by server.js at /api/chat

// DOM Elements
const elements = {
    appContainer: document.querySelector('.app-container'),
    sidebar: document.getElementById('sidebar'),
    chatContainer: document.getElementById('chat-container'),
    messagesList: document.getElementById('messages-list'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    stopBtn: document.getElementById('stop-btn'),
    voiceBtn: document.getElementById('voice-btn'),
    fileUpload: document.getElementById('file-upload'),
    previewContainer: document.getElementById('preview-container'),
    themeToggle: document.getElementById('theme-toggle'),
    newChatBtns: [document.getElementById('new-chat-btn'), document.getElementById('mobile-new-chat-btn')],
    clearChatsBtn: document.getElementById('clear-chats-btn'),
    chatHistoryList: document.getElementById('chat-history-list'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsBtn: document.getElementById('close-settings'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    welcomeScreen: document.getElementById('welcome-screen'),
    typingIndicator: document.getElementById('typing-indicator'),
    scrollToBottomBtn: document.getElementById('scroll-to-bottom'),
    tokenCounter: document.getElementById('token-counter'),
    toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),

    // Artifacts / Layout
    artifactsPanel: document.getElementById('artifacts-panel'),
    closeArtifactsBtn: document.getElementById('close-artifacts-btn'),
    artifactFrame: document.getElementById('artifact-frame'),

    // Settings specific
    apiKeyInput: document.getElementById('api-key-input'),
    modelSelect: document.getElementById('model-select'),
    systemInstruction: document.getElementById('system-instruction'),
    tempSlider: document.getElementById('temp-slider'),
    tempValue: document.getElementById('temp-value'),
    toppSlider: document.getElementById('topp-slider'),
    toppValue: document.getElementById('topp-value'),
    maxTokens: document.getElementById('max-tokens'),
    ttsToggle: document.getElementById('tts-toggle'),
    autoScrollToggle: document.getElementById('autoscroll-toggle')
};

// State Management
const defaultSettings = {
    apiKey: "AIzaSyBYK1EYQPzRwRwdwgGJtPEaLpDJsFo7rVU", // User provided key
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 2048,
    systemInstruction: "",
    ttsEnabled: false,
    autoScroll: true
};

let state = {
    chats: JSON.parse(localStorage.getItem('gemini_chats')) || {},
    currentChatId: null,
    controller: null,
    isGenerating: false,
    settings: (() => {
        const saved = JSON.parse(localStorage.getItem('gemini_settings') || '{}');
        // If saved apiKey is missing or empty, use default
        if (!saved.apiKey) saved.apiKey = defaultSettings.apiKey;
        return { ...defaultSettings, ...saved };
    })(),
    files: [],
    theme: localStorage.getItem('gemini_theme') || 'dark',
    isArtifactOpen: false
};

// --- Initialization ---

function init() {
    loadTheme();
    renderChatHistory();
    setupEventListeners();
    setupSettings();
    startNewChat();

    // Initialize Mermaid
    if (window.mermaid) {
        mermaid.initialize({ startOnLoad: false, theme: state.theme === 'dark' ? 'dark' : 'default' });
    }
}

function loadTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    elements.themeToggle.checked = state.theme === 'light';
    if (window.mermaid) {
        mermaid.initialize({ theme: state.theme === 'dark' ? 'dark' : 'default' });
        // Re-render diagrams if possible, or just next time
    }
}

function setupSettings() {
    // Populate settings inputs
    elements.apiKeyInput.value = state.settings.apiKey || "";
    elements.modelSelect.value = state.settings.model || defaultSettings.model;
    elements.systemInstruction.value = state.settings.systemInstruction || "";
    elements.tempSlider.value = state.settings.temperature || 0.7;
    elements.tempValue.textContent = state.settings.temperature || 0.7;
    elements.toppSlider.value = state.settings.topP || 0.95;
    elements.toppValue.textContent = state.settings.topP || 0.95;
    elements.maxTokens.value = state.settings.maxOutputTokens || 2048;
    elements.ttsToggle.checked = state.settings.ttsEnabled || false;
    elements.autoScrollToggle.checked = state.settings.autoScroll !== false;
}

// --- Event Listeners ---

function setupEventListeners() {
    // Theme Toggle
    elements.themeToggle.addEventListener('change', () => {
        state.theme = elements.themeToggle.checked ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('gemini_theme', state.theme);
        if (window.mermaid) {
            mermaid.initialize({ theme: state.theme === 'dark' ? 'dark' : 'default' });
            // Re-render diagrams if possible, or just next time
        }
    });

    // Sidebar Toggles
    const toggleSidebar = () => elements.sidebar.classList.toggle('open');
    if (elements.toggleSidebarBtn) elements.toggleSidebarBtn.addEventListener('click', toggleSidebar);
    if (elements.mobileMenuBtn) elements.mobileMenuBtn.addEventListener('click', toggleSidebar);

    // New Chat
    elements.newChatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            startNewChat();
            if (window.innerWidth <= 768) elements.sidebar.classList.remove('open');
        });
    });

    // Clear All Chats
    elements.clearChatsBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all chat history?')) {
            state.chats = {};
            localStorage.removeItem('gemini_chats');
            renderChatHistory();
            startNewChat();
        }
    });

    // Input Handling
    elements.userInput.addEventListener('input', () => {
        elements.userInput.style.height = 'auto';
        elements.userInput.style.height = elements.userInput.scrollHeight + 'px';
        updateSendButtonState();
    });

    elements.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!elements.sendBtn.disabled) sendMessage();
        }
    });

    elements.sendBtn.addEventListener('click', sendMessage);

    // Stop Generation
    elements.stopBtn.addEventListener('click', stopGeneration);

    // File Upload
    elements.fileUpload.addEventListener('change', handleFileUpload);

    // Voice Input
    elements.voiceBtn.addEventListener('click', startVoiceInput);

    // Settings Modal
    elements.settingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('active'));
    elements.closeSettingsBtn.addEventListener('click', () => elements.settingsModal.classList.remove('active'));
    elements.saveSettingsBtn.addEventListener('click', saveSettings);

    // Settings Sliders
    elements.tempSlider.addEventListener('input', (e) => elements.tempValue.textContent = e.target.value);
    elements.toppSlider.addEventListener('input', (e) => elements.toppValue.textContent = e.target.value);

    // Scroll Button
    elements.chatContainer.addEventListener('scroll', () => {
        if (elements.chatContainer.scrollTop + elements.chatContainer.clientHeight < elements.chatContainer.scrollHeight - 100) {
            elements.scrollToBottomBtn.classList.remove('hidden');
        } else {
            elements.scrollToBottomBtn.classList.add('hidden');
        }
    });

    elements.scrollToBottomBtn.addEventListener('click', scrollToBottom);

    // Suggestions
    document.querySelectorAll('.suggestion').forEach(card => {
        card.addEventListener('click', () => {
            elements.userInput.value = card.dataset.prompt;
            elements.userInput.dispatchEvent(new Event('input'));
            sendMessage();
        });
    });

    // Artifacts Panel
    elements.closeArtifactsBtn.addEventListener('click', () => {
        toggleArtifactPanel(false);
    });
}

// --- Chat Logic ---

function startNewChat() {
    const id = Date.now().toString();
    state.currentChatId = id;
    state.chats[id] = {
        title: "New Chat",
        messages: [],
        timestamp: Date.now()
    };

    clearUI();
    toggleWelcomeScreen(true);
    renderChatHistory();
    updateSendButtonState();
}

function loadChat(id) {
    state.currentChatId = id;
    const chat = state.chats[id];

    clearUI();
    toggleWelcomeScreen(false);

    chat.messages.forEach(msg => {
        appendMessage(msg.role, msg.parts[0].text, false);
    });

    renderChatHistory();
    if (window.innerWidth <= 768) elements.sidebar.classList.remove('open');
}

function clearUI() {
    elements.messagesList.innerHTML = '';
    elements.userInput.value = '';
    elements.userInput.style.height = 'auto';
    state.files = [];
    renderPreviews();
    stopGeneration();
    toggleArtifactPanel(false);
}

function updateSendButtonState() {
    const hasText = elements.userInput.value.trim().length > 0;
    const hasFiles = state.files.length > 0;
    elements.sendBtn.disabled = !(hasText || hasFiles) || state.isGenerating;
}

function toggleWelcomeScreen(show) {
    if (show) {
        elements.welcomeScreen.classList.remove('hidden');
        elements.chatContainer.classList.add('hidden');
    } else {
        elements.welcomeScreen.classList.add('hidden');
        elements.chatContainer.classList.remove('hidden');
    }
}

// --- API Integration ---

async function sendMessage() {
    if (state.isGenerating) return;

    const text = elements.userInput.value.trim();
    const files = [...state.files];

    if (!text && files.length === 0) return;

    toggleWelcomeScreen(false);
    elements.userInput.value = '';
    state.files = [];
    renderPreviews();
    elements.userInput.style.height = 'auto';

    state.isGenerating = true;
    updateSendButtonState();
    elements.sendBtn.classList.add('hidden');
    elements.stopBtn.classList.remove('hidden');
    elements.typingIndicator.classList.remove('hidden');

    appendMessage('user', text, true);

    const currentChat = state.chats[state.currentChatId];

    const newMessage = {
        role: "user",
        parts: [{ text: text }]
    };

    if (files.length > 0) {
        files.forEach(file => {
            newMessage.parts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
        });
    }

    currentChat.messages.push(newMessage);

    if (currentChat.messages.length === 1) {
        generateChatTitle(text);
    }

    saveChats();

    try {
        state.controller = new AbortController();
        const signal = state.controller.signal;

        const contents = currentChat.messages.map(msg => ({
            role: msg.role,
            parts: msg.parts
        }));

        let systemInstructionObj = {};
        if (state.settings.systemInstruction.trim()) {
            systemInstructionObj = {
                systemInstruction: {
                    parts: [{ text: state.settings.systemInstruction }]
                }
            };
        }

        const url = '/api/chat'; // Use backend proxy

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: state.settings.model, // Send model choice to backend
                contents: contents,
                generationConfig: {
                    temperature: parseFloat(state.settings.temperature),
                    topP: parseFloat(state.settings.topP),
                    maxOutputTokens: parseInt(state.settings.maxOutputTokens)
                },
                ...systemInstructionObj
            }),
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponseText = "";

        const aiMessageDiv = appendMessage('model', '', true);
        const aiContentDiv = aiMessageDiv.querySelector('.message-content');

        elements.typingIndicator.classList.add('hidden');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Clean parsing strategy
            const cleanedChunk = chunk.replace(/^,/, '');

            try {
                let jsonChunk = JSON.parse(cleanedChunk.trim());
                if (Array.isArray(jsonChunk)) {
                    jsonChunk.forEach(item => {
                        if (item.candidates && item.candidates[0].content) {
                            const text = item.candidates[0].content.parts[0].text;
                            if (text) {
                                aiResponseText += text;
                                updateAIMessage(aiContentDiv, aiResponseText);
                            }
                        }
                    });
                }
            } catch (e) {
                const textMatch = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
                let match;
                while ((match = textMatch.exec(chunk)) !== null) {
                    try {
                        const unescaped = JSON.parse(`"${match[1]}"`);
                        aiResponseText += unescaped;
                        updateAIMessage(aiContentDiv, aiResponseText);
                    } catch (err) {
                        // ignore
                    }
                }
            }
        }

        currentChat.messages.push({
            role: "model",
            parts: [{ text: aiResponseText }]
        });
        saveChats();

        if (state.settings.ttsEnabled) {
            speak(aiResponseText);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            updateAIMessage(document.querySelector('.message.ai:last-child .message-content'), "Analysis stopped by user.");
            currentChat.messages.push({ role: "model", parts: [{ text: "Analysis stopped by user." }] });
        } else {
            console.error(error);
            showToast("Error generating response. Check API Key in Settings.");
            appendMessage('model', "Sorry, I encountered an error. Please check your API Key in Settings.", true);
            currentChat.messages.push({ role: "model", parts: [{ text: "Error encountered." }] });
        }
    } finally {
        state.isGenerating = false;
        elements.sendBtn.classList.remove('hidden');
        elements.stopBtn.classList.add('hidden');
        elements.typingIndicator.classList.add('hidden');
        updateSendButtonState();
        saveChats();
        state.controller = null;
    }
}

function stopGeneration() {
    if (state.controller) {
        state.controller.abort();
    }
}

// --- UI Rendering ---

function appendMessage(role, text, animate = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role === 'model' ? 'ai' : 'user'}`;

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = `avatar ${role === 'model' ? 'ai-avatar' : 'user-avatar'}`;
    avatar.innerHTML = role === 'model' ? '<i class="fa-solid fa-sparkles"></i>' : '<i class="fa-solid fa-user"></i>';

    // Content
    const content = document.createElement('div');
    content.className = 'message-content';

    if (role === 'model') {
        renderMarkdown(content, text);
    } else {
        content.textContent = text;
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(content);

    elements.messagesList.appendChild(msgDiv);

    if (state.settings.autoScroll) {
        scrollToBottom();
    }

    const tokenCount = text.split(/\s+/).length;
    elements.tokenCounter.textContent = `${tokenCount} chars`;

    return msgDiv;
}

function updateAIMessage(contentElement, text) {
    renderMarkdown(contentElement, text);

    if (state.settings.autoScroll) {
        scrollToBottom();
    }
}

// --- Advanced Renderer: Markdown + Mermaid + KaTeX + Artifacts ---
function renderMarkdown(element, text) {
    // 1. Basic Markdown
    let html = marked.parse(text);

    // 2. Sanitize (Simple approach, assume DOMPurify unavailable for no-dep constraint, or careful use)
    // For a pure demo, we'll skip heavy sanitization but normally use DOMPurify here.

    element.innerHTML = html;

    // 3. Highlight Code Blocks & Artifacts Check
    element.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);

        const lang = block.className.match(/language-(\w+)/)?.[1];
        const code = block.innerText;

        // "Run Artifact" button for HTML/SVG
        if (lang === 'html' || lang === 'svg' || lang === 'xml') {
            addArtifactButton(block.parentElement, code);
        } else if (lang === 'mermaid') {
            // Re-render Mermaid
            const graphDiv = document.createElement('div');
            graphDiv.className = 'mermaid';
            graphDiv.textContent = code;
            block.parentElement.replaceWith(graphDiv);
            if (window.mermaid) mermaid.init(undefined, graphDiv);
            return; // Skip normal copy button for diagram
        }

        addCopyButton(block.parentElement);
    });

    // 4. Render Math (KaTeX)
    // Look for $$...$$ or $...$ patterns.
    // NOTE: marked.js might mess up $ symbols. Better to use a marked extension or regex replace before parse.
    // For this simple implementation, let's try to render any specific class or just parse DOM.
    // But since marked might have already escaped $, we can try a simple text replacement in the HTML for $$ blocks
    // Or use a library like `markdown-it-katex`.
    // Simple fallback: Render KaTeX on the whole container text if generic.

    if (window.renderMathInElement) {
        renderMathInElement(element, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ]
        });
    }
}

function addArtifactButton(preElement, code) {
    if (preElement.querySelector('.run-artifact-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'run-artifact-btn';
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Run Preview';
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent copy or other events
        openArtifact(code);
    });

    // Insert before the pre block or inside
    preElement.insertBefore(btn, preElement.firstChild);
}

function addCopyButton(preElement) {
    if (preElement.querySelector('.copy-code-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
    btn.addEventListener('click', () => {
        const code = preElement.querySelector('code').innerText;
        navigator.clipboard.writeText(code);
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy', 2000);
    });
    preElement.appendChild(btn);
}

// --- Artifacts Panel Logic ---

function toggleArtifactPanel(show) {
    state.isArtifactOpen = show;
    if (show) {
        elements.artifactsPanel.classList.add('active');
        elements.artifactsPanel.classList.remove('hidden');
    } else {
        elements.artifactsPanel.classList.remove('active');
        // Wait for transition to finish to hide? Or just hide.
        setTimeout(() => elements.artifactsPanel.classList.add('hidden'), 300);
    }
}

function openArtifact(code) {
    toggleArtifactPanel(true);

    // Inject code into Iframe
    const doc = elements.artifactFrame.contentWindow.document;
    doc.open();
    doc.write(code);
    doc.close();
}

function scrollToBottom() {
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

function renderChatHistory() {
    elements.chatHistoryList.innerHTML = '';
    const sortedChats = Object.entries(state.chats).sort(([, a], [, b]) => b.timestamp - a.timestamp);

    sortedChats.forEach(([id, chat]) => {
        const li = document.createElement('li');
        li.className = `history-item ${id === state.currentChatId ? 'active' : ''}`;

        const span = document.createElement('span');
        span.textContent = chat.title;
        span.onclick = () => loadChat(id);

        const delBtn = document.createElement('i');
        delBtn.className = 'fa-solid fa-trash-can delete-chat';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(id);
        };

        li.appendChild(span);
        li.appendChild(delBtn);
        elements.chatHistoryList.appendChild(li);
    });
}

function deleteChat(id) {
    if (confirm('Delete this chat?')) {
        delete state.chats[id];
        localStorage.setItem('gemini_chats', JSON.stringify(state.chats));
        renderChatHistory();
        if (state.currentChatId === id) {
            startNewChat();
        }
    }
}

function saveChats() {
    state.chats[state.currentChatId].timestamp = Date.now();
    localStorage.setItem('gemini_chats', JSON.stringify(state.chats));
    renderChatHistory();
}

// --- Features ---

function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result.split(',')[1];
            state.files.push({
                mimeType: file.type,
                data: base64Data,
                preview: event.target.result
            });
            renderPreviews();
            updateSendButtonState();
        };
        reader.readAsDataURL(file);
    });

    e.target.value = '';
}

function renderPreviews() {
    elements.previewContainer.innerHTML = '';
    if (state.files.length === 0) {
        elements.previewContainer.classList.add('hidden');
        return;
    }

    elements.previewContainer.classList.remove('hidden');
    state.files.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-preview';

        if (file.mimeType.startsWith('image/')) {
            div.innerHTML = `<img src="${file.preview}" alt="upload">`;
        } else {
            div.innerHTML = `<div class="file-icon"><i class="fa-solid fa-file"></i></div>`;
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        removeBtn.onclick = () => {
            state.files.splice(index, 1);
            renderPreviews();
            updateSendButtonState();
        };

        div.appendChild(removeBtn);
        elements.previewContainer.appendChild(div);
    });
}

// Voice & Visualizer
let audioContext, analyser, dataArray, source, animationId;
const canvas = document.getElementById('voice-visualizer');
const canvasCtx = canvas.getContext('2d');
const voiceOverlay = document.getElementById('voice-overlay');
const closeVoiceBtn = document.getElementById('close-voice-btn');

closeVoiceBtn.addEventListener('click', stopVoiceInput);

function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
        showToast("Speech recognition not supported.");
        return;
    }

    // Open Overlay
    voiceOverlay.classList.remove('hidden');
    elements.voiceBtn.classList.add('active-mic');

    // Init Recognition
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    // Init Audio Context for Visualizer
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            drawVisualizer();
            recognition.start();
        })
        .catch(err => {
            console.error(err);
            showToast("Microphone access denied.");
            stopVoiceInput();
        });

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        document.querySelector('.voice-status').textContent = `"${speechResult}"`;

        if (event.results[0].isFinal) {
            elements.userInput.value = speechResult;
            stopVoiceInput();
            sendMessage();
        }
    };

    recognition.onend = () => {
        // Auto-close if silence or done
        // stopVoiceInput(); // Optional: Keep open for continuous? 
        // For simple interaction: close and send
    };

    recognition.onerror = (event) => {
        showToast("Error: " + event.error);
        stopVoiceInput();
    };

    // Store ref to stop later
    state.currentRecognition = recognition;
}

function stopVoiceInput() {
    voiceOverlay.classList.add('hidden');
    elements.voiceBtn.classList.remove('active-mic');

    if (state.currentRecognition) {
        state.currentRecognition.stop();
        state.currentRecognition = null;
    }

    if (audioContext) {
        audioContext.close();
        cancelAnimationFrame(animationId);
    }

    // Reset Canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawVisualizer() {
    if (voiceOverlay.classList.contains('hidden')) return;

    animationId = requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    canvasCtx.fillStyle = '#000';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2; // Scale down

        // Gemini Colors (Blue/Red gradient effect)
        const r = barHeight + 25 * (i / dataArray.length);
        const g = 100 * (i / dataArray.length);
        const b = 255 - r;

        canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
        // Center bars vertically
        canvasCtx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);

        x += barWidth + 1;
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        const cleanText = text.replace(/[*#`]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(utterance);
    }
}

// Settings
function saveSettings() {
    state.settings = {
        model: elements.modelSelect.value,
        systemInstruction: elements.systemInstruction.value,
        temperature: elements.tempSlider.value,
        topP: elements.toppSlider.value,
        maxOutputTokens: elements.maxTokens.value,
        ttsEnabled: elements.ttsToggle.checked,
        autoScroll: elements.autoScrollToggle.checked
    };

    localStorage.setItem('gemini_settings', JSON.stringify(state.settings));
    elements.settingsModal.classList.remove('active');
    showToast("Settings saved!");
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

async function generateChatTitle(firstMessage) {
    let title = firstMessage.substring(0, 30);
    if (firstMessage.length > 30) title += "...";

    state.chats[state.currentChatId].title = title;
    saveChats();
}

// Init
init();
