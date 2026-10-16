<?php
/**
 * Uninstall: caifudeguo AV-Depot (AGPL-3.0-only).
 *
 * The plugin creates no database tables, options, transients, cron events, user/post meta,
 * uploads or rewrite rules, so it deletes nothing: it only removes what it created, and that
 * is the plugin folder, which WordPress deletes itself. WordPress core options (for example
 * `recently_activated`) are core's business and are not touched.
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}
