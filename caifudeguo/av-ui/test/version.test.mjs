// Version 0.3.2 in the plugin header, the constant and the readme stable tag (Stage 5 E.6); the 0.3.2 changelog entry is the owner's finalized text (above 0.3.0).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const f = p => readFileSync(new URL(`../../wp-plugin/caifudeguo-av-depot/${p}`, import.meta.url), 'utf8')

const CHANGELOG_032 = `= 0.3.2 =
* 图表始终显示，表格和文字说明收进可折叠区域；图表加了读屏说明。
* 精简页面：去掉与结论重复的图注句子、重复的标题和跳转链接；税务说明、合并报税近似提示和补贴说明收进可折叠的「详情与依据」；「逐年明细」移到「不同存钱额的比较」之前。
* 调整间距，合并页脚说明；宽屏下说明文字移到左栏。
* 修复：脚本被延迟加载（如 WP Rocket「延迟 JavaScript」）时 iframe 高度不更新；高度消息只接受来自该 iframe 本身、且来源与其地址一致的消息。完全避免需在 WP Rocket 中把 embed.js 排除在延迟执行之外。`

describe('version 0.3.2', () => {
  it('three places + changelog', () => {
    expect(f('caifudeguo-av-depot.php')).toMatch(/\* Version: +0\.3\.2\n/)
    expect(f('caifudeguo-av-depot.php')).toContain('define(\'CAIFUDEGUO_AV_DEPOT_VERSION\', \'0.3.2\');')
    expect(f('readme.txt')).toMatch(/^Stable tag: 0\.3\.2$/m)
    expect(f('readme.txt')).toContain('= 0.3.0 =')
    expect(f('readme.txt')).toContain(`== Changelog ==\n\n${CHANGELOG_032}\n\n= 0.3.0 =`)
    expect(f('readme.txt').match(/^= 0\.3\.2 =$/gm)).toHaveLength(1)
  })
})
