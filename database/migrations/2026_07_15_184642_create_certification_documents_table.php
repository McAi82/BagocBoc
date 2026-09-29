<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certification_documents', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('certification_id')
                ->constrained('certifications')
                ->cascadeOnDelete();
            
            $table->string('document_type')->nullable();
            
            $table->foreignId('uploaded_by_user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            
            $table->enum('verification_status', [
                'Pending',
                'Verified',
                'Rejected'
            ])->default('Pending');
            
            $table->foreignId('verified_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            
            $table->timestamp('verified_at')->nullable();
            $table->text('remarks')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // ✅ Short index names
            $table->index('certification_id', 'idx_cert_doc_cert_id');
            $table->index('uploaded_by_user_id', 'idx_cert_doc_uploaded_by');
            $table->index('verification_status', 'idx_cert_doc_verification_status');
            $table->index(['certification_id', 'verification_status'], 'idx_cert_doc_cert_status');
            $table->index('deleted_at', 'idx_cert_doc_deleted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certification_documents');
    }
};