var App = {
    currentScreen: 'welcomeScreen',

    init: function() {
        console.log('MindBridge AI starting...');
        ProfileManager.init();
        VoiceSystem.init();
        this.handleSplash();
        this.bindEvents();
        ProfileManager.updateProfileUI();
        console.log('MindBridge AI ready!');
    },

    handleSplash: function() {
        var splash = document.getElementById('splashScreen');
        var mainApp = document.getElementById('mainApp');

        setTimeout(function() {
            if (splash) splash.classList.add('fade-out');
            if (mainApp) mainApp.classList.remove('hidden');
            setTimeout(function() {
                if (splash) splash.style.display = 'none';
            }, 800);
        }, 3000);
    },

    bindEvents: function() {
        var self = this;

        // Start chat
        var startBtn = document.getElementById('startChat');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                self.showScreen('chatScreen');
                self.sendInitialMessage();
            });
        }

        // Send button
        var sendBtn = document.getElementById('btnSend');
        if (sendBtn) {
            sendBtn.addEventListener('click', function() { self.sendUserMessage(); });
        }

        // Enter key
        var input = document.getElementById('messageInput');
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    self.sendUserMessage();
                }
            });
            input.addEventListener('input', function(e) {
                Utils.autoResize(e.target);
            });
        }

        // Mic button
        var micBtn = document.getElementById('btnMic');
        if (micBtn) {
            micBtn.addEventListener('click', function() { self.toggleChatMic(); });
        }

        // Extras toggle
        var attachBtn = document.getElementById('btnAttach');
        if (attachBtn) {
            attachBtn.addEventListener('click', function() {
                var extras = document.getElementById('inputExtras');
                if (extras) extras.classList.toggle('hidden');
            });
        }

        // Voice call
        var voiceCallBtn = document.getElementById('btnVoiceCall');
        if (voiceCallBtn) {
            voiceCallBtn.addEventListener('click', function() {
                var extras = document.getElementById('inputExtras');
                if (extras) extras.classList.add('hidden');
                VoiceSystem.startCall();
            });
        }

        // Call controls
        var endCallBtn = document.getElementById('btnEndCall');
        if (endCallBtn) endCallBtn.addEventListener('click', function() { VoiceSystem.endCall(); });

        var muteCallBtn = document.getElementById('btnMuteCall');
        if (muteCallBtn) muteCallBtn.addEventListener('click', function() { VoiceSystem.toggleMute(); });

        var speakerBtn = document.getElementById('btnSpeaker');
        if (speakerBtn) {
            speakerBtn.addEventListener('click', function() { speakerBtn.classList.toggle('muted'); });
        }

        // Hospital finder
        var hospitalNavBtn = document.getElementById('btnHospitals');
        if (hospitalNavBtn) hospitalNavBtn.addEventListener('click', function() { self.openHospitalFinder(); });

        var findHospitalBtn = document.getElementById('btnFindHospital');
        if (findHospitalBtn) {
            findHospitalBtn.addEventListener('click', function() {
                var extras = document.getElementById('inputExtras');
                if (extras) extras.classList.add('hidden');
                self.openHospitalFinder();
            });
        }

        var backBtn = document.getElementById('btnBackFromHospital');
        if (backBtn) backBtn.addEventListener('click', function() { self.showScreen('chatScreen'); });

        var locateBtn = document.getElementById('btnLocateMe');
        if (locateBtn) locateBtn.addEventListener('click', function() { self.locateAndFindHospitals(); });

        // Hospital filters
        var filterBtns = document.querySelectorAll('.filter-btn');
        for (var f = 0; f < filterBtns.length; f++) {
            filterBtns[f].addEventListener('click', function(e) {
                var allFilters = document.querySelectorAll('.filter-btn');
                for (var j = 0; j < allFilters.length; j++) allFilters[j].classList.remove('active');
                e.target.classList.add('active');
                LocationFinder.renderHospitals(e.target.dataset.filter);
            });
        }

        // Hospital search
        var hospitalSearch = document.getElementById('hospitalSearch');
        if (hospitalSearch) {
            hospitalSearch.addEventListener('input', Utils.debounce(function(e) {
                if (e.target.value.trim()) {
                    LocationFinder.searchHospitals(e.target.value.trim());
                } else {
                    LocationFinder.renderHospitals('all');
                }
            }, 300));
        }

        // Profile
        var profileBtn = document.getElementById('btnProfile');
        if (profileBtn) {
            profileBtn.addEventListener('click', function() {
                var panel = document.getElementById('profilePanel');
                if (panel) panel.classList.add('open');
                ProfileManager.updateProfileUI();
            });
        }

        var closeProfileBtn = document.getElementById('btnCloseProfile');
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', function() {
                var panel = document.getElementById('profilePanel');
                if (panel) panel.classList.remove('open');
            });
        }

        var profileOverlay = document.getElementById('profileOverlay');
        if (profileOverlay) {
            profileOverlay.addEventListener('click', function() {
                var panel = document.getElementById('profilePanel');
                if (panel) panel.classList.remove('open');
            });
        }

        var clearDataBtn = document.getElementById('btnClearData');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', function() {
                if (confirm('Clear all data? This cannot be undone.')) {
                    ProfileManager.clearAll();
                    ChatEngine.clearHistory();
                    var msgs = document.getElementById('chatMessages');
                    if (msgs) msgs.innerHTML = '';
                    var panel = document.getElementById('profilePanel');
                    if (panel) panel.classList.remove('open');
                    self.showScreen('welcomeScreen');
                }
            });
        }

        // Emergency
        var emergencyBtn = document.getElementById('btnEmergency');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', function() {
                var modal = document.getElementById('crisisModal');
                if (modal) modal.classList.remove('hidden');
            });
        }

        var crisisChatBtn = document.getElementById('btnCrisisChat');
        if (crisisChatBtn) {
            crisisChatBtn.addEventListener('click', function() {
                var modal = document.getElementById('crisisModal');
                if (modal) modal.classList.add('hidden');
            });
        }

        var crisisHospitalBtn = document.getElementById('btnCrisisHospital');
        if (crisisHospitalBtn) {
            crisisHospitalBtn.addEventListener('click', function() {
                var modal = document.getElementById('crisisModal');
                if (modal) modal.classList.add('hidden');
                self.openHospitalFinder();
            });
        }

        // Breathing
        var breathingBtn = document.getElementById('btnBreathing');
        if (breathingBtn) {
            breathingBtn.addEventListener('click', function() {
                var modal = document.getElementById('breathingModal');
                var extras = document.getElementById('inputExtras');
                if (modal) modal.classList.remove('hidden');
                if (extras) extras.classList.add('hidden');
            });
        }

        var closeBreathingBtn = document.getElementById('btnCloseBreathing');
        if (closeBreathingBtn) {
            closeBreathingBtn.addEventListener('click', function() {
                var modal = document.getElementById('breathingModal');
                if (modal) modal.classList.add('hidden');
                self.stopBreathing();
            });
        }

        var startBreathingBtn = document.getElementById('btnStartBreathing');
        if (startBreathingBtn) {
            startBreathingBtn.addEventListener('click', function() { self.startBreathing(); });
        }

        // Mood buttons
        var moodBtns = document.querySelectorAll('.mood-btn');
        for (var m = 0; m < moodBtns.length; m++) {
            moodBtns[m].addEventListener('click', function(e) {
                var mood = e.target.dataset.mood;
                ProfileManager.addMood(mood);
                var selector = document.getElementById('moodSelector');
                if (selector) selector.classList.add('hidden');
                self.addUserMessage('I am feeling ' + mood);
                setTimeout(function() {
                    self.sendToAI('I am feeling ' + mood + ' right now');
                }, 300);
            });
        }

        // Journal
        var journalBtn = document.getElementById('btnJournal');
        if (journalBtn) {
            journalBtn.addEventListener('click', function() {
                var extras = document.getElementById('inputExtras');
                if (extras) extras.classList.add('hidden');
                self.addBotMessage("📝 Let us do a quick journal entry. Just write whatever comes to mind. No judgment. What is on your heart right now?");
            });
        }

        // Modal overlays
        var overlays = document.querySelectorAll('.modal-overlay');
        for (var o = 0; o < overlays.length; o++) {
            overlays[o].addEventListener('click', function(e) {
                var modal = e.target.closest('.modal');
                if (modal) modal.classList.add('hidden');
            });
        }

        // Feature cards on welcome screen
        var cards = document.querySelectorAll('.feature-card');
        for (var c = 0; c < cards.length; c++) {
            (function(index) {
                cards[index].addEventListener('click', function() {
                    if (index === 0) {
                        self.showScreen('chatScreen');
                        self.sendInitialMessage();
                    } else if (index === 1) {
                        VoiceSystem.startCall();
                    } else if (index === 2) {
                        self.openHospitalFinder();
                    } else if (index === 3) {
                        var modal = document.getElementById('crisisModal');
                        if (modal) modal.classList.remove('hidden');
                    }
                });
            })(c);
        }
    },

    showScreen: function(screenId) {
        var screens = document.querySelectorAll('.screen');
        for (var i = 0; i < screens.length; i++) {
            screens[i].classList.remove('active');
        }
        var screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
        this.currentScreen = screenId;
    },

    sendInitialMessage: function() {
        var messages = document.getElementById('chatMessages');
        if (!messages || messages.children.length > 0) return;

        var name = ProfileManager.profile.name;
        var greeting;
        
        if (name) {
            greeting = 'Hey ' + name + '! 💙 Welcome back. How are you doing today?';
        } else {
            greeting = 'Hey there! 💙 Welcome to MindBridge. I am really glad you are here. This is a safe space with no judgment, just genuine care. How are you doing today?';
        }

        this.addBotMessage(greeting);
    },

    sendUserMessage: async function() {
        var input = document.getElementById('messageInput');
        if (!input) return;
        
        var message = input.value.trim();
        if (!message || ChatEngine.isProcessing) return;

        input.value = '';
        Utils.autoResize(input);
        
        var extras = document.getElementById('inputExtras');
        if (extras) extras.classList.add('hidden');

        this.addUserMessage(message);
        await this.sendToAI(message);
    },

    sendToAI: async function(message) {
        this.showTyping(true);
        var result = await ChatEngine.sendMessage(message);
        this.showTyping(false);

        if (result) {
            if (result.crisis && result.crisis.shouldAlert) {
                var modal = document.getElementById('crisisModal');
                if (modal) modal.classList.remove('hidden');
            }
            this.addBotMessage(result.text);
            Utils.playSound('message');

            if (ProfileManager.messageCount > 0 && ProfileManager.messageCount % 8 === 0) {
                setTimeout(function() {
                    var selector = document.getElementById('moodSelector');
                    if (selector) selector.classList.remove('hidden');
                }, 1000);
            }
        }
    },

    addUserMessage: function(text) {
        var container = document.getElementById('chatMessages');
        if (!container) return;

        var msg = document.createElement('div');
        msg.className = 'message user';
        msg.innerHTML = '<div class="message-avatar"><i class="fas fa-user"></i></div><div class="message-bubble">' + Utils.formatMessage(text) + '<span class="message-time">' + Utils.formatTime() + '</span></div>';
        container.appendChild(msg);
        Utils.scrollToBottom(container.parentElement);
    },

    addBotMessage: function(text) {
        var container = document.getElementById('chatMessages');
        if (!container) return;

        var msg = document.createElement('div');
        msg.className = 'message bot';
        msg.innerHTML = '<div class="message-avatar"><i class="fas fa-brain"></i></div><div class="message-bubble">' + Utils.formatMessage(text) + '<span class="message-time">' + Utils.formatTime() + '</span></div>';
        container.appendChild(msg);
        Utils.scrollToBottom(container.parentElement);
    },

    showTyping: function(show) {
        var indicator = document.getElementById('typingIndicator');
        if (!indicator) return;
        if (show) {
            indicator.classList.remove('hidden');
            var chatContainer = document.querySelector('.chat-container');
            if (chatContainer) Utils.scrollToBottom(chatContainer);
        } else {
            indicator.classList.add('hidden');
        }
    },

    chatRecognition: null,
    isChatMicActive: false,

    toggleChatMic: function() {
        if (this.isChatMicActive) {
            this.stopChatMic();
        } else {
            this.startChatMic();
        }
    },

    startChatMic: function() {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.addBotMessage("Sorry, your browser does not support voice input. Please use Google Chrome! 💙");
            return;
        }

        var self = this;
        this.chatRecognition = new SpeechRecognition();
        this.chatRecognition.continuous = false;
        this.chatRecognition.interimResults = true;
        this.chatRecognition.lang = 'en-US';

        var input = document.getElementById('messageInput');
        var micBtn = document.getElementById('btnMic');

        this.chatRecognition.onstart = function() {
            self.isChatMicActive = true;
            if (micBtn) micBtn.classList.add('listening');
            if (input) input.placeholder = '🎤 Listening... speak now';
        };

        this.chatRecognition.onresult = function(event) {
            var finalTranscript = '';
            var interimTranscript = '';
            for (var i = event.resultIndex; i < event.results.length; i++) {
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

        this.chatRecognition.onend = function() {
            self.isChatMicActive = false;
            if (micBtn) micBtn.classList.remove('listening');
            if (input) input.placeholder = 'Type your message... I am here to listen 💙';
            if (input && input.value.trim()) {
                self.sendUserMessage();
            }
        };

        this.chatRecognition.onerror = function() {
            self.isChatMicActive = false;
            if (micBtn) micBtn.classList.remove('listening');
            if (input) input.placeholder = 'Type your message... I am here to listen 💙';
        };

        try {
            this.chatRecognition.start();
        } catch (e) {
            console.error('Mic error:', e);
        }
    },

    stopChatMic: function() {
        if (this.chatRecognition) {
            try { this.chatRecognition.stop(); } catch (e) {}
        }
        this.isChatMicActive = false;
        var micBtn = document.getElementById('btnMic');
        if (micBtn) micBtn.classList.remove('listening');
    },

    openHospitalFinder: function() {
        this.showScreen('hospitalScreen');
    },

    locateAndFindHospitals: async function() {
        var btn = document.getElementById('btnLocateMe');
        if (!btn) return;

        var originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Locating...</span>';
        btn.disabled = true;

        try {
            var location = await LocationFinder.getUserLocation();
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Finding hospitals...</span>';
            await LocationFinder.findNearbyHospitals(location.lat, location.lng);
            LocationFinder.renderMap(location.lat, location.lng);
            LocationFinder.renderHospitals('all');
            btn.innerHTML = '<i class="fas fa-check"></i> <span>Located!</span>';
            setTimeout(function() {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Location error:', error);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            var list = document.getElementById('hospitalList');
            if (list) {
                list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);"><i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--warning);margin-bottom:1rem;display:block;"></i><p>Could not access your location.</p><p style="font-size:0.85rem;margin-top:0.5rem;">Please enable location permissions and try again.</p></div>';
            }
        }
    },

    breathingInterval: null,

    startBreathing: function() {
        var circle = document.getElementById('breathingCircle');
        var text = document.getElementById('breathText');
        var instruction = document.getElementById('breathingInstruction');
        var btn = document.getElementById('btnStartBreathing');
        var self = this;
        
        if (btn) btn.style.display = 'none';

        var phases = [
            { text: 'Breathe In', cls: 'inhale', instruction: 'Breathe in slowly through your nose...', duration: 4000 },
            { text: 'Hold', cls: 'inhale', instruction: 'Hold it gently...', duration: 4000 },
            { text: 'Breathe Out', cls: 'exhale', instruction: 'Slowly release through your mouth...', duration: 6000 },
            { text: 'Rest', cls: '', instruction: 'Rest for a moment...', duration: 2000 }
        ];

        var phaseIndex = 0;
        var totalPhases = 0;

        function runPhase() {
            if (totalPhases >= 16) {
                self.stopBreathing();
                return;
            }
            var phase = phases[phaseIndex];
            if (text) text.textContent = phase.text;
            if (instruction) instruction.textContent = phase.instruction;
            if (circle) circle.className = 'breathing-circle ' + phase.cls;
            phaseIndex = (phaseIndex + 1) % phases.length;
            totalPhases++;
            self.breathingInterval = setTimeout(runPhase, phase.duration);
        }

        if (instruction) instruction.textContent = 'Get comfortable... we begin in a moment.';
        setTimeout(runPhase, 2000);
    },

    stopBreathing: function() {
        if (this.breathingInterval) clearTimeout(this.breathingInterval);
        var text = document.getElementById('breathText');
        var instruction = document.getElementById('breathingInstruction');
        var btn = document.getElementById('btnStartBreathing');
        var circle = document.getElementById('breathingCircle');
        if (text) text.textContent = '✨';
        if (instruction) instruction.textContent = 'Great job! Notice how you feel right now.';
        if (circle) circle.className = 'breathing-circle';
        if (btn) { btn.style.display = ''; btn.textContent = 'Do It Again'; }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
