<?php
/**
 * Built-in IN-xx defaults, ranges and sanitizers (PRD chapter 4 / 7).
 * This file has no WordPress dependency so it can be tested from the CLI.
 *
 * Percentages are stored as decimals (3,5 % → 0.035), except house_err / etf_err
 * which are percentage points. Admin forms display percentages as 0–100 numbers.
 */

/**
 * PRD chapter 4 built-in defaults, in engine units.
 *
 * @return array
 */
function caifu_bvr_builtin_input_defaults()
{
    return array(
        'price' => 400000.0,
        'renovation' => 20000.0,
        'down_payment' => 400000.0,
        'wealth' => 500000.0,
        'nk_mode' => 'detailed',
        'nk_total_pct' => 0.10,
        'grest_pct' => 0.065,
        'notary_pct' => 0.02,
        'broker_buy_pct' => 0.0357,
        'maint_pct' => 0.012,
        'maint_base' => 'total',
        'building_share' => 1.0,
        'maint_growth' => null,
        'buyer_other_costs' => 0.0,
        'buyer_other_growth' => null,
        'house_growth' => 0.02,
        'loan_rate' => 0.035,
        'init_tilgung' => 0.0185,
        'fix_years' => 10,
        'follow_rate' => null,
        'follow_mode' => 'keep_payment',
        'follow_tilgung' => null,
        'sondertilgung_pct' => 0.0,
        'rent' => 1850.0,
        'rent_growth' => null,
        'renter_nebenkosten' => 0.0,
        'renter_nk_growth' => null,
        'renter_renovation' => 0.0,
        'cash_monthly' => 2500.0,
        'cash_growth' => null,
        'etf_return' => 0.052,
        'inflation' => 0.02,
        'horizon_years' => 30,
        'house_err' => 2.0,
        'etf_err' => 4.0,
        'borrow_rate' => 0.06,
        'sell_cost_pct' => 0.0,
        'self_use_exempt' => true,
        'personal_tax_rate' => 0.42,
        'use_sparer_kirchen' => false,
        'kirchen_rate' => 0.09,
        'mc_runs' => 1000,
        'mc_sigma' => 0.15,
        'mc_seed' => 42,
    );
}

/**
 * Field schema for admin forms and sanitizing. Labels are PRD chapter 4 names.
 *
 * @return array
 */
function caifu_bvr_input_field_schema()
{
    $pct = function ($min, $max, $extra = array()) {
        return array_merge(array('kind' => 'pct', 'min' => $min, 'max' => $max), $extra);
    };
    $money = function ($min, $max, $extra = array()) {
        return array_merge(array('kind' => 'money', 'min' => $min, 'max' => $max), $extra);
    };
    return array(
        '房产与购房' => array(
            'price' => array_merge($money(10000, 10000000), array('id' => 'IN-01', 'label' => '房价 / Kaufpreis', 'unit' => '€')),
            'renovation' => array_merge($money(0, 1000000), array('id' => 'IN-02', 'label' => '装修 / Renovierung', 'unit' => '€')),
            'down_payment' => array_merge($money(0, null), array('id' => 'IN-03', 'label' => '投入的自有资金 / Eigenkapitaleinsatz', 'unit' => '€')),
            'wealth' => array_merge($money(0, null), array('id' => 'IN-04', 'label' => '总资产 / Gesamtvermögen', 'unit' => '€')),
            'nk_mode' => array('id' => 'IN-05', 'label' => '附加费用计算方式', 'kind' => 'enum', 'options' => array('detailed' => '分项', 'total' => '合计百分比')),
            'nk_total_pct' => array_merge($pct(0, 0.20), array('id' => 'IN-06', 'label' => '附加费用合计 / Kaufnebenkosten gesamt', 'unit' => '%')),
            'grest_pct' => array_merge($pct(0, 0.20), array('id' => 'IN-07', 'label' => 'Grunderwerbsteuer 税率', 'unit' => '%')),
            'notary_pct' => array_merge($pct(0, 0.05), array('id' => 'IN-08', 'label' => '公证 + 土地登记 / Notar + Grundbuch', 'unit' => '%')),
            'broker_buy_pct' => array_merge($pct(0, 0.0714), array('id' => 'IN-09', 'label' => '买方中介费 / Maklerprovision (Käufer)', 'unit' => '%')),
            'maint_pct' => array_merge($pct(0, 0.05), array('id' => 'IN-10', 'label' => '维护费率 / Instandhaltung', 'unit' => '%/年')),
            'maint_base' => array('id' => 'IN-11', 'label' => '维护费基数', 'kind' => 'enum', 'options' => array('total' => '房价', 'building' => '房价 × 建筑占比')),
            'building_share' => array_merge($pct(0, 1), array('id' => 'IN-12', 'label' => '建筑占比 / Gebäudeanteil', 'unit' => '%')),
            'maint_growth' => array_merge($pct(-0.05, 0.10), array('id' => 'IN-13', 'label' => '维护费年增长', 'unit' => '%/年', 'nullable' => true, 'empty' => '空 = IN-43')),
            'buyer_other_costs' => array_merge($money(0, 5000), array('id' => 'IN-14', 'label' => '买房者其他持有成本 / sonstige Eigentümerkosten', 'unit' => '€/月')),
            'buyer_other_growth' => array_merge($pct(-0.05, 0.10), array('id' => 'IN-15', 'label' => '其他持有成本年增长', 'unit' => '%/年', 'nullable' => true, 'empty' => '空 = IN-43')),
            'house_growth' => array_merge($pct(-0.10, 0.15), array('id' => 'IN-16', 'label' => '房价年增长 / Wertentwicklung', 'unit' => '%/年')),
        ),
        '贷款' => array(
            'loan_rate' => array_merge($pct(0, 0.15), array('id' => 'IN-20', 'label' => '贷款利率 / Sollzins', 'unit' => '%/年')),
            'init_tilgung' => array_merge($pct(0, 0.20), array('id' => 'IN-21', 'label' => '初始本金还款率 / anfängliche Tilgung', 'unit' => '%/年')),
            'fix_years' => array('id' => 'IN-22', 'label' => '利率锁定期 / Zinsbindung', 'kind' => 'int', 'min' => 1, 'max' => 40, 'nullable' => true, 'empty' => '全期', 'unit' => '年'),
            'follow_rate' => array_merge($pct(0, 0.15), array('id' => 'IN-23', 'label' => '续贷利率 / Anschlusszins', 'unit' => '%/年', 'nullable' => true, 'empty' => '空 = IN-20')),
            'follow_mode' => array('id' => 'IN-24', 'label' => '续贷月供规则', 'kind' => 'enum', 'options' => array('keep_payment' => '月供不变', 'new_tilgung' => '按新 Tilgung 重算')),
            'follow_tilgung' => array_merge($pct(0.005, 0.20), array('id' => 'IN-25', 'label' => '续贷 Tilgung', 'unit' => '%/年', 'nullable' => true, 'empty' => '空')),
            'sondertilgung_pct' => array_merge($pct(0, 0.10), array('id' => 'IN-26', 'label' => '年度额外还款 / Sondertilgung', 'unit' => '% 原始贷款额/年')),
        ),
        '租房' => array(
            'rent' => array_merge($money(0, 20000), array('id' => 'IN-30', 'label' => '冷租 / Kaltmiete', 'unit' => '€/月', 'gt' => 0)),
            'rent_growth' => array_merge($pct(-0.05, 0.10), array('id' => 'IN-31', 'label' => '租金年增长 / Mietsteigerung', 'unit' => '%/年', 'nullable' => true, 'empty' => '空 = IN-43')),
            'renter_nebenkosten' => array_merge($money(0, 5000), array('id' => 'IN-32', 'label' => '租房者额外费用 / Mieter-Nebenkosten', 'unit' => '€/月')),
            'renter_nk_growth' => array_merge($pct(-0.05, 0.10), array('id' => 'IN-33', 'label' => '租房者额外费用年增长', 'unit' => '%/年', 'nullable' => true, 'empty' => '空 = IN-43')),
            'renter_renovation' => array_merge($money(0, 1000000), array('id' => 'IN-34', 'label' => '租房者一次性支出', 'unit' => '€')),
        ),
        '现金、投资与宏观' => array(
            'cash_monthly' => array_merge($money(0, 100000), array('id' => 'IN-40', 'label' => '每月可支配现金 / monatlich verfügbares Geld', 'unit' => '€/月')),
            'cash_growth' => array_merge($pct(-0.05, 0.10), array('id' => 'IN-41', 'label' => '可支配现金年增长', 'unit' => '%/年', 'nullable' => true, 'empty' => '空 = IN-43')),
            'etf_return' => array_merge($pct(-0.05, 0.15), array('id' => 'IN-42', 'label' => 'ETF 年收益（税前、名义）', 'unit' => '%/年')),
            'inflation' => array_merge($pct(-0.02, 0.10), array('id' => 'IN-43', 'label' => '通胀率 / Inflation', 'unit' => '%/年')),
            'horizon_years' => array('id' => 'IN-44', 'label' => '比较期限', 'kind' => 'int', 'min' => 1, 'max' => 100, 'unit' => '年'),
            'house_err' => array('id' => 'IN-45', 'label' => '情景矩阵：房价步长 e₁', 'kind' => 'points', 'min' => 0, 'max' => 10, 'unit' => '百分点'),
            'etf_err' => array('id' => 'IN-46', 'label' => '情景矩阵：ETF 步长 e₂', 'kind' => 'points', 'min' => 0, 'max' => 10, 'unit' => '百分点'),
            'borrow_rate' => array_merge($pct(0, 0.20), array('id' => 'IN-47', 'label' => '透支借款利率', 'unit' => '%/年')),
            'use_sparer_kirchen' => array('id' => 'IN-48', 'label' => 'Sparerpauschbetrag / 教会税', 'kind' => 'bool', 'options' => array('1' => '是', '0' => '否')),
            'kirchen_rate' => array('id' => 'IN-49', 'label' => 'Kirchensteuer 税率', 'kind' => 'enum', 'options' => array('0.08' => '8 %', '0.09' => '9 %'), 'as_float' => true),
        ),
        '卖房（只用于「变现」比较）' => array(
            'sell_cost_pct' => array_merge($pct(0, 0.10), array('id' => 'IN-50', 'label' => '卖房成本 / Verkaufskosten', 'unit' => '% 卖价')),
            'self_use_exempt' => array('id' => 'IN-51', 'label' => '满足自住免税条件（§23 EStG）', 'kind' => 'bool', 'options' => array('1' => '是', '0' => '否')),
            'personal_tax_rate' => array_merge($pct(0, 0.45), array('id' => 'IN-52', 'label' => '个人边际税率', 'unit' => '%')),
        ),
        '蒙特卡洛' => array(
            'mc_runs' => array('id' => 'IN-60', 'label' => '模拟次数', 'kind' => 'int', 'min' => 100, 'max' => 20000),
            'mc_sigma' => array_merge($pct(0, 0.40), array('id' => 'IN-61', 'label' => 'ETF 年化波动率 σ', 'unit' => '%')),
            'mc_seed' => array('id' => 'IN-63', 'label' => '随机种子', 'kind' => 'int', 'min' => 0, 'max' => 4294967295),
        ),
    );
}

/**
 * Flat map of field key => schema.
 *
 * @return array
 */
function caifu_bvr_input_fields()
{
    $flat = array();
    foreach (caifu_bvr_input_field_schema() as $fields) {
        foreach ($fields as $key => $meta) {
            $flat[$key] = $meta;
        }
    }
    return $flat;
}

/**
 * Parse a user-typed number. Accepts 1.234,56 / 1234,56 / 1234.56.
 *
 * @param string $raw
 * @return float|null
 */
function caifu_bvr_parse_number($raw)
{
    if (!is_string($raw) && !is_numeric($raw)) {
        return null;
    }
    $s = trim((string) $raw);
    $s = str_replace(array(' ', '€', '%'), '', $s);
    if ($s === '') {
        return null;
    }
    if (strpos($s, ',') !== false && strpos($s, '.') !== false) {
        $s = str_replace('.', '', $s);
        $s = str_replace(',', '.', $s);
    } elseif (strpos($s, ',') !== false) {
        $s = str_replace(',', '.', $s);
    } elseif (preg_match('/^\\d{1,3}(\\.\\d{3})+$/', $s)) {
        $s = str_replace('.', '', $s);
    }
    if (!is_numeric($s)) {
        return null;
    }
    return (float) $s;
}

/**
 * Convert a stored engine value to the string shown in the admin form.
 *
 * @param string $key
 * @param mixed  $value
 * @return string
 */
function caifu_bvr_admin_display_value($key, $value)
{
    $fields = caifu_bvr_input_fields();
    if (!isset($fields[$key])) {
        return '';
    }
    $meta = $fields[$key];
    if ($value === null) {
        return '';
    }
    if ($meta['kind'] === 'bool') {
        return $value ? '1' : '0';
    }
    if ($meta['kind'] === 'enum') {
        return (string) $value;
    }
    if ($meta['kind'] === 'pct') {
        $n = ((float) $value) * 100.0;
        $text = rtrim(rtrim(number_format($n, 4, ',', ''), '0'), ',');
        return $text === '' || $text === '-' ? '0' : $text;
    }
    if ($meta['kind'] === 'points') {
        $text = rtrim(rtrim(number_format((float) $value, 2, ',', ''), '0'), ',');
        return $text === '' || $text === '-' ? '0' : $text;
    }
    if ($meta['kind'] === 'int') {
        return (string) (int) $value;
    }
    // money
    $n = (float) $value;
    if (abs($n - round($n)) < 1e-9) {
        return (string) (int) round($n);
    }
    return rtrim(rtrim(number_format($n, 2, ',', ''), '0'), ',');
}

/**
 * Parse one admin-form value into engine units.
 * Returns array('ok' => bool, 'value' => mixed, 'empty' => bool).
 *
 * @param string $key
 * @param mixed  $raw
 * @return array
 */
function caifu_bvr_parse_admin_field($key, $raw)
{
    $fields = caifu_bvr_input_fields();
    if (!isset($fields[$key])) {
        return array('ok' => false, 'value' => null, 'empty' => false);
    }
    $meta = $fields[$key];
    $nullable = !empty($meta['nullable']);
    if ($meta['kind'] === 'bool') {
        if (is_bool($raw)) {
            return array('ok' => true, 'value' => $raw, 'empty' => false);
        }
        $s = is_string($raw) || is_numeric($raw) ? (string) $raw : '';
        if ($s === '1' || $s === 'true' || $s === 'yes' || $s === '是') {
            return array('ok' => true, 'value' => true, 'empty' => false);
        }
        if ($s === '0' || $s === 'false' || $s === 'no' || $s === '否') {
            return array('ok' => true, 'value' => false, 'empty' => false);
        }
        return array('ok' => false, 'value' => null, 'empty' => false);
    }
    if ($meta['kind'] === 'enum') {
        $s = is_string($raw) || is_numeric($raw) ? (string) $raw : '';
        if (isset($meta['options'][$s])) {
            $val = !empty($meta['as_float']) ? (float) $s : $s;
            return array('ok' => true, 'value' => $val, 'empty' => false);
        }
        return array('ok' => false, 'value' => null, 'empty' => false);
    }
    if ($raw === null || (is_string($raw) && trim($raw) === '')) {
        if ($nullable) {
            return array('ok' => true, 'value' => null, 'empty' => true);
        }
        return array('ok' => false, 'value' => null, 'empty' => true);
    }
    $n = caifu_bvr_parse_number(is_string($raw) || is_numeric($raw) ? (string) $raw : '');
    if ($n === null) {
        return array('ok' => false, 'value' => null, 'empty' => false);
    }
    if ($meta['kind'] === 'pct') {
        $n = $n / 100.0;
    }
    if (!empty($meta['integer']) || $meta['kind'] === 'int') {
        if (abs($n - round($n)) > 1e-9) {
            return array('ok' => false, 'value' => null, 'empty' => false);
        }
        $n = (int) round($n);
    }
    if (isset($meta['min']) && $meta['min'] !== null && $n < $meta['min']) {
        return array('ok' => false, 'value' => null, 'empty' => false);
    }
    if (isset($meta['max']) && $meta['max'] !== null && $n > $meta['max']) {
        return array('ok' => false, 'value' => null, 'empty' => false);
    }
    if (!empty($meta['gt']) && $n <= $meta['gt']) {
        return array('ok' => false, 'value' => null, 'empty' => false);
    }
    if ($n <= -1 && $meta['kind'] === 'pct') {
        return array('ok' => false, 'value' => null, 'empty' => false);
    }
    return array('ok' => true, 'value' => $n, 'empty' => false);
}

/**
 * Validate a value already in engine units against the schema.
 *
 * @param string $key
 * @param mixed  $value
 * @return bool
 */
function caifu_bvr_engine_value_ok($key, $value)
{
    $fields = caifu_bvr_input_fields();
    if (!isset($fields[$key])) {
        return false;
    }
    $meta = $fields[$key];
    if ($value === null) {
        return !empty($meta['nullable']);
    }
    if ($meta['kind'] === 'bool') {
        return is_bool($value);
    }
    if ($meta['kind'] === 'enum') {
        if (!empty($meta['as_float'])) {
            if (!is_numeric($value)) {
                return false;
            }
            $key = (string) $value;
            return isset($meta['options'][$key]);
        }
        return is_string($value) && isset($meta['options'][$value]);
    }
    if (!is_numeric($value) || is_infinite((float) $value) || is_nan((float) $value)) {
        return false;
    }
    $n = (float) $value;
    if ((!empty($meta['integer']) || $meta['kind'] === 'int') && abs($n - round($n)) > 1e-9) {
        return false;
    }
    if (isset($meta['min']) && $meta['min'] !== null && $n < $meta['min']) {
        return false;
    }
    if (isset($meta['max']) && $meta['max'] !== null && $n > $meta['max']) {
        return false;
    }
    if (!empty($meta['gt']) && $n <= $meta['gt']) {
        return false;
    }
    if ($n <= -1 && $meta['kind'] === 'pct') {
        return false;
    }
    return true;
}

/**
 * Implied loan amount L0 from a complete defaults set and a GrESt table in decimals.
 *
 * @param array $d
 * @param array $grest_decimals
 * @return float
 */
function caifu_bvr_implied_loan($d)
{
    $nk = 0.0;
    if (isset($d['nk_mode']) && $d['nk_mode'] === 'total') {
        $nk = isset($d['nk_total_pct']) ? (float) $d['nk_total_pct'] : 0.0;
    } else {
        $grest = isset($d['grest_pct']) ? (float) $d['grest_pct'] : 0.065;
        $notary = isset($d['notary_pct']) ? (float) $d['notary_pct'] : 0.0;
        $broker = isset($d['broker_buy_pct']) ? (float) $d['broker_buy_pct'] : 0.0;
        $nk = $grest + $notary + $broker;
    }
    $price = isset($d['price']) ? (float) $d['price'] : 0.0;
    $reno = isset($d['renovation']) ? (float) $d['renovation'] : 0.0;
    $down = isset($d['down_payment']) ? (float) $d['down_payment'] : 0.0;
    $cost = $price * (1 + $nk) + $reno;
    $loan = $cost - $down;
    return $loan > 0 ? $loan : 0.0;
}

/**
 * Apply VAL cross-field rules. Invalid combinations revert the involved keys to $fallback.
 *
 * @param array $d
 * @param array $fallback
 * @param array $grest_decimals
 * @return array
 */
function caifu_bvr_apply_default_cross_rules($d, $fallback)
{
    if (isset($d['down_payment'], $d['wealth']) && $d['down_payment'] > $d['wealth']) {
        $d['down_payment'] = $fallback['down_payment'];
        $d['wealth'] = $fallback['wealth'];
    }
    if (isset($d['price']) && $d['price'] <= 0) {
        $d['price'] = $fallback['price'];
    }
    if (isset($d['rent']) && $d['rent'] <= 0) {
        $d['rent'] = $fallback['rent'];
    }
    if (isset($d['follow_mode']) && $d['follow_mode'] === 'new_tilgung' && ($d['follow_tilgung'] === null || $d['follow_tilgung'] === '')) {
        $d['follow_mode'] = $fallback['follow_mode'];
        $d['follow_tilgung'] = $fallback['follow_tilgung'];
    }
    $loan = caifu_bvr_implied_loan($d);
    if ($loan > 0 && isset($d['loan_rate'], $d['init_tilgung']) && (float) $d['loan_rate'] === 0.0 && (float) $d['init_tilgung'] === 0.0) {
        $d['loan_rate'] = $fallback['loan_rate'];
        $d['init_tilgung'] = $fallback['init_tilgung'];
    }
    return $d;
}

/**
 * Sanitize a map of defaults already in engine units. Missing/invalid keys fall back to the built-ins.
 *
 * @param mixed $raw
 * @param array $grest_decimals
 * @return array
 */
function caifu_bvr_sanitize_defaults($raw)
{
    $builtin = caifu_bvr_builtin_input_defaults();
    $out = $builtin;
    if (!is_array($raw)) {
        return $out;
    }
    foreach (caifu_bvr_input_fields() as $key => $meta) {
        if (!array_key_exists($key, $raw)) {
            continue;
        }
        if (caifu_bvr_engine_value_ok($key, $raw[$key])) {
            $out[$key] = $raw[$key];
            if ($meta['kind'] === 'int' && $out[$key] !== null) {
                $out[$key] = (int) $out[$key];
            }
        }
    }
    return caifu_bvr_apply_default_cross_rules($out, $builtin);
}

/**
 * Sanitize defaults posted by the admin form (display units: percent as 3,5).
 *
 * @param mixed $raw
 * @param array $grest_decimals
 * @return array
 */
function caifu_bvr_sanitize_defaults_from_admin($raw)
{
    $builtin = caifu_bvr_builtin_input_defaults();
    $out = $builtin;
    if (!is_array($raw)) {
        return $out;
    }
    if (!empty($raw['fix_years_full'])) {
        $raw['fix_years'] = '';
    }
    foreach (caifu_bvr_input_fields() as $key => $meta) {
        if (!array_key_exists($key, $raw)) {
            continue;
        }
        $parsed = caifu_bvr_parse_admin_field($key, $raw[$key]);
        if ($parsed['ok']) {
            $out[$key] = $parsed['value'];
        }
        unset($meta);
    }
    return caifu_bvr_apply_default_cross_rules($out, $builtin);
}
