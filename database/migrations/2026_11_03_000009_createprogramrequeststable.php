<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();

            $table->string('title');
            $table->text('description')->nullable();
            $table->text('justification')->nullable();
            // Same values as programs.program_type so an approved request maps 1:1
            $table->enum('program_type', ['nutrition', 'drug', 'sexual_health', 'maternal', 'other']);
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedInteger('target_beneficiaries')->nullable();
            $table->string('location')->nullable();
            $table->decimal('budget', 12, 2)->nullable();

            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_remarks')->nullable();   // approval note or rejection reason

            // Filled on approval
            $table->foreignId('program_id')->nullable()->constrained('programs')->nullOnDelete();
            $table->json('notified_user_ids')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index(['requested_by_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_requests');
    }
};
