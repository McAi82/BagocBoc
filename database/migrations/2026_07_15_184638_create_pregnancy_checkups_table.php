<?php
// database/migrations/2026_07_25_000008_create_pregnancy_checkups_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pregnancy_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            
            // Maternal Vitals
            $table->json('maternal_vitals')->nullable();
            
            // Fetal Assessment
            $table->text('fetal_assessment')->nullable();
            $table->integer('fetal_heart_rate')->nullable();
            $table->decimal('fundal_height', 5, 2)->nullable();
            
            // Interventions
            $table->text('interventions')->nullable();
            $table->text('micronutrients')->nullable();
            $table->boolean('iron_supplement')->default(false);
            $table->boolean('folic_acid')->default(false);
            
            // Clinical Assessment
            $table->text('clinical_assessment')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pregnancy_checkups');
    }
};