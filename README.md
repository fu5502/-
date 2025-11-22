# ⚡ Raiden React: Storm Fighters (雷电 REACT)

> 重燃街机热血！基于 React + Canvas 的现代复刻版《雷电》弹幕射击游戏。

![Game Banner](https://raw.githubusercontent.com/fu5502/-/refs/heads/main/s.png)
<!-- 💡 提示：请将使用 promo.html 生成的横版截图重命名为 banner.png 并放在 docs 文件夹下 -->

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-4.0-646cff.svg)](https://vitejs.dev)

## 📖 游戏简介 (Introduction)

**Raiden React** 是一款向经典街机游戏《雷电4》致敬的 Web 版 STG 游戏。完全使用现代 Web 技术栈（React, TypeScript, Canvas API）构建。

游戏完美还原了经典的红蓝紫武器系统、激烈的弹幕体验以及无尽的周目挑战。无论是在 PC 浏览器还是移动端设备上，都能体验到流畅的射击快感。

## ✨ 游戏特色 (Features)

- 🚀 **经典复刻**: 还原红（散弹）、蓝（激光）、紫（等离子）三种经典武器特性。
- 💥 **弹幕地狱**: 精心设计的敌兵行为与 BOSS 弹幕逻辑。
- 🆙 **武器升级**: 拾取 `P` 或 `UP` 道具，武器最高可升至 LV.4，解锁全屏特效！
- 📱 **多端支持**: 完美支持 PC 键盘操作与移动端触摸拖拽。
- 🎵 **复古音效**: 基于 Web Audio API 实时合成的街机风格音效与 BGM。
- ♾️ **无限挑战**: 击败 BOSS 后自动进入下一周目，难度动态提升。

## 🕹️ 玩法说明 (How to Play)

### 🎮 操作方式 (Controls)

| 动作 | PC 键盘 (Keyboard) | 移动端 (Touch) |
| :--- | :--- | :--- |
| **移动 (Move)** | `WASD` 或 `↑↓←→` | 手指拖动战机任意位置 |
| **射击 (Shoot)** | `Space` (空格) / 自动射击 | 自动射击 |
| **炸弹 (Bomb)** | `B` 或 `Shift` | 点击屏幕右下角 `BOMB` 按钮 |

### ⚔️ 武器系统 (Weapons)

游戏包含三种主武器，通过拾取对应颜色的道具进行切换或升级：

| 类型 | 颜色 | 名称 | 特性 | 满级效果 |
| :---: | :---: | :--- | :--- | :--- |
| **VULCAN** | 🔴 **红色** | **散弹** | 扇形攻击，覆盖面广 | 追加两翼自动追踪导弹 |
| **LASER** | 🔵 **蓝色** | **激光** | 直线高伤，穿透力强 | 追加侧翼广域能量波 |
| **PLASMA** | 🟣 **紫色** | **等离子** | 全屏自动追踪敌人 | 追加直线穿透主炮 |

### 📦 道具说明 (Items)

- **`UP` (Yellow)**: 武器升级（最高 4 级）。
- **`B` (Amber)**: 补充护身炸弹（全屏清屏）。
- **`H` (Green)**: 修复机体护盾（回复 HP）。
- **`R` / `L` / `P`**: 切换对应颜色的武器（继承当前等级）。

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
- **Styling**: Tailwind CSS
- **Graphics**: HTML5 Canvas (2D Context)
- **Audio**: Web Audio API (Oscillators & GainNodes)
- **Icons**: Lucide React

## 📄 许可证 (License)

本项目基于 MIT 许可证开源。

---

*Generated with ❤️ by AI Studio*
