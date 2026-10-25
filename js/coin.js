export class Coin {
    constructor(canvasWidth, groundY, speed) {
        this.radius = 15;
        this.width = this.radius * 2; 
        this.height = this.radius * 2;
        this.x = canvasWidth;
        
        // [تعديل التوازن]: العملة المرتفعة أصبحت أعلى لتتطلب قفزة ممتازة من اللاعب
        const isHigh = Math.random() > 0.5;
        this.y = isHigh ? groundY - 140 : groundY - this.radius * 2 - 10;

        this.speed = speed;
        this.markedForDeletion = false;
        
        this.rotationAngle = Math.random() * Math.PI; 
        this.pulseAngle = 0; 
    }

    update(deltaTime) {
        this.x -= this.speed * (deltaTime / 16);
        this.rotationAngle += 0.1 * (deltaTime / 16); 
        this.pulseAngle += 0.05 * (deltaTime / 16);   
        
        if (this.x + this.width < 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        
        let cx = this.x + this.radius;
        let cy = this.y + this.radius;
        
        let scaleX = Math.abs(Math.cos(this.rotationAngle));
        let glowScale = 1 + Math.sin(this.pulseAngle) * 0.2; 
        
        ctx.translate(cx, cy);
        ctx.scale(scaleX, 1); 

        ctx.shadowBlur = 20 * glowScale;
        ctx.shadowColor = '#ffee00';
        ctx.fillStyle = 'rgba(255, 170, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.7);
        ctx.lineTo(0, this.radius * 0.7);
        ctx.stroke();

        ctx.restore();
    }

    getHitbox() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}