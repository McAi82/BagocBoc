<?php
// database/migrations/2026_07_25_000012_create_ncd_checkups_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ncd_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            
            // Vitals & Labs
            $table->json('vitals')->nullable();
            $table->json('lab_results')->nullable();
            
            // Medications
            $table->text('medication_adherence')->nullable();
            $table->json('medications_refilled')->nullable();
            
            // Counseling
            $table->text('lifestyle_counseling')->nullable();
            $table->text('dietary_counseling')->nullable();
            $table->text('exercise_recommendations')->nullable();
            
            // Monitoring
            $table->text('complication_monitoring')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ncd_checkups');
    }
};