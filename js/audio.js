export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = parseFloat(localStorage.getItem('neonDashVolume') ?? '0.5');
        this.soundEnabled = (localStorage.getItem('neonDashSoundEnabled') ?? 'true') === 'true';
    }

    init() {
        if (!this.soundEnabled) return;
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(vol) {
        this.masterVolume = vol;
        localStorage.setItem('neonDashVolume', vol);
    }

    toggleSound(isEnabled) {
        this.soundEnabled = isEnabled;
        localStorage.setItem('neonDashSoundEnabled', isEnabled);
        if (isEnabled) this.init(); 
    }

    playTone(type, startFreq, endFreq, duration, vol) {
        if (!this.soundEnabled || !this.ctx || this.ctx.state !== 'running') return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
        gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(vol * this.masterVolume, this.ctx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playJump() { this.playTone('square', 150, 400, 0.15, 0.3); }
    playDash() { this.playTone('sawtooth', 200, 50, 0.2, 0.3); }
    playCoin() { this.playTone('sine', 1200, 1800, 0.1, 0.4); }
    playHit() { this.playTone('square', 150, 40, 0.15, 0.5); }
    playDestroy() { this.playTone('sawtooth', 200, 30, 0.4, 0.6); }
    playOverdrive() { this.playTone('sawtooth', 100, 1200, 1.0, 0.4); }
    playGameOver() { this.playTone('triangle', 400, 50, 0.8, 0.5); }
    playClick() { this.playTone('square', 800, 1200, 0.05, 0.2); }
    
    playUnlock() { this.playTone('sine', 400, 1200, 0.5, 0.4); }
    playEquip() { this.playTone('square', 800, 600, 0.1, 0.3); }
    playError() { this.playTone('sawtooth', 200, 150, 0.2, 0.3); }
    
    // صوت مبهج للإنجازات (أصوات متتالية سريعة)
    playAchievementUnlock() {
        if (!this.soundEnabled || !this.ctx) return;
        this.playTone('sine', 440, 660, 0.1, 0.4);
        setTimeout(() => this.playTone('sine', 554, 880, 0.2, 0.4), 100);
        setTimeout(() => this.playTone('sine', 659, 1108, 0.4, 0.4), 200);
    }
}