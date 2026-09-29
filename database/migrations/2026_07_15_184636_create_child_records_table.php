<?php
// database/migrations/2026_07_25_000003_create_child_records_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('child_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            
            // Birth Information
            $table->decimal('birth_weight', 5, 2)->nullable();
            $table->decimal('birth_height', 5, 2)->nullable();
            $table->decimal('birth_head_circumference', 5, 2)->nullable();
            $table->integer('gestational_age_at_birth')->nullable();
            $table->string('birth_type')->nullable();
            $table->text('birth_complications')->nullable();
            
            // Health Information
            $table->text('immunization_history')->nullable();
            $table->text('allergies')->nullable();
            $table->text('chronic_conditions')->nullable();
            
            // Current Measurements (latest)
            $table->decimal('current_weight', 5, 2)->nullable();
            $table->decimal('current_height', 5, 2)->nullable();
            $table->decimal('current_muac', 5, 2)->nullable();
            $table->string('current_nutritional_status')->nullable();
            
            $table->timestamps();

            $table->index('birth_weight');
            $table->index('current_nutritional_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('child_records');
    }
};