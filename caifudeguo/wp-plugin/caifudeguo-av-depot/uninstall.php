<?php
/**
 * Uninstall: caifudeguo AV-Depot (AGPL-3.0-only).
 *
 * The plugin creates no database tables, options, transients, cron events, user/post meta,
 * uploads or rewrite rules. All files live in the plugin folder, which WordPress deletes.
 * The only trace WordPress core itself leaves is this plugin's entry in the core option
 * `recently_activated` (written on deactivation); remove that entry so the database is
 * exactly as before installation.
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

$caifudeguo_av_depot_recent = get_option('recently_activated');
if (is_array($caifudeguo_av_depot_recent) && is_string(WP_UNINSTALL_PLUGIN) && isset($caifudeguo_av_depot_recent[WP_UNINSTALL_PLUGIN])) {
    unset($caifudeguo_av_depot_recent[WP_UNINSTALL_PLUGIN]);
    if (array_filter($caifudeguo_av_depot_recent) === array()) {
        // Nothing meaningful left (WordPress itself created the option for this plugin).
        delete_option('recently_activated');
    } else {
        update_option('recently_activated', $caifudeguo_av_depot_recent);
    }
}
unset($caifudeguo_av_depot_recent);
