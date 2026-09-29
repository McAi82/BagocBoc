<?php
// database/migrations/2026_07_25_000009_create_child_checkups_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('child_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            
            // Anthropometric Measurements
            $table->decimal('weight', 5, 2)->nullable();
            $table->decimal('height', 5, 2)->nullable();
            $table->decimal('muac', 5, 2)->nullable();
            $table->decimal('head_circumference', 5, 2)->nullable();
            
            // Vaccination
            $table->json('vaccines_given')->nullable();
            
            // Development
            $table->text('developmental_assessment')->nullable();
            $table->json('developmental_milestones')->nullable();
            $table->string('nutritional_status')->nullable();
            
            // Interventions
            $table->text('nutritional_counseling')->nullable();
            $table->text('interventions')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('child_checkups');
    }
};