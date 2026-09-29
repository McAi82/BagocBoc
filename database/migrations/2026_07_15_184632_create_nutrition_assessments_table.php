<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nutrition_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participant_id')
                ->constrained('program_participants')
                ->cascadeOnDelete();
            $table->date('assessment_date');
            $table->decimal('weight', 8, 2);
            $table->decimal('height', 8, 2);
            $table->decimal('bmi', 8, 2)->nullable();
            $table->string('nutrition_status')->nullable();
            $table->string('weight_for_age_status')->nullable();
            $table->string('height_for_age_status')->nullable();
            $table->string('weight_for_height_status')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('encoded_by')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_assessments');
    }
};