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
            $table->foreignId('resident_id')
                ->nullable()
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->string('photo_id')->nullable();
            $table->timestamps();
            
            $table->index('resident_id', 'idx_cert_req_resident_id');
            $table->index(['resident_id', 'created_at'], 'idx_cert_req_resident_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_requesters');
    }
};