// 道具类
export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.collected = false;
    }
    
    getDisplayName() {
        const names = {
            'sword': '⚔️ 宝剑',
            'bow': '🏹 弓箭',
            'shield': '🛡️ 盾牌',
            'ladder': '🪜 梯子',
            'quiver': '🏹 箭筒（5支箭）',
            'key': '🔑 钥匙',
            'blackholeKey': '🗝️ 黑洞钥匙'
        };
        return names[this.type] || '道具';
    }
    
    getIcon() {
        const icons = {
            'sword': '⚔️',
            'bow': '🏹',
            'shield': '🛡️',
            'ladder': '🪜',
            'quiver': '🎯',
            'key': '🔑',
            'blackholeKey': '🗝️'
        };
        return icons[this.type] || '?';
    }
}