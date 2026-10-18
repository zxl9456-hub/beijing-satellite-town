# 北京卫星小镇

星仔与讯宝的 Three.js 互动探索网站，包括园区漫游、七区建筑导览、粒子互动和七关游戏。

本站使用静态 HTML、JavaScript 与本地三维资源。GitHub Pages 发布源为 `main` 分支根目录。

本地预览：

```sh
python3 -m http.server 8765
```

打开 `http://localhost:8765/`。摄像头手势识别需要 HTTPS 或 localhost，并由用户主动开启。

2026-10-18 性能优化版：远近景模型切换、共享三维展台、离屏暂停与自适应分辨率。
