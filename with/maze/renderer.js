// 渲染器类
export class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.tileSize = game.tileSize;
        this.viewRange = game.viewRange;
    }
    
    render() {
        const player = this.game.player;
        const viewRange = this.viewRange;
        
        // 同步最新的格子尺寸（窗口缩放时会变化）
        this.tileSize = this.game.tileSize;
        
        // 清空画布
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        
        // 计算视野范围
        const startX = Math.max(0, player.x - viewRange);
        const endX = Math.min(this.game.gameMap.width - 1, player.x + viewRange);
        const startY = Math.max(0, player.y - viewRange);
        const endY = Math.min(this.game.gameMap.height - 1, player.y + viewRange);
        
        // 渲染地图
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const screenX = (x - player.x + viewRange) * this.tileSize;
                const screenY = (y - player.y + viewRange) * this.tileSize;
                
                // 检查是否在视野范围内
                const distance = Math.max(Math.abs(x - player.x), Math.abs(y - player.y));
                if (distance > viewRange) continue;
                
                this.renderTile(x, y, screenX, screenY);
            }
        }
        
        // 渲染道具
        this.game.items.forEach(item => {
            if (!item.collected) {
                const distance = Math.max(Math.abs(item.x - player.x), Math.abs(item.y - player.y));
                if (distance <= viewRange) {
                    const screenX = (item.x - player.x + viewRange) * this.tileSize;
                    const screenY = (item.y - player.y + viewRange) * this.tileSize;
                    this.renderItem(item, screenX, screenY);
                }
            }
        });
        
        // 渲染怪物
        this.game.monsters.forEach(monster => {
            if (monster.isAlive) {
                const distance = Math.max(Math.abs(monster.x - player.x), Math.abs(monster.y - player.y));
                if (distance <= viewRange) {
                    const screenX = (monster.x - player.x + viewRange) * this.tileSize;
                    const screenY = (monster.y - player.y + viewRange) * this.tileSize;
                    this.renderMonster(monster, screenX, screenY);
                }
            }
        });
        
        // 渲染玩家（始终在中心）
        const playerScreenX = viewRange * this.tileSize;
        const playerScreenY = viewRange * this.tileSize;
        this.renderPlayer(playerScreenX, playerScreenY);
        
        // 渲染视野边界
        this.renderFog();
    }
    
    renderTile(x, y, screenX, screenY) {
        const tile = this.game.gameMap.getTile(x, y);
        
        switch(tile) {
            case 'floor':
                this.ctx.fillStyle = '#3a3a3a';
                this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                this.ctx.strokeStyle = '#2a2a2a';
                this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
                break;
                
            case 'wall':
                // 绘制黑色线条墙体
                this.ctx.fillStyle = '#3a3a3a';
                this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
                break;
                
            case 'door':
                // 绘制门：正方形中间有一个点
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(screenX + 4, screenY + 4, this.tileSize - 8, this.tileSize - 8);
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.arc(screenX + this.tileSize / 2, screenY + this.tileSize / 2, 3, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'blackhole':
                // 绘制黑洞：旋转的线条
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                const time = Date.now() / 500;
                this.ctx.strokeStyle = '#666666';
                this.ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + time;
                    const x1 = screenX + this.tileSize / 2 + Math.cos(angle) * 4;
                    const y1 = screenY + this.tileSize / 2 + Math.sin(angle) * 4;
                    const x2 = screenX + this.tileSize / 2 + Math.cos(angle) * (this.tileSize / 2 - 4);
                    const y2 = screenY + this.tileSize / 2 + Math.sin(angle) * (this.tileSize / 2 - 4);
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                }
                break;
                
            case 'lightning':
                // 绘制闪电：黑云加曲折的线
                this.ctx.fillStyle = '#3a3a3a';
                this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                // 画云
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.arc(screenX + this.tileSize / 3, screenY + this.tileSize / 3, this.tileSize / 6, 0, Math.PI * 2);
                this.ctx.arc(screenX + this.tileSize / 2, screenY + this.tileSize / 4, this.tileSize / 5, 0, Math.PI * 2);
                this.ctx.arc(screenX + this.tileSize * 2 / 3, screenY + this.tileSize / 3, this.tileSize / 6, 0, Math.PI * 2);
                this.ctx.fill();
                // 画闪电
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(screenX + this.tileSize / 2, screenY + this.tileSize / 2);
                this.ctx.lineTo(screenX + this.tileSize / 2 - 3, screenY + this.tileSize * 2 / 3);
                this.ctx.lineTo(screenX + this.tileSize / 2 + 2, screenY + this.tileSize * 2 / 3);
                this.ctx.lineTo(screenX + this.tileSize / 2 - 2, screenY + this.tileSize * 5 / 6);
                this.ctx.stroke();
                break;
        }
    }
    
    renderPlayer(screenX, screenY) {
        // 绘制玩家：圆形角色
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.arc(
            screenX + this.tileSize / 2,
            screenY + this.tileSize / 2,
            this.tileSize / 2 - 4,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // 绘制眼睛
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(screenX + this.tileSize / 2 - 5, screenY + this.tileSize / 2 - 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screenX + this.tileSize / 2 + 5, screenY + this.tileSize / 2 - 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制嘴巴
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(screenX + this.tileSize / 2, screenY + this.tileSize / 2 + 3, 5, 0, Math.PI);
        this.ctx.stroke();
        
        // 如果被麻痹，显示特效
        if (this.game.player.isStunned && Date.now() < this.game.player.stunnedUntil) {
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
            this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        }
    }
    
    renderMonster(monster, screenX, screenY) {
        // 绘制怪物：半圆形，里面有两个小黑点
        const color = monster.isActivated ? '#F44336' : '#FF9800';
        
        // 绘制半圆形身体
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(
            screenX + this.tileSize / 2,
            screenY + this.tileSize / 2 + 3,
            this.tileSize / 2 - 4,
            Math.PI,
            0
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        // 绘制两个小黑点（眼睛）
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(screenX + this.tileSize / 2 - 6, screenY + this.tileSize / 2 + 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screenX + this.tileSize / 2 + 6, screenY + this.tileSize / 2 + 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 显示触发线（追击型怪物）
        if (monster.type === 'chase' && monster.triggerLine && !monster.isActivated) {
            monster.triggerLine.forEach(point => {
                const distance = Math.max(
                    Math.abs(point.x - this.game.player.x),
                    Math.abs(point.y - this.game.player.y)
                );
                if (distance <= this.viewRange) {
                    const lineScreenX = (point.x - this.game.player.x + this.viewRange) * this.tileSize;
                    const lineScreenY = (point.y - this.game.player.y + this.viewRange) * this.tileSize;
                    this.ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
                    this.ctx.fillRect(lineScreenX, lineScreenY, this.tileSize, this.tileSize);
                }
            });
        }
        
        // 显示范围（范围型怪物）
        if (monster.type === 'range' && monster.rangeArea && !monster.isActivated) {
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.lineWidth = 2;
            const area = monster.rangeArea;
            const x1 = (area.x1 - this.game.player.x + this.viewRange) * this.tileSize;
            const y1 = (area.y1 - this.game.player.y + this.viewRange) * this.tileSize;
            const width = (area.x2 - area.x1 + 1) * this.tileSize;
            const height = (area.y2 - area.y1 + 1) * this.tileSize;
            this.ctx.strokeRect(x1, y1, width, height);
        }
    }
    
    renderItem(item, screenX, screenY) {
        // 道具背景（闪烁效果）
        const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
        this.ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
        this.ctx.beginPath();
        this.ctx.arc(
            screenX + this.tileSize / 2,
            screenY + this.tileSize / 2,
            this.tileSize / 3,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // 根据道具类型绘制不同图形
        const centerX = screenX + this.tileSize / 2;
        const centerY = screenY + this.tileSize / 2;
        
        switch(item.type) {
            case 'sword':
                // 宝剑：简单的剑形
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - 8);
                this.ctx.lineTo(centerX, centerY + 8);
                this.ctx.moveTo(centerX - 4, centerY - 4);
                this.ctx.lineTo(centerX + 4, centerY - 4);
                this.ctx.stroke();
                break;
                
            case 'bow':
                // 弓箭：弓形
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 6, -Math.PI / 2, Math.PI / 2);
                this.ctx.moveTo(centerX, centerY - 6);
                this.ctx.lineTo(centerX, centerY + 6);
                this.ctx.stroke();
                break;
                
            case 'shield':
                // 盾牌：纯黑正方形 + 五边形 + T
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(centerX - 8, centerY - 8, 16, 16);
                this.ctx.fillStyle = '#FFD700';
                // 五边形
                this.ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                    const x = centerX + Math.cos(angle) * 4;
                    const y = centerY - 3 + Math.sin(angle) * 4;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.fill();
                // T形
                this.ctx.fillRect(centerX - 3, centerY + 2, 6, 2);
                this.ctx.fillRect(centerX - 1, centerY + 2, 2, 5);
                break;
                
            case 'ladder':
                // 梯子：简单的梯子形状
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - 5, centerY - 8);
                this.ctx.lineTo(centerX - 5, centerY + 8);
                this.ctx.moveTo(centerX + 5, centerY - 8);
                this.ctx.lineTo(centerX + 5, centerY + 8);
                this.ctx.moveTo(centerX - 5, centerY - 4);
                this.ctx.lineTo(centerX + 5, centerY - 4);
                this.ctx.moveTo(centerX - 5, centerY);
                this.ctx.lineTo(centerX + 5, centerY);
                this.ctx.moveTo(centerX - 5, centerY + 4);
                this.ctx.lineTo(centerX + 5, centerY + 4);
                this.ctx.stroke();
                break;
                
            case 'quiver':
                // 箭筒：纯黑正方形，上面有五根线，线的顶端有点
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(centerX - 6, centerY - 2, 12, 8);
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 1;
                for (let i = 0; i < 5; i++) {
                    const x = centerX - 5 + i * 2.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, centerY - 2);
                    this.ctx.lineTo(x, centerY - 8);
                    this.ctx.stroke();
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.beginPath();
                    this.ctx.arc(x, centerY - 8, 1, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                break;
                
            case 'key':
                // 钥匙：圆 + 倒着的F
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.arc(centerX - 4, centerY, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillRect(centerX - 1, centerY - 1, 6, 2);
                this.ctx.fillRect(centerX - 1, centerY - 1, 2, 6);
                this.ctx.fillRect(centerX - 1, centerY + 2, 4, 2);
                break;
                
            case 'blackholeKey':
                // 黑洞钥匙：特殊的钥匙
                this.ctx.fillStyle = '#8B00FF';
                this.ctx.beginPath();
                this.ctx.arc(centerX - 4, centerY, 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillRect(centerX, centerY - 1, 7, 2);
                this.ctx.fillRect(centerX, centerY - 1, 2, 7);
                this.ctx.fillRect(centerX, centerY + 3, 5, 2);
                break;
        }
    }
    
    renderEmoji(emoji, x, y) {
        this.ctx.font = `${this.tileSize * 0.6}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(
            emoji,
            x + this.tileSize / 2,
            y + this.tileSize / 2
        );
    }
    
    renderFog() {
        // 渲染视野外的黑雾
        const gradient = this.ctx.createRadialGradient(
            this.game.canvas.width / 2,
            this.game.canvas.height / 2,
            this.viewRange * this.tileSize * 0.7,
            this.game.canvas.width / 2,
            this.game.canvas.height / 2,
            this.viewRange * this.tileSize * 1.2
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    }
}