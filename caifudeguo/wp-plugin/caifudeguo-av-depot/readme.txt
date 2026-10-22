=== caifudeguo AV-Depot 计算器 ===
Contributors: caifudeguo
Tags: calculator, altersvorsorgedepot, chinese
Requires at least: 5.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.3.0
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

== 已知限制 ==

* 不支持合并报税（Zusammenveranlagung，§26b EStG）：只按单人的基本税率（Grundtarif，§32a Abs. 1 EStG）计算。
* 已婚合并报税：计算器只按单人算。页面上给了一个近似算法（两人合计应税收入各取一半填入），有误差，见页面说明。
* 如果自己没有交法定养老保险、只是因为配偶才有资格拿补贴（mittelbar zulageberechtigt，§79 S. 2 EStG），本计算器不适用。
* 局限：再投资的退税不会提高下一年的国家补贴和抵税基数，所以 AV 的结果略偏低。
* 「提前取出」（schädliche Verwendung，§93 EStG）一节是本插件另外加的计算层，不是 Finanzfluss 原计算器的结果；不含教会税（Kirchensteuer），只按 2026 税表和单人计算。

== 广告标注（§5a UWG）==

如果在计算器旁边放券商返佣链接或其他有报酬的链接，必须按 §5a Abs. 4 UWG 清楚标明「Werbung」或「Anzeige」（例如链接前写「Anzeige：」）。计算器本身不含任何广告或返佣链接。

== License / 许可证 ==

GNU Affero General Public License v3.0 (AGPL-3.0-only)，见 LICENSE。
计算核心来自 finanzfluss/calculators（AGPL-3.0，Copyright Finflow GmbH and contributors），固定在 commit dcc29a69bdd8a3943d092e4c86ad42bff2767e1a。页面运行的是这份计算代码的机器生成副本，只改了输出取整（计算方法不变）。
Machine-generated copy; only output rounding changed, calculation method unchanged.
「提前取出」一节另用一份机器生成副本（同上，只多一行 export，把内部函数导出给这个计算层用）。
Second machine-generated copy for the early-withdrawal layer: identical to the first plus one export line.
本插件与 Finanzfluss / Finflow GmbH 无关。

Corresponding source / 对应源代码：见 SOURCE.txt（fork 的固定 commit 链接）和插件内的 source/ 文件夹（同一 commit 的完整源代码归档）。

Build / 打包：必须用 Node 22.14.0（.nvmrc）：`nvm use && pnpm run wp:zip`，或 `npx -p node@22.14.0 node caifudeguo/wp-plugin/build-zip.mjs`。其他版本会报错停下（`--allow-node-mismatch` 可跳过，SOURCE.txt 会记录实际版本）。

== Changelog ==

= 0.3.0 =
* 阶段 5：单人报税脚注措辞修改（175 € 只在配偶资格说明里出现一次）；投入曲线里的 1 % 浅色带换成相对差异线（右轴，%；以退休时 AV 一侧余额为基数），表格加「相对差异」一列；新增「提前取出」（schädliche Verwendung）对比，按本插件另加的计算层算。原有 € 数字不变。

= 0.2.0 =
* 阶段 4：去掉合并报税的占位按钮，写明不支持合并报税（Zusammenveranlagung）；新增单人报税脚注和配偶资格（mittelbar zulageberechtigt）说明和合并报税近似算法说明；比较区计算时高度不再跳动；窄屏图表标签不重叠。数字不变。

= 0.1.0 =
* 第一版：中文界面（阶段 2，单人报税），WordPress iframe 短代码。
