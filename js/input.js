export class InputHandler {
    constructor(audioManager) {
        this.keys = [];
        
        window.addEventListener('keydown', e => {
            let key = e.code === 'ShiftLeft' || e.code === 'ShiftRight' ? 'Shift' : e.code;
            if (audioManager) audioManager.init();
            
            if (['Space', 'Shift', 'KeyR', 'KeyE', 'KeyP', 'Escape', 'Enter'].includes(key)) {
                if (key !== 'KeyR') e.preventDefault(); 
                if (this.keys.indexOf(key) === -1) {
                    this.keys.push(key);
                }
            }
        });

        window.addEventListener('keyup', e => {
            let key = e.code === 'ShiftLeft' || e.code === 'ShiftRight' ? 'Shift' : e.code;
            if (['Space', 'Shift', 'KeyR', 'KeyE', 'KeyP', 'Escape', 'Enter'].includes(key)) {
                this.keys.splice(this.keys.indexOf(key), 1);
            }
        });
    }
}