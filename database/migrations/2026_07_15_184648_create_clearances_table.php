<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clearances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->foreignId('processed_by_user_id')
                ->constrained('users');
            $table->string('reference_number')->unique();
            $table->text('purpose')->nullable();
            $table->decimal('amount', 10, 2)->default(50);
            $table->enum('status', ['pending', 'approved', 'released', 'rejected', 'cancelled', 'ready_for_release'])->default('pending');
            $table->string('document_path')->nullable();
            $table->string('document_name')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->date('valid_until')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clearances');
    }
};