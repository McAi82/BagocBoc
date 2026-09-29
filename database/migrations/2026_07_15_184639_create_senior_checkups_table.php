<?php
// database/migrations/2026_07_25_000011_create_senior_checkups_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('senior_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            
            // Vitals
            $table->json('vitals')->nullable();
            $table->decimal('blood_sugar', 5, 2)->nullable();
            
            // Assessments
            $table->integer('falls_reassessment')->nullable();
            $table->text('cognitive_check')->nullable();
            
            // Medications
            $table->text('medication_adherence')->nullable();
            $table->json('medications_refilled')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('senior_checkups');
    }
};