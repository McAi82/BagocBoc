<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('front_desk_claim_slips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')
                ->constrained('front_desk_requests')
                ->cascadeOnDelete();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->string('reference_number')->unique();
            $table->string('document_type');
            $table->enum('status', ['pending', 'claimed'])->default('pending');
            $table->foreignId('issued_by_user_id')
                ->constrained('users');
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->foreignId('claimed_by_user_id')
                ->nullable()
                ->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('front_desk_claim_slips');
    }
};