<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->enum('patient_type', ['pregnant', 'child', 'lactating', 'senior', 'ncd']);
            $table->json('vital_signs')->nullable();
            $table->foreignId('created_by_user_id')
                ->constrained('users');
            $table->foreignId('updated_by_user_id')
                ->nullable()
                ->constrained('users');
            $table->enum('status', ['active', 'inactive', 'archived'])->default('active');
            $table->timestamps();

            $table->index(['resident_id', 'patient_type']);
            $table->index('patient_type');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_records');
    }
};