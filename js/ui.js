import { SKINS } from './skins.js';

export class UIManager {
    constructor(callbacks, audioManager, progressionManager) {
        this.callbacks = callbacks;
        this.audioManager = audioManager;
        this.progression = progressionManager;
        
        this.screens = {
            main: document.getElementById('menu-main'),
            achievements: document.getElementById('menu-achievements'),
            skins: document.getElementById('menu-skins'),
            pause: document.getElementById('menu-pause'),
            gameover: document.getElementById('menu-gameover'),
            settings: document.getElementById('menu-settings'),
            tutorial: document.getElementById('menu-tutorial')
        };

        this.initButtons();
        this.initSettings();
        this.initKeyboard();
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        if (screenName && this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            if (screenName === 'skins') this.renderSkinsMenu();
            if (screenName === 'achievements') this.renderAchievementsMenu();
        }
    }

    updateGameOverStats(score, best, coins) {
        document.getElementById('go-score').innerText = Math.floor(score);
        document.getElementById('go-best').innerText = Math.floor(best);
        document.getElementById('go-coins').innerText = coins;
    }

    click() {
        if (this.audioManager) {
            this.audioManager.init(); 
            this.audioManager.playClick();
        }
    }

    initButtons() {
        const bindBtn = (id, callback) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => { this.click(); callback(); });
        };

        bindBtn('btn-play', this.callbacks.onPlay);
        bindBtn('btn-achievements', this.callbacks.onAchievements);
        bindBtn('btn-skins', this.callbacks.onSkins);
        bindBtn('btn-settings', this.callbacks.onSettings);
        bindBtn('btn-tutorial', this.callbacks.onTutorial);
        
        bindBtn('btn-resume', this.callbacks.onResume);
        bindBtn('btn-restart-pause', this.callbacks.onRestart);
        bindBtn('btn-home-pause', this.callbacks.onHome);

        bindBtn('btn-restart-go', this.callbacks.onRestart);
        bindBtn('btn-home-go', this.callbacks.onHome);

        bindBtn('btn-back-achievements', this.callbacks.onHome);
        bindBtn('btn-back-skins', this.callbacks.onHome);
        bindBtn('btn-back-settings', this.callbacks.onHome);
        bindBtn('btn-back-tutorial', this.callbacks.onHome);
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                if (this.screens.main.classList.contains('active')) document.getElementById('btn-play').click();
                else if (this.screens.pause.classList.contains('active')) document.getElementById('btn-resume').click();
                else if (this.screens.gameover.classList.contains('active')) document.getElementById('btn-restart-go').click();
            } else if (e.code === 'Escape') {
                if (this.screens.settings.classList.contains('active')) document.getElementById('btn-back-settings').click();
                else if (this.screens.tutorial.classList.contains('active')) document.getElementById('btn-back-tutorial').click();
                else if (this.screens.skins.classList.contains('active')) document.getElementById('btn-back-skins').click();
                else if (this.screens.achievements.classList.contains('active')) document.getElementById('btn-back-achievements').click();
            }
        });
    }

    initSettings() {
        const soundBtn = document.getElementById('btn-sound-toggle');
        const volSlider = document.getElementById('volume-slider');

        const updateSoundBtn = () => {
            if (this.audioManager.soundEnabled) {
                soundBtn.innerText = 'ON'; soundBtn.classList.remove('off');
            } else {
                soundBtn.innerText = 'OFF'; soundBtn.classList.add('off');
            }
        };

        updateSoundBtn();
        volSlider.value = this.audioManager.masterVolume * 100;

        soundBtn.addEventListener('click', () => {
            this.click(); this.audioManager.toggleSound(!this.audioManager.soundEnabled); updateSoundBtn();
        });

        volSlider.addEventListener('input', (e) => {
            const val = e.target.value / 100; this.audioManager.setVolume(val);
        });
    }

    renderAchievementsMenu() {
        const achContainer = document.getElementById('achievements-list');
        const misContainer = document.getElementById('missions-list');
        achContainer.innerHTML = '';
        misContainer.innerHTML = '';

        this.progression.getMissionsData().forEach(mission => {
            const isCompleted = this.progression.completedMissions.includes(mission.id);
            let currentProgress = isCompleted ? mission.target : Math.min(this.progression.getStatValue(mission.stat), mission.target);
            let percent = (currentProgress / mission.target) * 100;

            const card = document.createElement('div');
            card.className = `item-card mission ${isCompleted ? 'completed' : ''}`;
            card.innerHTML = `
                <div class="reward-badge">+${mission.reward} 🪙</div>
                <h4>${mission.title}</h4>
                <p>${mission.desc}</p>
                <div class="progress-bg">
                    <div class="progress-fill" style="width: ${percent}%;"></div>
                </div>
                <div class="progress-text">${Math.floor(currentProgress)} / ${mission.target}</div>
            `;
            misContainer.appendChild(card);
        });

        this.progression.getAchievementsData().forEach(ach => {
            const isUnlocked = this.progression.unlockedAchievements.includes(ach.id);
            const card = document.createElement('div');
            card.className = `item-card ${isUnlocked ? 'unlocked' : ''}`;
            card.innerHTML = `
                <div class="status-icon">${isUnlocked ? '🔓' : '🔒'}</div>
                <h4>${ach.title}</h4>
                <p>${ach.desc}</p>
            `;
            achContainer.appendChild(card);
        });
    }

    showToast(title, desc, isMission = false) {
        const container = document.getElementById('toast-container');
        if(!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${isMission ? 'mission' : ''}`;
        toast.innerHTML = `
            <div class="toast-title">${isMission ? '🎯 MISSION COMPLETE' : '🏆 ACHIEVEMENT UNLOCKED'}</div>
            <div class="toast-desc">${title} ${isMission ? `(+${desc} Coins)` : ''}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400); 
        }, 3500);
    }

    renderSkinsMenu() {
        const container = document.getElementById('skins-grid');
        container.innerHTML = '';
        document.getElementById('skins-total-coins').innerText = this.progression.totalCoins;
        document.getElementById('skins-best-score').innerText = Math.floor(this.progression.bestScore);

        SKINS.forEach(skin => {
            const isUnlocked = this.progression.isUnlocked(skin.id);
            const isEquipped = this.progression.equippedSkinId === skin.id;
            const card = document.createElement('div');
            card.className = 'skin-card';
            card.style.borderColor = skin.colors.main;
            if (isEquipped) card.style.boxShadow = `0 0 15px ${skin.colors.main}, inset 0 0 10px ${skin.colors.main}`;

            let statusHtml = '';
            if (isEquipped) statusHtml = `<button class="btn btn-skin equipped">EQUIPPED</button>`;
            else if (isUnlocked) statusHtml = `<button class="btn btn-skin equip-btn" data-id="${skin.id}">EQUIP</button>`;
            else {
                if (skin.type === 'coins') {
                    const canAfford = this.progression.totalCoins >= skin.cost;
                    statusHtml = `<button class="btn btn-skin unlock-btn ${canAfford ? '' : 'locked'}" data-id="${skin.id}">${skin.cost} COINS</button>`;
                } else if (skin.type === 'score') {
                    statusHtml = `<div class="skin-req">BEST SCORE: ${skin.requirement}</div><button class="btn btn-skin locked">LOCKED</button>`;
                }
            }
            card.innerHTML = `
                <h3 style="color: ${skin.colors.main}; text-shadow: 0 0 10px ${skin.colors.main}; font-size:1.1rem;">${skin.name}</h3>
                <div class="skin-preview" style="background: ${skin.colors.dark}; border: 2px solid ${skin.colors.main}; box-shadow: 0 0 10px ${skin.colors.main};">
                    <div class="visor" style="background: ${skin.colors.visor}; box-shadow: 0 0 5px ${skin.colors.visor};"></div>
                </div>
                ${statusHtml}
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.equip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.audioManager.init(); this.audioManager.playEquip();
                this.progression.equipSkin(e.target.dataset.id); this.callbacks.onSkinChange(); this.renderSkinsMenu();
            });
        });

        container.querySelectorAll('.unlock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.audioManager.init();
                const id = e.target.dataset.id;
                const skin = SKINS.find(s => s.id === id);
                if (this.progression.totalCoins >= skin.cost) {
                    this.audioManager.playUnlock(); this.progression.buySkin(id); this.renderSkinsMenu();
                } else this.audioManager.playError();
            });
        });
    }
}