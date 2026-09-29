<?php
// database/migrations/2026_07_15_184641_create_certifications_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certifications', function (Blueprint $table) {
            $table->id();

            // Foreign Keys
            $table->foreignId('requester_id')
                ->constrained('certificate_requesters')
                ->cascadeOnDelete();

            $table->foreignId('certification_type_id')
                ->constrained('certification_types')
                ->cascadeOnDelete();

            $table->foreignId('requested_by_user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('processed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Reference & Tracking
            $table->string('reference_number')->unique();

            // Request Details
            $table->text('purpose')->nullable();
            $table->text('details')->nullable();
            $table->text('remarks')->nullable();

            // Document Files
            $table->string('file_url')->nullable();
            $table->string('document_path')->nullable();
            $table->string('pdf_url')->nullable();
            $table->timestamp('downloaded_at')->nullable();
            $table->string('download_token', 64)->nullable();
            $table->timestamp('download_token_expires_at')->nullable();
            $table->string('document_name')->nullable();

            // Status & Workflow
            $table->enum('status', [
                'Pending',
                'In Review',
                'Approved',
                'Ready for Release',
                'Released',
                'Rejected',
                'Cancelled'
            ])->default('Pending');

            // Timestamps
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->date('expiry_date')->nullable();

            // ✅ ZL Clearance Fields (for virtual submissions)
            $table->enum('zl_clearance_status', ['pending', 'approved', 'rejected'])
                ->default('pending');
            $table->text('zl_clearance_notes')->nullable();
            $table->timestamp('zl_clearance_date')->nullable();

            // ✅ Submission Channel (Physical or Virtual)
            $table->enum('submission_channel', ['physical', 'virtual'])
                ->default('physical');

            // ✅ Virtual Documents (JSON)
            $table->json('virtual_documents')->nullable();

            // ✅ Payment Fields
            $table->enum('payment_method', ['cash', 'gcash', 'bank_transfer', 'online'])
                ->nullable();
            $table->enum('payment_status', ['pending', 'paid', 'failed'])
                ->default('pending');
            $table->string('payment_reference')->nullable();

            // Soft Delete
            $table->softDeletes();

            // Timestamps
            $table->timestamps();

            // ============================================
            // INDEXES
            // ============================================

            // Foreign Key Indexes
            $table->index('requester_id', 'idx_cert_requester_id');
            $table->index('certification_type_id', 'idx_cert_type_id');
            $table->index('requested_by_user_id', 'idx_cert_requested_by');
            $table->index('processed_by_user_id', 'idx_cert_processed_by');

            // Status Indexes
            $table->index('status', 'idx_cert_status');
            $table->index(['requester_id', 'status'], 'idx_cert_requester_status');
            $table->index(['certification_type_id', 'status'], 'idx_cert_type_status');
            $table->index(['status', 'created_at'], 'idx_cert_status_created');

            // Reference Index
            $table->index('reference_number', 'idx_cert_ref_no');
            $table->index(['reference_number', 'status'], 'idx_cert_ref_status');

            // ✅ New Indexes
            $table->index('zl_clearance_status', 'idx_cert_zl_status');
            $table->index('submission_channel', 'idx_cert_channel');
            $table->index('payment_status', 'idx_cert_payment_status');
            $table->index(['zl_clearance_status', 'submission_channel'], 'idx_cert_zl_channel');
            $table->index(['payment_status', 'status'], 'idx_cert_payment_status_status');

            // Date Indexes
            $table->index('approved_at', 'idx_cert_approved_at');
            $table->index('released_at', 'idx_cert_released_at');
            $table->index('received_at', 'idx_cert_received_at');
            $table->index('expiry_date', 'idx_cert_expiry_date');

            // Soft Delete Index
            $table->index('deleted_at', 'idx_cert_deleted_at');

            // Composite Indexes
            $table->index(['status', 'submission_channel'], 'idx_cert_status_channel');
            $table->index(['zl_clearance_status', 'payment_status'], 'idx_cert_zl_payment');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certifications');
    }
};
