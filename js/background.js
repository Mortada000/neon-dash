class Layer {
    constructor(canvasWidth, canvasHeight, speedModifier, type, groundY) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.speedModifier = speedModifier;
        this.x = 0;
        this.type = type; // 'sky', 'bg-city', 'fg-city'
        this.groundY = groundY;
        this.buildings = this.generateBuildings();
        this.stars = this.generateStars();
    }

    generateStars() {
        let stars = [];
        if (this.type !== 'sky') return stars;
        for (let i = 0; i < 50; i++) {
            stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height * 0.7,
                size: Math.random() * 2,
                opacity: Math.random()
            });
        }
        return stars;
    }

    generateBuildings() {
        let buildings = [];
        if (this.type === 'sky') return buildings;

        let totalWidth = 0;
        while (totalWidth < this.width * 2) { // توليد مباني تكفي لضعف الشاشة للتكرار السلس
            let w = (this.type === 'bg-city' ? 60 : 80) + Math.random() * 60;
            let h = (this.type === 'bg-city' ? 100 : 50) + Math.random() * 150;
            let windows = [];
            
            // توليد نوافذ نيون عشوائية للمباني
            for (let i = 0; i < 5; i++) {
                if (Math.random() > 0.3) {
                    windows.push({
                        wx: Math.random() * (w - 15) + 5,
                        wy: Math.random() * (h - 20) + 10,
                        color: Math.random() > 0.5 ? '#00ffff' : '#ff00a0'
                    });
                }
            }
            
            buildings.push({ width: w, height: h, windows: windows });
            totalWidth += w;
        }
        return buildings;
    }

    update(globalSpeed, deltaTime) {
        // الحركة تعتمد على سرعة اللعبة الأساسية + معامل سرعة الطبقة
        this.x -= globalSpeed * this.speedModifier * (deltaTime / 16);
        // عند خروج الطبقة خارج الشاشة، نعيدها للبداية لدوران لا نهائي
        if (this.x <= -this.width) this.x = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, 0);

        // رسم الطبقة مرتين (جنباً إلى جنب) لضمان عدم ظهور فراغ أثناء الحركة
        for (let i = 0; i < 2; i++) {
            let offsetX = i * this.width;

            if (this.type === 'sky') {
                // تدرج لوني للسماء الداكنة
                let grad = ctx.createLinearGradient(0, 0, 0, this.height);
                grad.addColorStop(0, '#050510');
                grad.addColorStop(1, '#1a0b2e');
                ctx.fillStyle = grad;
                ctx.fillRect(offsetX, 0, this.width, this.height);

                // النجوم الخافتة
                ctx.fillStyle = '#ffffff';
                this.stars.forEach(star => {
                    ctx.globalAlpha = star.opacity;
                    ctx.fillRect(offsetX + star.x, star.y, star.size, star.size);
                });
                ctx.globalAlpha = 1;

            } else {
                // رسم المباني
                let currentX = offsetX;
                ctx.fillStyle = this.type === 'bg-city' ? '#0a0a1a' : '#101026';
                ctx.strokeStyle = this.type === 'bg-city' ? '#1a1a3a' : '#2a1a4a';

                this.buildings.forEach(b => {
                    let by = this.groundY - b.height;
                    
                    // جسم المبنى
                    ctx.shadowBlur = 0;
                    ctx.fillRect(currentX, by, b.width, b.height);
                    ctx.strokeRect(currentX, by, b.width, b.height);

                    // النوافذ (Neon)
                    ctx.shadowBlur = 10;
                    b.windows.forEach(w => {
                        ctx.shadowColor = w.color;
                        ctx.fillStyle = w.color;
                        ctx.fillRect(currentX + w.wx, by + w.wy, 4, 8);
                    });

                    currentX += b.width;
                });
            }
        }
        ctx.restore();
    }
}

export class Background {
    constructor(canvasWidth, canvasHeight, groundY) {
        this.layers = [
            new Layer(canvasWidth, canvasHeight, 0.1, 'sky', groundY),
            new Layer(canvasWidth, canvasHeight, 0.3, 'bg-city', groundY),
            new Layer(canvasWidth, canvasHeight, 0.6, 'fg-city', groundY)
        ];
    }

    update(globalSpeed, deltaTime) {
        this.layers.forEach(layer => layer.update(globalSpeed, deltaTime));
    }

    draw(ctx) {
        this.layers.forEach(layer => layer.draw(ctx));
    }
}