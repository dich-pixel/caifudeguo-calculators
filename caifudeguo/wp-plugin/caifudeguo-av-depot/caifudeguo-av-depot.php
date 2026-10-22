<?php
/**
 * Plugin Name:       caifudeguo AV-Depot 计算器
 * Plugin URI:        https://github.com/dich-pixel/caifudeguo-calculators
 * Description:       养老投资账户（Altersvorsorgedepot）计算器，中文界面。短代码 [caifudeguo_av_depot]。纯浏览器端计算，不建数据表、不存选项、不用 cookie。
 * Version:           0.2.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Rich Dr (caifudeguo.de)
 * License:           AGPL-3.0-only
 * License URI:       https://www.gnu.org/licenses/agpl-3.0.html
 *
 * Copyright (C) 2026 Rich Dr (caifudeguo.de).
 * Calculation core: finanzfluss/calculators (AGPL-3.0) commit dcc29a6, Copyright Finflow GmbH and contributors.
 * Machine-generated copy; only output rounding changed, calculation method unchanged.
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License version 3 as published by the Free Software Foundation.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See LICENSE.
 *
 * Corresponding source: see SOURCE.txt and the source/ folder of this plugin.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CAIFUDEGUO_AV_DEPOT_VERSION', '0.2.0');

/**
 * Origins allowed to report the iframe height via postMessage.
 * Hard-coded caifudeguo.de hosts + this site's own origin; extend with the
 * `caifudeguo_av_depot_allowed_origins` filter (values like "https://example.org").
 *
 * @return string[]
 */
function caifudeguo_av_depot_allowed_origins()
{
    $origins = array(
        'https://www.caifudeguo.de',
        'https://caifudeguo.de',
        caifudeguo_av_depot_origin_of(home_url('/')),
        caifudeguo_av_depot_origin_of(plugins_url('/', __FILE__)),
    );
    $origins = apply_filters('caifudeguo_av_depot_allowed_origins', $origins);
    $clean = array();
    foreach ((array) $origins as $origin) {
        $origin = is_string($origin) ? caifudeguo_av_depot_origin_of($origin) : '';
        if ($origin !== '' && !in_array($origin, $clean, true)) {
            $clean[] = $origin;
        }
    }
    return $clean;
}

/**
 * Normalises a URL to its origin (scheme://host[:port]), or '' if invalid.
 *
 * @param string $url
 * @return string
 */
function caifudeguo_av_depot_origin_of($url)
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

function caifudeguo_av_depot_register_assets()
{
    wp_register_script(
        'caifudeguo-av-depot-embed',
        plugins_url('assets/embed.js', __FILE__),
        array(),
        CAIFUDEGUO_AV_DEPOT_VERSION,
        true
    );
}
add_action('wp_enqueue_scripts', 'caifudeguo_av_depot_register_assets');

/**
 * [caifudeguo_av_depot height="2400" title="..."]
 *
 * @param array|string $atts
 * @return string
 */
function caifudeguo_av_depot_shortcode($atts)
{
    $atts = shortcode_atts(
        array(
            'height' => '2400',
            'title'  => '养老投资账户计算器（Altersvorsorgedepot）',
        ),
        is_array($atts) ? $atts : array(),
        'caifudeguo_av_depot'
    );
    $height = max(300, min(20000, absint($atts['height'])));

    if (!wp_script_is('caifudeguo-av-depot-embed', 'registered')) {
        caifudeguo_av_depot_register_assets();
    }
    static $configured = false;
    if (!$configured) {
        $configured = true;
        wp_add_inline_script(
            'caifudeguo-av-depot-embed',
            'window.caifudeguoAvDepot = ' . wp_json_encode(array('origins' => caifudeguo_av_depot_allowed_origins())) . ';',
            'before'
        );
    }
    wp_enqueue_script('caifudeguo-av-depot-embed');

    $src = add_query_arg('v', CAIFUDEGUO_AV_DEPOT_VERSION, plugins_url('app/index.html', __FILE__));

    return sprintf(
        '<iframe class="caifudeguo-av-depot" src="%1$s" title="%2$s" style="width:100%%;height:%3$dpx;border:0;display:block;overflow:hidden" scrolling="no" loading="lazy" referrerpolicy="no-referrer"></iframe>',
        esc_url($src),
        esc_attr($atts['title']),
        $height
    );
}
add_shortcode('caifudeguo_av_depot', 'caifudeguo_av_depot_shortcode');
