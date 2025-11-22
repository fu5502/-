# ⚡ Raiden React: Storm Fighters (雷电 REACT)

> 重燃街机热血！基于 React + Canvas 的现代复刻版《雷电》弹幕射击游戏。

[![Play Now](https://img.shields.io/badge/🚀_在线畅玩-点击进入-success?style=for-the-badge&logo=vercel)](https://xi-sable.vercel.app/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?style=flat-square)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?style=flat-square)](https://www.typescriptlang.org/)

![Game Banner](docs/banner.png)
<!-- 💡 提示：请将使用 promo.html 生成的横版截图重命名为 banner.png 并放在 docs 文件夹下 -->

## 🎮 在线畅玩 (Play Now)

无需下载，点击下方链接立即体验最新版本：

### 👉 [https://xi-sable.vercel.app/](https://xi-sable.vercel.app/)

---

## 📖 游戏简介 (Introduction)

**Raiden React** 是一款向经典街机游戏《雷电4》致敬的 Web 版 STG 游戏。完全使用现代 Web 技术栈（React, TypeScript, Canvas API）构建。

游戏完美还原了经典的红蓝紫武器系统、激烈的弹幕体验以及无尽的周目挑战。无论是在 PC 浏览器还是移动端设备上，都能体验到流畅的射击快感。

## ✨ 最新特性 (Features) v1.1

- 🏆 **全球排行**: 接入 Supabase 云端数据库，与全球玩家一决高下。
- 🚀 **深度武库**: 武器系统上限提升至 **LV.8**，解锁毁天灭地的终极形态。
- 🛡️ **纳米修复**: 引入呼吸回血机制，脱战 10 秒后自动缓慢修复机体。
- 💣 **空中支援**: 释放炸弹现在会呼叫盟军战机编队进行地毯式轰炸。
- 🎵 **动态 BGM**: 搭载 Web Audio 音序器，BGM 随关卡推进自动变奏。
- 📱 **多端支持**: 完美支持 PC 键盘操作与移动端触摸拖拽。

## 🕹️ 玩法说明 (How to Play)

### 🎮 操作方式 (Controls)

| 动作 | PC 键盘 (Keyboard) | 移动端 (Touch) |
| :--- | :--- | :--- |
| **移动 (Move)** | `WASD` 或 `↑↓←→` | 手指拖动战机任意位置 |
| **射击 (Shoot)** | **自动射击** (Auto Fire) | **自动射击** |
| **炸弹 (Bomb)** | `B` / `Space` (空格) / `Shift` | 点击屏幕右下角 `BOMB` 按钮 |

### ⚔️ 武器系统 (Weapons)

游戏包含三种主武器，拾取对应颜色的 `P` 道具可切换类型或升级（最高 LV.8）：

| 类型 | 颜色 | 名称 | 特性 | 终极形态 (LV.8) |
| :---: | :---: | :--- | :--- | :--- |
| **VULCAN** | 🔴 **红色** | **红莲散弹** | 扇形攻击，覆盖面广 | **加特林风暴** + 侧翼追踪导弹 |
| **LASER** | 🔵 **蓝色** | **苍穹激光** | 直线高伤，穿透力强 | **高能主炮** + 广域侧翼波 |
| **PLASMA** | 🟣 **紫色** | **紫电追踪** | 全屏自动追踪敌人 | **黑洞力场** + 智能地雷 |

### 📦 道具图鉴 (Items)

| 图标 | 名称 | 效果 |
| :---: | :--- | :--- |
| <span style="color:#ef4444">P</span> | **Power Up** | 切换武器 / 提升当前武器等级 |
| <span style="color:#fbbf24">UP</span> | **Full Upgrade** | 直接提升武器等级 (稀有) |
| <span style="color:#22d3ee">S</span> | **Shield** | **[新增]** 获得 5秒 无敌护盾状态 |
| <span style="color:#f59e0b">B</span> | **Bomb** | 补充一枚呼叫空中支援的信号弹 |
| <span style="color:#22c55e">H</span> | **Health** | 修复机体受损部件 (+30 HP) |
| <span style="color:#fbbf24">$</span> | **Gold/Silver** | **[新增]** 获取大量积分 (金币/银币) |

### ❤️ 生存机制 (Survival)

- **无敌时间**: 每次重生或拾取 `S` 道具，战机会进入无敌闪烁状态。
- **纳米修复**: 若 **10秒** 内未受到任何伤害，战机会启动纳米修复系统，极其缓慢地回复生命值。

## 💻 本地运行 (Run Locally)

确保你的环境已安装 [Node.js](https://nodejs.org/) (推荐 v16+)。

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/raiden-react.git
   cd raiden-react
