<?php
// database/migrations/2026_07_15_184660_create_notifications_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            // Who sent it (null = system-generated)
            $table->foreignId('sender_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Content
            $table->string('title');
            $table->text('message');

            // Category drives icon/color on mobile (e.g. 'certificate', 'penalty', 'health')
            $table->string('category')->default('general');

            // Optional polymorphic reference to what this notification is about
            $table->nullableMorphs('reference');

            // Optional deep link for mobile navigation
            $table->string('deep_link')->nullable();

            // Priority affects visual emphasis
            $table->enum('priority', ['low', 'normal', 'high'])->default('normal');

            $table->timestamps();

            // Indexes for common lookups
            $table->index('category', 'idx_notifications_category');
            $table->index('priority', 'idx_notifications_priority');
            $table->index('created_at', 'idx_notifications_created_at');
            $table->index(['reference_type', 'reference_id'], 'idx_notifications_reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
