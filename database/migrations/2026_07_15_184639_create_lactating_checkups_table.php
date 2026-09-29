<?php
// database/migrations/2026_07_25_000010_create_lactating_checkups_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lactating_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            
            // Feeding Assessment
            $table->string('feeding_method')->nullable();
            $table->text('latching_assessment')->nullable();
            $table->string('engorgement_status')->nullable();
            
            // Counseling
            $table->text('nutritional_counseling')->nullable();
            
            // Infant Monitoring
            $table->decimal('infant_weight', 5, 2)->nullable();
            $table->text('infant_health_status')->nullable();
            
            // Family Planning
            $table->text('family_planning_counseling')->nullable();
            $table->string('family_planning_method')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lactating_checkups');
    }
};