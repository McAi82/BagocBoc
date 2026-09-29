<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->foreignId('processed_by_user_id')
                ->constrained('users');
            $table->string('or_number')->unique();
            $table->decimal('amount', 12, 2);
            $table->string('payment_type');
            $table->enum('payment_method', ['Cash', 'GCash'])->default('Cash');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'completed', 'failed'])->default('completed');
            $table->timestamp('paid_at')->nullable();
            $table->nullableMorphs('payable');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};