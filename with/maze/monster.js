// 怪物类
export class Monster {
    constructor(x, y, type, triggerLine = null, rangeArea = null) {
        this.x = x;
        this.y = y;
        this.type = type; // 'chase' 或 'range'
        this.triggerLine = triggerLine; // 追击型怪物的蓝线触发区域
        this.rangeArea = rangeArea; // 范围型怪物的活动区域 {x1, y1, x2, y2}
        
        this.isAlive = true;
        this.health = 1;
        this.isActivated = false; // 是否被激活
        
        this.lastMoveTime = Date.now();
        this.moveInterval = 1000; // 每秒移动一次
    }
    
    update(player) {
        if (!this.isAlive) return;
        
        const now = Date.now();
        
        // 检查是否激活
        if (!this.isActivated) {
            this.checkActivation(player);
        }
        
        // 如果激活，追击玩家
        if (this.isActivated && now - this.lastMoveTime >= this.moveInterval) {
            this.chasePlayer(player);
            this.lastMoveTime = now;
        }
    }
    
    checkActivation(player) {
        if (this.type === 'chase') {
            // 追击型：检查玩家是否触碰蓝线
            if (this.triggerLine) {
                for (let point of this.triggerLine) {
                    if (player.x === point.x && player.y === point.y) {
                        this.isActivated = true;
                        return;
                    }
                }
            }
        } else if (this.type === 'range') {
            // 范围型：检查玩家是否进入范围
            if (this.rangeArea) {
                const inRange = player.x >= this.rangeArea.x1 && 
                               player.x <= this.rangeArea.x2 &&
                               player.y >= this.rangeArea.y1 && 
                               player.y <= this.rangeArea.y2;
                if (inRange) {
                    this.isActivated = true;
                }
            }
        }
    }
    
    chasePlayer(player) {
        // 范围型怪物只在范围内追击
        if (this.type === 'range' && this.rangeArea) {
            const inRange = this.x >= this.rangeArea.x1 && 
                           this.x <= this.rangeArea.x2 &&
                           this.y >= this.rangeArea.y1 && 
                           this.y <= this.rangeArea.y2;
            if (!inRange) {
                return; // 超出范围不移动
            }
        }
        
        // 计算到玩家的方向
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        
        let moveX = 0;
        let moveY = 0;
        
        // 优先移动距离更远的轴
        if (Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
        } else if (Math.abs(dy) > 0) {
            moveY = dy > 0 ? 1 : -1;
        } else if (Math.abs(dx) > 0) {
            moveX = dx > 0 ? 1 : -1;
        }
        
        // 尝试移动
        const newX = this.x + moveX;
        const newY = this.y + moveY;
        
        // 怪物不能穿墙
        const game = player.game;
        if (game.gameMap.isWalkable(newX, newY)) {
            // 检查是否会移出范围（范围型怪物）
            if (this.type === 'range' && this.rangeArea) {
                if (newX >= this.rangeArea.x1 && newX <= this.rangeArea.x2 &&
                    newY >= this.rangeArea.y1 && newY <= this.rangeArea.y2) {
                    this.x = newX;
                    this.y = newY;
                }
            } else {
                this.x = newX;
                this.y = newY;
            }
        } else {
            // 如果直线路径被阻挡，尝试绕路
            if (moveX !== 0 && game.gameMap.isWalkable(this.x, this.y + (dy > 0 ? 1 : -1))) {
                const newY2 = this.y + (dy > 0 ? 1 : -1);
                if (this.type !== 'range' || this.isInRange(this.x, newY2)) {
                    this.y = newY2;
                }
            } else if (moveY !== 0 && game.gameMap.isWalkable(this.x + (dx > 0 ? 1 : -1), this.y)) {
                const newX2 = this.x + (dx > 0 ? 1 : -1);
                if (this.type !== 'range' || this.isInRange(newX2, this.y)) {
                    this.x = newX2;
                }
            }
        }
    }
    
    isInRange(x, y) {
        if (!this.rangeArea) return true;
        return x >= this.rangeArea.x1 && x <= this.rangeArea.x2 &&
               y >= this.rangeArea.y1 && y <= this.rangeArea.y2;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.isAlive = false;
        }
    }
}