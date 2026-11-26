<?php
/**
 * Official frontend settings for the same-origin calculator iframe.
 * Returns only admin-sanitized values. Query parameters cannot inject settings.
 * No CORS wildcard: a foreign page cannot read this response.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');

$wp_load = dirname(__DIR__, 3) . '/wp-load.php';
if (!is_file($wp_load)) {
    http_response_code(404);
    echo '{"error":"not_installed"}';
    exit;
}

require_once $wp_load;

if (!function_exists('caifu_bvr_frontend_settings')) {
    http_response_code(503);
    echo '{"error":"inactive"}';
    exit;
}

$lang = (isset($_GET['lang']) && $_GET['lang'] === 'de') ? 'de' : 'zh';
$json = wp_json_encode(caifu_bvr_frontend_settings($lang, false));
echo is_string($json) ? $json : '{}';
