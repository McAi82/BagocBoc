<?php
// database/migrations/2026_07_25_000006_create_ncd_records_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ncd_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            
            // Classification & Diagnosis
            $table->string('ncd_classification')->nullable();
            $table->date('diagnosis_date')->nullable();
            
            // Lab Results (latest)
            $table->json('lab_results')->nullable();
            
            // Medications & Treatment
            $table->text('medications')->nullable();
            $table->text('complications')->nullable();
            $table->text('lifestyle_factors')->nullable();
            $table->text('allergies')->nullable();
            $table->text('treatment_history')->nullable();
            $table->string('current_status')->nullable();
            
            $table->timestamps();

            $table->index('ncd_classification');
            $table->index('current_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ncd_records');
    }
};