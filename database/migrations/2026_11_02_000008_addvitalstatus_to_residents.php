<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            // alive     = living resident
            // deceased  = resident who has died
            // decedent  = deceased PROPERTY OWNER (still tracked for the property record)
            $table->enum('vital_status', ['alive', 'deceased', 'decedent'])
                ->default('alive')
                ->after('status');

            $table->index('vital_status');
        });
    }

    public function down(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->dropIndex(['vital_status']);
            $table->dropColumn('vital_status');
        });
    }
};