<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('message');
            $table->string('category')->default('general');
            $table->nullableMorphs('reference');
            $table->string('deep_link')->nullable();
            $table->enum('priority', ['low', 'normal', 'high'])->default('normal');
            $table->timestamps();

            $table->index('category', 'idx_notifications_category');
            $table->index('priority', 'idx_notifications_priority');
            $table->index('created_at', 'idx_notifications_created_at');
            $table->index(['reference_type', 'reference_id'], 'idx_notifications_reference');
        });

        Schema::create('notification_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')->constrained('notifications')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->unique(['notification_id', 'user_id'], 'uq_notification_recipients_notif_user');
            $table->index(['user_id', 'is_read'], 'idx_notif_recipient_user_read');
            $table->index(['notification_id', 'user_id'], 'idx_notif_recipient_notif_user');
            $table->index(['user_id', 'created_at'], 'idx_notif_recipient_user_created');
        });

        Schema::create('record_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('encoded_by')->constrained('users')->cascadeOnDelete();
            $table->morphs('record');
            $table->string('action');
            $table->string('data_status')->nullable();
            $table->text('details')->nullable();
            $table->timestamps();
            $table->index(['record_id', 'record_type']);
        });

        Schema::create('barangay_infos', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('captain_name')->nullable();
            $table->string('municipality')->nullable();
            $table->string('province')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('seal_url')->nullable();
            $table->string('barangay_secretary')->nullable();
            $table->string('barangay_treasurer')->nullable();
            $table->text('about_us')->nullable();
            $table->text('mission')->nullable();
            $table->text('vision')->nullable();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('message');
            $table->string('target_group')->default('All');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->string('action_url')->nullable();
            $table->string('image_url')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->enum('status', ['Published', 'Draft', 'Archived'])->default('Draft');
            $table->timestamps();
        });

        Schema::create('compliance_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('barangay_zones')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('requirement');
            $table->decimal('penalty', 10, 2)->default(0);
            $table->enum('status', ['pending', 'completed', 'overdue', 'exempted'])->default('pending');
            $table->timestamp('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('completion_notes')->nullable();
            $table->foreignId('completed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('is_active', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->index(['resident_id', 'status']);
            $table->index(['zone_id', 'status']);
            $table->index('due_date');
            $table->index('is_active');
        });

        Schema::create('survey_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained('households')->cascadeOnDelete();
            $table->foreignId('respondent_id')->nullable()->constrained('residents')->nullOnDelete();
            $table->json('answers');
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('encoded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['draft', 'submitted'])->default('draft');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_responses');
        Schema::dropIfExists('compliance_requirements');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('barangay_infos');
        Schema::dropIfExists('record_activity_logs');
        Schema::dropIfExists('notification_recipients');
        Schema::dropIfExists('notifications');
    }
};