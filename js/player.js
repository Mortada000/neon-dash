const STATES = { NORMAL: 'NORMAL', JUMPING: 'JUMPING', DASHING: 'DASHING' };

export class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.baseX = 100; 
        this.skinColors = { main: '#00ffff', dark: '#0a0b10', visor: '#ffffff', trail: '#00aaff' };
        this.reset(); 
    }

    applySkin(skinColors) {
        this.skinColors = skinColors;
    }

    reset() {
        this.x = this.baseX; 
        this.y = 0;   
        this.vy = 0;          
        this.gravity = 0.85;   
        this.jumpStrength = 14.5; 
        this.state = STATES.NORMAL;
        this.dashDuration = 220; 
        this.dashCooldown = 800; 
        this.dashSpeed = 18;     
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.trail = [];      
        this.isDead = false;
        this.animTime = 0; 
        this.isOverdrive = false; 
    }

    update(deltaTime, input, canvasHeight, triggerShake, spawnParticles, audioManager) {
        const groundMargin = 100; 
        const groundY = canvasHeight - groundMargin;
        this.animTime += deltaTime;
        
        const mainColor = this.isOverdrive ? '#ffee00' : this.skinColors.main;

        if (!this.isDead) {
            if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= deltaTime;

            if (input.includes('Shift') && this.state !== STATES.DASHING && this.dashCooldownTimer <= 0) {
                this.state = STATES.DASHING;
                this.dashTimer = this.dashDuration;
                this.vy = 0; 
                
                if (audioManager) audioManager.playDash();
                if (triggerShake) triggerShake(150, this.isOverdrive ? 10 : 5); 
                if (spawnParticles) spawnParticles(this.x, this.y + this.height/2, 20, '#ffffff', mainColor); 
            }

            if (this.state === STATES.DASHING) {
                this.x += this.dashSpeed * (deltaTime / 16);
                this.dashTimer -= deltaTime;
                this.trail.push({ x: this.x, y: this.y, opacity: 0.7, type: 'dash' });

                if (this.dashTimer <= 0) {
                    this.state = STATES.NORMAL;
                    this.dashCooldownTimer = this.dashCooldown; 
                }
            } else {
                if (this.x > this.baseX) {
                    this.x -= (this.x - this.baseX) * 0.1; 
                    if (Math.abs(this.x - this.baseX) < 1) this.x = this.baseX;
                }

                if (input.includes('Space') && this.onGround(groundY)) {
                    this.vy = -this.jumpStrength;
                    this.state = STATES.JUMPING;
                    if (audioManager) audioManager.playJump();
                    if (spawnParticles) spawnParticles(this.x, groundY, 5, '#aaaaaa', '#000000'); 
                }
            }
        }

        this.y += this.vy;
        if (!this.onGround(groundY)) {
            this.vy += this.gravity;
            if (this.state !== STATES.DASHING && !this.isDead) this.state = STATES.JUMPING;
            
            if (!this.isDead && this.state === STATES.JUMPING && Math.random() > 0.5) {
                this.trail.push({ x: this.x, y: this.y, opacity: 0.3, type: 'jump' });
            }
        } else {
            this.vy = 0;
            this.y = groundY - this.height;
            if (this.state !== STATES.DASHING && !this.isDead) this.state = STATES.NORMAL;
        }

        this.trail.forEach(t => t.opacity -= (t.type === 'dash' ? 0.08 : 0.05) * (deltaTime / 16));
        this.trail = this.trail.filter(t => t.opacity > 0);

        if (this.isOverdrive && Math.random() < 0.3 && !this.isDead) {
            if (spawnParticles) spawnParticles(this.x + Math.random() * this.width, this.y + Math.random() * this.height, 2, '#ffffff', '#ffee00');
        }
    }

    getHitbox() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }

    die(spawnParticles) {
        this.isDead = true; this.state = STATES.NORMAL; this.isOverdrive = false; 
        if(spawnParticles) spawnParticles(this.x + 20, this.y + 20, 50, '#ff0055', '#ff0055', true);
    }

    onGround(groundY) { return this.y >= groundY - this.height; }

    draw(ctx) {
        const mainColor = this.isOverdrive ? '#ffee00' : this.skinColors.main;

        this.trail.forEach(t => {
            ctx.save();
            ctx.globalAlpha = t.opacity;
            ctx.fillStyle = t.type === 'dash' ? mainColor : (this.isOverdrive ? '#ffaa00' : this.skinColors.trail);
            ctx.fillRect(t.x, t.y, this.width, this.height);
            ctx.restore();
        });

        if (!this.isDead) {
            ctx.save();
            let breathY = (this.state === STATES.NORMAL) ? Math.sin(this.animTime * 0.005) * 2 : 0;
            let currentY = this.y + breathY;
            let stretchX = this.state === STATES.DASHING ? 15 : 0; 
            
            ctx.fillStyle = this.skinColors.dark; 
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 2;
            ctx.shadowBlur = this.state === STATES.DASHING ? (this.isOverdrive ? 40 : 20) : (this.isOverdrive ? 15 : 5); 
            ctx.shadowColor = mainColor;
            
            ctx.beginPath();
            ctx.rect(this.x - stretchX, currentY, this.width + stretchX, this.height);
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(this.x + 10, currentY + 10);
            ctx.lineTo(this.x + 30, currentY + 10);
            ctx.moveTo(this.x + 10, currentY + 20);
            ctx.lineTo(this.x + 25, currentY + 20);
            ctx.strokeStyle = this.skinColors.trail;
            ctx.stroke();

            ctx.fillStyle = this.isOverdrive ? '#ffffff' : this.skinColors.visor; 
            ctx.shadowBlur = 15;
            ctx.shadowColor = mainColor;
            let visorY = currentY + 8 + (this.state === STATES.JUMPING ? -2 : 0); 
            ctx.fillRect(this.x + 20, visorY, 25, 8); 

            if (this.state === STATES.DASHING) {
                ctx.fillStyle = '#ffffff'; 
                ctx.fillRect(this.x - 30, currentY + 10, 20, 2);
                ctx.fillRect(this.x - 45, currentY + 25, 30, 2);
            }
            ctx.restore();
        }
    }
}