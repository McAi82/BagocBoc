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
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('processed_by_user_id')->constrained('users');
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

        Schema::create('financial_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users');
            $table->string('title');
            $table->string('report_type', 50);
            $table->string('period');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->json('report_data')->nullable();
            $table->timestamps();
        });

        Schema::create('tax_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->nullable()->constrained('residents')->nullOnDelete();
            $table->foreignId('processed_by_user_id')->constrained('users');
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

        Schema::create('penalties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('issued_by_user_id')->constrained('users');
            $table->string('reference_number')->unique();
            $table->string('reason');
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->enum('status', ['pending', 'paid', 'waived'])->default('pending');
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('front_desk_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->string('service_type');
            $table->text('purpose')->nullable();
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->string('reference_number')->unique();
            $table->enum('status', ['pending', 'processing', 'completed', 'forwarded', 'cancelled'])->default('pending');
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('processed_by_user_id')->nullable()->constrained('users');
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->string('forwarded_to_office')->nullable();
            $table->text('forwarded_notes')->nullable();
            $table->foreignId('forwarded_by_user_id')->nullable()->constrained('users');
            $table->timestamp('forwarded_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by_user_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::create('front_desk_appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('request_id')->nullable()->constrained('front_desk_requests')->nullOnDelete();
            $table->string('service_type');
            $table->date('appointment_date');
            $table->string('appointment_time')->nullable();
            $table->text('notes')->nullable();
            $table->string('reference_number')->unique();
            $table->enum('status', ['scheduled', 'confirmed', 'cancelled', 'completed'])->default('scheduled');
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('front_desk_claim_slips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('front_desk_requests')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->string('reference_number')->unique();
            $table->string('document_type');
            $table->enum('status', ['pending', 'claimed'])->default('pending');
            $table->foreignId('issued_by_user_id')->constrained('users');
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->foreignId('claimed_by_user_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::create('front_desk_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('request_id')->nullable()->constrained('front_desk_requests')->nullOnDelete();
            $table->string('service_type')->nullable();
            $table->integer('position');
            $table->enum('status', ['waiting', 'serving', 'done'])->default('waiting');
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('called_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('front_desk_queue');
        Schema::dropIfExists('front_desk_claim_slips');
        Schema::dropIfExists('front_desk_appointments');
        Schema::dropIfExists('front_desk_requests');
        Schema::dropIfExists('penalties');
        Schema::dropIfExists('tax_payments');
        Schema::dropIfExists('financial_reports');
        Schema::dropIfExists('payments');
    }
};