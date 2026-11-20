(function (blocks, element, blockEditor, components) {
  const el = element.createElement
  const InspectorControls = blockEditor.InspectorControls
  const PanelBody = components.PanelBody
  const SelectControl = components.SelectControl
  const TextControl = components.TextControl
  blocks.registerBlockType('caifu/buy-vs-rent', {
    edit (props) {
      return el('div', { className: props.className },
        el(InspectorControls, {},
          el(PanelBody, { title: '买房 vs 租房' },
            el(SelectControl, {
              label: '语言 / Sprache',
              value: props.attributes.lang || '',
              options: [
                { label: '默认（后台设置）', value: '' },
                { label: '中文', value: 'zh' },
                { label: 'Deutsch', value: 'de' },
              ],
              onChange (v) { props.setAttributes({ lang: v }) },
            }),
            el(TextControl, {
              label: '初始高度（像素）',
              value: String(props.attributes.height || 2400),
              onChange (v) { props.setAttributes({ height: Number.parseInt(v, 10) || 2400 }) },
            }),
          ),
        ),
        el('p', {}, '买房还是租房？计算器将在前台显示。'),
      )
    },
    save () { return null },
  })
})(
  window.wp.blocks,
  window.wp.element,
  window.wp.blockEditor,
  window.wp.components,
)
