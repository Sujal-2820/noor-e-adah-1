/**
 * Notification Sound Utility
 * 
 * Plays a subtle, attention-grabbing notification sound using the Web Audio API.
 * No external audio file required.
 */

let audioContext = null;
let lastPlayTime = 0;
const DEBOUNCE_MS = 500; // Prevent rapid-fire sounds

/**
 * Initialize the Audio Context (required for Web Audio API)
 */
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Play a subtle notification chime
 * Uses two sine waves to create a pleasant, non-intrusive sound
 */
export function playNotificationSound() {
    try {
        // Debounce to prevent rapid-fire sounds
        const now = Date.now();
        if (now - lastPlayTime < DEBOUNCE_MS) {
            return;
        }
        lastPlayTime = now;

        const ctx = getAudioContext();

        // Resume audio context if it was suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const currentTime = ctx.currentTime;

        // Create a gentle two-tone chime
        // First tone (higher pitch)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.frequency.setValueAtTime(880, currentTime); // A5 note
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0, currentTime);
        gain1.gain.linearRampToValueAtTime(0.15, currentTime + 0.02); // Quick attack
        gain1.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3); // Smooth decay
        osc1.start(currentTime);
        osc1.stop(currentTime + 0.35);

        // Second tone (lower pitch, slightly delayed)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(659.25, currentTime + 0.08); // E5 note
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0, currentTime + 0.08);
        gain2.gain.linearRampToValueAtTime(0.12, currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4);
        osc2.start(currentTime + 0.08);
        osc2.stop(currentTime + 0.45);

        // Optional: Third subtle undertone for richness
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.frequency.setValueAtTime(523.25, currentTime); // C5 note
        osc3.type = 'sine';
        gain3.gain.setValueAtTime(0, currentTime);
        gain3.gain.linearRampToValueAtTime(0.05, currentTime + 0.05);
        gain3.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
        osc3.start(currentTime);
        osc3.stop(currentTime + 0.55);

    } catch (error) {
        // Silently fail if audio is not supported
        console.warn('Notification sound failed:', error);
    }
}

/**
 * Check if notification sounds are enabled
 * Returns true by default, can be customized to check user preferences
 */
export function isNotificationSoundEnabled() {
    // Check localStorage for user preference
    const preference = localStorage.getItem('notificationSoundEnabled');
    // Default to true if not set
    return preference !== 'false';
}

/**
 * Toggle notification sound on/off
 */
export function setNotificationSoundEnabled(enabled) {
    localStorage.setItem('notificationSoundEnabled', enabled ? 'true' : 'false');
}

/**
 * Play notification sound if enabled
 */
export function playNotificationSoundIfEnabled() {
    if (isNotificationSoundEnabled()) {
        playNotificationSound();
    }
}

export default {
    playNotificationSound,
    playNotificationSoundIfEnabled,
    isNotificationSoundEnabled,
    setNotificationSoundEnabled,
};
