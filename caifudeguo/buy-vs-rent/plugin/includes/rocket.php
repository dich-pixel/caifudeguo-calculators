<?php
/**
 * WP Rocket integration helpers (no WordPress functions required, so they can be unit-tested).
 * Exclusions and attributes keep embed.js + the inline caifuBuyVsRent config out of
 * "Delay JavaScript execution" / defer, so a mobile user who only taps inside the iframe
 * still gets share params, admin defaults, Basiszins and the disclaimer.
 */

/**
 * Strings to match against script src and inline content in WP Rocket exclusion lists.
 *
 * @return string[]
 */
function caifu_bvr_rocket_exclusion_patterns()
{
    return array(
        'caifu-buy-vs-rent',
        'caifuBuyVsRent',
    );
}

/**
 * @param mixed $exclusions
 * @return array
 */
function caifu_bvr_rocket_delay_js_exclusions($exclusions)
{
    if (!is_array($exclusions)) {
        $exclusions = array();
    }
    foreach (caifu_bvr_rocket_exclusion_patterns() as $item) {
        if (!in_array($item, $exclusions, true)) {
            $exclusions[] = $item;
        }
    }
    return $exclusions;
}

/**
 * Same patterns for "Load JavaScript deferred".
 *
 * @param mixed $excluded
 * @return array
 */
function caifu_bvr_rocket_exclude_defer_js($excluded)
{
    return caifu_bvr_rocket_delay_js_exclusions($excluded);
}

/**
 * Add nowprocket / data-no-defer / data-no-optimize on the embed.js <script> tag.
 *
 * @param string $tag
 * @param string $handle
 * @param string $src
 * @return string
 */
function caifu_bvr_script_loader_tag($tag, $handle, $src = '')
{
    if ($handle !== 'caifu-buy-vs-rent-embed' || !is_string($tag)) {
        return $tag;
    }
    $next = preg_replace_callback(
        '/<script\b([^>]*)>/i',
        function ($m) {
            $attrs = $m[1];
            // WP concatenates the before-inline script and the external src tag.
            // nowprocket on the inline tag must not skip the src tag (F-6).
            if (!preg_match('/\bsrc\s*=/i', $attrs)) {
                return $m[0];
            }
            if (stripos($attrs, 'nowprocket') !== false) {
                return $m[0];
            }
            return '<script nowprocket data-no-defer="true" data-no-optimize="true" ' . ltrim($attrs) . '>';
        },
        $tag
    );
    return is_string($next) ? $next : $tag;
}

/**
 * Short content hash for cache-busting query params (plugin Version stays 1.0.0).
 *
 * @param string $path
 * @param int    $len
 * @return string
 */
function caifu_bvr_file_ver($path, $len = 12)
{
    if (!is_string($path) || $path === '' || !is_file($path)) {
        return defined('CAIFU_BVR_VERSION') ? CAIFU_BVR_VERSION : '1.0.0';
    }
    $hash = hash_file('sha256', $path);
    if (!is_string($hash) || $hash === '') {
        return defined('CAIFU_BVR_VERSION') ? CAIFU_BVR_VERSION : '1.0.0';
    }
    $len = (int) $len;
    if ($len < 8) {
        $len = 8;
    }
    if ($len > 64) {
        $len = 64;
    }
    return substr($hash, 0, $len);
}

/**
 * Script tag for assets/bootstrap.js. No inline JS, so wptexturize cannot mangle &&.
 *
 * @param string $src Already escaped URL.
 * @return string
 */
function caifu_bvr_bootstrap_tag($src)
{
    if (!is_string($src) || $src === '') {
        return '';
    }
    return '<script nowprocket data-no-defer="true" data-no-optimize="true" src="' . $src . '"></script>';
}

/**
 * Same attributes on the inline window.caifuBuyVsRent = … script (WP 5.7+).
 *
 * @param mixed  $attributes
 * @param string $data
 * @return array
 */
function caifu_bvr_inline_script_attributes($attributes, $data = '')
{
    if (!is_array($attributes)) {
        $attributes = array();
    }
    if (!is_string($data)) {
        return $attributes;
    }
    if (strpos($data, 'caifuBuyVsRent') === false && strpos($data, 'caifu-buy-vs-rent') === false) {
        return $attributes;
    }
    $attributes['nowprocket'] = true;
    $attributes['data-no-defer'] = 'true';
    $attributes['data-no-optimize'] = 'true';
    return $attributes;
}
