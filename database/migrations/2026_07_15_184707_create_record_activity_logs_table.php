<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('record_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('encoded_by')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->morphs('record');
            $table->string('action');
            $table->string('data_status')->nullable();
            $table->text('details')->nullable();
            $table->timestamps();
            $table->index(['record_id', 'record_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('record_activity_logs');
    }
};