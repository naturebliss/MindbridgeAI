// ============================================
// MINDBRIDGE AI - Main Application Controller
// ============================================

const App = {
    currentScreen: 'welcomeScreen',

    init() {
        console.log('MindBridge AI initializing...');
        
        // Initialize modules
        ProfileManager.init();
        VoiceSystem.init();

        // Splash screen
        this.handleSplash();

        // Bind events
        this.bindEvents();

        // Update profile
        ProfileManager.updateProfileUI();

        console.log('MindBridge AI ready!');
    },

    handleSplash() {
        const splash = document.getElementById('splashScreen');
        const mainApp = document.getElementById('mainApp');

        setTimeout(() => {
            if (splash) splash.classList.add('fade-out');
            if (mainApp) mainApp.classList.remove('hidden');
            
            setTimeout(() => {
                if (splash) splash.style.display = 'none';
            }, 800);
        }, 3000);
    },

    bindEvents() {
        // ---- START CHAT ----
        const startBtn = document.getElementById('startChat');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.showScreen('chatScreen');
                this.sendInitialMessage();
            });
        }

        // ---- SEND MESSAGE ----
        const sendBtn = document.getElementById('btnSend');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendUserMessage());
        }

        // ---- ENTER KEY ----
        const input = document.getElementById('messageInput');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendUserMessage();
                }
            });

            input.addEventListener('input', (e) => {
                Utils.autoResize(e.target);
            });
        }

        // ---- MIC BUTTON ----
        const micBtn = document.getElementById('btnMic');
        if (micBtn) {
            micBtn.addEventListener('click', () => this.toggleChatMic());
        }

        // ---- EXTRAS TOGGLE ----
        const attachBtn = document.getElementById('btnAttach');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                const extras = document.getElementById('inputExtras');
                if (extras) extras.classList.toggle('hidden');
            });
        }

        // ---- VOICE CALL ----
        const voiceCallBtn = document.getElementById('btnVoiceCall');
        if (voiceCallBtn) {
            voiceCallBtn.addEventListener('click', () => {
                const extras = document.getElementById('inputExtras');
                if (extras) extras.classList.add('hidden');
                VoiceSystem.startCall();
            });
        }

        // ---- CALL CONTROLS ----
        const endCallBtn = document.getElementById('btnEndCall');
        if (endCallBtn) endCallBtn.addEventListener('click', () => VoiceSystem.endCall());

        const muteCallBtn = document.getElementById('btnMuteCall');
        if (muteCallBtn) muteCallBtn.addEventListener('click', () => VoiceSystem.toggleMute());

        const speakerBtn = document.getElementById('btnSpeaker');
        if (speakerBtn) {
            speakerBtn.addEventListener('click', () => {
                speakerBtn.classList.toggle('muted');
            });
        }

        // ---- HOSPITAL FINDER ----
        const hospitalNavBtn = document.getElementById('btnHospitals');
        if (hospitalNavBtn) hospitalNavBtn.addEventListener('click', () => this.openHospitalFinder());

        const findHospitalBtn = document.getElementById('btnFindHospital');
        if (findHospitalBtn) {
            findHospitalBtn.addEventListener('click', () => {
                const extras = document.getElementById('inputExtras');
                if (extras) extras.classList.add('hidden');
                this.openHospitalFinder();
            });
        }

        const backFromHospital = document.getElementById('btnBackFromHospital');
        if (backFromHospital) backFromHospital.addEventListener('click', () => this.showScreen('chatScreen'));

        const locateBtn = document.getElementById('btnLocateMe');
        if (locateBtn) locateBtn.addEventListener('click', () => this.locateAndFindHospitals());

        // Hospital filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                LocationFinder.renderHospitals(e.target.dataset.filter);
            });
        });

        // Hospital search
        const hospitalSearch = document.getElementById('hospitalSearch');
        if (hospitalSearch) {
            hospitalSearch.addEventListener('input', Utils.debounce((e) => {
                if (e.target.value.trim()) {
                    LocationFinder.searchHospitals(e.target.value.trim());
                } else {
                    LocationFinder.renderHospitals('all');
                }
            }, 300));
        }

        // ---- PROFILE ----
        const profileBtn = document.getElementById('btnProfile');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                const panel = document.getElementById('profilePanel');
                if (panel) panel.classList.add('open');
                ProfileManager.updateProfileUI();
            });
        }

        const closeProfileBtn = document.getElementById('btnCloseProfile');
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', () => {
                const panel = document.getElementById('profilePanel');
                if (panel) panel.classList.remove('open');
            });
        }

        const profileOverlay = document.getElementById('profileOverlay');
        if (profileOverlay) {
            profileOverlay.addEventListener('click', () => {
                const panel = document.getElementById('profilePanel');
                if (panel) panel.classList.remove('open');
            });
        }

        const clearDataBtn = document.getElementById('btnClearData');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                if (confirm('Clear all data? This cannot be undone.')) {
                    ProfileManager.clearAll();
                    ChatEngine.clearHistory();
                    const msgs = document.getElementById('chatMessages');
                    if (msgs) msgs.innerHTML = '';
                    const panel = document.getElementById('profilePanel');
                    if (panel) panel.classList.remove('open');
                    this.showScreen('welcomeScreen');
                }
            });
        }

        // ---- EMERGENCY ----
        const emergencyBtn = document.getElementById('btnEmergency');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', () => {
                const modal = document.getElementById('crisisModal');
                if (modal) modal.classList.remove('hidden');
            });
        }

        // Crisis modal
        const crisisChatBtn = document.getElementById('btnCrisisChat');
        if (crisisChatBtn) {
            crisisChatBtn.addEventListener('click', () => {
                const modal = document.getElementById('crisisModal');
                if (modal) modal.classList.add('hidden');
            });
        }

        const crisisHospitalBtn = document.getElementById('btnCrisisHospital');
        if (crisisHospitalBtn) {
            crisisHospitalBtn.addEventListener('click', () => {
                const modal = document.getElementById('crisisModal');
                if (modal) modal.classList.add('hidden');
                this.openHospitalFinder();
            });
        }

        // ---- BREATHING ----
        const breathingBtn = document.getElementById('btnBreathing');
        if (breathingBtn) {
            breathingBtn.addEventListener('click', () => {
                const modal = document.getElementById('breathingModal');
                const extras = document.getElementById('inputExtras');
                if (modal) modal.classList.remove('hidden');
                if (extras) extras.classList.add('hidden');
            });
        }

        const closeBreathingBtn = document.getElementById('btnCloseBreathing');
        if (closeBreathingBtn) {
            closeBreathingBtn.addEventListener('click', () => {
                const modal = document.getElementById('breathingModal');
                if (modal) modal.classList.add('hidden');
                this.stopBreathing();
            });
        }

        const startBreathingBtn = document.getElementById('btnStartBreathing');
        if (startBreathingBtn) {
            startBreathingBtn.addEventListener('click', () => this.startBreathing());
        }

        // ---- MOOD BUTTONS ----
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mood = e.target.dataset.mood;
                ProfileManager.addMood(mood);
                const selector = document.getElementById('moodSelector');
                if (selector) selector.classList.add('hidden');
                
                this.addUserMessage(`I'm feeling ${mood}`);
                setTimeout(() => {
                    this.sendToAI(`I'm feeling ${mood} right now`);
                }, 300);
            });
        });

        // ---- JOURNAL ----
        const journalBtn = document.getElementById('btnJournal');
        if (journalBtn) {
            journalBtn.addEventListener('click', () => {
                const extras = document.getElementById('inputExtras');
                if (extras) extras.classList.add('hidden');
                this.addBotMessage("📝 Let's do a quick journal entry. Just write whatever comes to mind — no judgment, no structure needed. What's on your heart right now?");
            });
        }

        // ---- MODAL OVERLAYS ----
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                const modal = overlay.closest('.modal');
                if (modal) modal.classList.add('hidden');
            });
        });

        // ---- FEATURE CARDS ----
        document.querySelectorAll('.feature-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                switch(index) {
                    case 0:
                        this.showScreen('chatScreen');
                        this.sendInitialMessage();
                        break;
                    case 1:
                        VoiceSystem.startCall();
                        break;
                    case 2:
                        this.openHospitalFinder();
                        break;
                    case 3:
                        const modal = document.getElementById('crisisModal');
                        if (modal) modal.classList.remove('hidden');
                        break;
                }
            });
        });
    },

    // ---- SCREEN MANAGEMENT ----
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
        this.currentScreen = screenId;
    },

    // ---- INITIAL MESSAGE ----
    sendInitialMessage() {
        const messages = document.getElementById('chatMessages');
        if (!messages || messages.children.length > 0) return;

        const name = ProfileManager.profile.name;
        let greeting;
        
        if (name) {
            greeting = `Hey ${name}! 💙 Welcome back. I've been thinking about you. How are you doing today?`;
        } else {
            greeting = `Hey there! 💙 Welcome to MindBridge. I'm really glad you're here. This is a safe space — no judgment, just genuine care. How are you doing today?`;
        }

        this.addBotMessage(greeting);
    },

    // ---- SEND USER MESSAGE ----
    async sendUserMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message || ChatEngine.isProcessing) return;

        input.value = '';
        Utils.autoResize(input);
        
        const extras = document.getElementById('inputExtras');
        if (extras) extras.classList.add('hidden');

        this.addUserMessage(message);
        await this.sendToAI(message);
    },

    // ---- SEND TO AI ----
    async sendToAI(message) {
        this.showTyping(true);

        const result = await ChatEngine.sendMessage(message);

        this.showTyping(false);

        if (result) {
            if (result.crisis && result.crisis.shouldAlert) {
                const modal = document.getElementById('crisisModal');
                if (modal) modal.classList.remove('hidden');
            }

            this.addBotMessage(result.text);
            Utils.playSound('message');

            // Show mood selector every 8 messages
            if (ProfileManager.messageCount > 0 && ProfileManager.messageCount % 8 === 0) {
                setTimeout(() => {
                    const selector = document.getElementById('moodSelector');
                    if (selector) selector.classList.remove('hidden');
                }, 1000);
            }
        }
    },

    // ---- ADD MESSAGES ----
    addUserMessage(text) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

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
        if (!container) return;

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

    // ---- TYPING INDICATOR ----
    showTyping(show) {
        const indicator = document.getElementById('typingIndicator');
        if (!indicator) return;
        
        if (show) {
            indicator.classList.remove('hidden');
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) Utils.scrollToBottom(chatContainer);
        } else {
            indicator.classList.add('hidden');
        }
    },

    // ---- CHAT MIC ----
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
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.addBotMessage("Sorry, your browser doesn't support voice input. Please use Google Chrome for the best experience! 💙");
            return;
        }

        this.chatRecognition = new SpeechRecognition();
        this.chatRecognition.continuous = false;
        this.chatRecognition.interimResults = true;
        this.chatRecognition.lang = 'en-US';

        const input = document.getElementById('messageInput');
        const micBtn = document.getElementById('btnMic');

        this.chatRecognition.onstart = () => {
            this.isChatMicActive = true;
            if (micBtn) micBtn.classList.add('listening');
            if (input) input.placeholder = '🎤 Listening... speak now';
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

            if (input) {
                input.value = finalTranscript || interimTranscript;
                Utils.autoResize(input);
            }
        };

        this.chatRecognition.onend = () => {
            this.isChatMicActive = false;
            if (micBtn) micBtn.classList.remove('listening');
            if (input) input.placeholder = "Type your message... I'm here to listen 💙";

            if (input && input.value.trim()) {
                this.sendUserMessage();
            }
        };

        this.chatRecognition.onerror = () => {
            this.isChatMicActive = false;
            if (micBtn) micBtn.classList.remove('listening');
            if (input) input.placeholder = "Type your message... I'm here to listen 💙";
        };

        try {
            this.chatRecognition.start();
        } catch (e) {
            console.error('Mic start error:', e);
        }
    },

    stopChatMic() {
        if (this.chatRecognition) {
            try { this.chatRecognition.stop(); } catch (e) {}
        }
        this.isChatMicActive = false;
        const micBtn = document.getElementById('btnMic');
        if (micBtn) micBtn.classList.remove('listening');
    },

    // ---- HOSPITAL FINDER ----
    openHospitalFinder() {
        this.showScreen('hospitalScreen');
    },

    async locateAndFindHospitals() {
        const btn = document.getElementById('btnLocateMe');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
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
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Location error:', error);
            btn.innerHTML = originalHTML;
            btn.disabled = false;

            const list = document.getElementById('hospitalList');
            if (list) {
                list.innerHTML = `
                    <div style="text-align:center;padding:2rem;color:var(--text-muted);">
                        <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--warning);margin-bottom:1rem;display:block;"></i>
                        <p>Couldn't access your location.</p>
                        <p style="font-size:0.85rem;margin-top:0.5rem;">Please enable location permissions and try again.</p>
                    </div>
                `;
            }
        }
    },

    // ---- BREATHING EXERCISE ----
    breathingInterval: null,

    startBreathing() {
        const circle = document.getElementById('breathingCircle');
        const text = document.getElementById('breathText');
        const instruction = document.getElementById('breathingInstruction');
        const btn = document.getElementById('btnStartBreathing');
        
        if (btn) btn.style.display = 'none';

        const phases = [
            { text: 'Breathe In', cls: 'inhale', instruction: 'Breathe in slowly through your nose...', duration: 4000 },
            { text: 'Hold', cls: 'inhale', instruction: 'Hold it gently...', duration: 4000 },
            { text: 'Breathe Out', cls: 'exhale', instruction: 'Slowly release through your mouth...', duration: 6000 },
            { text: 'Rest', cls: '', instruction: 'Rest for a moment...', duration: 2000 }
        ];

        let phaseIndex = 0;
        let totalPhases = 0;
        const maxPhases = 16; // 4 complete cycles

        const runPhase = () => {
            if (totalPhases >= maxPhases) {
                this.stopBreathing();
                return;
            }

            const phase = phases[phaseIndex];
            if (text) text.textContent = phase.text;
            if (instruction) instruction.textContent = phase.instruction;
            if (circle) circle.className = 'breathing-circle ' + phase.cls;

            phaseIndex = (phaseIndex + 1) % phases.length;
            totalPhases++;

            this.breathingInterval = setTimeout(runPhase, phase.duration);
        };

        if (instruction) instruction.textContent = 'Get comfortable... we begin in a moment.';
        setTimeout(runPhase, 2000);
    },

    stopBreathing() {
        if (this.breathingInterval) clearTimeout(this.breathingInterval);
        
        const text = document.getElementById('breathText');
        const instruction = document.getElementById('breathingInstruction');
        const btn = document.getElementById('btnStartBreathing');
        const circle = document.getElementById('breathingCircle');

        if (text) text.textContent = '✨';
        if (instruction) instruction.textContent = 'Great job! Notice how you feel right now.';
        if (circle) circle.className = 'breathing-circle';
        if (btn) {
            btn.style.display = '';
            btn.textContent = 'Do It Again';
        }
    }
};

// ============================================
// START THE APP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
