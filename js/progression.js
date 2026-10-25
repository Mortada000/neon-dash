import { SKINS } from './skins.js';

const ACHIEVEMENTS_DATA = [
    { id: 'first_run', title: 'FIRST RUN', desc: 'Play your first game.', target: 1, stat: 'gamesPlayed' },
    { id: 'speed_demon', title: 'SPEED DEMON', desc: 'Reach 1,000 score in one run.', target: 1000, stat: 'bestScore' },
    { id: 'coin_hunter', title: 'COIN HUNTER', desc: 'Collect 100 coins in total.', target: 100, stat: 'totalCoins' },
    { id: 'dash_master', title: 'DASH MASTER', desc: 'Use Dash 50 times in total.', target: 50, stat: 'totalDashes' },
    { id: 'overdrive_init', title: 'OVERDRIVE', desc: 'Activate OVERDRIVE 10 times.', target: 10, stat: 'totalOverdrives' },
    { id: 'survivor', title: 'SURVIVOR', desc: 'Survive a single run for 5 minutes.', target: 300, stat: 'longestRunSeconds' },
    { id: 'rich', title: 'RICH', desc: 'Hold 500 Total Coins.', target: 500, stat: 'totalCoins' },
    { id: 'legend', title: 'LEGEND', desc: 'Reach 10,000 score in one run.', target: 10000, stat: 'bestScore' }
];

const MISSIONS_DATA = [
    { id: 'm_runs', title: 'RUNNER', desc: 'Run 3 games', target: 3, stat: 'gamesPlayed', reward: 50 },
    { id: 'm_coins', title: 'COLLECTOR', desc: 'Collect 50 coins', target: 50, stat: 'totalCoins', reward: 100 },
    { id: 'm_dash', title: 'DASHER', desc: 'Use Dash 20 times', target: 20, stat: 'totalDashes', reward: 50 },
    { id: 'm_overdrive', title: 'POWER', desc: 'Activate OVERDRIVE 5 times', target: 5, stat: 'totalOverdrives', reward: 100 },
    { id: 'm_score', title: 'PRO', desc: 'Reach Score 2000', target: 2000, stat: 'bestScore', reward: 150 }
];

export class ProgressionManager {
    constructor() {
        this.totalCoins = parseInt(localStorage.getItem('neonDashTotalCoins') || '0');
        this.bestScore = parseFloat(localStorage.getItem('neonDashBestScore') || '0');
        
        try { this.unlockedSkins = JSON.parse(localStorage.getItem('neonDashUnlockedSkins')) || ['neon-blue']; } 
        catch(e) { this.unlockedSkins = ['neon-blue']; }
        
        this.equippedSkinId = localStorage.getItem('neonDashEquippedSkin') || 'neon-blue';

        const savedStats = JSON.parse(localStorage.getItem('neonDashStats')) || {};
        this.stats = { ...this.getDefaultStats(), ...savedStats };

        try { this.unlockedAchievements = JSON.parse(localStorage.getItem('neonDashAchievements')) || []; } 
        catch(e) { this.unlockedAchievements = []; }

        try { this.completedMissions = JSON.parse(localStorage.getItem('neonDashMissions')) || []; } 
        catch(e) { this.completedMissions = []; }
    }

    getDefaultStats() {
        return { gamesPlayed: 0, totalDashes: 0, totalOverdrives: 0, longestRunSeconds: 0 };
    }

    save() {
        localStorage.setItem('neonDashTotalCoins', this.totalCoins);
        localStorage.setItem('neonDashBestScore', this.bestScore);
        localStorage.setItem('neonDashUnlockedSkins', JSON.stringify(this.unlockedSkins));
        localStorage.setItem('neonDashEquippedSkin', this.equippedSkinId);
        localStorage.setItem('neonDashStats', JSON.stringify(this.stats));
        localStorage.setItem('neonDashAchievements', JSON.stringify(this.unlockedAchievements));
        localStorage.setItem('neonDashMissions', JSON.stringify(this.completedMissions));
    }

    addCoins(amount) { this.totalCoins += amount; this.save(); }
    
    updateBestScore(score) { 
        if (score > this.bestScore) { 
            this.bestScore = score; 
            this.save(); 
        } 
    }
    
    addStat(statName, value = 1) { 
        this.stats[statName] = (this.stats[statName] || 0) + value;
        this.save();
    }
    
    updateLongestRun(seconds) {
        if (seconds > this.stats.longestRunSeconds) {
            this.stats.longestRunSeconds = seconds;
            this.save();
        }
    }

    getStatValue(statName) {
        if (statName === 'totalCoins') return this.totalCoins;
        if (statName === 'bestScore') return this.bestScore;
        return this.stats[statName] || 0;
    }

    checkUnlocks() {
        let newUnlocks = [];

        ACHIEVEMENTS_DATA.forEach(ach => {
            if (!this.unlockedAchievements.includes(ach.id)) {
                if (this.getStatValue(ach.stat) >= ach.target) {
                    this.unlockedAchievements.push(ach.id);
                    newUnlocks.push({ type: 'achievement', data: ach });
                }
            }
        });

        MISSIONS_DATA.forEach(mission => {
            if (!this.completedMissions.includes(mission.id)) {
                if (this.getStatValue(mission.stat) >= mission.target) {
                    this.completedMissions.push(mission.id);
                    this.addCoins(mission.reward); 
                    newUnlocks.push({ type: 'mission', data: mission });
                }
            }
        });

        if (newUnlocks.length > 0) this.save();
        return newUnlocks;
    }

    getAchievementsData() { return ACHIEVEMENTS_DATA; }
    getMissionsData() { return MISSIONS_DATA; }

    isUnlocked(skinId) {
        const skin = SKINS.find(s => s.id === skinId);
        if (skin.type === 'default') return true;
        if (skin.type === 'score') return this.bestScore >= skin.requirement; 
        return this.unlockedSkins.includes(skinId);
    }
    buySkin(skinId) {
        const skin = SKINS.find(s => s.id === skinId);
        if (skin && skin.type === 'coins' && this.totalCoins >= skin.cost && !this.isUnlocked(skinId)) {
            this.totalCoins -= skin.cost; this.unlockedSkins.push(skinId); this.save(); return true;
        }
        return false;
    }
    equipSkin(skinId) {
        if (this.isUnlocked(skinId)) { this.equippedSkinId = skinId; this.save(); return true; }
        return false;
    }
    getEquippedSkin() { return SKINS.find(s => s.id === this.equippedSkinId) || SKINS[0]; }
}