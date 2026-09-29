<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clearance_configurations', function (Blueprint $table) {
            $table->id();
            $table->decimal('default_fee', 10, 2)->default(50);
            $table->string('punong_barangay_name')->nullable();
            $table->string('barangay_secretary_name')->nullable();
            $table->text('header_text')->nullable();
            $table->text('footer_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clearance_configurations');
    }
};