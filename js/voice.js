// ============================================
// MINDBRIDGE AI - Voice Call System
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
    isListeningForSpeech: false,
    retryCount: 0,
    MAX_RETRIES: 3,

    init() {
        this.loadVoices();
        // Chrome needs this event
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
        // Also try loading after a short delay
        setTimeout(() => this.loadVoices(), 500);
        setTimeout(() => this.loadVoices(), 1000);
    },

    loadVoices() {
        const voices = this.synthesis.getVoices();
        console.log('Available voices:', voices.length);
        
        if (voices.length === 0) return;

        // Preferred natural sounding voices
        const preferred = [
            'Google UK English Female',
            'Google US English',
            'Samantha',
            'Karen',
            'Moira',
            'Fiona',
            'Tessa',
            'Microsoft Zira',
            'Victoria',
            'Alex'
        ];

        for (const name of preferred) {
            const v = voices.find(voice => voice.name.includes(name));
            if (v) {
                this.selectedVoice = v;
                console.log('Selected voice:', v.name);
                break;
            }
        }

        // Fallback to any English voice
        if (!this.selectedVoice) {
            this.selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
            console.log('Fallback voice:', this.selectedVoice?.name);
        }
    },

    async startCall() {
        if (this.isCallActive) return;

        // Check for microphone permission first
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Release immediately
        } catch (err) {
            alert('Please allow microphone access to use voice call.');
            return;
        }

        this.isCallActive = true;
        this.callStartTime = Date.now();
        this.retryCount = 0;

        // Show call screen
        App.showScreen('callScreen');

        const statusEl = document.getElementById('callStatus');
        const timerEl = document.getElementById('callTimer');

        statusEl.textContent = 'Connecting...';
        Utils.playSound('call');

        // Simulate connection
        await this.delay(2000);

        if (!this.isCallActive) return;

        statusEl.textContent = 'Connected';
        timerEl.classList.remove('hidden');
        this.startTimer();
        this.startVisualizer();

        // AI greeting
        const greeting = this.getCallGreeting();
        await this.speak(greeting);

        // Start listening after greeting
        if (this.isCallActive) {
            this.startListening();
        }
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    getCallGreeting() {
        const name = ProfileManager.profile.name;
        const hour = new Date().getHours();
        let timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        
        if (name) {
            const greetings = [
                `${timeGreeting}, ${name}! I'm so glad you called. How are you doing right now?`,
                `Hey ${name}! It's really good to hear from you. What's on your mind today?`,
                `${name}, hi! I'm here for you. Take your time and just talk to me.`
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        return `${timeGreeting}! I'm really glad you reached out. I'm here to listen. How are you feeling right now?`;
    },

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
            if (statusEl) statusEl.textContent = 'MindBridge is talking...';

            // Cancel any current speech
            this.synthesis.cancel();

            // Make sure voices are loaded
            if (!this.selectedVoice) {
                this.loadVoices();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }
            utterance.rate = 0.92;
            utterance.pitch = 1.05;
            utterance.volume = 1.0;

            utterance.onstart = () => {
                console.log('Speaking started');
                this.animateVisualizer(true);
            };

            utterance.onend = () => {
                console.log('Speaking ended');
                this.isSpeaking = false;
                this.animateVisualizer(false);
                
                if (this.isCallActive && !this.isMuted) {
                    if (statusEl) statusEl.textContent = 'Listening...';
                    // Wait a bit before starting to listen
                    setTimeout(() => {
                        if (this.isCallActive && !this.isSpeaking && !this.isMuted) {
                            this.startListening();
                        }
                    }, 600);
                }
                resolve();
            };

            utterance.onerror = (event) => {
                console.error('Speech error:', event.error);
                this.isSpeaking = false;
                this.animateVisualizer(false);
                resolve();
            };

            // Chrome bug fix - speech synthesis stops after ~15 seconds
            // This keeps it alive
            this.chromeBugFix();

            this.synthesis.speak(utterance);
        });
    },

    // Fix for Chrome cutting off long speech
    chromeBugFix() {
        if (this._chromeFix) clearInterval(this._chromeFix);
        this._chromeFix = setInterval(() => {
            if (this.synthesis.speaking) {
                this.synthesis.pause();
                this.synthesis.resume();
            } else {
                clearInterval(this._chromeFix);
            }
        }, 10000);
    },

    startListening() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            const statusEl = document.getElementById('callStatus');
            if (statusEl) statusEl.textContent = 'Voice not supported - use Chrome';
            return;
        }

        if (this.isListeningForSpeech || this.isSpeaking || !this.isCallActive || this.isMuted) {
            return;
        }

        console.log('Starting speech recognition...');

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListeningForSpeech = true;
            this.retryCount = 0;
            const statusEl = document.getElementById('callStatus');
            if (statusEl) statusEl.textContent = 'Listening... speak now';
            console.log('Listening started');
        };

        this.recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript.trim();
            const confidence = event.results[0][0].confidence;
            
            console.log(`Heard: "${transcript}" (confidence: ${confidence})`);
            
            if (transcript) {
                this.isListeningForSpeech = false;
                
                const statusEl = document.getElementById('callStatus');
                if (statusEl) statusEl.textContent = 'Thinking...';

                // Also add to chat as a record
                if (document.getElementById('chatMessages')) {
                    App.addUserMessage(transcript);
                }

                // Get AI response
                const result = await ChatEngine.sendMessage(transcript);
                
                if (result && this.isCallActive) {
                    // Add bot response to chat too
                    if (document.getElementById('chatMessages')) {
                        App.addBotMessage(result.text);
                    }

                    // Crisis check
                    if (result.crisis && result.crisis.shouldAlert) {
                        await this.speak("I'm really concerned about what you just shared. I care about you so much. Please know you can call 988 right now for immediate support. I'm staying right here with you.");
                    } else {
                        await this.speak(result.text);
                    }
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.log('Recognition error:', event.error);
            this.isListeningForSpeech = false;

            // Handle different errors
            switch (event.error) {
                case 'no-speech':
                    // No speech detected - just retry
                    if (this.isCallActive && !this.isSpeaking && !this.isMuted) {
                        setTimeout(() => this.startListening(), 500);
                    }
                    break;
                case 'audio-capture':
                    const statusEl = document.getElementById('callStatus');
                    if (statusEl) statusEl.textContent = 'Microphone error - check permissions';
                    break;
                case 'not-allowed':
                    if (document.getElementById('callStatus')) {
                        document.getElementById('callStatus').textContent = 'Microphone blocked - allow access';
                    }
                    break;
                case 'aborted':
                    // Intentionally stopped - do nothing
                    break;
                default:
                    // Retry with limit
                    this.retryCount++;
                    if (this.retryCount < this.MAX_RETRIES && this.isCallActive && !this.isSpeaking) {
                        setTimeout(() => this.startListening(), 1000);
                    }
                    break;
            }
        };

        this.recognition.onend = () => {
            console.log('Recognition ended');
            this.isListeningForSpeech = false;

            // Auto-restart if call is active and not speaking
            if (this.isCallActive && !this.isSpeaking && !this.isMuted) {
                setTimeout(() => {
                    if (this.isCallActive && !this.isSpeaking && !this.isMuted) {
                        this.startListening();
                    }
                }, 300);
            }
        };

        try {
            this.recognition.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
            this.isListeningForSpeech = false;
            
            // Retry after delay
            if (this.isCallActive && !this.isSpeaking) {
                setTimeout(() => this.startListening(), 1000);
            }
        }
    },

    stopListening() {
        this.isListeningForSpeech = false;
        if (this.recognition) {
            try {
                this.recognition.abort();
                this.recognition = null;
            } catch (e) {
                // Silent
            }
        }
    },

    endCall() {
        console.log('Ending call...');
        this.isCallActive = false;
        this.isSpeaking = false;
        this.isMuted = false;
        
        this.stopListening();
        this.synthesis.cancel();
        
        if (this._chromeFix) clearInterval(this._chromeFix);
        clearInterval(this.callTimerInterval);
        this.stopVisualizer();

        const statusEl = document.getElementById('callStatus');
        const timerEl = document.getElementById('callTimer');
        const muteBtn = document.getElementById('btnMuteCall');
        
        if (statusEl) statusEl.textContent = 'Call ended';
        if (muteBtn) {
            muteBtn.classList.remove('muted');
            muteBtn.querySelector('i').className = 'fas fa-microphone';
        }
        
        setTimeout(() => {
            if (timerEl) {
                timerEl.classList.add('hidden');
                timerEl.textContent = '00:00';
            }
            if (statusEl) statusEl.textContent = 'Connecting...';
            
            App.showScreen('chatScreen');
            App.addBotMessage("That was a great talk! 💙 I'm always here if you want to chat more or call again. How are you feeling now?");
        }, 1500);
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('btnMuteCall');
        const statusEl = document.getElementById('callStatus');
        
        if (this.isMuted) {
            this.stopListening();
            if (btn) {
                btn.classList.add('muted');
                btn.querySelector('i').className = 'fas fa-microphone-slash';
            }
            if (statusEl) statusEl.textContent = 'Muted';
        } else {
            if (btn) {
                btn.classList.remove('muted');
                btn.querySelector('i').className = 'fas fa-microphone';
            }
            if (statusEl) statusEl.textContent = 'Listening...';
            if (!this.isSpeaking) {
                setTimeout(() => this.startListening(), 300);
            }
        }
    },

    startTimer() {
        const timerEl = document.getElementById('callTimer');
        if (this.callTimerInterval) clearInterval(this.callTimerInterval);
        
        this.callTimerInterval = setInterval(() => {
            if (!this.isCallActive) {
                clearInterval(this.callTimerInterval);
                return;
            }
            const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            if (timerEl) timerEl.textContent = `${mins}:${secs}`;
        }, 1000);
    },

    startVisualizer() {
        const bars = document.querySelectorAll('.viz-bar');
        bars.forEach((bar, i) => {
            bar.style.animation = `vizPulse ${0.3 + Math.random() * 0.4}s ease infinite alternate`;
            bar.style.animationDelay = `${i * 0.06}s`;
        });
    },

    stopVisualizer() {
        const bars = document.querySelectorAll('.viz-bar');
        bars.forEach(bar => {
            bar.style.animation = 'none';
            bar.style.height = '8px';
        });
    },

    animateVisualizer(active) {
        const bars = document.querySelectorAll('.viz-bar');
        if (active) {
            bars.forEach((bar, i) => {
                bar.style.animation = `vizPulse ${0.2 + Math.random() * 0.3}s ease infinite alternate`;
                bar.style.animationDelay = `${i * 0.04}s`;
            });
        } else {
            bars.forEach(bar => {
                bar.style.animation = `vizPulse 1s ease infinite alternate`;
            });
        }
    }
};
