import { Player } from './player.js';
import { InputHandler } from './input.js';
import { Obstacle } from './obstacle.js';
import { Coin } from './coin.js';
import { Background } from './background.js';
import { AudioManager } from './audio.js';
import { UIManager } from './ui.js';
import { ProgressionManager } from './progression.js';

// استعادة تسجيل Service Worker للنسخة النهائية (Offline / PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('NEON DASH: Service Worker Registered'))
            .catch(err => console.error('NEON DASH: Service Worker Failed', err));
    });
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const audioManager = new AudioManager();
const input = new InputHandler(audioManager);
const progression = new ProgressionManager();
const player = new Player();
let background = new Background(canvas.width, canvas.height, canvas.height - 100);

player.applySkin(progression.getEquippedSkin().colors);

const GAME_STATES = { MENU: 0, PLAYING: 1, PAUSED: 2, GAME_OVER: 3, SETTINGS: 4, TUTORIAL: 5, SKINS: 6, ACHIEVEMENTS: 7 };
let currentState = GAME_STATES.MENU;

const ui = new UIManager({
    onPlay: () => { restartGame(); },
    onAchievements: () => { currentState = GAME_STATES.ACHIEVEMENTS; ui.showScreen('achievements'); },
    onSkins: () => { currentState = GAME_STATES.SKINS; ui.showScreen('skins'); }, 
    onSettings: () => { currentState = GAME_STATES.SETTINGS; ui.showScreen('settings'); },
    onTutorial: () => { currentState = GAME_STATES.TUTORIAL; ui.showScreen('tutorial'); },
    onResume: () => { currentState = GAME_STATES.PLAYING; ui.showScreen(null); },
    onRestart: () => { restartGame(); },
    onHome: () => { currentState = GAME_STATES.MENU; ui.showScreen('main'); },
    onSkinChange: () => { player.applySkin(progression.getEquippedSkin().colors); } 
}, audioManager, progression);

let obstacles = []; let coinsArray = [];
let score = 0; let coinsCount = 0; 
let gameParticles = []; let floatingTexts = []; 

const MAX_ENERGY = 100; let energy = 0;
let isOverdriveActive = false; let overdriveTimer = 0;
const OVERDRIVE_DURATION = 6000; const OVERDRIVE_SPEED_MULTIPLIER = 1.3; 

let baseSpeed = 6; let currentSpeed = baseSpeed;
let spawnInterval = 1600; let minSpawnInterval = 850; 
let spawnTimer = 1600; let coinSpawnInterval = 2000; let coinSpawnTimer = 1000;

let lastTime = 0; let globalTime = 0; let worldTime = 0;  
let shakeTimer = 0; let shakeIntensity = 0; let flashTimer = 0; 

let pauseToggleFlag = false;
let runTimeSeconds = 0; 
let previousPlayerState = 'NORMAL'; 

export function triggerShake(duration, intensity) { shakeTimer = duration; shakeIntensity = intensity; }

function spawnParticles(x, y, count, fillColor, shadowColor, isExplosion = false) {
    for(let i = 0; i < count; i++) {
        gameParticles.push({
            x: x, y: y,
            vx: isExplosion ? (Math.random() - 0.5) * 15 : (Math.random() * -10) - 2,
            vy: isExplosion ? (Math.random() - 0.5) * 15 : (Math.random() - 0.5) * 10,
            size: Math.random() * 3 + 2, life: Math.random() * (isExplosion ? 400 : 200) + 100,
            fillColor: fillColor, shadowColor: shadowColor
        });
    }
}

function checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y);
}

function processUnlocks() {
    const unlocks = progression.checkUnlocks();
    if (unlocks.length > 0) {
        if(audioManager.playAchievementUnlock) audioManager.playAchievementUnlock();
        unlocks.forEach(u => {
            if (u.type === 'achievement') ui.showToast(u.data.title, u.data.desc, false);
            else if (u.type === 'mission') ui.showToast(u.data.title, u.data.reward, true);
        });
    }
}

function restartGame() {
    player.reset(); player.applySkin(progression.getEquippedSkin().colors);
    obstacles = []; coinsArray = []; gameParticles = []; floatingTexts = [];
    currentSpeed = baseSpeed; spawnInterval = 1600; spawnTimer = 1600; coinSpawnTimer = 1000;
    score = 0; coinsCount = 0; energy = 0; runTimeSeconds = 0;
    isOverdriveActive = false; overdriveTimer = 0; flashTimer = 0;
    currentState = GAME_STATES.PLAYING;
    background = new Background(canvas.width, canvas.height, canvas.height - 100);
    ui.showScreen(null); audioManager.init(); 
    
    progression.addStat('gamesPlayed', 1);
    processUnlocks(); 
}

function drawGround() {
    const groundMargin = 100; const groundY = canvas.height - groundMargin;
    ctx.save();
    ctx.fillStyle = '#08050c'; ctx.fillRect(0, groundY, canvas.width, groundMargin);
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY);
    ctx.strokeStyle = '#ff00a0'; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#ff00a0'; ctx.stroke();
    ctx.shadowBlur = 5; ctx.shadowColor = '#00ffff'; ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
    ctx.setLineDash([40, 60]); ctx.lineDashOffset = -(worldTime * currentSpeed * 0.1) % 100;
    ctx.beginPath(); ctx.moveTo(0, groundY + 30); ctx.lineTo(canvas.width, groundY + 30); ctx.stroke();
    ctx.restore();
}

function drawHUD() {
    ctx.save();
    ctx.font = '20px "Segoe UI", Arial, sans-serif'; ctx.shadowBlur = 10;
    const isMobile = window.innerWidth < 768;
    
    ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.textAlign = 'left';
    if(!isMobile) ctx.fillText('SCORE', 30, 40);
    ctx.font = 'bold 28px "Segoe UI"'; ctx.fillText(Math.floor(score), 30, isMobile ? 45 : 75);

    ctx.fillStyle = '#ffee00'; ctx.shadowColor = '#ffee00'; ctx.textAlign = 'center';
    ctx.font = '20px "Segoe UI"'; if(!isMobile) ctx.fillText('COINS', canvas.width / 2, 40);
    ctx.font = 'bold 28px "Segoe UI"'; ctx.fillText(coinsCount, canvas.width / 2, isMobile ? 45 : 75);

    ctx.fillStyle = '#ff00a0'; ctx.shadowColor = '#ff00a0'; ctx.textAlign = 'right';
    ctx.font = '20px "Segoe UI"'; if(!isMobile) ctx.fillText('BEST', canvas.width - 30, 40);
    ctx.font = 'bold 28px "Segoe UI"'; ctx.fillText(Math.floor(progression.bestScore), canvas.width - 30, isMobile ? 45 : 75);
    
    const barWidth = isMobile ? 180 : 220; const barHeight = 15;
    const barX = canvas.width / 2 - barWidth / 2; const barY = isMobile ? 65 : 95; 
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.shadowBlur = 0; ctx.strokeRect(barX, barY, barWidth, barHeight);

    let energyColor = energy === MAX_ENERGY ? '#ffee00' : '#00ffff';
    ctx.fillStyle = energyColor; ctx.shadowBlur = 10; ctx.shadowColor = energyColor;
    ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * (energy / MAX_ENERGY), barHeight - 4);

    ctx.textAlign = 'center'; ctx.font = 'bold 16px "Segoe UI"';
    if (isOverdriveActive) {
        ctx.fillStyle = '#ffee00'; ctx.fillText(`OVERDRIVE ${(overdriveTimer / 1000).toFixed(1)}`, canvas.width / 2, barY + 35);
    } else if (energy === MAX_ENERGY) {
        ctx.globalAlpha = 0.5 + Math.sin(globalTime * 0.01) * 0.5;
        ctx.fillStyle = '#ffee00'; ctx.fillText('OVERDRIVE READY', canvas.width / 2, barY + 35);
        ctx.globalAlpha = 1.0;
    } else {
        if(!isMobile){ ctx.fillStyle = '#00ffff'; ctx.fillText('ENERGY', canvas.width / 2, barY + 35); }
    }
    ctx.restore();
}

function update(deltaTime) {
    const keys = input.keys;

    const pausePressed = keys.includes('KeyP') || keys.includes('Escape');
    if (pausePressed && !pauseToggleFlag) {
        pauseToggleFlag = true;
        if (currentState === GAME_STATES.PLAYING) {
            currentState = GAME_STATES.PAUSED; ui.showScreen('pause'); audioManager.playClick();
        } else if (currentState === GAME_STATES.PAUSED) {
            currentState = GAME_STATES.PLAYING; ui.showScreen(null); audioManager.playClick();
        } else if ([GAME_STATES.SETTINGS, GAME_STATES.TUTORIAL, GAME_STATES.SKINS, GAME_STATES.ACHIEVEMENTS].includes(currentState)) {
            currentState = GAME_STATES.MENU; ui.showScreen('main'); audioManager.playClick();
        }
    } else if (!pausePressed) { pauseToggleFlag = false; }

    if (currentState === GAME_STATES.PAUSED) return;

    if (shakeTimer > 0) shakeTimer -= deltaTime;
    if (flashTimer > 0) flashTimer -= deltaTime;
    globalTime += deltaTime;
    
    if (currentState !== GAME_STATES.PLAYING && currentState !== GAME_STATES.GAME_OVER) {
        background.update(baseSpeed * 0.2, deltaTime); worldTime += deltaTime * 0.2;
    }

    const groundY = canvas.height - 100;
    const playerHitbox = player.getHitbox();

    if (currentState === GAME_STATES.PLAYING) {
        
        runTimeSeconds += deltaTime / 1000;
        if (runTimeSeconds > 0 && Math.floor(runTimeSeconds) % 10 === 0) { 
            progression.updateLongestRun(runTimeSeconds);
            processUnlocks();
        }

        if (energy >= MAX_ENERGY && keys.includes('KeyE') && !isOverdriveActive) {
            isOverdriveActive = true; energy = 0; overdriveTimer = OVERDRIVE_DURATION;
            progression.addStat('totalOverdrives', 1); 
            processUnlocks();
            
            audioManager.playOverdrive(); 
            triggerShake(250, 12); spawnParticles(player.x, player.y, 40, '#ffffff', '#ffee00', true);
        }

        let timeScale = isOverdriveActive ? OVERDRIVE_SPEED_MULTIPLIER : 1;
        if (isOverdriveActive) {
            overdriveTimer -= deltaTime;
            if (overdriveTimer <= 0) { isOverdriveActive = false; overdriveTimer = 0; }
        }
        player.isOverdrive = isOverdriveActive;

        if (!isOverdriveActive && energy < MAX_ENERGY) {
            energy += 0.2 * (deltaTime / 16); 
            energy += (currentSpeed * 0.005) * (deltaTime / 16); 
            if (energy > MAX_ENERGY) energy = MAX_ENERGY;
        }

        let activeDeltaTime = deltaTime * timeScale; worldTime += activeDeltaTime;
        
        let oldScore = score;
        score += 0.1 * activeDeltaTime; 
        currentSpeed += 0.00015 * activeDeltaTime; 
        if (currentSpeed > 14) currentSpeed = 14; 
        
        if (Math.floor(score) > Math.floor(oldScore) && Math.floor(score) % 100 === 0) {
            progression.updateBestScore(score);
            processUnlocks();
        }

        if (spawnInterval > minSpawnInterval) spawnInterval -= 0.015 * activeDeltaTime;

        background.update(currentSpeed, activeDeltaTime);

        spawnTimer -= activeDeltaTime;
        if (spawnTimer <= 0) {
            obstacles.push(new Obstacle(canvas.width, groundY, currentSpeed));
            spawnTimer = spawnInterval + (Math.random() * 500 - 100);
        }

        coinSpawnTimer -= activeDeltaTime;
        if (coinSpawnTimer <= 0) {
            coinsArray.push(new Coin(canvas.width, groundY, currentSpeed));
            coinSpawnTimer = coinSpawnInterval + (Math.random() * 1000 - 500);
        }

        obstacles.forEach(obs => obs.update(activeDeltaTime));
        obstacles = obstacles.filter(obs => !obs.markedForDeletion);
        
        for (let obs of obstacles) {
            if (checkCollision(playerHitbox, obs.getHitbox())) {
                if (isOverdriveActive) {
                    obs.markedForDeletion = true; 
                    score += 150; 
                    audioManager.playDestroy(); triggerShake(200, 15); 
                    spawnParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, 30, '#ff0055', '#ffee00', true);
                    floatingTexts.push({ x: obs.x, y: obs.y, text: 'DESTROYED! +150', life: 800, opacity: 1 });
                    
                    progression.updateBestScore(score);
                    processUnlocks();
                } else {
                    currentState = GAME_STATES.GAME_OVER; isOverdriveActive = false; 
                    triggerShake(400, 20); flashTimer = 200; 
                    audioManager.playHit(); audioManager.playGameOver(); player.die(spawnParticles);
                    
                    progression.updateLongestRun(runTimeSeconds);
                    progression.updateBestScore(score); 
                    processUnlocks();
                    
                    ui.updateGameOverStats(score, progression.bestScore, coinsCount); ui.showScreen('gameover');
                    break; 
                }
            }
        }

        coinsArray.forEach(c => c.update(activeDeltaTime));
        coinsArray = coinsArray.filter(c => !c.markedForDeletion);
        for (let c of coinsArray) {
            if (checkCollision(playerHitbox, c.getHitbox())) {
                c.markedForDeletion = true; coinsCount++; 
                progression.addCoins(1); 
                processUnlocks(); 
                
                audioManager.playCoin(); 
                let coinScore = isOverdriveActive ? 100 : 50; 
                score += coinScore;  
                
                if (!isOverdriveActive) { energy += 15; if (energy > MAX_ENERGY) energy = MAX_ENERGY; }
                
                spawnParticles(c.x + c.radius, c.y + c.radius, 15, '#ffffff', isOverdriveActive ? '#ffee00' : player.skinColors.main);
                floatingTexts.push({ x: c.x, y: c.y, text: `+${coinScore}`, life: 800, opacity: 1 });
            }
        }

        previousPlayerState = player.state;
        player.update(deltaTime, keys, canvas.height, triggerShake, spawnParticles, audioManager);
        
        if (player.state === 'DASHING' && previousPlayerState !== 'DASHING') {
            progression.addStat('totalDashes', 1);
            processUnlocks();
        }

    } else if (currentState === GAME_STATES.GAME_OVER) {
        player.update(deltaTime, [], canvas.height, triggerShake, spawnParticles, audioManager);
    } else {
        player.update(deltaTime, [], canvas.height, null, null, null);
    }

    gameParticles.forEach(p => { p.x += p.vx * (deltaTime / 16); p.y += p.vy * (deltaTime / 16); p.life -= deltaTime; p.size *= 0.95; });
    gameParticles = gameParticles.filter(p => p.life > 0 && p.size > 0.5);

    floatingTexts.forEach(ft => { ft.y -= 1.5 * (deltaTime / 16); ft.life -= deltaTime; ft.opacity = Math.max(0, ft.life / 800); });
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save(); 
    if (shakeTimer > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity; const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy); 
    }

    background.draw(ctx); drawGround();
    if (currentState === GAME_STATES.PLAYING || currentState === GAME_STATES.PAUSED || currentState === GAME_STATES.GAME_OVER) {
        coinsArray.forEach(c => c.draw(ctx)); obstacles.forEach(obs => obs.draw(ctx));
    }
    player.draw(ctx);

    gameParticles.forEach(p => {
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life / 400); ctx.fillStyle = p.fillColor;
        ctx.shadowBlur = 10; ctx.shadowColor = p.shadowColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    floatingTexts.forEach(ft => {
        ctx.save(); ctx.globalAlpha = ft.opacity; const txtColor = isOverdriveActive ? '#ffee00' : player.skinColors.main;
        ctx.fillStyle = txtColor; ctx.shadowBlur = 10; ctx.shadowColor = txtColor;
        ctx.font = 'bold 20px "Segoe UI"'; ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
    });

    if (isOverdriveActive && currentState !== GAME_STATES.PAUSED) {
        ctx.fillStyle = `rgba(255, 238, 0, ${0.03 + Math.sin(globalTime * 0.02) * 0.02})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore(); 

    if (currentState === GAME_STATES.PLAYING || currentState === GAME_STATES.PAUSED) { drawHUD(); }

    if (flashTimer > 0) {
        ctx.fillStyle = `rgba(255, 0, 85, ${flashTimer / 200})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function gameLoop(timestamp) {
    const deltaTime = Math.min(timestamp - lastTime, 32); 
    lastTime = timestamp;
    update(deltaTime); draw();
    requestAnimationFrame(gameLoop);
}

ui.showScreen('main');
requestAnimationFrame((timestamp) => { lastTime = timestamp; gameLoop(timestamp); });