# 红蓝防御塔与独立召唤水晶

使用 game-assets 通用生成，以现有 sanctuary-altar 的冷灰石材、雪线和固定 45° 像素绘制风格为参考，生成红蓝防御塔及红蓝召唤水晶四个独立透明部件。防御塔强调宽石基、护爪和能量核心；召唤水晶使用低矮符文晶座，不复用缩小的基地水晶。

最终 PNG：tower-blue.png、tower-red.png（344×513）；inhibitor-blue.png、inhibitor-red.png（308×366）。RGBA 原生裁切并居中补透明边，不缩放原始像素。geometry.json 保存共同脚线、锚点和接入比例；准备脚本为 scripts/prepare-team-structures.py。

基地水晶保留 howling-painted-v4/sanctuary-altar.png 的形状；红方通过 TeamPalette 将高饱和蓝色能量映射为红色，灰石、积雪和火焰保留。后墙自带旗帜及独立墙旗也使用阵营色。装饰晶体按桥纵向区域分别批次着色，中央区域中性，桥下自然冰挂保留自然冰色。

素材预览：index.html。实机增加“蓝方圣所 / 红方圣所”选项，保持当前建筑布局、战斗射程和碰撞规则。塔的点击代理略加宽以匹配新石基轮廓。
