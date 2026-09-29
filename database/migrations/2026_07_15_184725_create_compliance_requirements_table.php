<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compliance_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->foreignId('zone_id')
                ->nullable()
                ->constrained('barangay_zones')
                ->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('requirement');
            $table->decimal('penalty', 10, 2)->default(0);
            $table->enum('status', ['pending', 'completed', 'overdue', 'exempted'])->default('pending');
            $table->timestamp('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('completion_notes')->nullable();
            $table->foreignId('completed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->enum('is_active', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->index(['resident_id', 'status']);
            $table->index(['zone_id', 'status']);
            $table->index('due_date');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_requirements');
    }
};