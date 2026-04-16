// ============================================
// MINDBRIDGE AI - Crisis Detection Engine
// ============================================

const CrisisDetector = {
    // Crisis keywords and patterns
    highRiskKeywords: [
        'kill myself', 'want to die', 'end my life', 'suicide', 'suicidal',
        'no reason to live', 'better off dead', 'don\'t want to live',
        'can\'t go on', 'end it all', 'take my life', 'harm myself',
        'cut myself', 'overdose', 'jump off', 'hang myself',
        'no point in living', 'want to disappear forever',
        'nobody would miss me', 'world is better without me'
    ],

    mediumRiskKeywords: [
        'self harm', 'self-harm', 'hurting myself', 'want to hurt',
        'hate myself', 'worthless', 'hopeless', 'helpless',
        'can\'t take it anymore', 'breaking down', 'falling apart',
        'nobody cares', 'all alone', 'no one understands',
        'give up', 'exhausted of living', 'tired of everything',
        'nothing matters', 'what\'s the point', 'numb'
    ],

    lowRiskKeywords: [
        'depressed', 'depression', 'anxiety', 'anxious', 'panic attack',
        'can\'t sleep', 'insomnia', 'nightmare', 'stressed',
        'overwhelmed', 'lonely', 'isolated', 'scared', 'afraid',
        'crying', 'can\'t stop crying', 'sad', 'empty',
        'lost', 'confused', 'frustrated', 'angry', 'rage'
    ],

    // Analyze message for crisis indicators
    analyze(message) {
        const lowerMsg = message.toLowerCase();
        let riskLevel = 'none';
        let matchedKeywords = [];
        let score = 0;

        // Check high risk
        for (const keyword of this.highRiskKeywords) {
            if (lowerMsg.includes(keyword)) {
                riskLevel = 'high';
                matchedKeywords.push(keyword);
                score += 10;
            }
        }

        // Check medium risk
        if (riskLevel !== 'high') {
            for (const keyword of this.mediumRiskKeywords) {
                if (lowerMsg.includes(keyword)) {
                    riskLevel = 'medium';
                    matchedKeywords.push(keyword);
                    score += 5;
                }
            }
        }

        // Check low risk
        if (riskLevel === 'none') {
            for (const keyword of this.lowRiskKeywords) {
                if (lowerMsg.includes(keyword)) {
                    riskLevel = 'low';
                    matchedKeywords.push(keyword);
                    score += 2;
                }
            }
        }

        // Check for escalation patterns
        const consecutiveNegative = this.checkEscalation();
        if (consecutiveNegative >= 5 && riskLevel === 'low') {
            riskLevel = 'medium';
            score += 3;
        }

        return {
            riskLevel,
            score,
            matchedKeywords,
            shouldAlert: riskLevel === 'high',
            shouldMonitor: riskLevel === 'medium'
        };
    },

    // Track escalation over conversation
    messageHistory: [],

    addToHistory(message, riskLevel) {
        this.messageHistory.push({
            message,
            riskLevel,
            timestamp: Date.now()
        });
        // Keep last 20 messages
        if (this.messageHistory.length > 20) {
            this.messageHistory.shift();
        }
    },

    checkEscalation() {
        const recent = this.messageHistory.slice(-5);
        return recent.filter(m => m.riskLevel !== 'none').length;
    },

    // Get crisis resources based on detected risk
    getResources(riskLevel) {
        const resources = {
            high: {
                message: "I'm really concerned about you right now. Please know that help is available immediately.",
                actions: [
                    { label: "Call 988 Suicide & Crisis Lifeline", url: "tel:988", type: "call" },
                    { label: "Text HOME to 741741", url: "sms:741741&body=HELLO", type: "text" },
                    { label: "Emergency Services (911)", url: "tel:911", type: "emergency" }
                ]
            },
            medium: {
                message: "It sounds like you're going through a really tough time. I'm here for you, and there are people who can help.",
                actions: [
                    { label: "Crisis Text Line: Text HOME to 741741", url: "sms:741741&body=HELLO", type: "text" },
                    { label: "SAMHSA Helpline: 1-800-662-4357", url: "tel:18006624357", type: "call" }
                ]
            },
            low: {
                message: "I hear you, and your feelings are valid. Would you like to explore some coping strategies together?",
                actions: []
            }
        };
        return resources[riskLevel] || resources.low;
    }
};
