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
    if (strpos($tag, 'nowprocket') !== false) {
        return $tag;
    }
    $attrs = 'nowprocket data-no-defer="true" data-no-optimize="true" ';
    $next = preg_replace('/<script\s+/i', '<script ' . $attrs, $tag, 1);
    return is_string($next) ? $next : $tag;
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
