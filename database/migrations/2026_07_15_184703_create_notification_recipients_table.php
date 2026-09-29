<?php
// database/migrations/2026_07_15_184703_create_notification_recipients_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_recipients', function (Blueprint $table) {
            $table->id();

            // ============================================
            // FOREIGN KEYS
            // ============================================

            $table->foreignId('notification_id')
                ->constrained('notifications')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // ============================================
            // READ STATE
            // ============================================

            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();

            // ============================================
            // TIMESTAMPS
            // ============================================

            $table->timestamps();

            // ============================================
            // CONSTRAINTS & INDEXES
            // ============================================

            // ✅ Prevents duplicate delivery of the same notification to the same user
            $table->unique(
                ['notification_id', 'user_id'],
                'uq_notification_recipients_notif_user'
            );

            // ✅ Fast unread-count lookup per user (used every 15s by the polling)
            $table->index(
                ['user_id', 'is_read'],
                'idx_notif_recipient_user_read'
            );

            // ✅ Fast ownership check on mark-read / delete (notification + user)
            $table->index(
                ['notification_id', 'user_id'],
                'idx_notif_recipient_notif_user'
            );

            // ✅ Fast ordering by time when listing a user's notifications
            $table->index(
                ['user_id', 'created_at'],
                'idx_notif_recipient_user_created'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_recipients');
    }
};
