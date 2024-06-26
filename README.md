# YNOproject Yume2kki 变量44 推测

[更新日志](https://github.com/Exsper/yno2kkivar44guess/blob/master/Changelog.md) [GreasyFork](https://greasyfork.org/zh-CN/scripts/485388-ynoproject-yume2kki-%E5%8F%98%E9%87%8F44-%E6%8E%A8%E6%B5%8B)

本工具通过遍历内存数据来筛选可能为变量#44的地址，实时显示变量#44及其他变量的值。

使用本工具会改变原有的游戏体验，推荐对游戏有深入了解后再使用。

**本工具仅读取游戏内存，不会对游戏内容、内存或存档作任何修改。**

## 原理

检索内存（HEAPU32）

通过查找入睡次数（变量#43）和与入睡次数相关的季节（变量#94）来定位变量#44的地址

需要足够入睡次数以便准确定位变量，所以推荐入睡次数大于100次再使用

## 使用方法

将脚本添加到Tampermonkey中

浏览器打开游戏页面，左侧会出现“+”按钮，点开即可打开脚本面板，点击右上方“-”按钮可以隐藏面板

在游戏中加载存档，将显示的入睡次数（Day数）输入到脚本面板中

脚本检索后，如发现多个可能的变量地址，需要自主选择（一般不为0，睡觉后会变化）

### 操作界面

显示变量时，左上角会出现更多按钮

- “←” 按钮： 退回脚本主界面，重新输入入睡次数，便于更正输入或切换存档
- “⟳” 按钮： 手动重连多人系统（等效于控制台执行initSessionWs()），但无法解决加载地图失败导致的黑屏问题
- “🌙/🔍” 按钮： 切换是否显示部分地图中脚本内置的变量，切换到“🔍”状态为显示

  当前内置的变量：
  - Black Building 楼层数
  - Infinite Library 深度
  - Smiley Face DECK 传送点位置
  - Shimako 事件红怪剩余
  - Rainy Apartments 楼梯数
  - Horror Maze 玫瑰数及小地图
- “+” 按钮： 可以任意添加需要显示的变量

## 刷新变量#44方法（当前版本0.122d）

### 换日刷新法

在[伪部屋](https://yume.wiki/2kki/Urotsuki%27s_Dream_Apartments)的床上睡觉，回到现实部屋后按Z继续睡觉返回，变量#44刷新，同时增加入梦天数。

### 不换日刷新法

在[奇妙数](https://yume.wiki/2kki/Numeral_Hallways)的最下方锯墙壁，画面上方数字变为“3”时，变量#44刷新。

## 其他

### 关于hook的构想

hook onPlayerTeleported 获取 mapId（变量10） 和主角位置（变量22和23），然后进行筛选

测试时出现了 onPlayerTeleported 被无限调用的问题，失败了

考虑到安全性，放弃该策略

### 关于开关

[获取开关功能已单独立项](https://github.com/Exsper/yno2kkiswitchcheck)
