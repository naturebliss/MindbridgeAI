// ============================================
// MINDBRIDGE AI - User Profile Manager
// Gradually collects info through natural conversation
// ============================================

const ProfileManager = {
    profile: {
        name: null,
        age: null,
        dateOfBirth: null,
        gender: null,
        livingWith: null,
        location: null,
        menstrualTracking: null,
        preferredName: null,
        mood_history: []
    },

    // Questions to ask naturally during conversation (one at a time)
    pendingQuestions: [
        {
            field: 'name',
            triggers: ['first_message'],
            asked: false,
            priority: 1
        },
        {
            field: 'gender',
            triggers: ['after_name', 'natural'],
            asked: false,
            priority: 2
        },
        {
            field: 'age',
            triggers: ['natural'],
            asked: false,
            priority: 3
        },
        {
            field: 'livingWith',
            triggers: ['natural', 'loneliness'],
            asked: false,
            priority: 4
        },
        {
            field: 'location',
            triggers: ['natural', 'hospital_request'],
            asked: false,
            priority: 5
        }
    ],

    messageCount: 0,
    lastQuestionAskedAt: 0,
    MIN_MESSAGES_BETWEEN_QUESTIONS: 4,

    init() {
        const saved = Utils.store.get('profile');
        if (saved) {
            this.profile = { ...this.profile, ...saved };
            this.updatePendingQuestions();
        }
    },

    save() {
        Utils.store.set('profile', this.profile);
        this.updateProfileUI();
    },

    updatePendingQuestions() {
        for (const q of this.pendingQuestions) {
            if (this.profile[q.field]) {
                q.asked = true;
            }
        }
    },

    // Determine if we should ask a profile question in the next response
    shouldAskQuestion() {
        this.messageCount++;
        
        // Don't ask questions too frequently
        const messagesSinceLastQuestion = this.messageCount - this.lastQuestionAskedAt;
        if (messagesSinceLastQuestion < this.MIN_MESSAGES_BETWEEN_QUESTIONS && this.lastQuestionAskedAt > 0) {
            return null;
        }

        // Find next unanswered question
        const nextQ = this.pendingQuestions
            .filter(q => !q.asked)
            .sort((a, b) => a.priority - b.priority)[0];

        if (!nextQ) return null;

        // Special case: first message always asks name
        if (this.messageCount === 1 && nextQ.field === 'name') {
            this.lastQuestionAskedAt = this.messageCount;
            return nextQ.field;
        }

        // Otherwise, randomly decide (don't always ask)
        if (messagesSinceLastQuestion >= this.MIN_MESSAGES_BETWEEN_QUESTIONS) {
            if (Math.random() > 0.4) { // 60% chance to ask
                this.lastQuestionAskedAt = this.messageCount;
                return nextQ.field;
            }
        }

        return null;
    },

    // Generate the contextual question hint for AI
    getQuestionContext(field) {
        const contexts = {
            name: "Naturally ask the user what their name is, or what they'd like to be called. Be warm and welcoming.",
            age: "At some natural point in the conversation, gently ask how old they are. Don't make it feel like a form.",
            gender: "Naturally and respectfully ask about their gender identity. This helps you provide more personalized support.",
            livingWith: "When relevant, gently ask if they live with someone (family, friends, partner, roommates) or if they live alone. This helps understand their support system.",
            location: "If it feels natural, ask what city or area they're in. This helps you suggest local resources if needed."
        };
        return contexts[field] || '';
    },

    // Extract profile info from user messages
    extractInfo(message) {
        const lower = message.toLowerCase().trim();
        let extracted = false;

        // Extract name
        if (!this.profile.name) {
            const namePatterns = [
                /(?:my name is|i'm|i am|call me|they call me|name's)\s+([a-zA-Z]+)/i,
                /^([a-zA-Z]{2,15})$/i // Single word response (likely a name)
            ];
            for (const pattern of namePatterns) {
                const match = message.match(pattern);
                if (match && match[1].length > 1 && match[1].length < 20) {
                    this.profile.name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                    this.profile.preferredName = this.profile.name;
                    this.pendingQuestions.find(q => q.field === 'name').asked = true;
                    extracted = true;
                    break;
                }
            }
        }

        // Extract age
        if (!this.profile.age) {
            const agePatterns = [
                /(?:i'm|i am|im)\s*(\d{1,2})\s*(?:years?\s*old)?/i,
                /(?:age|aged)\s*(\d{1,2})/i,
                /^(\d{1,2})$/
            ];
            for (const pattern of agePatterns) {
                const match = message.match(pattern);
                if (match) {
                    const age = parseInt(match[1]);
                    if (age >= 10 && age <= 120) {
                        this.profile.age = age;
                        this.pendingQuestions.find(q => q.field === 'age').asked = true;
                        extracted = true;
                        break;
                    }
                }
            }
        }

        // Extract gender
        if (!this.profile.gender) {
            const genderMap = {
                'male': 'Male', 'man': 'Male', 'boy': 'Male', 'guy': 'Male', 'he/him': 'Male',
                'female': 'Female', 'woman': 'Female', 'girl': 'Female', 'she/her': 'Female',
                'non-binary': 'Non-binary', 'nonbinary': 'Non-binary', 'they/them': 'Non-binary',
                'trans': 'Transgender', 'transgender': 'Transgender'
            };
            for (const [key, value] of Object.entries(genderMap)) {
                if (lower.includes(key)) {
                    this.profile.gender = value;
                    this.pendingQuestions.find(q => q.field === 'gender').asked = true;
                    // Enable menstrual tracking for females
                    if (value === 'Female') {
                        this.profile.menstrualTracking = true;
                    }
                    extracted = true;
                    break;
                }
            }
        }

        // Extract living situation
        if (!this.profile.livingWith) {
            if (lower.includes('alone') || lower.includes('by myself') || lower.includes('live alone')) {
                this.profile.livingWith = 'Alone';
                this.pendingQuestions.find(q => q.field === 'livingWith').asked = true;
                extracted = true;
            } else if (lower.includes('family') || lower.includes('parents') || lower.includes('mom') || lower.includes('dad')) {
                this.profile.livingWith = 'With family';
                this.pendingQuestions.find(q => q.field === 'livingWith').asked = true;
                extracted = true;
            } else if (lower.includes('partner') || lower.includes('spouse') || lower.includes('husband') || lower.includes('wife') || lower.includes('boyfriend') || lower.includes('girlfriend')) {
                this.profile.livingWith = 'With partner';
                this.pendingQuestions.find(q => q.field === 'livingWith').asked = true;
                extracted = true;
            } else if (lower.includes('roommate') || lower.includes('friend') || lower.includes('flatmate')) {
                this.profile.livingWith = 'With roommates/friends';
                this.pendingQuestions.find(q => q.field === 'livingWith').asked = true;
                extracted = true;
            }
        }

        if (extracted) {
            this.save();
        }

        return extracted;
    },

    // Get context string for AI
    getProfileContext() {
        const p = this.profile;
        let context = '';
        
        if (p.name) context += `User's name: ${p.name}. `;
        if (p.age) context += `Age: ${p.age}. `;
        if (p.gender) context += `Gender: ${p.gender}. `;
        if (p.livingWith) context += `Living situation: ${p.livingWith}. `;
        if (p.location) context += `Location: ${p.location}. `;
        if (p.gender === 'Female') {
            context += `Being female, be aware of hormonal and menstrual cycle impacts on mental health. Be sensitive about PMS, PMDD, and hormonal mood changes when relevant. `;
        }
        
        return context;
    },

    // Track mood
    addMood(mood) {
        this.profile.mood_history.push({
            mood,
            timestamp: Date.now()
        });
        // Keep last 30 entries
        if (this.profile.mood_history.length > 30) {
            this.profile.mood_history.shift();
        }
        this.save();
    },

    // Update profile UI
    updateProfileUI() {
        const p = this.profile;
        const nameEl = document.getElementById('profileName');
        const ageEl = document.getElementById('profileAge');
        const genderEl = document.getElementById('profileGender');
        const livingEl = document.getElementById('profileLiving');
        const locationEl = document.getElementById('profileLocation');
        const greetingEl = document.getElementById('profileGreeting');

        if (nameEl) nameEl.textContent = p.name || 'Not shared yet';
        if (ageEl) ageEl.textContent = p.age ? `${p.age} years old` : 'Not shared yet';
        if (genderEl) genderEl.textContent = p.gender || 'Not shared yet';
        if (livingEl) livingEl.textContent = p.livingWith || 'Not shared yet';
        if (locationEl) locationEl.textContent = p.location || 'Not shared yet';
        if (greetingEl) greetingEl.textContent = p.name ? `Hello, ${p.name}! 💙` : 'Hello there! 💙';

        // Update mood chart
        this.updateMoodChart();
    },

    updateMoodChart() {
        const chart = document.getElementById('moodChart');
        if (!chart) return;

        const history = this.profile.mood_history;
        if (history.length === 0) {
            chart.innerHTML = '<p class="no-data">Start chatting to track your mood journey</p>';
            return;
        }

        const moodEmojis = {
            happy: '😊', neutral: '😐', sad: '😢',
            anxious: '😰', angry: '😠', overwhelmed: '😩'
        };

        const recent = history.slice(-7);
        let html = '<div style="display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap;">';
        for (const entry of recent) {
            const emoji = moodEmojis[entry.mood] || '😐';
            const date = new Date(entry.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
            html += `<div style="text-align:center;padding:0.5rem;">
                <div style="font-size:1.5rem;">${emoji}</div>
                <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.25rem;">${date}</div>
            </div>`;
        }
        html += '</div>';
        chart.innerHTML = html;
    },

    // Clear all data
    clearAll() {
        this.profile = {
            name: null, age: null, dateOfBirth: null,
            gender: null, livingWith: null, location: null,
            menstrualTracking: null, preferredName: null,
            mood_history: []
        };
        this.pendingQuestions.forEach(q => q.asked = false);
        this.messageCount = 0;
        this.lastQuestionAskedAt = 0;
        Utils.store.clear();
        this.updateProfileUI();
    }
};
