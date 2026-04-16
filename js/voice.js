// ============================================
// MINDBRIDGE AI - Voice Call System
// Uses Web Speech API + Gemini AI for real conversation
// ============================================

const VoiceSystem = {
    isCallActive: false,
    isMuted: false,
    isSpeaking: false,
    recognition: null,
    synthesis: window.speechSynthesis,
    callStartTime: null,
    callTimerInterval: null,
    selectedVoice: null,
    voiceQueue: [],
    isListeningForSpeech: false,

    init() {
        // Find the best voice
        this.loadVoices();
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
    },

    loadVoices() {
        const voices = this.synthesis.getVoices();
        // Prefer a natural female voice
        const preferred = [
            'Google UK English Female',
            'Samantha',
            'Karen',
            'Microsoft Zira',
            'Google US English',
            'Moira',
            'Fiona',
            'Victoria',
            'Tessa'
        ];

        for (const name of preferred) {
            const v = voices.find(voice => voice.name.includes(name));
            if (v) {
                this.selectedVoice = v;
                break;
            }
        }

        // Fallback: any English female voice
        if (!this.selectedVoice) {
            this.selectedVoice = voices.find(v => 
                v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
            ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        }
    },

    // Start a voice call
    async startCall() {
        if (this.isCallActive) return;

        this.isCallActive = true;
        this.callStartTime = Date.now();

        // Show call screen
        App.showScreen('callScreen');

        const statusEl = document.getElementById('callStatus');
        const timerEl = document.getElementById('callTimer');

        statusEl.textContent = 'Connecting...';
        Utils.playSound('call');

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!this.isCallActive) return; // User might have ended during connection

        statusEl.textContent = 'Connected';
        timerEl.classList.remove('hidden');
        this.startTimer();
        this.startVisualizer();

        // AI greeting
        const greeting = this.getCallGreeting();
        await this.speak(greeting);

        // Start listening
        this.startListening();
    },

    getCallGreeting() {
        const name = ProfileManager.profile.name;
        const hour = new Date().getHours();
        let timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        
        if (name) {
            const greetings = [
                `${timeGreeting}, ${name}! I'm so glad you called. How are you doing right now?`,
                `Hey ${name}! It's really good to hear from you. What's on your mind today?`,
                `${name}, hi! I'm here. Take your time and just talk to me. What's going on?`
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        return `${timeGreeting}! I'm really glad you reached out. I'm here to listen. How are you feeling right now?`;
    },

    // Text to Speech
    speak(text) {
        return new Promise((resolve) => {
            if (!text || !this.isCallActive) {
                resolve();
                return;
            }

            // Stop listening while speaking
            this.stopListening();
            this.isSpeaking = true;
            
            const statusEl = document.getElementById('callStatus');
            statusEl.textContent = 'MindBridge is talking...';

            // Cancel any current speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }
            utterance.rate = 0.92;
            utterance.pitch = 1.05;
            utterance.volume = 1;

            utterance.onstart = () => {
                this.animateVisualizer(true);
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                this.animateVisualizer(false);
                if (this.isCallActive) {
                    statusEl.textContent = 'Listening...';
                    // Resume listening after speaking
                    setTimeout(() => {
                        if (this.isCallActive) this.startListening();
                    }, 500);
                }
                resolve();
            };

            utterance.onerror = () => {
                this.isSpeaking = false;
                this.animateVisualizer(false);
                resolve();
            };

            this.synthesis.speak(utterance);
        });
    },

    // Speech Recognition
    startListening() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }

        if (this.isListeningForSpeech || this.isSpeaking) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListeningForSpeech = true;
            const statusEl = document.getElementById('callStatus');
            if (statusEl) statusEl.textContent = 'Listening...';
        };

        this.recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript.trim()) {
                const statusEl = document.getElementById('callStatus');
                statusEl.textContent = 'Thinking...';
                this.isListeningForSpeech = false;

                // Get AI response
                const result = await ChatEngine.sendMessage(transcript);
                if (result && this.isCallActive) {
                    // Check for crisis
                    if (result.crisis && result.crisis.shouldAlert) {
                        await this.speak("I'm really concerned about what you just shared. I care about you deeply. Please, I want you to know that you can call 988 right now for immediate support. I'm staying right here with you.");
                    }
                    await this.speak(result.text);
                }
            }
        };

        this.recognition.onerror = (event) => {
            this.isListeningForSpeech = false;
            if (event.error !== 'no-speech' && event.error !== 'aborted' && this.isCallActive) {
                // Retry
                setTimeout(() => {
                    if (this.isCallActive && !this.isSpeaking) {
                        this.startListening();
                    }
                }, 1000);
            }
        };

        this.recognition.onend = () => {
            this.isListeningForSpeech = false;
            // Auto-restart listening if call is still active
            if (this.isCallActive && !this.isSpeaking) {
                setTimeout(() => {
                    if (this.isCallActive && !this.isSpeaking) {
                        this.startListening();
                    }
                }, 300);
            }
        };

        try {
            this.recognition.start();
        } catch (e) {
            this.isListeningForSpeech = false;
        }
    },

    stopListening() {
        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (e) {}
        }
        this.isListeningForSpeech = false;
    },

    // End call
    endCall() {
        this.isCallActive = false;
        this.isSpeaking = false;
        this.stopListening();
        this.synthesis.cancel();
        
        clearInterval(this.callTimerInterval);
        this.stopVisualizer();

        const statusEl = document.getElementById('callStatus');
        const timerEl = document.getElementById('callTimer');
        statusEl.textContent = 'Call ended';
        
        setTimeout(() => {
            timerEl.classList.add('hidden');
            timerEl.textContent = '00:00';
            statusEl.textContent = 'Connecting...';
            App.showScreen('chatScreen');
            
            // Add a message about the call
            App.addBotMessage("That was a great talk! 💙 I'm always here if you want to chat more or call again. How are you feeling now?");
        }, 1500);
    },

    // Toggle mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('btnMuteCall');
        if (this.isMuted) {
            this.stopListening();
            btn.classList.add('muted');
            btn.querySelector('i').className = 'fas fa-microphone-slash';
        } else {
            btn.classList.remove('muted');
            btn.querySelector('i').className = 'fas fa-microphone';
            if (!this.isSpeaking) this.startListening();
        }
    },

    // Call timer
    startTimer() {
        const timerEl = document.getElementById('callTimer');
        this.callTimerInterval = setInterval(() => {
            if (!this.isCallActive) {
                clearInterval(this.callTimerInterval);
                return;
            }
            const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
        }, 1000);
    },

    // Audio visualizer
    startVisualizer() {
        const bars = document.querySelectorAll('.viz-bar');
        bars.forEach(bar => bar.classList.add('active'));
    },

    stopVisualizer() {
        const bars = document.querySelectorAll('.viz-bar');
        bars.forEach(bar => {
            bar.classList.remove('active');
            bar.style.height = '8px';
        });
    },

    animateVisualizer(active) {
        const bars = document.querySelectorAll('.viz-bar');
        if (active) {
            bars.forEach((bar, i) => {
                bar.style.animation = `vizPulse ${0.3 + Math.random() * 0.4}s ease infinite alternate`;
                bar.style.animationDelay = `${i * 0.05}s`;
            });
        } else {
            bars.forEach(bar => {
                bar.style.animation = 'none';
                bar.style.height = '8px';
            });
        }
    }
};
