=== caifu 买房 vs 租房计算器 ===
Contributors: caifudeguo
Tags: calculator, immobilie, mieten, kaufen, chinese
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: AGPL-3.0-only
License URI: https://www.gnu.org/licenses/agpl-3.0.html

买房自住与继续租房的资产对比计算器，中文界面（可选德语），在浏览器中计算。

== Description ==

* 短代码：`[caifu_buy_vs_rent]`，可选属性 `lang="zh|de"`、`preset="default"`、`height`（初始高度，像素，默认 2400）、`title`（iframe 的无障碍标题）。
* Gutenberg 区块「买房 vs 租房」使用同一个渲染器。
* 计算器以 iframe 显示（插件目录 `app/index.html`），完全在浏览器里计算：不上传用户输入、不用 cookie、不调用第三方服务。
* 后台：设置 → 买房 vs 租房，可更新 Basiszins、输入默认值（含 Grunderwerbsteuer 税率）、默认语言和免责声明。卸载插件时删除这些设置。
* 高度自适应：计算器页面用 ResizeObserver 测高，通过 postMessage 告诉父页面。插件只接受来自该 iframe 本身、且来源与其地址一致的消息（以及本站 / 插件 origin 和 caifudeguo.de）。
* 兼容 WP Rocket「延迟 JavaScript 执行」和「Remove Unused CSS」：计算界面在 iframe 内，样式不会被主题页扫描去掉；embed.js 在运行时读取配置并会补发高度请求，不必把脚本从延迟执行中排除。

测试专用接口（生产环境默认关闭，见交付说明）：仅在 `WP_DEBUG`、常量 `CAIFU_BVR_TEST` 或短代码 `test="1"` 时开启。

== Changelog ==

= 1.0.0 =
* 第一版：确定性模型、情景矩阵、蒙特卡洛、中德界面、后台设置、Gutenberg 区块。

== License / 许可证 ==

GNU Affero General Public License v3.0 (AGPL-3.0-only)，见 LICENSE。
本插件由 caifudeguo.de 新写，不是 finanzfluss/calculators 的派生作品。
Corresponding source：见 SOURCE.txt 和插件内 source/ 文件夹。
