<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->nullable()
                ->constrained('residents')
                ->nullOnDelete();
            $table->foreignId('processed_by_user_id')
                ->constrained('users');
            $table->string('receipt_number')->unique();
            $table->string('taxpayer_name');
            $table->enum('tax_type', ['Cedula', 'Real Property Tax', 'Business Tax'])->default('Cedula');
            $table->decimal('amount', 12, 2);
            $table->enum('payment_method', ['Cash', 'GCash'])->default('Cash');
            $table->enum('status', ['pending', 'paid'])->default('paid');
            $table->timestamp('paid_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_payments');
    }
};