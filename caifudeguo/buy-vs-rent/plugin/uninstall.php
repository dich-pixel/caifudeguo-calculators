<?php
/**
 * Uninstall: caifu-buy-vs-rent (AGPL-3.0-only).
 *
 * Deletes the plugin's admin settings option. The plugin creates no tables,
 * transients, cron events, user/post meta, uploads or rewrite rules.
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

delete_option('caifu_buy_vs_rent_settings');
