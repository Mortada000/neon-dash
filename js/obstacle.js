export class Obstacle {
    constructor(canvasWidth, groundY, speed) {
        this.width = 30;
        this.height = 50 + Math.random() * 30; 
        this.x = canvasWidth;
        this.y = groundY - this.height;
        this.speed = speed;
        this.markedForDeletion = false;
        
        // شكل عشوائي لتفاصيل العقبة الداخلية
        this.patternOffset = Math.random() * 10;
    }

    update(deltaTime) {
        this.x -= this.speed * (deltaTime / 16);
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        
        // الكتلة الداكنة الأساسية
        ctx.fillStyle = '#050205';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // حواف الـ Neon (Magenta/Red)
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0055'; 
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // تفاصيل هندسية تحذيرية (Caution stripes)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#880022';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = this.patternOffset; i < this.height; i += 15) {
            ctx.moveTo(this.x + 2, this.y + i);
            ctx.lineTo(this.x + this.width - 2, this.y + i + 10);
        }
        ctx.stroke();

        ctx.restore();
    }

    getHitbox() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}