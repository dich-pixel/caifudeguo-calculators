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

if ($failed) {
    echo "\n$failed failed, $passed passed\n";
    exit(1);
}
echo "\n$passed passed, 0 failed\n";
exit(0);
