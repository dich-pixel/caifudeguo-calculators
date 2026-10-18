=== caifudeguo AV-Depot 计算器 ===
Contributors: caifudeguo
Tags: calculator, altersvorsorgedepot, chinese
Requires at least: 5.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.1.0
License: AGPL-3.0-only
License URI: https://www.gnu.org/licenses/agpl-3.0.html

养老投资账户（Altersvorsorgedepot）计算器，中文界面，单人报税版。

== Description ==

* 短代码：`[caifudeguo_av_depot]`，可选属性 `height`（初始高度，像素，默认 2400）和 `title`（iframe 的无障碍标题）。
* 计算器以 iframe 显示（插件目录 `app/index.html`），完全在浏览器里计算：不上传数据、不用 cookie、不写 localStorage、不加载第三方资源、不做追踪。
* 高度自适应：计算器页面用 ResizeObserver 测高，通过 postMessage 告诉父页面；插件只接受以下来源（origin）的消息：
  `https://www.caifudeguo.de`、`https://caifudeguo.de`、本站的 origin、插件文件所在的 origin。
  需要追加时用 filter：

    add_filter('caifudeguo_av_depot_allowed_origins', function ($origins) {
        $origins[] = 'https://staging.example.org';
        return $origins;
    });

* 不建数据表、不存任何选项；删除插件后不留痕迹（uninstall.php 无需清理任何数据）。

== 广告标注（§5a UWG）==

如果在计算器旁边放券商返佣链接或其他有报酬的链接，必须按 §5a Abs. 4 UWG 清楚标明「Werbung」或「Anzeige」（例如链接前写「Anzeige：」）。计算器本身不含任何广告或返佣链接。

== License / 许可证 ==

GNU Affero General Public License v3.0 (AGPL-3.0-only)，见 LICENSE。
计算核心来自 finanzfluss/calculators（AGPL-3.0，Copyright Finflow GmbH and contributors），固定在 commit dcc29a69bdd8a3943d092e4c86ad42bff2767e1a。页面运行的是这份计算代码的机器生成副本，只改了输出取整（计算方法不变）。
Machine-generated copy; only output rounding changed, calculation method unchanged.
本插件与 Finanzfluss / Finflow GmbH 无关。

Corresponding source / 对应源代码：见 SOURCE.txt（fork 的固定 commit 链接）和插件内的 source/ 文件夹（同一 commit 的完整源代码归档）。

Build / 打包：必须用 Node 22.14.0（.nvmrc）：`PATH=/exec-daemon:$PATH pnpm run wp:zip`，或 `nvm use && pnpm run wp:zip`，或 `npx -p node@22.14.0 node caifudeguo/wp-plugin/build-zip.mjs`。其他版本会报错停下（`--allow-node-mismatch` 可跳过，SOURCE.txt 会记录实际版本）。

== Changelog ==

= 0.1.0 =
* 第一版：中文界面（阶段 2，单人报税），WordPress iframe 短代码。
