# 《极光冻原 / AURORA HOLLOW》电影级 three.js 提示词包 · v1.0

> 目标：让 AI 编程智能体（Claude Code / Cursor / DSH / Codex）产出**可直接作为电影剧照**的 three.js 极光雪原，并在此基础上做出「生存 + 创造」双模式的开放世界。
>
> 配套文件：[master-prompt.md](master-prompt.md)（主控提示词，复制即用）、[GDD.md](GDD.md)（玩法设计，作为需求输入）
>
> 适用参考图：极光夜空下、左侧木屋亮着暖窗、右侧绿色极光幕帘横扫、前景大片雪原与树线剪影。

---

## 0. 怎么用：五阶段流水线

**不要一次性把全部提示词丢给模型。** 电影感来自「先锁画面，再叠玩法」。按下面顺序，每阶段验收通过再进入下一阶段。

| 阶段 | 粘贴什么 | 期望产出 | 验收线 |
| --- | --- | --- | --- |
| P0 视觉锁定 | `master-prompt.md`（把玩法段落临时改为「暂不实现玩法」）+ M02/M03/M04/M05/M06 | 可自由飞行的静态场景，3 个固定机位 | 截图与参考图构图/色温/光比 80% 接近；60 fps |
| P1 电影级打磨 | 4.1 美术评审 → M06/M07 → 再评审 | 曝光、泛光、景深、颗粒、雪面质感定稿 | 评审表 ≥ 8.5/10；直方图无死黑死白 |
| P2 生存闭环 | M08/M09 + GDD §4–5 | 能生火、取暖、吃饭、过夜、死亡重来 | 连续存活 3 个游戏日无软锁 |
| P3 世界与生物 | M10 + GDD §3/§6 | 6 群系、12 POI、狼群、极光夜事件 | 6 km 跑图无裂缝、无掉帧尖峰 |
| P4 创造与导演 | M11/M12 | 编辑器、资产库、镜头工具、分享码 | 5 分钟搭出可拍摄场景并导出 4K 截图 |

**投喂技巧**

1. 模型温度调低（0.2–0.4），一次只给一个模块；让它先输出「文件清单 + 方案」再写代码。
2. 每个模块都附上上一阶段的**截图**，并要求「对照参考图逐项打分，再改」。
3. 让它自证：要求它给出「可运行的验收命令」和「预期输出」，而不是「已完成」。
4. 代码禁止 TODO / 占位几何 / 注释掉的阴影；发现一次就退回重做。
5. 中文注释、英文标识符、中文 UI；单文件成品必须能双击离线打开。

---

## 1. 参考图视觉规格书（可直接作为提示词素材）

这一节是把「感觉」翻译成「可执行参数」。主控提示词与评审提示词都引用这里的数值。

### 1.1 构图拆解

| 项 | 规格 |
| --- | --- |
| 画幅 | 参考图 16:9；成片默认 2.39:1 遮幅，另提供 16:9 全画幅 |
| 地平线 | 树线在画面高度 **75%** 处；天空 75%，雪地 25% |
| 主体 | 木屋横向占 12%–47%，屋脊 53%、檐口 63%、基座 76%，山墙朝右前方 |
| 极光 | 从右侧 38% 高度向左下扫至 68%（消失于木屋后方），倾角 **12–18°**，构成对角引导线 |
| 前景 | 底部 25% 纯雪原留白，仅风蚀雪脊（sastrugi）、左侧通往木屋的雪道与半埋的雪车，不放杂物 |
| 银河 | 斜贯画面上方 1/3，密度低于极光，避免抢戏 |
| 树线 | 地平线上 2–4% 高度的黑色剪影，断续，留出右侧缺口给极光 |
| 视觉动线 | 脚印（下中）→ 木屋窗光（左中）→ 屋顶 → 极光（右上）→ 星空（上） |

### 1.2 色板（十六进制，可直接写进 shader / LUT）

| 用途 | 色值 | 说明 |
| --- | --- | --- |
| 天顶 | `#050d1c` | 近黑蓝，保留 2% 细节 |
| 天空中段 | `#0d2140` | 银河背景 |
| 地平线 | `#1b3a5c` | 与雾衔接 |
| 银河亮带 | `#2a4a72` | 低饱和 |
| 极光核心 | `#16f0a0` | HDR 输出时 ×3.0 |
| 极光高光 | `#8bffdc` | 幕帘底部 |
| 极光上部 | `#2f7bff` | 向天顶过渡 |
| 极光品红边 | `#6b3a8f` | 仅 5% 面积，防"塑料绿" |
| 雪地暗部 | `#22344a` | 反射天光，绝不纯黑 |
| 雪地中间调 | `#7d9ab8` | 占雪地 60% |
| 雪地亮部 | `#cfe2f2` | 受极光/窗光照亮处 |
| 木屋暗部 | `#17100d` | 木纹仍可辨 |
| 木屋中间调 | `#2e211a` | 暖褐 |
| 窗光 | `#ffb469` | 2400 K |
| 窗光晕 | `#ff8a3d` | 泛光染色 |
| 树线剪影 | `#04090f` | 接近黑，但保留 1% 蓝 |
| 雾 | `#0b1a2a` | 指数雾基色 |

### 1.3 光照模型（四光源 + 反弹）

| 光源 | 颜色 | 强度 | 说明 |
| --- | --- | --- | --- |
| 极光主光（Key） | `#2bffc0` | 0.55（平行光，右上方 15°） | 只对雪面/屋顶产生冷绿染色，不投影 |
| 星光/月光（Fill） | `#9fc4ff` | 0.28（平行光，左后上方） | 唯一投影光源，2048 阴影 |
| 半球天光 | 天 `#12294a` / 地 `#050a12` | 0.35 | 提供暗部冷色与最低可见度 |
| 窗光（Practical） | `#ffb060` | 22 cd，距离 16 m，decay 2 | 雪面形成暖色光池，与冷绿对冲 |
| 炉火 | `#ff7a2a` | 14 cd + 噪声闪烁 | 室内为主，门口溢出 |
| 雪地反弹 | `#7d9ab8` | 半球地面色提亮 | 木屋底部不该死黑 |

**光比**：雪地亮部 : 暗部 ≈ 4:1；窗光局部 : 周围雪 ≈ 8:1；极光峰值 : 天空 ≈ 6:1。**没有纯黑（最低 0.015）与纯白（最高 0.96，光源除外）。**

### 1.4 材质规格

| 材质 | 参数 |
| --- | --- |
| 雪 | 基色 `#dfeaf5`，粗糙度 0.45–0.65（风蚀区更低），法线三层叠加（0.15 m 风脊 / 2 cm 颗粒 / 冰晶闪点），次表面 0.12，掠射角闪点 |
| 木材 | `#2a1d17`，粗糙 0.72，木纹凹凸 + 端面年轮，边缘积雪（朝上法线混合雪材质） |
| 窗玻璃 | 自发光 3.5，粗糙 0.15，内部可见暖色体积（用半透明面片 + 噪声） |
| 屋顶雪 | 厚 0.25 m，边缘圆角，悬垂冰柱（InstancedMesh 圆锥，随机长度 0.1–0.8 m） |
| 冰 | 透射近似：`transmission 0.6` 或自定义折射，粗糙 0.08，内部气泡噪声 |
| 铁/旧金属 | 粗糙 0.3，锈迹遮罩，各向异性微弱 |

### 1.5 大气

- 指数雾：`FogExp2(#0b1a2a, 0.0035)`，另叠一层**高度雾**（0–8 m 密度最高），让树线"浮"在雾上。
- 空气透视：300 m 外对比度 −30%，色相偏青 `#16324a`。
- 极光在地平线的散射：一条加法混合的绿色辉光带（高度 0–12%），强度随 Kp。
- 雪面反照：夜间雪不应是灰色，而是带蓝的天光反射 + 极光方向的绿边。

### 1.6 镜头与运动

| 项 | 规格 |
| --- | --- |
| 焦距 | 35 mm 等效；FOV 40°（16:9）/ 32°（2.39） |
| 机位高度 | 1.55–1.65 m（人眼），俯仰 +4° |
| 光圈 | f/2.8，对焦 18 m（木屋），前景 1.2 m 轻微虚化 |
| 运动 | 手持微抖：位移 0.8 cm、旋转 0.3°，周期 6–9 s，多频正弦叠加 |
| 移动镜头 | 推轨 0.6 m/s，缓入缓出 1.2 s；转身带 0.15 s 惯性 |
| 呼吸 | 站立时相机随呼吸起伏 0.6 cm / 4 s |

### 1.7 质感关键词与反模式

**要**：cinematic、anamorphic、halation、volumetric、physically based、filmic、deep shadows with detail、muted highlights、atmospheric perspective、fine grain、anamorphic bokeh。

**不要**（出现即判定不合格）：

- 紫色/品红霓虹极光、彩虹渐变天空；
- 泛光过曝（strength > 0.8）、整屏发灰、纯黑阴影；
- 均匀大小、均匀亮度的星点；贴图式极光（一张 PNG 拉伸）；
- 塑料感雪（纯白 Lambert、无粗糙度变化）、雪面纯灰；
- 无人机俯视、超广角鱼眼、卡片式 UI 挡住画面；
- 卡通描边、低多边形风格化（除非明确要风格化版本）。

---

## 2. 主控提示词

完整正文见 [master-prompt.md](master-prompt.md)。使用前替换两个占位符：

- `{{PROJECT_DIR}}` → 例如 `E:\Deepseek\aurora-hollow`
- `{{REF_IMAGE}}` → 参考图路径（或直接粘贴 §1 视觉规格）

如果只想要「场景 demo」，把主控提示词里【玩法】整段替换为：
> 本阶段只做可自由飞行的场景（WASD + 鼠标 + Shift 加速 + P 拍照模式），不实现生存、建造、AI；但视觉规格一条不许少。

---

## 3. 分模块提示词（M01–M12）

> 用法：每次只贴一个模块，附上当前截图与报错。模块可以单独使用，也可以拼进主控提示词。

### M01 · 工程骨架与构建

```text
【任务】在 {{PROJECT_DIR}} 建立可长期迭代的 three.js 工程骨架。

【结构】
src/
  main.js            启动、循环、全局错误边界
  core/loop.js       固定步长 60 Hz + 渲染插值
  core/input.js      键鼠/触屏/指针锁定
  core/quality.js    3 档画质与自动降级
  core/debug.js      URL 参数、调试面板、冻结时间
  world/…  render/…  gameplay/…  ui/…  audio/
  vendor/three.module.js  （本地副本，禁止 CDN）
build.mjs            内联打包成单文件 aurora-hollow.html
index.html           开发入口

【渲染器】WebGL2、antialias、powerPreference:"high-performance"、
outputColorSpace=SRGB、toneMapping=ACESFilmic、toneMappingExposure=1.15、
shadowMap PCFSoft、pixelRatio=min(dpr,2)。

【循环】固定 1/60 累加器，最多补 3 帧；渲染用 alpha 插值；标签页隐藏时暂停物理。

【画质档】高：全特效 2048 阴影 / 3 万雪粒 / 像素比 min(dpr, 1.5)；
中：1024 阴影 / 1.2 万 / min(dpr, 1.25)；低：关阴影、关景深、8 千 / 1.0。
连续 3 秒 < 50 fps 自动降一档，回升需稳定 10 秒。

【调试】?seed=&t=&kp=&q=0|1|2&fps=1&wire=1&freeze=1&cam=x,y,z&look=x,y,z&shot=1
（shot=1 时隐藏 UI、固定机位、暴露 window.__READY__ 供无头截图）

【验收】空白场景 60 fps；无 console 报错；build 产出的 HTML 双击可开；
刷新后 URL 参数生效；调试面板显示 draw calls / tris / ms。
```

### M02 · 地形 · 雪原 · 冰湖

```text
【任务】程序化生成 6 km × 6 km 北极冻原地形，参考图前景的雪面质感是重点。

【高度场】seed 驱动 mulberry32；6 层 FBM（基础起伏）+ ridged noise（冰川脊）
+ domain warp（雪丘）+ 大尺度盆地（湖/谷）。分辨率 2048²，世界 6144 m。
冰湖：用椭圆 SDF 压平到 -1.2 m，边缘 24 m 平滑过渡；冰川：脊线 + 裂隙切槽。
雪深层：独立 1024² 图，0–0.6 m，风蚀方向由主风向决定。

【分块】64 m 一块，9×9 流式加载；每块 LOD 0–3，裙边防裂；地形碰撞用高度图双线性采样。
远景 LOD 用低模 + 法线贴图，不出现"纸片山"。

【材质】三平面混合：雪 / 岩 / 冰。雪：白 0.9、粗糙 0.55、法线三层（0.15 m 风脊、
2 cm 颗粒、掠射闪点）；岩：深灰褐、粗糙 0.8；冰湖：低粗糙 + 屏幕空间反射近似。
雪面必须能接收极光的绿色染色与窗光的暖色光池。

【验收】任意机位无接缝、无 Z-fighting；跑图 1 km 不见重复图案；
雪面在 5 m / 50 m / 500 m 三个距离上都有细节；帧时间 < 4 ms。
```

### M03 · 极光（本作灵魂）

```text
【任务】实现参考图中"绿色幕帘横扫夜空"的极光，必须是体积感，不是贴图。

【结构】3 层弧形幕帘（半径 420 / 680 / 950 m，高度 120–420 m），
每层 PlaneGeometry(2400, 700, 96, 48) 在顶点着色器弯成圆柱面，
additive blending、depthWrite=false、depthTest=true（被山遮挡）、HDR 颜色 >1。

【着色】域扭曲 FBM 生成幕帘主体；uv.y 方向高频 FBM 生成垂直光柱；
幕帘底部亮、顶部淡；左右两端渐隐；边缘 5% 混入品红 #6b3a8f。
颜色 ramp：底 #14ffb0 → 中 #4dffd4 → 顶 #2f6bff。
流动：两层不同速度（0.015 / 0.008），叠加慢速呼吸（sin 周期 11 s）。

【参数】uKp 0–9 控制亮度、幕帘数量、光柱锐度；uWind 控制横向漂移；
uTime 独立于游戏时间（拍照模式可冻结）。

【光照联动】极光强度 → 平行光 #2bffc0 强度 0.15–0.9、半球光偏绿、
雾色向 #0d3b33 偏移、雪面反照率 +8%、泛光阈值下降 0.05。

【验收】截图里极光有明确的前后层次与垂直丝状结构；峰值亮度 >2.0（HDR）；
边缘无锯齿、无 banding；从任何角度看都不穿帮；关闭极光后场景仍成立。
```

### M04 · 星空 · 银河 · 大气

```text
【任务】参考图级别的星空与空气透视。

【星】18000 个点，半径 3000 m 天球；大小按星等 0.6–2.2 px，颜色 4000–10000 K；
每颗独立相位闪烁（0.7–2 Hz，幅度 0.15）；地平线以下淡出（消光）。
禁止所有星一样大、一样亮。

【银河】沿大圆分布的 6 万暗点 + 3D 噪声亮带（程序生成等距柱状贴图 2048×1024），
色 #2a4a72，亮度仅比天空高 12%；一条暗尘带切过银心。

【流星】平均 40 s 一颗，持续 0.6 s，HDR 拖尾，随机方向，不频繁。

【大气】指数雾 #0b1a2a 密度 0.0035 + 高度雾（0–8 m）+ 远景对比衰减；
天空本身用三层渐变（天顶/中段/地平线），地平线处叠极光散射辉光。
所有雾必须在 HDR 空间做，避免 sRGB 空间插值发灰。

【验收】星空有密度变化与银河结构；地平线附近星点消失；雾不把画面洗白；
截图缩到 25% 仍能看出银河走向。
```

### M05 · 木屋 · 道具 · 场景叙事

```text
【任务】复刻参考图左侧的木屋，并让它在 5 m 内经得起细看。

【结构】原木墙（InstancedMesh 圆木，直径 0.22 m，逐根 ±1.5° 随机旋转与 1 cm 错位）、
32° 双坡屋顶、石砌烟囱、门廊、外挂梯、窗框、门、雪橇、柴堆、冰柱。
屋顶积雪 0.25 m，檐口圆角下垂，边缘不规则。

【材质】木：深褐 #2a1d17、粗糙 0.72、木纹 + 端面年轮；朝上表面按法线混合雪材质；
窗：自发光 3.5 + 内部暖色面片 + 玻璃粗糙 0.15；烟囱内可见微弱火光。

【叙事道具】门口冻结的靴子、靠墙的木梯、屋后细天线杆、左侧半埋的雪地车、墙上的刻痕、
半埋的信箱、熄灭的提灯、拖拽痕迹。每件都要有独立的小阴影与雪堆积。
其中"梯子斜靠山墙、天线杆细长剪影、雪车只露出车顶"这三样是参考图的识别性细节，必须做。

【性能】按材质合并；远处 LOD1（去内部、减半圆木）；阴影投射只保留主体与烟囱。

【验收】3 m 内可见木纹与积雪厚度；窗光在雪面形成 8:1 的暖色光池；
轮廓在极光下有一圈冷绿边缘光；LOD 切换无跳变。
```

### M06 · 光照与电影级调色

```text
【任务】把"能看"变成"电影截图"。这是全项目权重最高的一环。

【渲染管线】HDR HalfFloat 渲染目标 → 泛光（阈值 0.85、强度 0.5、半径 0.7、6 级）
→ 暖色 halation（#ff9a5c，0.06）→ 景深（f/2.8，对焦 18 m，最大模糊 6 px）
→ 色差（仅边缘，0.0012）→ 暗角（0.32，圆度 0.4）→ 胶片颗粒（0.03，1.2 px）
→ ACES 色调映射 → sRGB → 抖动（防 banding）。

【调色】3D LUT 16³ 程序生成：阴影偏青（210–230°）、高光偏暖（30–45°）、
饱和 1.05、对比 1.06；lift (0.005,0.010,0.020)、gain (1.03,1.00,0.97)。
禁止把极光的绿压成青灰。
注意：若使用后期链路，renderer.toneMapping 必须设为 NoToneMapping，
由最终 pass 统一做 ACES，避免二次色调映射导致高光发灰。

【曝光】人眼适应：目标中灰 0.42，速度 0.6/s；从木屋走到雪原时 2 s 内自动提亮，
但窗光不得过曝（局部 tonemap 或 bloom 阈值保护）。

【验收】直方图双峰（暗部天空 + 亮部雪/窗），无 >0.98 的大面积死白、无 <0.01 的死黑；
阴影里仍能读出雪脊；窗光有柔和光晕但不过曝；缩略图有"电影海报"感。
```

### M07 · 雪地交互 · 足迹 · 粒子

```text
【任务】让雪"可被踩"，这是沉浸感的关键。

【足迹】2048² 顶视 RenderTarget 覆盖玩家周围 96 m；每移动 0.35 m 盖一次脚印
（RG=深度、B=压实度）；地形着色器采样，压深处变暗 8%、法线压平、粗糙度下降；
脚印随时间 0.02/s 淡出（暴风雪中 3 倍速）。

【扬雪】冲刺/急停时 2000 个 GPU 粒子：生命周期 0.6 s、重力、阻力、随风漂移，
只在近处（<25 m）出现。

【呼吸】每 3.2 s 一次白雾 sprite，随风向偏移，低温时更浓。

【其他】落雪（3 万 instanced quad，GPU 驱动，深度感知遮挡）、
风吹雪贴地流动层（噪声滚动，0.2 m 高）、雪面反光随视角变化。

【验收】走过雪地留下连续、方向正确的脚印；转身有拖痕；
暴风雪中脚印快速消失；粒子不穿墙、不闪烁。
```

### M08 · 生存系统

```text
【任务】实现 GDD §4 的生存闭环，数值直接照表，不要自创。

【属性】HP/饥饿/口渴/耐力/核心体温/精神/疲劳；固定 1 Hz 结算，UI 用插值。
体温公式、CLO 表、失温阶段、冻伤部位、状态效果全部按 GDD 实现。

【交互】E 拾取/交互；长按 E 生火；火需要火绒 + 木柴 + 避风（风速 > 8 m/s 时失败）；
雪水需煮沸；生肉 25% 食物中毒；睡眠跳过时间并结算体温。

【反馈】不用数字弹窗：结霜 shader、呼吸变粗、心跳、手指发白、镜头轻微抖动。
低体温时 UI 边缘结冰并逐渐侵入画面。

【死亡】掉落背包（可回收，限时冻结）；在最近床/篝火复活；
严酷难度掉落全部装备。死亡界面是一段 8 s 的固定镜头（雪落在尸体上），可跳过。

【验收】不穿衣服在 -28°C 户外 3–6 游戏小时死亡；屋内可稳定过夜；
饥饿/口渴/体温三条曲线可在调试面板实时可视化。
```

### M09 · 制作 · 建造 · 据点

```text
【任务】实现 GDD §5 的制作与建造，重点是"造出来的屋真的更暖"。

【制作】28 配方数据驱动（JSON），工作站限制，工具耐久与修理；
UI 为轮盘 + 列表双层，显示材料缺口与"可替代材料"。

【建造】18 件套；网格 0.5 m + 角度 15° 吸附；幽灵预览（绿/红）；
结构完整性用简化支撑图（BFS 到地基）；暴风雪中无支撑件倒塌（带音效与碎雪）；
封闭空间计算开口数与体积 → shelterBonus 0–2.5 CLO；拆除返还 50%。

【据点】储物箱、床（设复活点）、晾衣架（烘干）、灯柱（夜间导航）、
风挡（降低局部风速）。所有建筑参与阴影与雪堆积。

【验收】造一面墙能观测到屋内风速下降；屋顶能挡住落雪；
拆掉承重墙会倒塌；存档后重建完全一致。
```

### M10 · 生物与 AI

```text
【任务】GDD §5.4 / §6 的生物。不要做"直线追人"的假 AI。

【狼群】状态机：巡逻 → 察觉 → 包抄（2 只绕侧）→ 试探 → 冲锋 → 撤退；
怕火（4 m 内不进攻）、怕强光；头狼死亡后群体溃散；白天更低攻击性。
【驯鹿】迁徙路线按 seed 生成，群体 steering（分离/对齐/聚合），受惊奔逃。
【北极狐】偷取放置在地上的食物，被追则钻洞。
【熊】护巢，低吼预警，冲锋有 0.8 s 前摇（可躲）。
【低语者】Kp≥7 夜晚在视野边缘出现，不可击杀；直视掉精神，转身消失；
火/木屋范围内不出现。

【性能】每帧最多 40 个活跃 AI；远处用简化 tick（5 Hz）；导航用高度图 + 障碍斥力，
不建 navmesh；动画用程序化骨骼摆动（腿/头/尾），远距离降为 2 骨骼。

【验收】狼会绕后、会被火逼退；驯鹿群有整体转向；
AI 不穿墙、不抖动、不掉下地形；40 只同屏仍 60 fps。
```

### M11 · 创造模式 · 导演模式

```text
【任务】GDD §7 的编辑器与拍摄工具，这是"电影级"的出口。

【创造】无限资源、飞行（12 m/s，滚轮调速）、蓝图库、框选复制、镜像、撤销 50 步；
地形笔刷 5 种（隆起/下陷/平滑/雪深/冰面），实时更新高度图与碰撞；
资产库 60+（按类别分组，带缩略图，全部程序化）。

【环境】时间 0–24 滑杆、天气预设、Kp 0–9、极光色相/幕帘数/流速、
雾密度、月光强度、雪量；所有参数可打关键帧。

【导演】自由相机、焦距 18–85 mm、光圈、对焦拉杆、关键帧轨道 + 5 种缓动、
时间凝固、隐藏 HUD、构图辅助线（三分/中心/2.39 遮幅）、4K 截图（2× 超采样）、
WebM 录制 60 Mbps、一键生成分享码。

【验收】新建创造世界 10 s 内可开始建造；改极光参数实时生效；
导出的 4K 截图无 UI、无锯齿；分享码在另一浏览器可还原 95% 以上内容。
```

### M12 · UI · 音频 · 存档

```text
【任务】把"技术 demo"变成"产品"。

【UI】极简 diegetic：体温环 + 三条细线 + 罗盘条 + 交互提示；
结霜/暗角/呼吸全部由状态驱动；菜单呼吸式淡出；中文手写体标题。
设置：画质、FOV、灵敏度、动态模糊、屏幕震动、字号、色盲模式、字幕。

【音频】WebAudio 全程序化：风 3 层、脚步 4 种、火、极光和声（Kp 驱动）、
心跳、3 套环境乐；距离衰减与室内混响；暴风雪眼与洞穴刻意抽空。

【存档】GDD §10 的 schema；localStorage 元数据 + IndexedDB 主体；
3 手动 + 1 自动；版本迁移；导出/导入 .ahsave；损坏存档要能回滚到上一个自动档。

【验收】首次进入 3 分钟内理解全部核心操作；无 UI 遮挡画面中心；
所有按钮有 hover/active/disabled 三态；静音后仍有字幕提示；存档断电不丢。
```

---

## 4. 迭代提示词（比生成更重要）

### 4.1 美术总监评审（每次改完必跑）

```text
你是这部电影级场景的摄影指导兼艺术总监。对照我给出的视觉规格（§1）与参考图，
评审这张截图，不要客气，不要泛泛而谈。

【评分】构图 / 光比 / 色温 / 材质 / 大气 / 镜头语言 / 后期 / 整体电影感，各 0–10，
并给一句理由。低于 8 分的项必须指出具体区域（左上/地平线/前景…）。

【输出】
1. 三条"最破坏电影感"的问题，按严重度排序；
2. 五条最高性价比修改，每条给出具体参数（shader uniform / 灯光强度 / 曲线值），
   并预估提升幅度；
3. 一条"不要改"的建议（避免过度打磨）。

禁止建议"增加更多特效"。优先用光、雾、构图、材质解决问题。
```

### 4.2 性能优化

```text
分析当前帧的 GPU/CPU 开销（draw calls、三角形、shader 复杂度、纹理带宽、阴影、
粒子、后处理）。输出 Top 10 开销项，每项给出：当前 ms、根因、修复方案、
预计节省 ms、对画面的影响（0–3 级）。

约束：1080p 60 fps 不能降；视觉差异必须 < 5%。优先顺序：
合并批次 → LOD/ impostor → 降分辨率渲染目标 → 减少实时光源 → 简化 shader。
不要用"关闭阴影/关闭后处理"作为方案。
```

### 4.3 Shader 调试

```text
这个 shader 的输出不对（附截图与期望）。请：
1. 用最小可复现案例隔离问题（只保留相关 uniform 与计算）；
2. 逐项可视化中间变量（法线/深度/噪声/遮罩），给出可视化代码；
3. 解释数学上的错误假设；
4. 给出修复后的完整 shader 与"如何验证修好了"的检查项。
不要重写整个材质，只改出错的部分。
```

### 4.4 Bug 复现与回归

```text
现象：（贴报错/截图/操作步骤）
请按：最小复现 → 根因（5 Whys）→ 修复 → 回归测试 的顺序处理。
修复必须附带一个能自动跑的检查（console 断言 / 截图对比 / 数值范围校验），
并在修复后说明"为什么不会再犯"。
```

### 4.5 手感调优

```text
以第一次玩这个游戏的玩家身份，按 GDD §11 的 60 分钟旅程走一遍，
记录前 10 个"卡住/困惑/无聊/出戏"的瞬间，每个给出：
发生时刻、玩家以为什么、实际是什么、最小改法（UI/数值/引导/音效）。
优先改"玩家第一次死亡前"的体验。
```

### 4.6 发布前验收

```text
对照 §8 验收清单逐项检查，输出表格：项目 / 结果（通过/不通过/未测）/ 证据（截图或命令输出）。
不通过项给出修复优先级。禁止用"应该没问题"作为证据。
```

---

## 5. 生图提示词（概念图 / 关键艺术 / UI）

> 用于 Midjourney / SDXL / 即梦，产出美术参考、商店图、加载图。与 three.js 实现互补。

### 5.1 主视觉 Key Art（英文，MJ v6 / SDXL）

```text
Ultra-cinematic wide establishing shot of an arctic polar night: a weathered log cabin
with two glowing amber windows sits on the left third of the frame, wind-carved snowdrifts
and a single trail of footprints in the foreground, a vast emerald aurora curtain with fine
vertical rays sweeping diagonally across the right half of the sky, dense star field and a
faint Milky Way above, a broken silhouette of spruce treeline along the horizon, cold blue
volumetric haze hugging the ground, warm light pooling on the snow beneath the windows.
Shot on 35mm anamorphic, f/2.0, 8-second exposure, subtle halation, fine 35mm grain,
deep teal shadows, restrained highlights, Kodak Vision3 500T color science, no text.
--ar 21:9 --style raw --v 6.1
```

**Negative**：
```text
oversaturated purple, neon magenta sky, rainbow gradient, cartoon, illustration, flat
lighting, blown highlights, plastic snow, low contrast, HDR halos, text, watermark, logo,
daytime, sun, people, fisheye, tilted horizon
```

**参数建议**：风格强度 0.6（若用参考图作 style ref），构图参考权重 0.35；出 4 张选 1 张再局部重绘窗光。

### 5.2 生物群系概念（各 1 张）

```text
# 针叶林
moonless taiga at night, snow-laden spruce, green aurora filtering through branches,
wolf eyes reflecting light in the dark, blue volumetric fog, 35mm, cinematic, 2.39:1

# 冰湖
frozen black lake mirroring a green aurora, pressure cracks glowing faint cyan,
tiny human silhouette with a lantern in the middle distance, vast negative space

# 冰川
deep blue ice cave, translucent walls with trapped air bubbles, a single warm headlamp
beam, ice crystals on the floor, cinematic volumetric light, cold teal palette

# 温泉
steaming hot spring in a snowfield at night, orange lantern light on wet black rocks,
aurora above, contrast of warm steam and cold blue snow, cinematic

# 黑岩脊
black volcanic ridge under an intense green aurora, magnetic anomaly, compass needles
floating, wind-blown snow streaks, graphic silhouette composition
```

### 5.3 UI / HUD 概念

```text
minimal diegetic survival HUD, thin frosted-glass arcs, temperature ring in pale cyan,
three hairline bars, no numbers, Chinese handwritten title "极光冻原", dark UI,
subtle frost texture at screen edges, cinematic game interface, 4k, flat lay
```

### 5.4 角色服装

```text
polar explorer, 1912 expedition, layered wool and sealskin parka, frost on beard,
goggles pushed up, carrying a kerosene lantern, backlit by green aurora, snow on shoulders,
cinematic portrait, 85mm, shallow depth of field, film grain
```

### 5.5 中文版（即梦 / 通义万相 / 可灵）

```text
电影级广角镜头，北极极夜，画面左侧一间原木小屋，两扇窗透出暖黄灯光，
前景是被风雕刻出波纹的雪原和一串脚印，右侧天空一道巨大的绿色极光幕帘斜扫而过，
带细密垂直光柱，天空布满繁星与淡淡银河，地平线是云杉树线剪影，地面浮着冷蓝色薄雾，
35mm 变形宽银幕镜头，f/2.0，长曝光，轻微光晕，胶片颗粒，青蓝暗部，克制的高光，
无文字，21:9
```

---

## 6. 数值配方（实现时直接抄）

### 6.1 光照

| 项 | 值 |
| --- | --- |
| 曝光 | 1.15（ACES） |
| 极光平行光 | `#2bffc0`，0.15–0.9（随 Kp） |
| 星光平行光 | `#9fc4ff`，0.28，2048 阴影 |
| 半球光 | 天 `#12294a` / 地 `#050a12`，0.35 |
| 窗光 | `#ffb060`，22 cd，dist 16，decay 2 |
| 炉火 | `#ff7a2a`，14 cd，噪声闪烁 ±25% |
| 阴影 bias / normalBias | −0.0004 / 0.03 |

### 6.2 后期

| 项 | 值 |
| --- | --- |
| Bloom | 阈值 0.85，强度 0.5，半径 0.7，6 级 |
| Halation | `#ff9a5c`，0.06 |
| DOF | f/2.8，对焦 18 m，最大模糊 6 px |
| 颗粒 | 0.03，1.2 px |
| 暗角 | 0.32，圆度 0.4 |
| 色差 | 0.0012（仅边缘） |
| 饱和 / 对比 | 1.05 / 1.06 |
| Lift / Gain | (0.005,0.010,0.020) / (1.03,1.00,0.97) |
| 曝光适应 | 目标 0.42，速度 0.6/s |

### 6.3 相机

| 项 | 值 |
| --- | --- |
| FOV | 40°（16:9）/ 32°（2.39） |
| 近远平面 | 0.1 / 6000 |
| 眼高 | 1.62 m |
| 行走 / 冲刺 | 1.45 / 5.4 m/s |
| 手持抖动 | 位移 0.8 cm，旋转 0.3°，6–9 s |

### 6.4 性能预算（1080p / GTX 1650 级）

| 项 | 预算 |
| --- | --- |
| 帧时间 | ≤ 16.6 ms（p95），GPU ≤ 12 ms |
| Draw calls | ≤ 350 |
| 三角形 | ≤ 2.2 M |
| 阴影投射体 | ≤ 120 |
| 纹理显存 | ≤ 220 MB |
| 活跃粒子 | ≤ 35 k |
| 流式加载 | ≤ 4 ms / 帧 |
| 首屏可交互 | ≤ 2.5 s |

### 6.5 画质三档

| 档 | 像素比 | 阴影 | 雪粒 | 后期 |
| --- | --- | --- | --- | --- |
| 高 | 1.5 | 2048 | 30 k | 全开 + DOF |
| 中 | 1.25 | 1024 | 12 k | 关 DOF、降泛光分辨率 |
| 低 | 1.0 | 关 | 8 k | 仅泛光 + 调色 |

---

## 7. 代码种子（可直接给模型当锚点）

### 7.1 极光幕帘（GLSL，片元）

```glsl
uniform float uTime;   // 秒
uniform float uKp;     // 0..1
uniform vec3  uLow;    // #14ffb0
uniform vec3  uMid;    // #4dffd4
uniform vec3  uHigh;   // #2f6bff
varying vec2  vUv;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1,0));
  float c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = m * p; a *= 0.5; }
  return s;
}

void main(){
  vec2 uv = vUv;
  float t = uTime * 0.015;

  // 低频域扭曲 → 幕帘主体
  float warp    = fbm(vec2(uv.x * 2.2 + t * 0.35, uv.y * 0.7 - t));
  float curtain = fbm(vec2(uv.x * 3.4 + warp * 1.8 + t * 0.2, uv.y * 1.1 - t * 0.6));

  // 高频垂直光柱，跟随幕帘弯曲
  float rays = fbm(vec2(uv.x * 46.0 + curtain * 3.0, uv.y * 1.6 - t * 3.0));
  float rayMask = pow(smoothstep(0.35, 0.95, rays), 1.6);

  // 上下 + 左右渐隐
  float vFade = smoothstep(0.0, 0.22, uv.y) * (1.0 - smoothstep(0.55, 1.0, uv.y));
  float hFade = smoothstep(0.0, 0.18, uv.x) * (1.0 - smoothstep(0.82, 1.0, uv.x));

  float a = (curtain * 0.55 + rayMask * 0.85) * vFade * hFade;
  a *= 0.55 + 0.45 * uKp;

  vec3 col = mix(uLow, uMid, smoothstep(0.05, 0.55, uv.y));
  col = mix(col, uHigh, smoothstep(0.50, 1.00, uv.y));
  // 5% 品红边，防"塑料绿"
  col += vec3(0.35, 0.05, 0.45) * pow(1.0 - abs(curtain - 0.5) * 2.0, 6.0) * 0.25;

  gl_FragColor = vec4(col * (1.6 + 1.4 * uKp), a); // HDR，交给 bloom
}
```

> 混合：`AdditiveBlending`，`depthWrite:false`，`depthTest:true`；每层用不同 `uTime` 偏移与透明度（0.9 / 0.6 / 0.35）做出视差。

### 7.2 雪面闪点（片元，叠加在雪材质）

```glsl
vec3  N = normalize(vNormal);
vec2  cell = floor(vWorldPos.xz * 220.0);
float g  = hash21(cell);
vec3  Ng = normalize(N + vec3(g - 0.5, 0.0, hash21(cell + 7.0) - 0.5) * 0.55);
vec3  H  = normalize(uLightDir + uViewDir);
float spec = pow(max(dot(Ng, H), 0.0), 380.0) * step(0.985, g);
gl_FragColor.rgb += spec * 3.0 * uAuroraColor;
```

### 7.3 星空（顶点着色器要点）

```glsl
attribute float aSize;    // 0.6 .. 2.2
attribute float aPhase;   // 0 .. 6.28
attribute vec3  aColor;   // 色温映射
uniform float uTime;
varying vec3 vColor;

void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float twinkle = 0.85 + 0.15 * sin(uTime * 1.3 + aPhase * 6.28);
  gl_PointSize = aSize * twinkle * uPixelRatio;
  gl_Position  = projectionMatrix * mv;
  vColor = aColor * twinkle;
}
// 片元：圆形软边  smoothstep(1.0, 0.0, length(gl_PointCoord - 0.5) * 2.0)
```

### 7.4 足迹 RenderTarget

```js
// 顶视正交相机：覆盖玩家周围 96 m → 2048²
const trailCam = new THREE.OrthographicCamera(-48, 48, 48, -48, 0.1, 200);
const trailRT  = new THREE.WebGLRenderTarget(2048, 2048, {
  format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter
});
// 每移动 0.35 m：在玩家位置放一枚脚印贴片，渲染进 trailRT（不清屏，累积）
// 地形材质采样：uv = (worldPos.xz - center + 48) / 96
// 压深处：albedo *= 1.0 - 0.08 * stamp.r；normal 混合压平；粗糙度 -0.1
// 淡出：每帧以 0.998 的系数乘到旧内容（或用 1×1 清屏 + 衰减 shader）
```

### 7.5 后期链路（顺序不可乱）

```text
Scene(HDR HalfFloat) → Bloom → Halation → DOF → ChromaticAberration
→ Vignette → FilmGrain → ACES Tonemap → sRGB → Dither → Canvas
```

### 7.6 无头截图验收（Playwright 草图）

```js
// tools/shot.mjs —— 固定 3 个机位，输出对比图
import { chromium } from 'playwright';
const shots = [
  { name: 'ref',  cam: '0,1.62,14', look: '-9,2.4,0',  fov: 40 },
  { name: 'wide', cam: '20,3.2,40', look: '-9,4,0',     fov: 32 },
  { name: 'close',cam: '-6,1.7,6',  look: '-9,1.8,0',   fov: 40 },
];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const s of shots) {
  await p.goto(`file:///.../aurora-hollow.html?shot=1&q=2&cam=${s.cam}&look=${s.look}&fov=${s.fov}`);
  await p.waitForFunction(() => window.__READY__ === true, { timeout: 30000 });
  await p.waitForTimeout(1200);            // 等曝光适应与粒子稳定
  await p.screenshot({ path: `shots/${s.name}.png` });
}
await b.close();
```

---

## 8. 验收清单

### 视觉

- [ ] 3 个固定机位截图与参考图构图/色温/光比接近（人工评分 ≥ 8/10）
- [ ] 直方图：暗部 > 0.01、亮部 < 0.98（光源像素除外），无 banding
- [ ] 极光有前后层次与垂直丝状结构，峰值 > 2.0 HDR
- [ ] 雪面在 5 / 50 / 500 m 都有细节，不是一块白
- [ ] 窗光在雪面形成暖色光池，与极光冷绿形成对比
- [ ] 阴影里有细节，树线是剪影但不是死黑
- [ ] 画面缩到 25% 仍像电影海报

### 性能

- [ ] 1080p 60 fps（p95 帧时间 ≤ 16.6 ms）
- [ ] Draw calls ≤ 350，三角形 ≤ 2.2 M
- [ ] 自动降档在低端机生效且无观感崩塌
- [ ] 首屏可交互 ≤ 2.5 s，无长任务 > 200 ms

### 玩法

- [ ] 前 10 分钟能独立生火、喝水、过夜
- [ ] 体温/饥饿/口渴/精神四条曲线可在调试面板观察
- [ ] 建造的屋能显著改变体温曲线
- [ ] 狼群会包抄、怕火；低语者只在强极光夜出现
- [ ] 创造模式 10 s 内可开始建造，5 分钟能拍出成片

### 稳定

- [ ] 无 console error / warning
- [ ] 存档断电不丢，损坏可回滚
- [ ] 窗口缩放、切标签页、长时间挂机不崩
- [ ] 单文件成品双击离线可玩

---

## 9. 快速自检：AI 交付是否"像 demo"

| 症状 | 诊断 | 处方 |
| --- | --- | --- |
| 画面平、像网页 | 没有 HDR 管线与调色 | M06，先做 HDR + ACES + LUT |
| 雪是灰白塑料 | 只有 albedo，没有粗糙度/法线/SSS | M02 材质三层法线 + 闪点 |
| 极光像一块绿布 | 单层平面 + 贴图 | M03 三层幕帘 + 垂直光柱 + 域扭曲 |
| 星星像噪点 | 等大等亮 | M04 星等分布 + 闪烁 + 银河带 |
| 木屋像积木 | 无积雪、无边缘光、无道具 | M05 朝上积雪 + 冷绿轮廓光 |
| 灯光"打亮"而非"叙事" | 只有一个环境光 | M06 四光源 + 光比 + 实用光源 |
| 玩法像清单 | 系统之间不耦合 | 让体温同时驱动视觉/音频/UI/建造 |

---

*文档版本 1.0 · 配套 GDD 与主控提示词，可直接投喂 AI 编程智能体。*
