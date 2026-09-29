<?php
// database/migrations/2026_07_25_000005_create_senior_records_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('senior_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            
            // Risk Assessments
            $table->integer('falls_risk_score')->nullable();
            $table->text('cognitive_assessment')->nullable();
            $table->string('memory_status')->nullable();
            
            // Health Information
            $table->text('chronic_conditions')->nullable();
            $table->text('medication_list')->nullable();
            $table->text('allergies')->nullable();
            $table->string('activity_level')->nullable();
            $table->text('support_system')->nullable();
            $table->text('emergency_contact')->nullable();
            
            $table->timestamps();

            $table->index('falls_risk_score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('senior_records');
    }
};