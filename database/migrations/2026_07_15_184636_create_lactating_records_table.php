<?php
// database/migrations/2026_07_25_000004_create_lactating_records_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lactating_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            
            // Breastfeeding Information
            $table->string('breastfeeding_status')->nullable();
            $table->integer('infant_age')->nullable()->comment('in months');
            $table->string('feeding_method')->nullable();
            $table->text('latching_assessment')->nullable();
            
            // Mother's Health
            $table->string('nutritional_status')->nullable();
            $table->string('family_planning_method')->nullable();
            $table->text('maternal_health_status')->nullable();
            
            // Infant Monitoring
            $table->decimal('infant_weight', 5, 2)->nullable();
            $table->text('infant_health_status')->nullable();
            
            $table->timestamps();

            $table->index('breastfeeding_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lactating_records');
    }
};