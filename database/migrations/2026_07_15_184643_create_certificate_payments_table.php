<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_payments', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('certification_id')
                ->constrained('certifications')
                ->cascadeOnDelete()
                ->unique();
            
            $table->decimal('amount', 10, 2)->default(0);
            
            $table->enum('payment_method', ['Cash', 'GCash'])->default('Cash');
            
            $table->string('reference_number')->nullable();
            $table->string('official_receipt_number')->nullable();
            
            $table->enum('status', [
                'Pending',
                'Paid',
                'Failed',
                'Refunded'
            ])->default('Pending');
            
            $table->timestamp('paid_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // ✅ Short index names
            $table->index('certification_id', 'idx_cert_pay_cert_id');
            $table->index('status', 'idx_cert_pay_status');
            $table->index('paid_at', 'idx_cert_pay_paid_at');
            $table->index(['certification_id', 'status'], 'idx_cert_pay_cert_status');
            $table->index(['status', 'created_at'], 'idx_cert_pay_status_created');
            $table->index(['reference_number', 'official_receipt_number'], 'idx_cert_pay_ref_receipt');
            $table->index('deleted_at', 'idx_cert_pay_deleted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_payments');
    }
};