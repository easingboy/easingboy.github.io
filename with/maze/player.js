// 玩家类
export class Player {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        
        // 玩家属性
        this.health = 3;
        this.maxHealth = 3;
        
        // 装备
        this.hasSword = false;
        this.hasBow = false;
        this.hasShield = false;
        this.ladderUses = 0; // 梯子可以翻墙2次
        
        // 道具
        this.keys = 0;
        this.blackholeKeys = 0;
        this.arrows = 0;
        
        // 战斗计时器
        this.swordCooldown = 0;
        this.bowCooldown = 0;
        this.lastAttackTime = Date.now();
        
        // 闪电效果
        this.isStunned = false;
        this.stunnedUntil = 0;
        this.lightningDamageTimer = 0;
        this.triggeredLightning = new Set(); // 记录已触发的闪电位置
    }
    
    move(dx, dy) {
        // 检查是否被闪电麻痹
        if (this.isStunned && Date.now() < this.stunnedUntil) {
            return false;
        }
        
        const newX = this.x + dx;
        const newY = this.y + dy;
        
        // 检查边界
        if (newX < 0 || newX >= this.game.gameMap.width || 
            newY < 0 || newY >= this.game.gameMap.height) {
            return false;
        }
        
        // 检查墙壁
        if (this.game.gameMap.isWall(newX, newY)) {
            return false;
        }
        
        // 检查门
        if (this.game.gameMap.isDoor(newX, newY)) {
            if (this.keys > 0) {
                this.keys--;
                this.game.gameMap.openDoor(newX, newY);
                this.game.showMessage('🔑 使用钥匙打开了门');
            } else {
                this.game.showMessage('需要钥匙才能打开门');
                return false;
            }
        }
        
        // 移动
        this.x = newX;
        this.y = newY;
        
        return true;
    }
    
    useLadder() {
        if (this.ladderUses <= 0) {
            this.game.showMessage('没有梯子了');
            return false;
        }
        
        // 检查四个方向是否有墙可以翻越
        const directions = [
            {dx: 0, dy: -1, name: '上'},
            {dx: 0, dy: 1, name: '下'},
            {dx: -1, dy: 0, name: '左'},
            {dx: 1, dy: 0, name: '右'}
        ];
        
        for (let dir of directions) {
            const wallX = this.x + dir.dx;
            const wallY = this.y + dir.dy;
            const beyondX = this.x + dir.dx * 2;
            const beyondY = this.y + dir.dy * 2;
            
            // 检查是否是墙，且墙后面可以走
            if (this.game.gameMap.isWall(wallX, wallY) && 
                this.game.gameMap.isWalkable(beyondX, beyondY)) {
                this.x = beyondX;
                this.y = beyondY;
                this.ladderUses--;
                this.game.showMessage(`🪜 使用梯子翻越了墙壁（剩余${this.ladderUses}次）`);
                return true;
            }
        }
        
        this.game.showMessage('附近没有可以翻越的墙壁');
        return false;
    }
    
    collectItem(item) {
        switch(item.type) {
            case 'sword':
                this.hasSword = true;
                break;
            case 'bow':
                this.hasBow = true;
                break;
            case 'shield':
                this.hasShield = true;
                break;
            case 'ladder':
                this.ladderUses += 2;
                break;
            case 'quiver':
                this.arrows += 5;
                break;
            case 'key':
                this.keys++;
                break;
            case 'blackholeKey':
                this.blackholeKeys++;
                break;
        }
    }
    
    updateCombat(monsters) {
        const now = Date.now();
        const deltaTime = now - this.lastAttackTime;
        
        if (deltaTime < 1000) return; // 每秒更新一次
        
        this.lastAttackTime = now;
        
        // 检查是否在闪电上
        if (this.game.gameMap.getTile(this.x, this.y) === 'lightning') {
            const lightningKey = `${this.x},${this.y}`;
            // 只有未触发过的闪电才会生效
            if (!this.triggeredLightning.has(lightningKey)) {
                this.triggeredLightning.add(lightningKey);
                this.isStunned = true;
                this.stunnedUntil = now + 5000; // 5秒麻痹
                this.lightningDamageTimer = 0;
            }
            
            // 如果正在被麻痹，每秒受到伤害
            if (this.isStunned && now < this.stunnedUntil) {
                this.lightningDamageTimer++;
                if (this.lightningDamageTimer <= 5) {
                    this.takeDamage(1);
                }
            }
        } else {
            // 离开闪电区域后，重置麻痹状态（但不清除已触发记录）
            if (this.isStunned && now >= this.stunnedUntil) {
                this.isStunned = false;
                this.lightningDamageTimer = 0;
            }
        }
        
        // 如果被麻痹，无法战斗
        if (this.isStunned && now < this.stunnedUntil) {
            return;
        }
        
        // 宝剑攻击
        if (this.hasSword) {
            this.attackWithSword(monsters);
        }
        
        // 弓箭攻击
        if (this.hasBow && this.arrows > 0) {
            this.attackWithBow(monsters);
        }
        
        // 怪物攻击玩家
        this.receiveMonsterAttacks(monsters);
    }
    
    attackWithSword(monsters) {
        // 宝剑攻击视野内且无阻隔的怪物
        for (let monster of monsters) {
            if (!monster.isAlive) continue;
            
            const distance = this.getDistance(monster.x, monster.y);
            if (distance <= 9 && this.hasLineOfSight(monster.x, monster.y)) {
                monster.takeDamage(1);
                if (!monster.isAlive) {
                    this.game.showMessage('⚔️ 用宝剑击败了怪物！');
                }
                return; // 每秒只攻击一只
            }
        }
    }
    
    attackWithBow(monsters) {
        // 弓箭可以攻击9格内的任何怪物，即使有阻隔
        for (let monster of monsters) {
            if (!monster.isAlive) continue;
            
            const distance = this.getDistance(monster.x, monster.y);
            if (distance <= 9) {
                monster.takeDamage(1);
                this.arrows--;
                if (!monster.isAlive) {
                    this.game.showMessage('🏹 用弓箭击败了怪物！');
                }
                return; // 每秒只攻击一只
            }
        }
    }
    
    receiveMonsterAttacks(monsters) {
        // 检查相邻的怪物
        for (let monster of monsters) {
            if (!monster.isAlive) continue;
            
            const distance = Math.abs(monster.x - this.x) + Math.abs(monster.y - this.y);
            if (distance <= 1) {
                // 怪物攻击玩家
                let damage = 1;
                if (this.hasShield) {
                    damage = Math.max(0, damage - 1); // 盾牌减伤
                }
                if (damage > 0) {
                    this.takeDamage(damage);
                }
            }
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        this.game.updateUI();
    }
    
    hitByLightning() {
        const lightningKey = `${this.x},${this.y}`;
        if (!this.triggeredLightning.has(lightningKey)) {
            this.triggeredLightning.add(lightningKey);
            this.isStunned = true;
            this.stunnedUntil = Date.now() + 5000;
            this.lightningDamageTimer = 0;
        }
    }
    
    getDistance(x, y) {
        return Math.max(Math.abs(x - this.x), Math.abs(y - this.y));
    }
    
    hasLineOfSight(targetX, targetY) {
        // 使用Bresenham算法检查视线
        const dx = Math.abs(targetX - this.x);
        const dy = Math.abs(targetY - this.y);
        const sx = this.x < targetX ? 1 : -1;
        const sy = this.y < targetY ? 1 : -1;
        let err = dx - dy;
        
        let x = this.x;
        let y = this.y;
        
        while (x !== targetX || y !== targetY) {
            if (this.game.gameMap.isWall(x, y)) {
                return false;
            }
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return true;
    }
}