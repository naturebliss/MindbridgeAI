var VoiceSystem = {
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
    chromeFix: null,

    init: function() {
        var self = this;
        self.loadVoices();
        if (self.synthesis.onvoiceschanged !== undefined) {
            self.synthesis.onvoiceschanged = function() { self.loadVoices(); };
        }
        setTimeout(function() { self.loadVoices(); }, 500);
        setTimeout(function() { self.loadVoices(); }, 1500);
    },

    loadVoices: function() {
        var voices = this.synthesis.getVoices();
        if (voices.length === 0) return;
        console.log('Voices loaded:', voices.length);

        var preferred = [
            'Google UK English Female',
            'Google US English',
            'Samantha',
            'Karen',
            'Moira',
            'Fiona',
            'Microsoft Zira',
            'Victoria',
            'Tessa'
        ];

        for (var p = 0; p < preferred.length; p++) {
            for (var v = 0; v < voices.length; v++) {
                if (voices[v].name.indexOf(preferred[p]) !== -1) {
                    this.selectedVoice = voices[v];
                    console.log('Selected voice:', voices[v].name);
                    return;
                }
            }
        }

        for (var i = 0; i < voices.length; i++) {
            if (voices[i].lang.indexOf('en') === 0) {
                this.selectedVoice = voices[i];
                console.log('Fallback voice:', voices[i].name);
                return;
            }
        }

        this.selectedVoice = voices[0];
    },

    startCall: async function() {
        if (this.isCallActive) return;

        try {
            var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(function(track) { track.stop(); });
        } catch (err) {
            alert('Please allow microphone access to use voice call.');
            return;
        }

        this.isCallActive = true;
        this.callStartTime = Date.now();
        this.retryCount = 0;

        App.showScreen('callScreen');

        var statusEl = document.getElementById('callStatus');
        var timerEl = document.getElementById('callTimer');

        if (statusEl) statusEl.textContent = 'Connecting...';
        Utils.playSound('call');

        var self = this;
        await new Promise(function(resolve) { setTimeout(resolve, 2000); });

        if (!self.isCallActive) return;

        if (statusEl) statusEl.textContent = 'Connected';
        if (timerEl) timerEl.classList.remove('hidden');
        self.startTimer();
        self.startVisualizer();

        var greeting = self.getCallGreeting();
        await self.speak(greeting);

        if (self.isCallActive) {
            self.startListening();
        }
    },

    getCallGreeting: function() {
        var name = ProfileManager.profile.name;
        var hour = new Date().getHours();
        var timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        
        if (name) {
            var greetings = [
                timeGreeting + ', ' + name + '! I am so glad you called. How are you doing right now?',
                'Hey ' + name + '! It is really good to hear from you. What is on your mind today?',
                name + ', hi! I am here for you. Take your time and just talk to me.'
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        return timeGreeting + '! I am really glad you reached out. I am here to listen. How are you feeling right now?';
    },

    speak: function(text) {
        var self = this;
        return new Promise(function(resolve) {
            if (!text || !self.isCallActive) {
                resolve();
                return;
            }

            self.stopListening();
            self.isSpeaking = true;
            
            var statusEl = document.getElementById('callStatus');
            if (statusEl) statusEl.textContent = 'MindBridge is talking...';

            self.synthesis.cancel();

            if (!self.selectedVoice) {
                self.loadVoices();
            }

            var utterance = new SpeechSynthesisUtterance(text);
            
            if (self.selectedVoice) {
                utterance.voice = self.selectedVoice;
            }
            utterance.rate = 0.92;
            utterance.pitch = 1.05;
            utterance.volume = 1.0;

            utterance.onstart = function() {
                console.log('Speaking started');
                self.animateVisualizer(true);
            };

            utterance.onend = function() {
                console.log('Speaking ended');
                self.isSpeaking = false;
                self.animateVisualizer(false);
                
                if (self.isCallActive && !self.isMuted) {
                    if (statusEl) statusEl.textContent = 'Listening...';
                    setTimeout(function() {
                        if (self.isCallActive && !self.isSpeaking && !self.isMuted) {
                            self.startListening();
                        }
                    }, 600);
                }
                resolve();
            };

            utterance.onerror = function(event) {
                console.error('Speech error:', event.error);
                self.isSpeaking = false;
                self.animateVisualizer(false);
                resolve();
            };

            // Chrome bug fix
            if (self.chromeFix) clearInterval(self.chromeFix);
            self.chromeFix = setInterval(function() {
                if (self.synthesis.speaking) {
                    self.synthesis.pause();
                    self.synthesis.resume();
                } else {
                    clearInterval(self.chromeFix);
                }
            }, 10000);

            self.synthesis.speak(utterance);
        });
    },

    startListening: function() {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            return;
        }

        if (this.isListeningForSpeech || this.isSpeaking || !this.isCallActive || this.isMuted) {
            return;
        }

        var self = this;
        console.log('Starting listening...');

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = function() {
            self.isListeningForSpeech = true;
            self.retryCount = 0;
            var statusEl = document.getElementById('callStatus');
            if (statusEl) statusEl.textContent = 'Listening... speak now';
            console.log('Listening active');
        };

        this.recognition.onresult = async function(event) {
            var transcript = event.results[0][0].transcript.trim();
            console.log('Heard:', transcript);
            
            if (transcript) {
                self.isListeningForSpeech = false;
                
                var statusEl = document.getElementById('callStatus');
                if (statusEl) statusEl.textContent = 'Thinking...';

                // Add to chat record
                App.addUserMessage(transcript);

                var result = await ChatEngine.sendMessage(transcript);
                
                if (result && self.isCallActive) {
                    App.addBotMessage(result.text);

                    if (result.crisis && result.crisis.shouldAlert) {
                        await self.speak('I am really concerned about what you just shared. I care about you deeply. Please know you can call 988 right now for immediate support. I am staying right here with you.');
                    } else {
                        await self.speak(result.text);
                    }
                }
            }
        };

        this.recognition.onerror = function(event) {
            console.log('Recognition error:', event.error);
            self.isListeningForSpeech = false;

            if (event.error === 'no-speech') {
                if (self.isCallActive && !self.isSpeaking && !self.isMuted) {
                    setTimeout(function() { self.startListening(); }, 500);
                }
            } else if (event.error === 'aborted') {
                // do nothing
            } else {
                self.retryCount++;
                if (self.retryCount < 3 && self.isCallActive && !self.isSpeaking) {
                    setTimeout(function() { self.startListening(); }, 1000);
                }
            }
        };

        this.recognition.onend = function() {
            console.log('Recognition ended');
            self.isListeningForSpeech = false;

            if (self.isCallActive && !self.isSpeaking && !self.isMuted) {
                setTimeout(function() {
                    if (self.isCallActive && !self.isSpeaking && !self.isMuted) {
                        self.startListening();
                    }
                }, 300);
            }
        };

        try {
            this.recognition.start();
        } catch (e) {
            console.error('Recognition start failed:', e);
            this.isListeningForSpeech = false;
            if (this.isCallActive && !this.isSpeaking) {
                var s = this;
                setTimeout(function() { s.startListening(); }, 1000);
            }
        }
    },

    stopListening: function() {
        this.isListeningForSpeech = false;
        if (this.recognition) {
            try { this.recognition.abort(); } catch (e) {}
            this.recognition = null;
        }
    },

    endCall: function() {
        console.log('Ending call');
        this.isCallActive = false;
        this.isSpeaking = false;
        this.isMuted = false;
        
        this.stopListening();
        this.synthesis.cancel();
        
        if (this.chromeFix) clearInterval(this.chromeFix);
        if (this.callTimerInterval) clearInterval(this.callTimerInterval);
        this.stopVisualizer();

        var statusEl = document.getElementById('callStatus');
        var timerEl = document.getElementById('callTimer');
        var muteBtn = document.getElementById('btnMuteCall');
        
        if (statusEl) statusEl.textContent = 'Call ended';
        if (muteBtn) {
            muteBtn.classList.remove('muted');
            var icon = muteBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-microphone';
        }
        
        setTimeout(function() {
            if (timerEl) {
                timerEl.classList.add('hidden');
                timerEl.textContent = '00:00';
            }
            if (statusEl) statusEl.textContent = 'Connecting...';
            
            App.showScreen('chatScreen');
            App.addBotMessage("That was a great talk! 💙 I am always here if you want to chat more or call again.");
        }, 1500);
    },

    toggleMute: function() {
        this.isMuted = !this.isMuted;
        var btn = document.getElementById('btnMuteCall');
        var statusEl = document.getElementById('callStatus');
        
        if (this.isMuted) {
            this.stopListening();
            if (btn) {
                btn.classList.add('muted');
                var icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone-slash';
            }
            if (statusEl) statusEl.textContent = 'Muted';
        } else {
            if (btn) {
                btn.classList.remove('muted');
                var icon2 = btn.querySelector('i');
                if (icon2) icon2.className = 'fas fa-microphone';
            }
            if (statusEl) statusEl.textContent = 'Listening...';
            var self = this;
            if (!this.isSpeaking) {
                setTimeout(function() { self.startListening(); }, 300);
            }
        }
    },

    startTimer: function() {
        var timerEl = document.getElementById('callTimer');
        var self = this;
        if (this.callTimerInterval) clearInterval(this.callTimerInterval);
        
        this.callTimerInterval = setInterval(function() {
            if (!self.isCallActive) {
                clearInterval(self.callTimerInterval);
                return;
            }
            var elapsed = Math.floor((Date.now() - self.callStartTime) / 1000);
            var mins = Math.floor(elapsed / 60).toString();
            var secs = (elapsed % 60).toString();
            if (mins.length < 2) mins = '0' + mins;
            if (secs.length < 2) secs = '0' + secs;
            if (timerEl) timerEl.textContent = mins + ':' + secs;
        }, 1000);
    },

    startVisualizer: function() {
        var bars = document.querySelectorAll('.viz-bar');
        for (var i = 0; i < bars.length; i++) {
            bars[i].style.animation = 'vizPulse ' + (0.3 + Math.random() * 0.4) + 's ease infinite alternate';
            bars[i].style.animationDelay = (i * 0.06) + 's';
        }
    },

    stopVisualizer: function() {
        var bars = document.querySelectorAll('.viz-bar');
        for (var i = 0; i < bars.length; i++) {
            bars[i].style.animation = 'none';
            bars[i].style.height = '8px';
        }
    },

    animateVisualizer: function(active) {
        var bars = document.querySelectorAll('.viz-bar');
        for (var i = 0; i < bars.length; i++) {
            if (active) {
                bars[i].style.animation = 'vizPulse ' + (0.2 + Math.random() * 0.3) + 's ease infinite alternate';
                bars[i].style.animationDelay = (i * 0.04) + 's';
            } else {
                bars[i].style.animation = 'vizPulse 1s ease infinite alternate';
            }
        }
    }
};
