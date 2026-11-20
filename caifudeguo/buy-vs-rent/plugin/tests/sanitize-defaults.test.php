<?php
/**
 * CLI tests for IN-xx default sanitizing and fallback (no WordPress required).
 * Run: php caifudeguo/buy-vs-rent/plugin/tests/sanitize-defaults.test.php
 */

require_once dirname(__DIR__) . '/includes/input-defaults.php';

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

function almost($a, $b, $eps = 1e-12)
{
    return abs((float) $a - (float) $b) <= $eps;
}

$builtin = caifu_bvr_builtin_input_defaults();

// Empty / missing settings fall back to built-in PRD defaults.
$empty = caifu_bvr_sanitize_defaults(null);
assert_true($empty === $builtin, 'sanitize_defaults(null) returns built-in defaults');
$empty2 = caifu_bvr_sanitize_defaults(array());
assert_true($empty2 === $builtin, 'sanitize_defaults([]) returns built-in defaults');
$from_admin_empty = caifu_bvr_sanitize_defaults_from_admin(null);
assert_true($from_admin_empty === $builtin, 'sanitize_defaults_from_admin(null) returns built-in defaults');

// Q-01 / Q-02 / Q-04 built-in defaults (and Q-03 off).
assert_true(almost($builtin['grest_pct'], 0.065), 'default GrESt is the NW rate 6.5 %');
assert_true(!isset($builtin['bundesland']), 'no bundesland default');
assert_true(almost($builtin['cash_monthly'], 2500), 'Q-02 default cash_monthly is 2500');
assert_true($builtin['use_sparer_kirchen'] === false, 'Q-03 switch defaults to off');
assert_true(almost($builtin['kirchen_rate'], 0.09), 'default Kirchensteuer is 9 %');
assert_true(!isset($builtin['mc_sigma_house']), 'σ_Haus is not an admin-editable default (fixed at 0 in the app)');

// Valid admin form values: German numbers, percent as 3,5 → 0.035.
$ok = caifu_bvr_sanitize_defaults_from_admin(array(
    'grest_pct' => '3,5',
    'price' => '350.000',
    'rent' => '1.600',
    'loan_rate' => '3,5',
    'use_sparer_kirchen' => '1',
    'kirchen_rate' => '0.08',
));
assert_true(almost($ok['grest_pct'], 0.035), 'admin grest_pct 3,5 → 0.035');
assert_true(almost($ok['price'], 350000), 'admin price 350.000 → 350000');
assert_true(almost($ok['rent'], 1600), 'admin rent 1.600 → 1600');
assert_true(almost($ok['loan_rate'], 0.035), 'admin loan_rate 3,5 → 0.035');
assert_true($ok['use_sparer_kirchen'] === true, 'admin switch 1 → true');
assert_true(almost($ok['kirchen_rate'], 0.08), 'admin kirchen_rate 0.08 stays 0.08');

// Invalid values fall back to the built-in default for that key only.
$bad = caifu_bvr_sanitize_defaults_from_admin(array(
    'grest_pct' => '25',
    'price' => '0',
    'rent' => '0',
    'loan_rate' => 'abc',
    'horizon_years' => '1,5',
    'kirchen_rate' => '0.07',
));
assert_true(almost($bad['grest_pct'], 0.065), 'grest_pct 25 % falls back to 6.5 %');
assert_true(almost($bad['price'], $builtin['price']), 'price 0 falls back');
assert_true(almost($bad['rent'], $builtin['rent']), 'rent 0 falls back');
assert_true(almost($bad['loan_rate'], $builtin['loan_rate']), 'unparseable loan_rate falls back');
assert_true($bad['horizon_years'] === $builtin['horizon_years'], 'non-integer horizon falls back');
assert_true(almost($bad['kirchen_rate'], 0.09), 'invalid kirchen_rate falls back to 9 %');

// Stored engine-unit values are kept when already valid.
$stored = caifu_bvr_sanitize_defaults(array(
    'grest_pct' => 0.035,
    'price' => 350000.0,
    'use_sparer_kirchen' => true,
    'kirchen_rate' => 0.08,
));
assert_true(almost($stored['grest_pct'], 0.035), 'stored grest_pct 0.035 is kept');
assert_true(almost($stored['price'], 350000), 'stored price is kept');
assert_true($stored['use_sparer_kirchen'] === true, 'stored switch true is kept');
assert_true(almost($stored['kirchen_rate'], 0.08), 'stored kirchen_rate 0.08 is kept');

// Cross-field VAL: down_payment > wealth reverts both.
$cross = caifu_bvr_sanitize_defaults_from_admin(array(
    'down_payment' => '600000',
    'wealth' => '500000',
));
assert_true(almost($cross['down_payment'], $builtin['down_payment']) && almost($cross['wealth'], $builtin['wealth']), 'down_payment > wealth reverts both');

// follow_mode new_tilgung without follow_tilgung reverts.
$refi = caifu_bvr_sanitize_defaults_from_admin(array(
    'follow_mode' => 'new_tilgung',
    'follow_tilgung' => '',
));
assert_true($refi['follow_mode'] === $builtin['follow_mode'] && $refi['follow_tilgung'] === $builtin['follow_tilgung'], 'new_tilgung without Tilgung reverts');

// L0 > 0 and rate+tilgung both 0 reverts those two fields.
$amort = caifu_bvr_sanitize_defaults(array(
    'price' => 400000,
    'down_payment' => 100000,
    'wealth' => 200000,
    'loan_rate' => 0.0,
    'init_tilgung' => 0.0,
));
assert_true(almost($amort['loan_rate'], $builtin['loan_rate']) && almost($amort['init_tilgung'], $builtin['init_tilgung']), 'loan with rate=tilgung=0 reverts those fields');
assert_true(almost($amort['down_payment'], 100000), 'valid down_payment is kept when only rate/tilgung revert');

// Inherited empty fields become null; fix_years_full → null.
$inherit = caifu_bvr_sanitize_defaults_from_admin(array(
    'maint_growth' => '',
    'follow_rate' => '',
    'fix_years' => '10',
    'fix_years_full' => '1',
));
assert_true($inherit['maint_growth'] === null, 'empty maint_growth → null');
assert_true($inherit['follow_rate'] === null, 'empty follow_rate → null');
assert_true($inherit['fix_years'] === null, 'fix_years_full checkbox → null (全期)');

// Uninstall deletes the same option name the plugin writes.
$uninstall = file_get_contents(dirname(__DIR__) . '/uninstall.php');
assert_true(strpos($uninstall, "delete_option('caifu_buy_vs_rent_settings')") !== false, 'uninstall deletes caifu_buy_vs_rent_settings');

echo "\n$passed passed, $failed failed\n";
exit($failed === 0 ? 0 : 1);
