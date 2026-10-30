# 极光冻原 / AURORA HOLLOW · v12

three.js 极夜场景：木屋、GLB 驯鹿、可驾驶雪橇、冰湖、岩石、极光。

![极光](shots/v16-sky.png)

## 打开

双击 `aurora-hollow.html`。桌面点击进入锁鼠标；手机建议横屏。

| 桌面 | 手机 | 作用 |
| --- | --- | --- |
| WASD / Shift / Space | 摇杆 / 跑 / 跳 | 步行 |
| 鼠标 | 右半屏拖动 | 环视 |
| V | 视角 | 第一 / 第三人称 |
| E | 用 | 交互 / 上下雪橇 |
| W/S 或 ↑/↓、A/D 或 ←/→ | — | 雪橇加速刹车、转向 |

## v12 改动

**极光回到最初质感**
- 恢复最初的 5 层垂直帘幕（半径 520 / 680 / 880 / 1180 m + 底部 430 m 辉光），
  片元回到原始的高频垂直光柱、`vProfile`、绿→青→蓝紫的配色与 `uKp` 呼吸。
- 去掉上一版的横向绸带与交叉帘幕。

**雪地：第二层宏观法线**
- 主法线：`snow_02`，平铺 30 次，强度 0.42。
- 宏观法线：同一纹理克隆，平铺 6 次，作为 `clearcoatNormalMap` 参与物理材质的清漆法线层
  （`clearcoat 0.22 / clearcoatRoughness 0.55`）。
- 着色器里再叠一层世界坐标低频法线扰动，形成大尺度雪脊，减少单张纹理的机械重复。

**雪橇朝向**
- `ride()` 里显式写回 `sled.rotation.y = heading - π/2`，并保留转向侧倾。
- 第一视角相机后移到雪橇尾部（约 2.2 m），现在能看到雪橇前部与驾驶扶手；转向时扶手、滑轨和前部会跟着车头一起转，不再只有鹿转头。

**动物**
- GLB 鹿：`Idle / Walk / Gallop` 按速度切换；北极狐腿/尾巴摆动；渡鸦扇翅。

## 仍然不足

- 极光是程序化垂直帘幕，和参考图的真实 volumetrics 仍有距离。
- 雪地是「主法线 + clearcoat 宏观法线 + 顶点/着色器扰动」，不是多层视差。
- 雪橇只对木屋碰撞；树木/岩石无碰撞体，没有真正的侧滑。
- GLB 鹿为低模，绿色鞍布为模型自带。

## 资产

- Poly Haven `wood_planks`、`snow_02`、`snow_01`，CC0。
- Quaternius `Deer.glb`，CC0。
- GLTFLoader three.js r169，MIT。

## 开发

```
src/
  06-assets.js    内嵌 PBR + 脚印 + Deer.glb
  07-gltf.js      GLTFLoader
  20-world.js     地形 / 天空 / 极光（5 层）
  22-cabin.js     木屋 / 室内 / 交互
  24-trees.js     树木（避开冰湖）
  26-life.js      冰湖 / GLB 鹿动画 / 雪橇 / 雪雾 / 岩石
  30-player.js    第一/第三人称 / 雪橇驾驶 / 脚印
  40-main.js      循环 / UI / 截图
```
