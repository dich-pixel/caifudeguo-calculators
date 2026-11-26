<?php
/**
 * Plugin Name:       caifu 买房 vs 租房计算器
 * Plugin URI:        https://github.com/dich-pixel/caifudeguo-calculators
 * Description:       买房自住与继续租房的资产对比计算器，中文界面、德语可选。短代码 [caifu_buy_vs_rent]。全部在浏览器中计算，不上传用户输入。
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Rich Dr (caifudeguo.de)
 * License:           AGPL-3.0-only
 * License URI:       https://www.gnu.org/licenses/agpl-3.0.html
 * Text Domain:       caifu-buy-vs-rent
 *
 * Copyright (C) 2026 Rich Dr (caifudeguo.de).
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License version 3 as published by the Free Software Foundation.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See LICENSE.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CAIFU_BVR_VERSION', '1.0.0');
define('CAIFU_BVR_OPTION', 'caifu_buy_vs_rent_settings');

require_once __DIR__ . '/includes/input-defaults.php';
require_once __DIR__ . '/includes/rocket.php';

function caifu_bvr_default_disclaimer_zh()
{
    return '本计算器仅用于教育和信息目的，基于简化模型和你输入的假设，不构成投资、税务、法律或融资建议。税法规定（例如 Basiszins、税率）可能变化；实际结果会因市场变化和个人情况而不同。重大决定前请咨询 Steuerberater、Finanzberater 或银行。所有计算都在你的浏览器中完成，不会上传任何输入数据。';
}

function caifu_bvr_default_disclaimer_de()
{
    return 'Dieser Rechner dient ausschließlich der Information und Bildung. Er beruht auf einem vereinfachten Modell und Ihren Eingaben und stellt keine Anlage-, Steuer-, Rechts- oder Finanzierungsberatung dar. Steuerliche Regeln (etwa Basiszins und Steuersätze) können sich ändern; tatsächliche Ergebnisse weichen durch Markt und persönliche Umstände ab. Bitte ziehen Sie vor wichtigen Entscheidungen eine Steuerberatung, Finanzberatung oder Ihre Bank hinzu. Alle Berechnungen laufen in Ihrem Browser; es werden keine Eingaben übertragen.';
}

function caifu_bvr_settings()
{
    $saved = get_option(CAIFU_BVR_OPTION, array());
    if (!is_array($saved)) {
        $saved = array();
    }
    $basis = isset($saved['basiszins']) && is_numeric($saved['basiszins']) ? (float) $saved['basiszins'] : 3.2;
    $year = isset($saved['basiszins_year']) ? absint($saved['basiszins_year']) : 2026;
    $lang = (isset($saved['default_lang']) && $saved['default_lang'] === 'de') ? 'de' : 'zh';
    $disclaimer_zh = isset($saved['disclaimer_zh']) && is_string($saved['disclaimer_zh']) && $saved['disclaimer_zh'] !== ''
        ? $saved['disclaimer_zh'] : caifu_bvr_default_disclaimer_zh();
    $disclaimer_de = isset($saved['disclaimer_de']) && is_string($saved['disclaimer_de']) && $saved['disclaimer_de'] !== ''
        ? $saved['disclaimer_de'] : caifu_bvr_default_disclaimer_de();
    $defaults_raw = (isset($saved['defaults']) && is_array($saved['defaults'])) ? $saved['defaults'] : array();
    $defaults = caifu_bvr_sanitize_defaults($defaults_raw);
    return array(
        'basiszins'        => $basis,
        'basiszins_year'   => $year,
        'default_lang'     => $lang,
        'disclaimer_zh'    => $disclaimer_zh,
        'disclaimer_de'    => $disclaimer_de,
        'defaults'         => $defaults,
    );
}

/**
 * Frontend settings payload. basiszins is a decimal, as the engine expects.
 *
 * @param string $lang
 * @param bool   $test
 * @return array
 */
function caifu_bvr_frontend_settings($lang, $test)
{
    $s = caifu_bvr_settings();
    $payload = array(
        'lang'            => ($lang === 'de') ? 'de' : 'zh',
        'basiszins'       => ((float) $s['basiszins']) / 100.0,
        'basiszins_year'  => (int) $s['basiszins_year'],
        'disclaimer_zh'   => $s['disclaimer_zh'],
        'disclaimer_de'   => $s['disclaimer_de'],
        'version'         => CAIFU_BVR_VERSION,
        'testInterface'   => (bool) $test,
    );
    $payload['defaults'] = $s['defaults'];
    return $payload;
}

function caifu_bvr_test_mode($shortcode_test)
{
    if ($shortcode_test) {
        return true;
    }
    if (defined('CAIFU_BVR_TEST') && CAIFU_BVR_TEST) {
        return true;
    }
    if (defined('WP_DEBUG') && WP_DEBUG) {
        return true;
    }
    return false;
}

function caifu_bvr_origin_of($url)
{
    $parts = wp_parse_url(trim($url));
    if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        return '';
    }
    $scheme = strtolower($parts['scheme']);
    if ($scheme !== 'https' && $scheme !== 'http') {
        return '';
    }
    $host = strtolower($parts['host']);
    if (!preg_match('/^[a-z0-9.-]+$/', $host)) {
        return '';
    }
    $port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
    return $scheme . '://' . $host . $port;
}

function caifu_bvr_allowed_origins()
{
    $origins = array(
        'https://www.caifudeguo.de',
        'https://caifudeguo.de',
        caifu_bvr_origin_of(home_url('/')),
        caifu_bvr_origin_of(plugins_url('/', __FILE__)),
    );
    $origins = apply_filters('caifu_buy_vs_rent_allowed_origins', $origins);
    $clean = array();
    foreach ((array) $origins as $origin) {
        $origin = is_string($origin) ? caifu_bvr_origin_of($origin) : '';
        if ($origin !== '' && !in_array($origin, $clean, true)) {
            $clean[] = $origin;
        }
    }
    return $clean;
}

function caifu_bvr_register_assets()
{
    wp_register_script(
        'caifu-buy-vs-rent-embed',
        plugins_url('assets/embed.js', __FILE__),
        array(),
        caifu_bvr_file_ver(__DIR__ . '/assets/embed.js'),
        true
    );
}
add_action('wp_enqueue_scripts', 'caifu_bvr_register_assets');
add_filter('rocket_delay_js_exclusions', 'caifu_bvr_rocket_delay_js_exclusions');
add_filter('rocket_exclude_defer_js', 'caifu_bvr_rocket_exclude_defer_js');
add_filter('script_loader_tag', 'caifu_bvr_script_loader_tag', 10, 3);
add_filter('wp_inline_script_attributes', 'caifu_bvr_inline_script_attributes', 10, 2);
add_filter('no_texturize_shortcodes', 'caifu_bvr_no_texturize_shortcodes');

/**
 * @param mixed $shortcodes
 * @return array
 */
function caifu_bvr_no_texturize_shortcodes($shortcodes)
{
    if (!is_array($shortcodes)) {
        $shortcodes = array();
    }
    if (!in_array('caifu_buy_vs_rent', $shortcodes, true)) {
        $shortcodes[] = 'caifu_buy_vs_rent';
    }
    return $shortcodes;
}

/**
 * Tiny, Rocket-skipped helper that copies this instance’s share params from the
 * current page URL onto the preceding iframe and postMessages official settings.
 * External file (no inline JS) so the_content / wptexturize cannot mangle it.
 *
 * @return string
 */
function caifu_bvr_bootstrap_script()
{
    $src = add_query_arg(
        'ver',
        caifu_bvr_file_ver(__DIR__ . '/assets/bootstrap.js'),
        plugins_url('assets/bootstrap.js', __FILE__)
    );
    return caifu_bvr_bootstrap_tag(esc_url($src));
}


function caifu_bvr_sanitize_instance_id($raw)
{
    if (!is_string($raw) || $raw === '') {
        return '';
    }
    if (!preg_match('/^[A-Za-z][A-Za-z0-9_-]{0,31}$/', $raw)) {
        return '';
    }
    $reserved = array('lang', 'v', 'cbr', 'cbr_test', 'defaults', 'test', 'preset');
    if (in_array($raw, $reserved, true)) {
        return '';
    }
    return $raw;
}

/**
 * [caifu_buy_vs_rent lang="zh|de" preset="default" test="1" height="2400" id="bvr1"]
 *
 * @param array|string $atts
 * @return string
 */
function caifu_bvr_shortcode($atts)
{
    $atts = shortcode_atts(
        array(
            'lang'   => '',
            'preset' => 'default',
            'test'   => '',
            'height' => '2400',
            'title'  => '买房还是租房？',
            'id'     => '',
        ),
        is_array($atts) ? $atts : array(),
        'caifu_buy_vs_rent'
    );
    $saved = caifu_bvr_settings();
    $lang = $atts['lang'] === 'de' || $atts['lang'] === 'zh' ? $atts['lang'] : $saved['default_lang'];
    $test = caifu_bvr_test_mode($atts['test'] === '1' || $atts['test'] === 'true');
    $height = max(300, min(20000, absint($atts['height'])));

    if (!wp_script_is('caifu-buy-vs-rent-embed', 'registered')) {
        caifu_bvr_register_assets();
    }
    static $configured = false;
    if (!$configured) {
        $configured = true;
        wp_add_inline_script(
            'caifu-buy-vs-rent-embed',
            'window.caifuBuyVsRent = ' . wp_json_encode(array(
                'origins'  => caifu_bvr_allowed_origins(),
                'settings' => caifu_bvr_frontend_settings($lang, $test),
            )) . ';',
            'before'
        );
    }
    wp_enqueue_script('caifu-buy-vs-rent-embed');

    // Content hash of the app shell (Vite also stamps hashed query params on app assets).
    // Plugin Version header stays 1.0.0.
    $args = array(
        'v'    => caifu_bvr_file_ver(__DIR__ . '/app/index.html'),
        'lang' => $lang,
    );
    $cfg = wp_json_encode(caifu_bvr_frontend_settings($lang, $test));
    if (!is_string($cfg)) {
        $cfg = '{}';
    }

    // Instance id is page structure (safe to cache).
    static $instance_seq = 0;
    static $used_ids = array();
    $instance_seq++;
    $instance_id = caifu_bvr_sanitize_instance_id($atts['id']);
    if ($instance_id === '' || isset($used_ids[$instance_id])) {
        $n = $instance_seq;
        $instance_id = 'bvr' . $n;
        while (isset($used_ids[$instance_id])) {
            $n++;
            $instance_id = 'bvr' . $n;
        }
    }
    $used_ids[$instance_id] = true;

    $src = add_query_arg($args, plugins_url('app/index.html', __FILE__));
    // If this request already has share params, copy this instance’s keys onto the iframe src
    // (helps uncached / cache-bypassing requests). Parse QUERY_STRING so bvr1.price is not
    // mangled to bvr1_price (PHP $_GET). A cached page served for a later URL still relies
    // on the same-origin parent read and the nowprocket bootstrap / embed.js at runtime.
    $share = caifu_bvr_extract_instance_query(caifu_bvr_request_query(), $instance_id, $instance_seq === 1);
    foreach ($share as $share_key => $share_val) {
        $src = add_query_arg($share_key, $share_val, $src);
    }
    if ($share && !defined('DONOTCACHEPAGE')) {
        define('DONOTCACHEPAGE', true);
    }

    return sprintf(
        '<iframe class="caifu-buy-vs-rent" data-cbr-id="%4$s" data-cbr-settings="%6$s" src="%1$s" title="%2$s" style="width:100%%;height:%3$dpx;border:0;display:block;overflow:hidden" scrolling="no" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>%5$s',
        esc_url($src),
        esc_attr($atts['title']),
        $height,
        esc_attr($instance_id),
        caifu_bvr_bootstrap_script(),
        esc_attr($cfg)
    );
}
add_shortcode('caifu_buy_vs_rent', 'caifu_bvr_shortcode');

function caifu_bvr_register_block()
{
    if (!function_exists('register_block_type')) {
        return;
    }
    wp_register_script(
        'caifu-bvr-block',
        plugins_url('blocks/buy-vs-rent/index.js', __FILE__),
        array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components'),
        CAIFU_BVR_VERSION,
        true
    );
    register_block_type(
        __DIR__ . '/blocks/buy-vs-rent',
        array(
            'editor_script' => 'caifu-bvr-block',
            'render_callback' => function ($attributes) {
                $atts = array(
                    'lang'   => isset($attributes['lang']) ? $attributes['lang'] : '',
                    'height' => isset($attributes['height']) ? (string) $attributes['height'] : '2400',
                );
                return caifu_bvr_shortcode($atts);
            },
        )
    );
}
add_action('init', 'caifu_bvr_register_block');

function caifu_bvr_admin_menu()
{
    add_options_page(
        '买房 vs 租房',
        '买房 vs 租房',
        'manage_options',
        'caifu-buy-vs-rent',
        'caifu_bvr_render_admin'
    );
}
add_action('admin_menu', 'caifu_bvr_admin_menu');

function caifu_bvr_sanitize_settings($raw)
{
    $out = caifu_bvr_settings();
    if (!is_array($raw)) {
        return $out;
    }
    if (isset($raw['basiszins']) && is_numeric($raw['basiszins'])) {
        $v = (float) $raw['basiszins'];
        if ($v >= 0 && $v <= 20) {
            $out['basiszins'] = $v;
        }
    }
    if (isset($raw['basiszins_year'])) {
        $y = absint($raw['basiszins_year']);
        if ($y >= 2000 && $y <= 2100) {
            $out['basiszins_year'] = $y;
        }
    }
    if (isset($raw['default_lang']) && ($raw['default_lang'] === 'zh' || $raw['default_lang'] === 'de')) {
        $out['default_lang'] = $raw['default_lang'];
    }
    if (isset($raw['disclaimer_zh']) && is_string($raw['disclaimer_zh'])) {
        $out['disclaimer_zh'] = wp_kses_post($raw['disclaimer_zh']);
    }
    if (isset($raw['disclaimer_de']) && is_string($raw['disclaimer_de'])) {
        $out['disclaimer_de'] = wp_kses_post($raw['disclaimer_de']);
    }
    if (isset($raw['defaults']) && is_array($raw['defaults'])) {
        $out['defaults'] = caifu_bvr_sanitize_defaults_from_admin($raw['defaults']);
    } else {
        $out['defaults'] = caifu_bvr_sanitize_defaults(
            isset($out['defaults']) && is_array($out['defaults']) ? $out['defaults'] : array()
        );
    }
    return $out;
}

function caifu_bvr_handle_admin_post()
{
    if (!isset($_POST['caifu_bvr_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['caifu_bvr_nonce'])), 'caifu_bvr_save')) {
        return;
    }
    if (!current_user_can('manage_options')) {
        return;
    }
    $raw = isset($_POST['caifu_bvr']) ? wp_unslash($_POST['caifu_bvr']) : array();
    update_option(CAIFU_BVR_OPTION, caifu_bvr_sanitize_settings($raw), false);
    if (function_exists('rocket_clean_domain')) {
        rocket_clean_domain();
    }
    add_settings_error('caifu_bvr', 'saved', '设置已保存。', 'updated');
}
add_action('admin_init', 'caifu_bvr_handle_admin_post');

function caifu_bvr_render_admin_defaults_fields($defaults)
{
    echo '<h2>' . esc_html__('默认值预设', 'caifu-buy-vs-rent') . '</h2>';
    foreach (caifu_bvr_input_field_schema() as $section => $fields) {
        echo '<h3>' . esc_html($section) . '</h3>';
        echo '<table class="form-table" role="presentation">';
        foreach ($fields as $key => $meta) {
            $name = 'caifu_bvr[defaults][' . $key . ']';
            $id = 'cbr-default-' . $key;
            $value = array_key_exists($key, $defaults) ? $defaults[$key] : null;
            echo '<tr><th scope="row">';
            echo '<label for="' . esc_attr($id) . '">' . esc_html($meta['label']) . '</label>';
            echo '</th><td>';
            if ($meta['kind'] === 'enum' || $meta['kind'] === 'bool') {
                $current = caifu_bvr_admin_display_value($key, $value);
                echo '<select name="' . esc_attr($name) . '" id="' . esc_attr($id) . '">';
                foreach ($meta['options'] as $opt => $lab) {
                    echo '<option value="' . esc_attr((string) $opt) . '"' . selected($current, (string) $opt, false) . '>';
                    echo esc_html($lab);
                    echo '</option>';
                }
                echo '</select>';
            } elseif ($key === 'fix_years') {
                $is_full = ($value === null);
                $display = $is_full ? '' : caifu_bvr_admin_display_value($key, $value);
                echo '<input type="text" class="small-text" name="' . esc_attr($name) . '" id="' . esc_attr($id) . '" value="' . esc_attr($display) . '" inputmode="decimal" />';
                if (!empty($meta['unit'])) {
                    echo ' <span>' . esc_html($meta['unit']) . '</span>';
                }
                echo ' <label><input type="checkbox" name="caifu_bvr[defaults][fix_years_full]" value="1"' . checked($is_full, true, false) . ' /> ';
                echo esc_html__('全期', 'caifu-buy-vs-rent') . '</label>';
            } else {
                $display = caifu_bvr_admin_display_value($key, $value);
                $placeholder = isset($meta['empty']) ? $meta['empty'] : '';
                echo '<input type="text" class="regular-text" name="' . esc_attr($name) . '" id="' . esc_attr($id) . '" value="' . esc_attr($display) . '"';
                if ($placeholder !== '') {
                    echo ' placeholder="' . esc_attr($placeholder) . '"';
                }
                echo ' inputmode="decimal" />';
                if (!empty($meta['unit'])) {
                    echo ' <span>' . esc_html($meta['unit']) . '</span>';
                }
            }
            echo '</td></tr>';
        }
        echo '</table>';
    }
}

function caifu_bvr_render_admin()
{
    if (!current_user_can('manage_options')) {
        return;
    }
    $s = caifu_bvr_settings();
    settings_errors('caifu_bvr');
    echo '<div class="wrap"><h1>买房 vs 租房</h1>';
    echo '<form method="post">';
    wp_nonce_field('caifu_bvr_save', 'caifu_bvr_nonce');
    echo '<table class="form-table" role="presentation">';
    echo '<tr><th scope="row"><label for="cbr-basiszins">Basiszins (%)</label></th><td>';
    echo '<input name="caifu_bvr[basiszins]" id="cbr-basiszins" type="text" class="small-text" value="' . esc_attr((string) $s['basiszins']) . '" /> ';
    echo '<label>年份 <input name="caifu_bvr[basiszins_year]" type="number" class="small-text" value="' . esc_attr((string) $s['basiszins_year']) . '" min="2000" max="2100" /></label>';
    echo '</td></tr>';
    echo '<tr><th scope="row">默认语言</th><td>';
    echo '<select name="caifu_bvr[default_lang]"><option value="zh"' . selected($s['default_lang'], 'zh', false) . '>中文</option>';
    echo '<option value="de"' . selected($s['default_lang'], 'de', false) . '>Deutsch</option></select></td></tr>';
    echo '<tr><th scope="row">免责声明（中文）</th><td><textarea name="caifu_bvr[disclaimer_zh]" class="large-text" rows="6">' . esc_textarea($s['disclaimer_zh']) . '</textarea></td></tr>';
    echo '<tr><th scope="row">Haftungsausschluss (Deutsch)</th><td><textarea name="caifu_bvr[disclaimer_de]" class="large-text" rows="6">' . esc_textarea($s['disclaimer_de']) . '</textarea></td></tr>';
    echo '</table>';
    caifu_bvr_render_admin_defaults_fields($s['defaults']);
    submit_button('保存设置');
    echo '</form></div>';
}

function caifu_bvr_plugin_action_links($links)
{
    $url = admin_url('options-general.php?page=caifu-buy-vs-rent');
    array_unshift($links, '<a href="' . esc_url($url) . '">设置</a>');
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'caifu_bvr_plugin_action_links');
