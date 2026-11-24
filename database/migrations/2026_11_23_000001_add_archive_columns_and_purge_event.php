<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Archive support for cancelled / rejected / deleted requests.
 *
 * - Adds archive columns to certifications, clearances, front_desk_requests
 * - Creates a MySQL/MariaDB EVENT that permanently deletes rows 15 days after
 *   they were archived. No Laravel scheduler / cron involved.
 *
 * Requirements on the DB server:
 *   event_scheduler = ON   (put it in my.cnf so it survives restarts)
 *   the DB user running this migration needs the EVENT privilege
 */
return new class extends Migration
{
    private const RETENTION_DAYS = 15;
    private const EVENT_NAME     = 'ev_purge_archived_requests';

    /** Adjust the front-desk table name if yours differs. */
    private array $tables = ['certifications', 'clearances', 'front_desk_requests'];

    public function up(): void
    {
        foreach ($this->tables as $name) {
            if (!Schema::hasTable($name) || Schema::hasColumn($name, 'archived_at')) {
                continue;
            }

            Schema::table($name, function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->index();
                $table->foreignId('archived_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('archive_reason', 20)->nullable();        // cancelled | rejected | deleted
                $table->string('status_before_archive', 30)->nullable(); // status to return to on restore
            });
        }

        $this->createPurgeEvent();
    }

    public function down(): void
    {
        if ($this->isMysqlFamily()) {
            DB::unprepared('DROP EVENT IF EXISTS ' . self::EVENT_NAME);
        }

        foreach ($this->tables as $name) {
            if (!Schema::hasTable($name) || !Schema::hasColumn($name, 'archived_at')) {
                continue;
            }

            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('archived_by_user_id');
                $table->dropColumn(['archived_at', 'archive_reason', 'status_before_archive']);
            });
        }
    }

    private function isMysqlFamily(): bool
    {
        return in_array(DB::getDriverName(), ['mysql', 'mariadb'], true);
    }

    private function createPurgeEvent(): void
    {
        if (!$this->isMysqlFamily()) {
            return; // SQLite / Postgres: no EVENT support, handle separately (pg_cron etc.)
        }

        try {
            DB::unprepared('SET GLOBAL event_scheduler = ON');
        } catch (\Throwable $e) {
            // Needs SUPER/SYSTEM_VARIABLES_ADMIN. If it fails, set event_scheduler=ON in my.cnf.
        }

        $days = self::RETENTION_DAYS;
        $deletes = '';
        foreach ($this->tables as $name) {
            if (Schema::hasTable($name)) {
                $deletes .= "    DELETE FROM `{$name}` WHERE archived_at IS NOT NULL AND archived_at <= (NOW() - INTERVAL {$days} DAY);\n";
            }
        }

        DB::unprepared('DROP EVENT IF EXISTS ' . self::EVENT_NAME);

        // CONTINUE HANDLER: if one table's DELETE fails (e.g. a restrictive FK),
        // the remaining tables are still purged.
        DB::unprepared("
CREATE EVENT " . self::EVENT_NAME . "
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
ON COMPLETION PRESERVE
ENABLE
COMMENT 'Permanently deletes archived requests after " . $days . " days'
DO
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
{$deletes}END
");
    }
};
