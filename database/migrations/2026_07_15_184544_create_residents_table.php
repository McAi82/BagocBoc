<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residents', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix')->nullable();
            $table->string('phone_number')->nullable();
             $table->string('email')->nullable()->unique();
            $table->enum('gender', ['Male', 'Female']);
            $table->string('citizenship')->default('Filipino');
            $table->date('birth_date');
            $table->string('place_of_birth');
            $table->enum('civil_status', ['Single', 'Married', 'Widow', 'Legally Separated']);
            $table->enum('voter_status', ['Registered Local', 'Registered_Outside', 'Not Registered'])->default('Not Registered');
            $table->string('occupation')->nullable();
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->string('education_attainment')->nullable();
            $table->enum('status', ['active', 'inactive', 'pending'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residents');
    }
};