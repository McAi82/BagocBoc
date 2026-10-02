<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_requesters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->nullable()->constrained('residents')->cascadeOnDelete();
            $table->string('photo_id')->nullable();
            $table->timestamps();

            $table->index('resident_id', 'idx_cert_req_resident_id');
            $table->index(['resident_id', 'created_at'], 'idx_cert_req_resident_created');
        });

        Schema::create('certification_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->decimal('fee', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
            $table->index(['is_active', 'created_at']);
        });

        Schema::create('certifications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('requester_id')->constrained('certificate_requesters')->cascadeOnDelete();
            $table->foreignId('certification_type_id')->constrained('certification_types')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('processed_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('reference_number')->unique();

            $table->text('purpose')->nullable();
            $table->text('details')->nullable();
            $table->text('remarks')->nullable();

            $table->string('file_url')->nullable();
            $table->string('document_path')->nullable();
            $table->string('pdf_url')->nullable();
            $table->timestamp('downloaded_at')->nullable();
            $table->string('download_token', 64)->nullable();
            $table->timestamp('download_token_expires_at')->nullable();
            $table->string('document_name')->nullable();

            $table->enum('status', [
                'Pending',
                'In Review',
                'Approved',
                'Ready for Release',
                'Released',
                'Rejected',
                'Cancelled',
            ])->default('Pending');

            $table->timestamp('approved_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->date('expiry_date')->nullable();

            $table->enum('zl_clearance_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('zl_clearance_notes')->nullable();
            $table->timestamp('zl_clearance_date')->nullable();

            $table->enum('submission_channel', ['physical', 'virtual'])->default('physical');
            $table->json('virtual_documents')->nullable();

            $table->enum('payment_method', ['cash'])->nullable();
            $table->enum('payment_status', ['inreview', 'pending', 'paid', 'failed'])->default('inreview');
            $table->string('payment_reference')->nullable();

            $table->softDeletes();
            $table->timestamps();

            $table->index('requester_id', 'idx_cert_requester_id');
            $table->index('certification_type_id', 'idx_cert_type_id');
            $table->index('requested_by_user_id', 'idx_cert_requested_by');
            $table->index('processed_by_user_id', 'idx_cert_processed_by');
            $table->index('status', 'idx_cert_status');
            $table->index(['requester_id', 'status'], 'idx_cert_requester_status');
            $table->index(['certification_type_id', 'status'], 'idx_cert_type_status');
            $table->index(['status', 'created_at'], 'idx_cert_status_created');
            $table->index('reference_number', 'idx_cert_ref_no');
            $table->index(['reference_number', 'status'], 'idx_cert_ref_status');
            $table->index('zl_clearance_status', 'idx_cert_zl_status');
            $table->index('submission_channel', 'idx_cert_channel');
            $table->index('payment_status', 'idx_cert_payment_status');
            $table->index(['zl_clearance_status', 'submission_channel'], 'idx_cert_zl_channel');
            $table->index(['payment_status', 'status'], 'idx_cert_payment_status_status');
            $table->index('approved_at', 'idx_cert_approved_at');
            $table->index('released_at', 'idx_cert_released_at');
            $table->index('received_at', 'idx_cert_received_at');
            $table->index('expiry_date', 'idx_cert_expiry_date');
            $table->index('deleted_at', 'idx_cert_deleted_at');
            $table->index(['status', 'submission_channel'], 'idx_cert_status_channel');
            $table->index(['zl_clearance_status', 'payment_status'], 'idx_cert_zl_payment');
        });

        Schema::create('certification_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('certification_id')->constrained('certifications')->cascadeOnDelete();
            $table->string('document_type')->nullable();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('verification_status', ['Pending', 'Verified', 'Rejected'])->default('Pending');
            $table->foreignId('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('certification_id', 'idx_cert_doc_cert_id');
            $table->index('uploaded_by_user_id', 'idx_cert_doc_uploaded_by');
            $table->index('verification_status', 'idx_cert_doc_verification_status');
            $table->index(['certification_id', 'verification_status'], 'idx_cert_doc_cert_status');
            $table->index('deleted_at', 'idx_cert_doc_deleted_at');
        });

        Schema::create('certificate_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('certification_id')->unique()->constrained('certifications')->cascadeOnDelete();
            $table->decimal('amount', 10, 2)->default(0);
            $table->enum('payment_method', ['Cash'])->default('Cash');
            $table->string('reference_number')->nullable();
            $table->string('official_receipt_number')->nullable();
            $table->enum('status', ['Pending', 'Paid', 'Failed', 'Refunded'])->default('Pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('certification_id', 'idx_cert_pay_cert_id');
            $table->index('status', 'idx_cert_pay_status');
            $table->index('paid_at', 'idx_cert_pay_paid_at');
            $table->index(['certification_id', 'status'], 'idx_cert_pay_cert_status');
            $table->index(['status', 'created_at'], 'idx_cert_pay_status_created');
            $table->index(['reference_number', 'official_receipt_number'], 'idx_cert_pay_ref_receipt');
            $table->index('deleted_at', 'idx_cert_pay_deleted_at');
        });

        Schema::create('clearances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('processed_by_user_id')->constrained('users');
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

        Schema::create('clearance_configurations', function (Blueprint $table) {
            $table->id();
            $table->decimal('default_fee', 10, 2)->default(50);
            $table->string('punong_barangay_name')->nullable();
            $table->string('barangay_secretary_name')->nullable();
            $table->text('header_text')->nullable();
            $table->text('footer_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clearance_configurations');
        Schema::dropIfExists('clearances');
        Schema::dropIfExists('certificate_payments');
        Schema::dropIfExists('certification_documents');
        Schema::dropIfExists('certifications');
        Schema::dropIfExists('certification_types');
        Schema::dropIfExists('certificate_requesters');
    }
};
