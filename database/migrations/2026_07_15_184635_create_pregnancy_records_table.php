<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pregnancy_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')
                ->constrained('patient_records')
                ->cascadeOnDelete();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->date('last_menstrual_period')->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->integer('gestational_age')->nullable();
            $table->integer('gravida')->nullable();
            $table->integer('para')->nullable();
            $table->text('obstetric_history')->nullable();
            $table->enum('risk_level', ['low', 'medium', 'high'])->default('low');
            $table->string('immunization_status')->nullable();
            $table->text('prenatal_logs')->nullable();
            $table->text('allergies')->nullable();
            $table->text('medical_history')->nullable();
            $table->text('current_medications')->nullable();
            $table->timestamps();

            $table->index('expected_delivery_date');
            $table->index('risk_level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pregnancy_records');
    }
};