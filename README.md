# Big-Goose-Mall

一个基于 **uni-app (Vue 2)** 的微信小程序：选图 → 配置文字水印（实时预览）→ 生成并保存/分享带水印的图片。

纯前端实现，所有绘制在设备本地完成，不上传任何图片。

## 功能

**三步式流程**（单页面条件渲染切换）：

| 步骤 | 内容 |
|------|------|
| 1 · 选择图片 | 从相册选择或直接拍照 |
| 2 · 配置水印 | 实时预览 + 参数面板 |
| 3 · 预览保存 | 全屏预览、保存到相册、分享 |

**水印参数**

| 参数 | 范围 / 选项 | 默认 |
|------|-------------|------|
| 文字内容 | 自由输入，提供 `© 2024` / `禁止转载` / `仅供展示` 快捷标签 | 空 |
| 位置模式 | 平铺 / 单角（右下）/ 居中 | 平铺 |
| 密度 | 1 – 10（仅平铺模式生效） | 5 |
| 透明度 | 10% – 100% | 50% |
| 角度 | −45° – 45°（仅平铺模式生效） | 0° |
| 字号 | 12 – 48 | 24 |
| 颜色 | 白 / 黑 / 灰 / 红 / 黄 / 青 + 自定义 `#RRGGBB` | `#FFFFFF` |

**其他**

- 参数改动实时刷新预览；配置自动记忆，下次进入自动恢复
- 导出使用原图分辨率（超 4096px 自动等比缩小并提示）
- 相册/相机权限被拒时引导跳转设置页

## 技术栈

- **uni-app + Vue 2**（`manifest.json` 的 `vueVersion: "2"`）
- **微信小程序** `canvas type="2d"` 接口为主要目标平台
- SCSS；主题变量集中在 `uni.scss` 的 `$watermark-*`
- 无构建脚本、无 npm 依赖 —— 由 **HBuilderX** 托管编译，产物输出到 `unpackage/dist/dev/mp-weixin/`

## 目录结构

```
pages/index/
├── index.vue                  三步流程容器 + 页面级分享钩子
└── components/
    ├── StepIndicator.vue      顶部步骤指示器
    ├── ImagePicker.vue        Step 1：相册 / 拍照
    ├── WatermarkEditor.vue    Step 2：预览 + 参数面板 + 隐藏的导出 canvas
    ├── WatermarkCanvas.vue    canvas 封装（预览与导出共用）
    └── PreviewSaver.vue       Step 3：预览 + 保存 + 分享
utils/
├── watermark.js               水印绘制核心（纯函数，含 WYSIWYG 缩放基准）
└── storage.js                 配置持久化（uni.setStorageSync）
```

## 运行

1. 用 **HBuilderX** 打开本目录
2. `manifest.json` → 基础配置 → 把 **uni-app appid**（`__UNI__F188D55`）改为你自己的
3. `manifest.json` → 微信小程序配置 → 把 **微信 appid**（`wx9e2e830d327b47f3`）改为你自己的
4. 运行 → 运行到小程序模拟器 → 微信开发者工具

> `project.config.json` 里 `miniprogramRoot` 指向 `unpackage/dist/dev/mp-weixin/`，所以也可以直接用微信开发者工具打开本目录。

## 实现要点

有几处不显然、但改动时容易踩坑的地方：

**预览与导出的所见即所得**
`utils/watermark.js` 里 `PREVIEW_REFERENCE_WIDTH = 325` 是「名义基准宽度」，字号、平铺间距等几何量都相对它定义，绘制时按 `canvasWidth / 325` 等比放大。因此预览画布（几百 px）与导出画布（原图分辨率）的水印**相对大小严格一致**——这个比例与 `canvasWidth` 取值无关，所以改预览尺寸不会破坏 WYSIWYG。

**导出 canvas 必须留在视口内**
真机原生层不会光栅化移出视口的 canvas，`left:-9999px` 之类的隐藏方式会让 `canvasToTempFilePath` 返回空白图（相册里显示为黑图）。因此导出 canvas 用 `displayWidth/displayHeight` 把**显示尺寸**压到视口内的小尺寸，而**位图尺寸**（`canvas.width/height`）仍是原图分辨率，导出清晰度不受影响。

**导出前必须等绘制落定**
`drawWatermark` 是异步的（要先 `await` 图片加载），而 `renderCanvas()` 在「请求已过期」时会提前返回。若直接导出，读到的是 `clearRect` 之后、`drawImage` 之前的透明画布。所以导出前必须 `await waitForIdle()`。

**WXML 的 `style` 绑定只能是字符串**
三元表达式里嵌对象字面量（`cond ? {...} : {}`）会被原样输出到 WXML，导致编译报错。uni 只对**裸**对象字面量做字符串化优化。

**密度/角度在非平铺模式下是置灰而非隐藏**
这样参数面板高度恒定，预览区的量测结果不会因切换模式而失效。

## 已知限制

- **微信不能直接发送图片到聊天或朋友圈**。分享按钮走的是小程序卡片，以水印图作封面；真正的图片传递需要用户先保存到相册再从微信发送（保存成功的 toast 里带了这句提示）。App 端可用 `uni.share` 直接分享图片，代码中留有条件编译位置。
- 「分享到朋友圈」按钮当前走的是 `onShareAppMessage`，并非真正的朋友圈单页分享（后者只能由微信右上角菜单触发）。
- 单角模式固定为右下角，不可选角位。
- 仅支持文本水印，无图片/logo 水印、无批量处理、无拖拽摆放。
- **本项目没有自动化测试**。`utils/watermark.js` 是纯函数、便于单测，但目前尚未接入测试框架；canvas 相关逻辑只能在微信开发者工具/真机验证。
