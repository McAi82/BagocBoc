<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zone_check_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_leader_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('zone_id')
                ->constrained('barangay_zones')
                ->cascadeOnDelete();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['clear', 'needs_attention', 'urgent'])->default('clear');
            $table->timestamp('checked_in_at')->nullable();
            $table->text('findings')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zone_check_ins');
    }
};