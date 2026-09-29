<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkup_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')
                ->constrained('patient_records')
                ->cascadeOnDelete();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->foreignId('performed_by_user_id')
                ->constrained('users');
            $table->enum('checkup_type', ['pregnancy', 'child', 'lactating', 'senior', 'ncd']);
            $table->timestamp('checkup_date')->nullable();
            $table->json('vital_signs')->nullable();
            $table->text('assessment')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('treatment')->nullable();
            $table->text('recommendations')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->enum('status', ['draft', 'completed'])->default('completed');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['patient_record_id', 'checkup_type']);
            $table->index('checkup_date');
            $table->index('follow_up_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkup_records');
    }
};