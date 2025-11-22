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

## 🚀 更新日志 (Changelog)

### v1.1.5 (2025.11.24)
- **🎯 Boss 弱点系统**: 所有 Boss 现在拥有显露的核心弱点（高亮红心）。
  - **暴击伤害**: 准确命中核心可造成 **2.5倍** 的毁灭性打击。
  - **视觉反馈**: 命中弱点时会触发特殊的金色火花与屏幕震动。
- **UI 优化**: 优化了移动端触摸操作的边界判定。

### v1.1.4
- **Boss 战利品**: 击败 Boss 掉落对应关卡的强力武器。
- **BGM 引擎升级**: 支持和弦合成，音效更丰富。
- **平衡性**: 调整了回血速度 (0.8HP/2s) 和道具掉落率。

## ✨ 核心特性 (Features)

- 🏆 **全球排行**: 接入 Supabase 云端数据库，与全球玩家一决高下。
- 🚀 **深度武库**: 武器系统上限提升至 **LV.8**，解锁毁天灭地的终极形态。
- ⚡ **过载模式**: 满级后再次拾取武器可触发 **Hyper Mode**，10秒内射速翻倍+金身特效。
- 🎯 **弱点打击**: 针对 Boss 核心弱点进行精确打击，快速击破强敌。
- 💣 **空中支援**: 释放炸弹现在会呼叫盟军战机编队进行地毯式轰炸。
- 🛡️ **纳米修复**: 脱战 8秒 后启动自我修复系统。

## 🕹️ 玩法说明 (How to Play)

### 🎮 操作方式 (Controls)

| 动作 | PC 键盘 (Keyboard) | 移动端 (Touch) |
| :--- | :--- | :--- |
| **移动 (Move)** | `WASD` 或 `↑↓←→` | 手指拖动战机任意位置 |
| **射击 (Shoot)** | **自动射击** (Auto Fire) | **自动射击** |
| **炸弹 (Bomb)** | `B` / `Space` (空格) | 点击屏幕右下角 `BOMB` 按钮 |

### ⚔️ 武器系统 (Weapons)

游戏包含三种主武器，拾取对应颜色的 `P` 道具可切换类型或升级（最高 LV.8）。
**随机跳级**：拾取武器时有 **20%** 概率直接连升 2 级！

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
| <span style="color:#22d3ee">S</span> | **Shield** | **[稀有]** 获得 5秒 无敌护盾状态 |
| <span style="color:#f59e0b">B</span> | **Bomb** | 补充一枚呼叫空中支援的信号弹 |
| <span style="color:#22c55e">H</span> | **Health** | 修复机体受损部件 (+15 HP) |
| <span style="color:#fbbf24">$</span> | **Gold/Silver** | 获取大量积分 (金币/银币) |

## 💻 本地运行 (Run Locally)

确保你的环境已安装 [Node.js](https://nodejs.org/) (推荐 v16+)。

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/raiden-react.git
   cd raiden-react
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   打开浏览器访问 `http://localhost:5173`。

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 🛠️ 技术栈 (Tech Stack)

- **Core**: React 18, TypeScript
- **Build Tool**: Vite
- **Database**: Supabase (用于在线排行榜)
- **Styling**: Tailwind CSS
- **Graphics**: HTML5 Canvas (2D Context)
- **Audio**: Web Audio API (Oscillators & GainNodes)
- **Deployment**: Vercel

## 📄 许可证 (License)

本项目基于 MIT 许可证开源。

---

*Generated with ❤️ by AI Studio*