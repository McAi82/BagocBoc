<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('front_desk_appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->foreignId('request_id')
                ->nullable()
                ->constrained('front_desk_requests')
                ->nullOnDelete();
            $table->string('service_type');
            $table->date('appointment_date');
            $table->string('appointment_time')->nullable();
            $table->text('notes')->nullable();
            $table->string('reference_number')->unique();
            $table->enum('status', ['scheduled', 'confirmed', 'cancelled', 'completed'])->default('scheduled');
            $table->foreignId('created_by_user_id')
                ->constrained('users');
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('front_desk_appointments');
    }
};