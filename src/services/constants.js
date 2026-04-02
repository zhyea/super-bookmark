/**
 * 全局常量：卡片图标背景色（用于书签卡片图标及编辑弹窗颜色选择）
 */
export const CARD_ICON_BACKGROUND_COLORS = [
    '#ff6a00', '#42b883', '#e1251b', '#336666', '#f7df1e',
    '#d6d6dc', '#57a0ee', '#764abc', '#3178c6'
];

if (typeof window !== 'undefined') {
    window.CARD_ICON_BACKGROUND_COLORS = CARD_ICON_BACKGROUND_COLORS;
}
