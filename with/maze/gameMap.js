// 游戏地图类
import { Monster } from './monster.js';
import { Item } from './item.js';

export class GameMap {
    constructor() {
        // 根据图片创建地图（30x30格子）
        this.width = 30;
        this.height = 30;
        this.map = this.createMapFromImage();
    }
    
    createMapFromImage() {
        // 基于上传的图片创建地图
        // 0=空地, 1=墙, 2=门, 3=黑洞, 4=闪电
        const map = [];
        
        // 初始化空地图
        for (let y = 0; y < this.height; y++) {
            map[y] = [];
            for (let x = 0; x < this.width; x++) {
                map[y][x] = 0;
            }
        }
        
        // 根据图片绘制墙壁（黑色线条）
        // 外墙
        for (let x = 0; x < this.width; x++) {
            map[0][x] = 1;
            map[this.height - 1][x] = 1;
        }
        for (let y = 0; y < this.height; y++) {
            map[y][0] = 1;
            map[y][this.width - 1] = 1;
        }
        
        // 内部墙壁结构（根据图片）
        // 顶部区域
        this.drawWall(map, 1, 1, 3, 1);
        this.drawWall(map, 1, 1, 1, 3);
        this.drawWall(map, 8, 1, 10, 1);
        this.drawWall(map, 8, 1, 8, 4);
        
        // 左侧区域
        this.drawWall(map, 3, 5, 3, 8);
        this.drawWall(map, 3, 8, 7, 8);
        this.drawWall(map, 7, 5, 7, 8);
        
        // 中央区域
        this.drawWall(map, 10, 5, 15, 5);
        this.drawWall(map, 15, 5, 15, 10);
        this.drawWall(map, 10, 10, 15, 10);
        this.drawWall(map, 10, 5, 10, 10);
        
        // 右侧区域
        this.drawWall(map, 20, 3, 25, 3);
        this.drawWall(map, 20, 3, 20, 8);
        this.drawWall(map, 25, 3, 25, 8);
        this.drawWall(map, 20, 8, 25, 8);
        
        // 下方区域
        this.drawWall(map, 5, 15, 10, 15);
        this.drawWall(map, 5, 15, 5, 20);
        this.drawWall(map, 15, 15, 20, 15);
        this.drawWall(map, 20, 15, 20, 20);
        
        // 底部区域
        this.drawWall(map, 8, 25, 15, 25);
        this.drawWall(map, 8, 25, 8, 28);
        this.drawWall(map, 15, 25, 15, 28);
        
        // 添加门（根据图片中的门位置）
        map[12][8] = 2; // 左侧门
        map[18][15] = 2; // 中间门
        map[5][22] = 2; // 下方门
        
        // 添加黑洞（图片右上角）
        map[2][28] = 3;
        
        // 添加闪电陷阱
        map[10][12] = 4;
        map[18][8] = 4;
        
        return map;
    }
    
    drawWall(map, x1, y1, x2, y2) {
        if (x1 === x2) {
            // 垂直墙
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            for (let y = minY; y <= maxY; y++) {
                if (y >= 0 && y < this.height && x1 >= 0 && x1 < this.width) {
                    map[y][x1] = 1;
                }
            }
        } else {
            // 水平墙
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            for (let x = minX; x <= maxX; x++) {
                if (y1 >= 0 && y1 < this.height && x >= 0 && x < this.width) {
                    map[y1][x] = 1;
                }
            }
        }
    }
    
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 1; // 边界外视为墙
        }
        
        const tile = this.map[y][x];
        switch(tile) {
            case 0: return 'floor';
            case 1: return 'wall';
            case 2: return 'door';
            case 3: return 'blackhole';
            case 4: return 'lightning';
            default: return 'floor';
        }
    }
    
    isWalkable(x, y) {
        const tile = this.getTile(x, y);
        return tile === 'floor' || tile === 'lightning';
    }
    
    isWall(x, y) {
        return this.getTile(x, y) === 'wall';
    }
    
    isDoor(x, y) {
        return this.getTile(x, y) === 'door';
    }
    
    openDoor(x, y) {
        if (this.isDoor(x, y)) {
            this.map[y][x] = 0; // 变成空地
            return true;
        }
        return false;
    }
    
    createMonsters() {
        const monsters = [];
        
        // 追击型怪物（带蓝线触发区域）
        monsters.push(new Monster(5, 5, 'chase', [
            {x: 3, y: 5}, {x: 4, y: 5}, {x: 5, y: 5}, {x: 6, y: 5}, {x: 7, y: 5}
        ]));
        
        monsters.push(new Monster(12, 3, 'chase', [
            {x: 12, y: 3}, {x: 12, y: 4}, {x: 12, y: 5}, {x: 12, y: 6}
        ]));
        
        monsters.push(new Monster(22, 6, 'chase', [
            {x: 20, y: 6}, {x: 21, y: 6}, {x: 22, y: 6}, {x: 23, y: 6}, {x: 24, y: 6}
        ]));
        
        // 范围型怪物（在特定区域内追击）
        monsters.push(new Monster(8, 12, 'range', null, {
            x1: 5, y1: 10, x2: 12, y2: 15
        }));
        
        monsters.push(new Monster(18, 18, 'range', null, {
            x1: 15, y1: 15, x2: 22, y2: 22
        }));
        
        monsters.push(new Monster(25, 25, 'range', null, {
            x1: 22, y1: 22, x2: 28, y2: 28
        }));
        
        // 额外的怪物
        monsters.push(new Monster(15, 7, 'chase', [
            {x: 13, y: 7}, {x: 14, y: 7}, {x: 15, y: 7}, {x: 16, y: 7}, {x: 17, y: 7}
        ]));
        
        return monsters;
    }
    
    createItems() {
        const items = [];
        
        // 武器和装备
        items.push(new Item(3, 27, 'sword'));
        items.push(new Item(27, 3, 'bow'));
        items.push(new Item(12, 12, 'shield'));
        
        // 梯子
        items.push(new Item(6, 10, 'ladder'));
        items.push(new Item(18, 10, 'ladder'));
        
        // 箭筒
        items.push(new Item(10, 8, 'quiver'));
        items.push(new Item(20, 20, 'quiver'));
        items.push(new Item(25, 15, 'quiver'));
        
        // 钥匙
        items.push(new Item(8, 15, 'key'));
        items.push(new Item(16, 18, 'key'));
        items.push(new Item(22, 12, 'key'));
        
        // 黑洞钥匙（最重要的道具）
        items.push(new Item(26, 26, 'blackholeKey'));
        
        return items;
    }
}