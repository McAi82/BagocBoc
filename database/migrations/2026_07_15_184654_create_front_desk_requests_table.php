<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('front_desk_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->string('service_type');
            $table->text('purpose')->nullable();
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->string('reference_number')->unique();
            $table->enum('status', ['pending', 'processing', 'completed', 'forwarded', 'cancelled'])->default('pending');
            $table->foreignId('created_by_user_id')
                ->constrained('users');
            $table->foreignId('processed_by_user_id')
                ->nullable()
                ->constrained('users');
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->string('forwarded_to_office')->nullable();
            $table->text('forwarded_notes')->nullable();
            $table->foreignId('forwarded_by_user_id')
                ->nullable()
                ->constrained('users');
            $table->timestamp('forwarded_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by_user_id')
                ->nullable()
                ->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('front_desk_requests');
    }
};