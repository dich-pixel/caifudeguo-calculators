# caifu 买房 vs 租房计算器

WordPress 插件 `caifu-buy-vs-rent`，短代码 `[caifu_buy_vs_rent]`。计算核心是与界面无关的纯 TypeScript 模块，按 `PRD_WordPress_买房vs租房计算器.md`（v1.0）实现。

## 开发

```bash
pnpm run bvr:test
pnpm run bvr:dev
pnpm run bvr:build
pnpm run bvr:zip -- --out /path/to/dir
```

需要 Node 22.14.0 才能打出与 CI 一致的 ZIP 字节（可用 `--allow-node-mismatch` 跳过）。工作区必须干净，否则加 `--allow-dirty`。

本地预览：`pnpm run bvr:build && pnpm run bvr:preview`，打开 `http://127.0.0.1:4177/host-wp-column.html`。`host-wp-column.html` 只用于测试，不会打进插件 ZIP。

## 测试专用 JS 接口

生产环境默认**关闭**。开启方式（满足任一即可）：

1. WordPress 的 `WP_DEBUG` 为 true；
2. 在 `wp-config.php` 中定义 `define('CAIFU_BVR_TEST', true)`；
3. 短代码 `[caifu_buy_vs_rent test="1"]`（不要用在正式页面）；
4. 本地静态预览给计算器页面加上 `?cbr_test=1`（在 caifudeguo.de 域名上会被忽略）。

开启后，计算器页面（iframe 内部）会出现：

```text
window.CaifuBuyVsRentTest.compute(inputs)
window.CaifuBuyVsRentTest.runMonteCarlo(inputs, config, onProgress)
window.CaifuBuyVsRentTest.scenarioMatrix(inputs)
window.CaifuBuyVsRentTest.createPrng(seed, initseq)
window.CaifuBuyVsRentTest.Pcg32
window.CaifuBuyVsRentTest.defaults
window.CaifuBuyVsRentTest.config
window.CaifuBuyVsRentTest.TAX_RATE
```

`compute` 的字段名与 PRD 第 4 章代码名一致（百分数用小数，如 3,5 % → `0.035`）。返回值含 `yearly`、`end`、`derived`、`warnings` 等。不要在生产站点留下 `test="1"`。
