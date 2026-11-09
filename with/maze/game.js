// 游戏主文件
import { GameMap } from './gameMap.js';
import { Player } from './player.js';
import { Monster } from './monster.js';
import { Item } from './item.js';
import { Renderer } from './renderer.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 游戏配置
        this.tileSize = 32;
        this.viewRange = 9; // 视野范围
        
        // 初始化游戏
        this.init();
        
        // 绑定事件
        this.bindEvents();
        
        // 游戏循环
        this.lastTime = 0;
        this.gameLoop(0);
    }
    
    init() {
        // 创建地图
        this.gameMap = new GameMap();
        
        // 设置画布大小（自适应容器）
        this.resizeCanvas();
        
        // 创建玩家
        this.player = new Player(1, 28, this); // 左下角红旗位置
        
        // 创建怪物
        this.monsters = this.gameMap.createMonsters();
        
        // 创建道具
        this.items = this.gameMap.createItems();
        
        // 创建渲染器
        this.renderer = new Renderer(this);
        
        // 游戏状态
        this.gameOver = false;
        this.gameWon = false;
        this.isPaused = false;
        
        // 更新UI
        this.updateUI();
    }
    
    resizeCanvas() {
        const visibleSize = this.viewRange * 2 + 1;
        const wrapper = this.canvas.parentElement;
        const style = window.getComputedStyle(wrapper);
        const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        
        const availW = Math.max(160, wrapper.clientWidth - padX - 6);
        const availH = Math.max(160, wrapper.clientHeight - padY - 6);
        const avail = Math.min(availW, availH);
        
        // 计算每格像素大小，限制在 12~32 之间并取整避免模糊
        let tile = Math.floor(avail / visibleSize);
        tile = Math.max(12, Math.min(32, tile));
        
        this.tileSize = tile;
        this.canvas.width = visibleSize * tile;
        this.canvas.height = visibleSize * tile;
        
        if (this.renderer) {
            this.renderer.tileSize = tile;
        }
    }
    
    bindEvents() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.isPaused) return;
            
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.player.move(0, -1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.player.move(0, 1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.player.move(-1, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.player.move(1, 0);
                    break;
                case ' ':
                    e.preventDefault();
                    this.player.useLadder();
                    break;
            }
            
            this.checkItemCollection();
            this.updateUI();
        });
        
        // 重新开始按钮
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
        
        document.getElementById('modalRestartBtn').addEventListener('click', () => {
            this.restart();
        });
        
        // 窗口尺寸/缩放变化时重新计算画布尺寸
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => this.resizeCanvas());
            ro.observe(this.canvas.parentElement);
        }
    }
    
    gameLoop(timestamp) {
        if (this.gameOver) {
            requestAnimationFrame((t) => this.gameLoop(t));
            return;
        }
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // 更新游戏逻辑（每秒一次）
        if (!this.isPaused && deltaTime > 0) {
            this.update(deltaTime);
        }
        
        // 渲染
        this.renderer.render();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(deltaTime) {
        // 更新怪物
        this.monsters.forEach(monster => {
            if (monster.isAlive) {
                monster.update(this.player);
            }
        });
        
        // 更新玩家战斗系统
        this.player.updateCombat(this.monsters);
        
        // 检查游戏结束
        if (this.player.health <= 0) {
            this.endGame(false, '你的生命值耗尽了！');
        }
    }
    
    checkItemCollection() {
        const px = this.player.x;
        const py = this.player.y;
        
        // 检查道具收集
        this.items = this.items.filter(item => {
            if (item.x === px && item.y === py && !item.collected) {
                this.player.collectItem(item);
                this.showMessage(`获得 ${item.getDisplayName()}`);
                return false;
            }
            return true;
        });
        
        // 检查黑洞
        const tile = this.gameMap.getTile(px, py);
        if (tile === 'blackhole') {
            if (this.player.blackholeKeys > 0) {
                this.endGame(true, '恭喜你！成功通过黑洞，赢得胜利！');
            } else {
                this.endGame(false, '你掉入了黑洞！需要黑洞钥匙才能通过。');
            }
        }
        
        // 检查闪电
        if (tile === 'lightning') {
            this.player.hitByLightning();
            this.showMessage('⚡ 被闪电击中！');
        }
    }
    
    updateUI() {
        document.getElementById('health').textContent = this.player.health;
        document.getElementById('arrows').textContent = this.player.arrows;
        document.getElementById('keys').textContent = this.player.keys;
        document.getElementById('blackholeKeys').textContent = this.player.blackholeKeys;
        
        // 更新背包状态
        document.getElementById('sword-status').textContent = this.player.hasSword ? '✅' : '❌';
        document.getElementById('bow-status').textContent = this.player.hasBow ? '✅' : '❌';
        document.getElementById('shield-status').textContent = this.player.hasShield ? '✅' : '❌';
        document.getElementById('ladder-count').textContent = this.player.ladderUses;
        
        // 更新背包高亮
        document.getElementById('inv-sword').classList.toggle('active', this.player.hasSword);
        document.getElementById('inv-bow').classList.toggle('active', this.player.hasBow);
        document.getElementById('inv-shield').classList.toggle('active', this.player.hasShield);
        document.getElementById('inv-ladder').classList.toggle('active', this.player.ladderUses > 0);
    }
    
    showMessage(text) {
        const messageEl = document.getElementById('gameMessage');
        messageEl.textContent = text;
        messageEl.classList.remove('hidden');
        
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 2000);
    }
    
    endGame(won, message) {
        this.gameOver = true;
        this.gameWon = won;
        
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const messageEl = document.getElementById('gameOverMessage');
        
        title.textContent = won ? '🎉 胜利！' : '💀 游戏结束';
        messageEl.textContent = message;
        
        modal.classList.remove('hidden');
    }
    
    restart() {
        // 隐藏模态框
        document.getElementById('gameOverModal').classList.add('hidden');
        
        // 重新初始化游戏
        this.init();
        this.lastTime = 0;
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});