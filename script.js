const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let platform = { x: 0, y: 0, width: 600, height: 400 };
let player, vines = [], coinsArray = [], gameSpeed = 5, isPressing = false, bgX = 0;
let gameLoop, isGameOver = false, isPaused = false, distance = 0, coins = 0, jumpPowerUpgrade = 1;

let bgMusic = document.getElementById('bg-music');
let deathSound = document.getElementById('death-sound');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    platform.y = canvas.height - 250;
    if (player && player.isOnGround) {
        player.y = platform.y - player.height;
    }
}
window.addEventListener('resize', resizeCanvas);

// Precarga de imágenes segura
const images = {};
const imagePaths = {
    bg: 'assets/Fondo videojuego.jpg',
    run1: 'assets/01.png', 
    run2: 'assets/02.png',
    swing2: 'assets/06.png', 
    vineN: 'assets/liana n_.png',
    coin: 'assets/moneda-videojuego.png'
};

let loadedImages = 0;
for (let key in imagePaths) {
    images[key] = new Image();
    images[key].src = imagePaths[key];
    images[key].onload = () => {
        loadedImages++;
        if (loadedImages === Object.keys(imagePaths).length) {
            // Solo iniciamos el juego cuando TODO está descargado en el navegador
            resizeCanvas();
            init();
        }
    };
}

class Monkey {
    constructor() {
        this.width = 80;  
        this.height = 80;
        this.x = 80;
        this.y = platform.y - this.height;
        this.vy = 0;
        this.vx = 0;
        this.gravity = 0.6;
        
        this.isSwinging = false;
        this.isOnGround = true;
        this.charge = 0;
        this.currentVine = null;
        
        this.runCycle = [images.run1, images.run2];
        this.frameCounter = 0;
    }

    draw() {
        if (!isPaused && !isGameOver) this.frameCounter++;

        if (this.isSwinging) {
            ctx.save();
            let swingSize = 160; 
            let centerX = this.x + (this.width / 2);
            let centerY = this.y + (this.height / 2);
            
            ctx.translate(centerX, centerY);
            ctx.rotate(2 * Math.PI / 180); 
            ctx.drawImage(images.swing2, -swingSize/2 + 20, -swingSize/2 - 10, swingSize, swingSize);
            ctx.restore();
        } else {
            let currentSprite = this.isOnGround ? 
                this.runCycle[Math.floor(this.frameCounter / 10) % this.runCycle.length] : images.run2; 
            ctx.drawImage(currentSprite, this.x, this.y, this.width, this.height);
        }
        
        if (this.charge > 0 && (this.isSwinging || this.isOnGround)) {
            ctx.fillStyle = '#F05022';
            ctx.fillRect(this.x, this.y - 15, this.charge * 2, 8);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y - 15, 40, 8);
        }
    }

    update() {
        if (this.isSwinging && this.currentVine) {
            this.x = this.currentVine.x + (this.currentVine.width / 2) - (this.width / 2) - 45;
            
            let maxBottom = this.currentVine.y + this.currentVine.totalHeight - 110;
            if (this.y > maxBottom) this.y = maxBottom;

            if (this.x + this.width < 0) triggerGameOver();
        } else {
            this.vy += this.gravity;
            this.y += this.vy;
            this.x += this.vx;

            // Límite de altura superior
            if (this.y < 0) { 
                this.y = 0; 
                this.vy = 0; 
            }
            
            if(this.vx > 0) this.vx -= 0.05; 

            if (this.vy >= 0 && 
                this.x < platform.x + platform.width && 
                this.x + this.width > platform.x && 
                this.y + this.height >= platform.y && 
                this.y + this.height <= platform.y + 40) {
                
                this.y = platform.y - this.height;
                this.vy = 0;
                this.isOnGround = true;
            } else {
                this.isOnGround = false;
            }
        }

        if (this.y > canvas.height) triggerGameOver();
    }

    jump() {
        if (this.isSwinging || this.isOnGround) {
            this.isSwinging = false;
            this.isOnGround = false;
            this.currentVine = null; 
            
            this.vy = -(6 + (this.charge * 0.45)) * jumpPowerUpgrade; 
            this.vx = 3 + (this.charge * 0.4); 
            this.charge = 0;
        }
    }
}

class Vine {
    constructor(x) {
        this.x = x;
        this.y = -50;
        this.width = 150; 
        this.totalHeight = (Math.random() * (canvas.height * 0.4)) + (canvas.height * 0.5); 
    }
    draw() { ctx.drawImage(images.vineN, this.x, this.y, this.width, this.totalHeight); }
    update(speed) { this.x -= speed; }
}

class Coin {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.width = 40; this.height = 40;
        this.collected = false;
    }
    draw() { if (!this.collected) ctx.drawImage(images.coin, this.x, this.y, this.width, this.height); }
    update(speed) { this.x -= speed; }
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    
    if (isPaused) {
        document.getElementById('pause-screen').classList.remove('hidden');
        bgMusic.pause();
    } else {
        document.getElementById('pause-screen').classList.add('hidden');
        bgMusic.play().catch(()=>console.log("Audio en espera"));
    }
}

document.getElementById('pause-btn').addEventListener('mousedown', (e) => { e.stopPropagation(); togglePause(); });
document.getElementById('pause-btn').addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); togglePause(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') togglePause(); });

canvas.addEventListener('mousedown', () => {
    if(!isGameOver && !isPaused) {
        if(bgMusic.paused) bgMusic.play().catch(e => console.log("Interacción requerida"));
        if (player.isSwinging || player.isOnGround) isPressing = true;
    }
});
canvas.addEventListener('mouseup', () => { if(isPressing && !isPaused) { player.jump(); isPressing = false; }});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if(!isGameOver && !isPaused) {
        if(bgMusic.paused) bgMusic.play().catch(e => console.log("Interacción requerida"));
        if (player.isSwinging || player.isOnGround) isPressing = true;
    }
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if(isPressing && !isPaused) { player.jump(); isPressing = false; }
});

function init() {
    // Forzar carga de audio
    bgMusic.load();
    deathSound.load();

    platform.y = canvas.height - 250;
    platform.x = 0;
    player = new Monkey();
    vines = [new Vine(canvas.width * 0.6)];
    coinsArray = [];
    
    distance = 0;
    isGameOver = false;
    isPaused = false;
    gameSpeed = 5;
    
    bgMusic.volume = 1.0;
    deathSound.pause();
    deathSound.currentTime = 0;

    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('custom-alert').classList.add('hidden');
    document.getElementById('distance').innerText = distance;
    
    if(!gameLoop) updateLoop();
}

function updateLoop() {
    if (isGameOver) return;
    if (isPaused) { requestAnimationFrame(updateLoop); return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpieza robusta del canvas para evitar bugs visuales

    if (isPressing && player.charge < 20) {
        player.charge += 0.5;
    }

    gameSpeed += 0.001; 
    let currentWorldSpeed = player.isSwinging ? gameSpeed * 0.4 : gameSpeed;

    bgX -= currentWorldSpeed * 0.3;
    if (bgX <= -canvas.width) bgX = 0;
    ctx.drawImage(images.bg, bgX, 0, canvas.width, canvas.height);
    ctx.drawImage(images.bg, bgX + canvas.width, 0, canvas.width, canvas.height);

    platform.x -= currentWorldSpeed;
    ctx.fillStyle = '#1D2A25'; 
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    if (vines.length > 0 && vines[vines.length - 1].x < canvas.width - 500) {
        let prevVine = vines[vines.length - 1];
        let randomDistance = prevVine.x + 500 + Math.random() * 400;
        
        vines.push(new Vine(randomDistance));
        
        let amountOfCoins = Math.floor(Math.random() * 3) + 2; 
        for(let i = 1; i <= amountOfCoins; i++) {
            let coinX = prevVine.x + ((randomDistance - prevVine.x) / (amountOfCoins + 1)) * i;
            let coinY = (canvas.height * 0.1) + (Math.random() * (canvas.height * 0.3)); 
            coinsArray.push(new Coin(coinX, coinY));
        }
    }

    coinsArray.forEach((coin) => {
        coin.update(currentWorldSpeed);
        coin.draw();

        if (!coin.collected &&
            player.x < coin.x + coin.width &&
            player.x + player.width > coin.x &&
            player.y < coin.y + coin.height &&
            player.y + player.height > coin.y) {
            
            coin.collected = true;
            coins += 1;
            document.getElementById('coins').innerText = coins;
        }
    });

    vines.forEach((vine) => {
        vine.update(currentWorldSpeed);
        vine.draw();

        if (!player.isSwinging && player.vy > 0 && 
            player.x < vine.x + vine.width && 
            player.x + player.width > vine.x && 
            player.y < vine.y + vine.totalHeight && 
            player.y + player.height > vine.y) {
                
                player.isSwinging = true;
                player.currentVine = vine; 
                player.vx = 0;
                player.vy = 0;
                
                distance += 10;
                document.getElementById('distance').innerText = distance;
        }
    });

    if (vines.length > 0 && vines.x < -150) vines.shift();
    coinsArray = coinsArray.filter(c => c.x > -100 && !c.collected);

    player.update();
    player.draw();

    gameLoop = requestAnimationFrame(updateLoop);
}

function triggerGameOver() {
    isGameOver = true;
    bgMusic.volume = 0.2; 
    deathSound.currentTime = 0;
    deathSound.play().catch(e => console.log("Audio denegado"));

    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-distance').innerText = distance;
    document.getElementById('final-coins').innerText = coins;
}

function showCustomAlert(msg) {
    document.getElementById('alert-text').innerText = msg;
    document.getElementById('custom-alert').classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('custom-alert').classList.add('hidden');
}

document.getElementById('close-alert-x').addEventListener('click', closeCustomAlert);
document.getElementById('close-alert-ok').addEventListener('click', closeCustomAlert);
document.getElementById('restart-btn').addEventListener('click', init);

document.getElementById('buy-jump').addEventListener('click', () => {
    if (coins >= 10) {
        coins -= 10;
        jumpPowerUpgrade += 0.2;
        document.getElementById('coins').innerText = coins;
        showCustomAlert("¡Fuerza de salto mejorada!");
    } else {
        showCustomAlert("No tienes suficientes monedas.");
    }
});
