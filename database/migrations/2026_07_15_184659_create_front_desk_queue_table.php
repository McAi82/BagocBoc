<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('front_desk_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->foreignId('request_id')
                ->nullable()
                ->constrained('front_desk_requests')
                ->nullOnDelete();
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
    }
};