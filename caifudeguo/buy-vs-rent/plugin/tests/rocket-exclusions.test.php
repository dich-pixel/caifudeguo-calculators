<?php
/**
 * CLI tests for WP Rocket exclusion helpers (no WordPress required).
 * Run: php caifudeguo/buy-vs-rent/plugin/tests/rocket-exclusions.test.php
 */

require_once dirname(__DIR__) . '/includes/input-defaults.php';
require_once dirname(__DIR__) . '/includes/rocket.php';

$failed = 0;
$passed = 0;

function assert_true($cond, $msg)
{
    global $failed, $passed;
    if ($cond) {
        $passed++;
        echo "ok  - $msg\n";
        return;
    }
    $failed++;
    echo "FAIL - $msg\n";
}

$patterns = caifu_bvr_rocket_exclusion_patterns();
assert_true(in_array('caifu-buy-vs-rent', $patterns, true), 'exclusion list includes the script handle/src stem');
assert_true(in_array('caifuBuyVsRent', $patterns, true), 'exclusion list includes the inline config global');

$from_null = caifu_bvr_rocket_delay_js_exclusions(null);
assert_true(in_array('caifu-buy-vs-rent', $from_null, true) && in_array('caifuBuyVsRent', $from_null, true), 'delay-js filter accepts a non-array and adds both patterns');

$existing = array('jquery', 'caifu-buy-vs-rent');
$merged = caifu_bvr_rocket_delay_js_exclusions($existing);
assert_true($merged[0] === 'jquery', 'existing exclusions are kept in order');
assert_true(count(array_keys($merged, 'caifu-buy-vs-rent', true)) === 1, 'does not duplicate an already-listed pattern');
assert_true(in_array('caifuBuyVsRent', $merged, true), 'adds the missing inline-config pattern');

$defer = caifu_bvr_rocket_exclude_defer_js(array());
assert_true($defer === caifu_bvr_rocket_delay_js_exclusions(array()), 'defer exclusions match delay exclusions');

$plain = '<script type="text/javascript" src="https://example.com/caifu-buy-vs-rent/assets/embed.js?ver=1.0.0" id="caifu-buy-vs-rent-embed-js"></script>';
$tagged = caifu_bvr_script_loader_tag($plain, 'caifu-buy-vs-rent-embed', 'https://example.com/embed.js');
assert_true(strpos($tagged, 'nowprocket') !== false, 'script tag gets nowprocket');
assert_true(strpos($tagged, 'data-no-defer="true"') !== false, 'script tag gets data-no-defer');
assert_true(strpos($tagged, 'data-no-optimize="true"') !== false, 'script tag gets data-no-optimize');
assert_true(strpos($tagged, 'src="https://example.com/caifu-buy-vs-rent/assets/embed.js?ver=1.0.0"') !== false, 'script src is unchanged');

$other = caifu_bvr_script_loader_tag($plain, 'jquery', '');
assert_true($other === $plain, 'other script handles are left untouched');

$already = '<script nowprocket src="https://example.com/embed.js"></script>';
assert_true(caifu_bvr_script_loader_tag($already, 'caifu-buy-vs-rent-embed') === $already, 'does not duplicate nowprocket');

$inline = caifu_bvr_inline_script_attributes(array('id' => 'x'), 'window.caifuBuyVsRent = {"settings":{}};');
assert_true(!empty($inline['nowprocket']) && $inline['data-no-defer'] === 'true' && $inline['data-no-optimize'] === 'true', 'inline config script gets Rocket skip attributes');

$other_inline = caifu_bvr_inline_script_attributes(array('id' => 'y'), 'window.foo = 1;');
assert_true($other_inline === array('id' => 'y'), 'unrelated inline scripts are left untouched');

// Share-param extraction (used to bake request params into iframe src on uncached requests).
$q = array('foo' => '1', 'price' => '420000', 'rent' => '1350', 'bvr2.price' => '111');
$first = caifu_bvr_extract_instance_query($q, 'bvr1', true);
assert_true(isset($first['price']) && $first['price'] === '420000' && $first['rent'] === '1350' && !isset($first['foo']), 'first instance gets unprefixed share params and ignores unrelated keys');
$second = caifu_bvr_extract_instance_query($q, 'bvr2', false);
assert_true(isset($second['price']) && $second['price'] === '111' && !isset($second['rent']), 'prefixed keys win for that instance; unprefixed do not apply to later instances');
assert_true(caifu_bvr_query_has_share_params($q) === true, 'request with share params is detected');
assert_true(caifu_bvr_query_has_share_params(array('utm' => 'keep', 'foo' => '1')) === false, 'unrelated query keys are not treated as share params');


// F-6: WP concatenates the before-inline script (already tagged) with the external src tag.
$combined = '<script nowprocket data-no-defer="true" data-no-optimize="true" id="caifu-buy-vs-rent-embed-js-before">window.caifuBuyVsRent = {"settings":{}};</script>' . "\n"
    . '<script type="text/javascript" src="https://example.com/caifu-buy-vs-rent/assets/embed.js?ver=abc" id="caifu-buy-vs-rent-embed-js"></script>';
$tagged = caifu_bvr_script_loader_tag($combined, 'caifu-buy-vs-rent-embed', 'https://example.com/embed.js');
assert_true(preg_match_all('/<script\b[^>]*\bsrc=/i', $tagged, $src_tags) === 1, 'combined tag still has one src script');
assert_true(strpos($src_tags[0][0], 'nowprocket') !== false, 'embed.js src tag gets nowprocket even when the inline script already has it');
assert_true(strpos($src_tags[0][0], 'data-no-defer="true"') !== false, 'embed.js src tag gets data-no-defer');
assert_true(strpos($src_tags[0][0], 'data-no-optimize="true"') !== false, 'embed.js src tag gets data-no-optimize');
assert_true(substr_count($src_tags[0][0], 'nowprocket') === 1, 'does not duplicate nowprocket on the src tag');

$ver = caifu_bvr_file_ver(dirname(__DIR__) . '/assets/embed.js');
assert_true(is_string($ver) && preg_match('/^[0-9a-f]{12}$/', $ver) === 1, 'embed.js content hash is 12 hex chars');
assert_true(caifu_bvr_file_ver('/no/such/file') === '1.0.0', 'missing file falls back to the plugin version');
$boot = dirname(__DIR__) . '/assets/bootstrap.js';
$boot_ver = caifu_bvr_file_ver($boot);
assert_true(preg_match('/^[0-9a-f]{12}$/', $boot_ver) === 1, 'bootstrap.js content hash is 12 hex chars');

$boot_tag = caifu_bvr_bootstrap_tag('https://example.com/caifu-buy-vs-rent/assets/bootstrap.js?ver=' . $boot_ver);
assert_true(strpos($boot_tag, '<script ') === 0 && strpos($boot_tag, 'nowprocket') !== false, 'bootstrap tag includes nowprocket');
assert_true(strpos($boot_tag, 'data-no-defer="true"') !== false && strpos($boot_tag, 'data-no-optimize="true"') !== false, 'bootstrap tag includes defer/optimize skips');
assert_true(strpos($boot_tag, 'src="https://example.com/caifu-buy-vs-rent/assets/bootstrap.js?ver=' . $boot_ver . '"') !== false, 'bootstrap tag points at the hashed src');
assert_true(preg_match('/<script\b[^>]*>\s*<\/script>/', $boot_tag) === 1 || preg_match('/<script\b[^>]*><\/script>/', $boot_tag) === 1, 'bootstrap tag has no inline JS');
assert_true(strpos($boot_tag, '&&') === false, 'bootstrap tag source contains no &&');

$iframe = '<iframe class="caifu-buy-vs-rent" data-cbr-id="bvr1" src="https://example.com/app/index.html?v=abc&amp;lang=zh"></iframe>';
$html = $iframe . $boot_tag;
$texturized = str_replace('&&', '&#038;&#038;', $html);
if (!preg_match_all('#<script\b([^>]*)>(.*?)</script>#is', $texturized, $scripts, PREG_SET_ORDER)) {
    $scripts = array();
}
$inline_bodies = array();
foreach ($scripts as $script) {
    $body = trim($script[2]);
    if ($body !== '') {
        $inline_bodies[] = $body;
    }
}
assert_true($inline_bodies === array(), 'rendered shortcode output has no inline script bodies after wptexturize-like && encoding');

$tmp = tempnam(sys_get_temp_dir(), 'cbr-js-');
file_put_contents($tmp, file_get_contents($boot));
$check = array();
$code = 0;
exec('node --check ' . escapeshellarg($tmp) . ' 2>&1', $check, $code);
unlink($tmp);
assert_true($code === 0, 'bootstrap.js parses as JavaScript (node --check): ' . implode("\n", $check));

// F-5: dots in query names must survive (PHP $_GET / parse_str would turn bvr1.price into bvr1_price).
$parsed = caifu_bvr_parse_query_string('foo=1&bvr1.price=430000&price=420000&rent=1350#ignored');
assert_true(isset($parsed['bvr1.price']) && $parsed['bvr1.price'] === '430000', 'parse_query_string keeps bvr1.price');
assert_true(!isset($parsed['bvr1_price']), 'parse_query_string does not invent bvr1_price');
assert_true(caifu_bvr_query_has_share_params($parsed) === true, 'prefixed-only keys on QUERY_STRING count as share params');
$from_pref = caifu_bvr_extract_instance_query($parsed, 'bvr1', true);
assert_true(isset($from_pref['price']) && $from_pref['price'] === '430000', 'prefixed key wins over unprefixed when reading raw QUERY_STRING');
$only_pref = caifu_bvr_parse_query_string('bvr2.rent=1500');
assert_true(caifu_bvr_query_has_share_params($only_pref) === true, 'a prefixed-only share link is detected for DONOTCACHEPAGE');
assert_true(caifu_bvr_extract_instance_query($only_pref, 'bvr2', false)['rent'] === '1500', 'later instance reads its prefixed key from the raw query');

parse_str('bvr1.price=430000', $mangled);
assert_true(isset($mangled['bvr1_price']) && !isset($mangled['bvr1.price']), 'documents PHP parse_str / $_GET dot mangling');
assert_true(caifu_bvr_extract_instance_query($mangled, 'bvr1', true) === array(), 'mangled $_GET keys would not match, which is why we parse QUERY_STRING');

assert_true(caifu_bvr_parse_query_string('') === array(), 'empty query string yields an empty bag');
$enc = caifu_bvr_parse_query_string('bvr1.price=430%2C000&foo=a+b');
assert_true($enc['bvr1.price'] === '430,000' && $enc['foo'] === 'a b', 'query values are urldecoded');


if ($failed) {
    echo "\n$failed failed, $passed passed\n";
    exit(1);
}
echo "\n$passed passed, 0 failed\n";
exit(0);
