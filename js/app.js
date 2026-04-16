// ============================================
// MINDBRIDGE AI - Main Application Controller
// ============================================

const App = {
    currentScreen: 'welcomeScreen',

    init() {
        // Initialize modules
        ProfileManager.init();
        VoiceSystem.init();

        // Set up splash screen
        this.handleSplash();

        // Bind all event listeners
        this.bindEvents();

        // Update profile UI
        ProfileManager.updateProfileUI();
    },

    handleSplash() {
        const splash = document.getElementById('splashScreen');
        const mainApp = document.getElementById('mainApp');

        setTimeout(() => {
            splash.classList.add('fade-out');
            mainApp.classList.remove('hidden');
            
            setTimeout(() => {
                splash.style.display = 'none';
            }, 800);
        }, 3000);
    },

    bindEvents() {
        // Start chat button
        document.getElementById('startChat')?.addEventListener('click', () => {
            this.showScreen('chatScreen');
            this.sendInitialMessage();
        });

        // Send message
        document.getElementById('btnSend')?.addEventListener('click', () => this.sendUserMessage());

        // Enter key to send
        document.getElementById('messageInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendUserMessage();
            }
        });

        // Auto-resize textarea
        document.getElementById('messageInput')?.addEventListener('input', (e) => {
            Utils.autoResize(e.target);
        });

        // Mic button (speech-to-text for chat)
        document.getElementById('btnMic')?.addEventListener('click', () => this.toggleChatMic());

        // Attach/extras toggle
        document.getElementById('btnAttach')?.addEventListener('click', () => {
            document.getElementById('inputExtras')?.classList.toggle('hidden');
        });

        // Voice call buttons
        document.getElementById('btnVoiceCall')?.addEventListener('click', () => VoiceSystem.startCall());
        
        // Call controls
        document.getElementById('btnEndCall')?.addEventListener('click', () => VoiceSystem.endCall());
        document.getElementById('btnMuteCall')?.addEventListener('click', () => VoiceSystem.toggleMute());
        document.getElementById('btnSpeaker')?.addEventListener('click', () => {
            // Speaker is always on for web - visual toggle only
            const btn = document.getElementById('btnSpeaker');
            btn.classList.toggle('muted');
        });

        // Hospital finder
        document.getElementById('btnHospitals')?.addEventListener('click', () => this.openHospitalFinder());
        document.getElementById('btnFindHospital')?.addEventListener('click', () => this.openHospitalFinder());
        document.getElementById('btnBackFromHospital')?.addEventListener('click', () => this.showScreen('chatScreen'));
        document.getElementById('btnLocateMe')?.addEventListener('click', () => this.locateAndFindHospitals());

        // Hospital filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                LocationFinder.renderHospitals(e.target.dataset.filter);
            });
        });

        // Hospital search
        document.getElementById('hospitalSearch')?.addEventListener('input', Utils.debounce((e) => {
            if (e.target.value.trim()) {
                LocationFinder.searchHospitals(e.target.value.trim());
            } else {
                LocationFinder.renderHospitals('all');
            }
        }, 300));

        // Profile
        document.getElementById('btnProfile')?.addEventListener('click', () => {
            document.getElementById('profilePanel')?.classList.add('open');
        });
        document.getElementById('btnCloseProfile')?.addEventListener('click', () => {
            document.getElementById('profilePanel')?.classList.remove('open');
        });
        document.getElementById('profileOverlay')?.addEventListener('click', () => {
            document.getElementById('profilePanel')?.classList.remove('open');
        });
        document.getElementById('btnClearData')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all your data? This cannot be undone.')) {
                ProfileManager.clearAll();
                ChatEngine.clearHistory();
                document.getElementById('chatMessages').innerHTML = '';
                document.getElementById('profilePanel')?.classList.remove('open');
                this.showScreen('welcomeScreen');
            }
        });

        // Emergency SOS
        document.getElementById('btnEmergency')?.addEventListener('click', () => {
            document.getElementById('crisisModal')?.classList.remove('hidden');
        });

        // Crisis modal buttons
        document.getElementById('btnCrisisChat')?.addEventListener('click', () => {
            document.getElementById('crisisModal')?.classList.add('hidden');
        });
        document.getElementById('btnCrisisHospital')?.addEventListener('click', () => {
            document.getElementById('crisisModal')?.classList.add('hidden');
            this.openHospitalFinder();
        });

        // Breathing exercise
        document.getElementById('btnBreathing')?.addEventListener('click', () => {
            document.getElementById('breathingModal')?.classList.remove('hidden');
            document.getElementById('inputExtras')?.classList.add('hidden');
        });
        document.getElementById('btnCloseBreathing')?.addEventListener('click', () => {
            document.getElementById('breathingModal')?.classList.add('hidden');
            this.stopBreathing();
        });
        document.getElementById('btnStartBreathing')?.addEventListener('click', () => this.startBreathing());

        // Mood buttons
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mood = e.target.dataset.mood;
                ProfileManager.addMood(mood);
                document.getElementById('moodSelector')?.classList.add('hidden');
                
                const moodMessages = {
                    happy: "I'm glad to hear you're feeling good! 😊",
                    neutral: "Thanks for checking in. I'm here if you want to talk about anything.",
                    sad: "I'm sorry you're feeling sad. Would you like to talk about what's going on? 💙",
                    anxious: "Anxiety can be really tough. I'm right here with you. Want to try a breathing exercise or talk it out?",
                    angry: "It's okay to feel angry. Your emotions are valid. Want to talk about what's bothering you?",
                    overwhelmed: "Being overwhelmed is exhausting. Let's take this one step at a time. I'm here. 💙"
                };

                this.addUserMessage(`I'm feeling ${mood}`);
                setTimeout(() => {
                    this.sendToAI(`I'm feeling ${mood} right now`);
                }, 300);
            });
        });

        // Journal button
        document.getElementById('btnJournal')?.addEventListener('click', () => {
            document.getElementById('inputExtras')?.classList.add('hidden');
            this.addBotMessage("📝 Let's do a quick journal entry. Just write whatever comes to mind — no judgment, no structure needed. This is your safe space to let it all out. What's on your heart right now?");
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                overlay.closest('.modal')?.classList.add('hidden');
            });
        });

        // Welcome screen feature cards
        document.querySelectorAll('.feature-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                switch(index) {
                    case 0: // Chat
                        this.showScreen('chatScreen');
                        this.sendInitialMessage();
                        break;
                    case 1: // Voice Call
                        VoiceSystem.startCall();
                        break;
                    case 2: // Find Help
                        this.openHospitalFinder();
                        break;
                    case 3: // Crisis
                        document.getElementById('crisisModal')?.classList.remove('hidden');
                        break;
                }
            });
        });
    },

    // Screen management
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId)?.classList.add('active');
        this.currentScreen = screenId;
    },

    // Send initial AI greeting
    async sendInitialMessage() {
        const messages = document.getElementById('chatMessages');
        if (messages.children.length > 0) return; // Already has messages

        const name = ProfileManager.profile.name;
        let greeting;
        
        if (name) {
            greeting = `Hey ${name}! 💙 Welcome back. I've been thinking about you. How are you doing today?`;
        } else {
            greeting = `Hey there! 💙 Welcome to MindBridge. I'm really glad you're here. This is a safe space — no judgment, just genuine care. How are you doing today? And hey, what should I call you?`;
        }

        this.addBotMessage(greeting);
    },

    // Send user message
    async sendUserMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        if (!message || ChatEngine.isProcessing) return;

        input.value = '';
        Utils.autoResize(input);
        document.getElementById('inputExtras')?.classList.add('hidden');

        this.addUserMessage(message);
        await this.sendToAI(message);
    },

    // Send to AI and handle response
    async sendToAI(message) {
        this.showTyping(true);

        const result = await ChatEngine.sendMessage(message);

        this.showTyping(false);

        if (result) {
            // Check for crisis
            if (result.crisis && result.crisis.shouldAlert) {
                document.getElementById('crisisModal')?.classList.remove('hidden');
            }

            this.addBotMessage(result.text);
            Utils.playSound('message');

            // Show mood selector occasionally
            if (ProfileManager.messageCount % 8 === 0 && ProfileManager.messageCount > 0) {
                setTimeout(() => {
                    document.getElementById('moodSelector')?.classList.remove('hidden');
                }, 1000);
            }
        }
    },

    // Add messages to chat
    addUserMessage(text) {
        const container = document.getElementById('chatMessages');
        const msg = document.createElement('div');
        msg.className = 'message user';
        msg.innerHTML = `
            <div class="message-avatar"><i class="fas fa-user"></i></div>
            <div class="message-bubble">
                ${Utils.formatMessage(text)}
                <span class="message-time">${Utils.formatTime()}</span>
            </div>
        `;
        container.appendChild(msg);
        Utils.scrollToBottom(container.parentElement);
    },

    addBotMessage(text) {
        const container = document.getElementById('chatMessages');
        const msg = document.createElement('div');
        msg.className = 'message bot';
        msg.innerHTML = `
            <div class="message-avatar"><i class="fas fa-brain"></i></div>
            <div class="message-bubble">
                ${Utils.formatMessage(text)}
                <span class="message-time">${Utils.formatTime()}</span>
            </div>
        `;
        container.appendChild(msg);
        Utils.scrollToBottom(container.parentElement);
    },

    // Typing indicator
    showTyping(show) {
        const indicator = document.getElementById('typingIndicator');
        if (show) {
            indicator?.classList.remove('hidden');
            Utils.scrollToBottom(document.querySelector('.chat-container'));
        } else {
            indicator?.classList.add('hidden');
        }
    },

    // Chat microphone (speech to text)
    chatRecognition: null,
    isChatMicActive: false,

    toggleChatMic() {
        if (this.isChatMicActive) {
            this.stopChatMic();
        } else {
            this.startChatMic();
        }
    },

    startChatMic() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.addBotMessage("I'm sorry, your browser doesn't support voice input. Try using Chrome for the best experience! 💙");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.chatRecognition = new SpeechRecognition();
        this.chatRecognition.continuous = false;
        this.chatRecognition.interimResults = true;
        this.chatRecognition.lang = 'en-US';

        const input = document.getElementById('messageInput');
        const micBtn = document.getElementById('btnMic');

        this.chatRecognition.onstart = () => {
            this.isChatMicActive = true;
            micBtn.classList.add('listening');
            input.placeholder = '🎤 Listening... speak now';
        };

        this.chatRecognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            input.value = finalTranscript || interimTranscript;
            Utils.autoResize(input);
        };

        this.chatRecognition.onend = () => {
            this.isChatMicActive = false;
            micBtn.classList.remove('listening');
            input.placeholder = 'Type your message... I\'m here to listen 💙';

            // Auto-send if we got a final result
            if (input.value.trim()) {
                this.sendUserMessage();
            }
        };

        this.chatRecognition.onerror = (event) => {
            this.isChatMicActive = false;
            micBtn.classList.remove('listening');
            input.placeholder = 'Type your message... I\'m here to listen 💙';
        };

        this.chatRecognition.start();
    },

    stopChatMic() {
        if (this.chatRecognition) {
            this.chatRecognition.stop();
        }
        this.isChatMicActive = false;
        document.getElementById('btnMic')?.classList.remove('listening');
    },

    // Hospital finder
    async openHospitalFinder() {
        this.showScreen('hospitalScreen');
        document.getElementById('inputExtras')?.classList.add('hidden');
    },

    async locateAndFindHospitals() {
        const btn = document.getElementById('btnLocateMe');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Locating...</span>';
        btn.disabled = true;

        try {
            const location = await LocationFinder.getUserLocation();
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Finding hospitals...</span>';
            
            await LocationFinder.findNearbyHospitals(location.lat, location.lng);
            LocationFinder.renderMap(location.lat, location.lng);
            LocationFinder.renderHospitals('all');

            btn.innerHTML = '<i class="fas fa-check"></i> <span>Located!</span>';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Location error:', error);
            btn.innerHTML = originalText;
            btn.disabled = false;

            const list = document.getElementById('hospitalList');
            list.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--text-muted);">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--warning);margin-bottom:1rem;display:block;"></i>
                    <p>Couldn't access your location.</p>
                    <p style="font-size:0.85rem;margin-top:0.5rem;">Please enable location permissions in your browser and try again.</p>
                </div>
            `;
        }
    },

    // Breathing exercise
    breathingInterval: null,
    breathingCycle: 0,

    startBreathing() {
        const circle = document.getElementById('breathingCircle');
        const text = document.getElementById('breathText');
        const instruction = document.getElementById('breathingInstruction');
        const btn = document.getElementById('btnStartBreathing');
        
        btn.style.display = 'none';
        this.breathingCycle = 0;

        const phases = [
            { text: 'Breathe In', class: 'inhale', instruction: 'Breathe in slowly through your nose...', duration: 4000 },
            { text: 'Hold', class: 'inhale', instruction: 'Hold it gently...', duration: 4000 },
            { text: 'Breathe Out', class: 'exhale', instruction: 'Slowly release through your mouth...', duration: 6000 },
            { text: 'Rest', class: '', instruction: 'Rest for a moment...', duration: 2000 }
        ];

        let phaseIndex = 0;
        const maxCycles = 4;

        const runPhase = () => {
            if (this.breathingCycle >= maxCycles * phases.length) {
                this.stopBreathing();
                return;
            }

            const phase = phases[phaseIndex];
            text.textContent = phase.text;
            instruction.textContent = phase.instruction;
            
            circle.className = 'breathing-circle ' + phase.class;

            phaseIndex = (phaseIndex + 1) % phases.length;
            this.breathingCycle++;

            this.breathingInterval = setTimeout(runPhase, phase.duration);
        };

        instruction.textContent = 'Let\'s begin. Get comfortable...';
        setTimeout(runPhase, 2000);
    },

    stopBreathing() {
        clearTimeout(this.breathingInterval);
        const text = document.getElementById('breathText');
        const instruction = document.getElementById('breathingInstruction');
        const btn = document.getElementById('btnStartBreathing');
        const circle = document.getElementById('breathingCircle');

        if (text) text.textContent = '✨';
        if (instruction) instruction.textContent = 'Great job! Take a moment to notice how you feel.';
        if (circle) circle.className = 'breathing-circle';
        if (btn) {
            btn.style.display = '';
            btn.textContent = 'Do It Again';
        }
    }
};

// ============================================
// INITIALIZE APP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
