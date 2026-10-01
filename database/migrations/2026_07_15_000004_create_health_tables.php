<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opt_plus_assessments', function (Blueprint $table) {
            $table->id();
            $table->date('assessment_date');
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->decimal('weight_kg', 5, 2);
            $table->decimal('height_cm', 5, 2);
            $table->string('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('maternal_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->enum('pregnancy_status', ['pregnant', 'postpartum', 'terminated']);
            $table->date('expected_delivery_date')->nullable();
            $table->date('last_checkup_date')->nullable();
            $table->boolean('family_planning')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('patient_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->enum('patient_type', ['pregnant', 'child', 'lactating', 'senior', 'ncd']);
            $table->json('vital_signs')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users');
            $table->enum('status', ['active', 'inactive', 'archived'])->default('active');
            $table->timestamps();

            $table->index(['resident_id', 'patient_type']);
            $table->index('patient_type');
            $table->index('status');
        });

        Schema::create('pregnancy_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->date('last_menstrual_period')->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->integer('gestational_age')->nullable();
            $table->integer('gravida')->nullable();
            $table->integer('para')->nullable();
            $table->text('obstetric_history')->nullable();
            $table->enum('risk_level', ['low', 'medium', 'high'])->default('low');
            $table->string('immunization_status')->nullable();
            $table->text('prenatal_logs')->nullable();
            $table->text('allergies')->nullable();
            $table->text('medical_history')->nullable();
            $table->text('current_medications')->nullable();
            $table->timestamps();

            $table->index('expected_delivery_date');
            $table->index('risk_level');
        });

        Schema::create('child_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();

            $table->decimal('birth_weight', 5, 2)->nullable();
            $table->decimal('birth_height', 5, 2)->nullable();
            $table->decimal('birth_head_circumference', 5, 2)->nullable();
            $table->integer('gestational_age_at_birth')->nullable();
            $table->string('birth_type')->nullable();
            $table->text('birth_complications')->nullable();

            $table->text('immunization_history')->nullable();
            $table->text('allergies')->nullable();
            $table->text('chronic_conditions')->nullable();

            $table->decimal('current_weight', 5, 2)->nullable();
            $table->decimal('current_height', 5, 2)->nullable();
            $table->decimal('current_muac', 5, 2)->nullable();
            $table->string('current_nutritional_status')->nullable();

            $table->timestamps();

            $table->index('birth_weight');
            $table->index('current_nutritional_status');
        });

        Schema::create('lactating_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();

            $table->string('breastfeeding_status')->nullable();
            $table->integer('infant_age')->nullable()->comment('in months');
            $table->string('feeding_method')->nullable();
            $table->text('latching_assessment')->nullable();

            $table->string('nutritional_status')->nullable();
            $table->string('family_planning_method')->nullable();
            $table->text('maternal_health_status')->nullable();

            $table->decimal('infant_weight', 5, 2)->nullable();
            $table->text('infant_health_status')->nullable();

            $table->timestamps();
            $table->index('breastfeeding_status');
        });

        Schema::create('senior_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();

            $table->integer('falls_risk_score')->nullable();
            $table->text('cognitive_assessment')->nullable();
            $table->string('memory_status')->nullable();

            $table->text('chronic_conditions')->nullable();
            $table->text('medication_list')->nullable();
            $table->text('allergies')->nullable();
            $table->string('activity_level')->nullable();
            $table->text('support_system')->nullable();
            $table->text('emergency_contact')->nullable();

            $table->timestamps();
            $table->index('falls_risk_score');
        });

        Schema::create('ncd_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();

            $table->string('ncd_classification')->nullable();
            $table->date('diagnosis_date')->nullable();
            $table->json('lab_results')->nullable();
            $table->text('medications')->nullable();
            $table->text('complications')->nullable();
            $table->text('lifestyle_factors')->nullable();
            $table->text('allergies')->nullable();
            $table->text('treatment_history')->nullable();
            $table->string('current_status')->nullable();

            $table->timestamps();
            $table->index('ncd_classification');
            $table->index('current_status');
        });

        Schema::create('checkup_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_record_id')->constrained('patient_records')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('performed_by_user_id')->constrained('users');
            $table->enum('checkup_type', ['pregnancy', 'child', 'lactating', 'senior', 'ncd']);
            $table->timestamp('checkup_date')->nullable();
            $table->json('vital_signs')->nullable();
            $table->text('assessment')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('treatment')->nullable();
            $table->text('recommendations')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->enum('status', ['draft', 'completed'])->default('completed');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['patient_record_id', 'checkup_type']);
            $table->index('checkup_date');
            $table->index('follow_up_date');
        });

        Schema::create('pregnancy_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            $table->json('maternal_vitals')->nullable();
            $table->text('fetal_assessment')->nullable();
            $table->integer('fetal_heart_rate')->nullable();
            $table->decimal('fundal_height', 5, 2)->nullable();
            $table->text('interventions')->nullable();
            $table->text('micronutrients')->nullable();
            $table->boolean('iron_supplement')->default(false);
            $table->boolean('folic_acid')->default(false);
            $table->text('clinical_assessment')->nullable();
            $table->timestamps();
        });

        Schema::create('child_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            $table->decimal('weight', 5, 2)->nullable();
            $table->decimal('height', 5, 2)->nullable();
            $table->decimal('muac', 5, 2)->nullable();
            $table->decimal('head_circumference', 5, 2)->nullable();
            $table->json('vaccines_given')->nullable();
            $table->text('developmental_assessment')->nullable();
            $table->json('developmental_milestones')->nullable();
            $table->string('nutritional_status')->nullable();
            $table->text('nutritional_counseling')->nullable();
            $table->text('interventions')->nullable();
            $table->timestamps();
        });

        Schema::create('lactating_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            $table->string('feeding_method')->nullable();
            $table->text('latching_assessment')->nullable();
            $table->string('engorgement_status')->nullable();
            $table->text('nutritional_counseling')->nullable();
            $table->decimal('infant_weight', 5, 2)->nullable();
            $table->text('infant_health_status')->nullable();
            $table->text('family_planning_counseling')->nullable();
            $table->string('family_planning_method')->nullable();
            $table->timestamps();
        });

        Schema::create('senior_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            $table->json('vitals')->nullable();
            $table->decimal('blood_sugar', 5, 2)->nullable();
            $table->integer('falls_reassessment')->nullable();
            $table->text('cognitive_check')->nullable();
            $table->text('medication_adherence')->nullable();
            $table->json('medications_refilled')->nullable();
            $table->timestamps();
        });

        Schema::create('ncd_checkups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_record_id')->constrained('checkup_records')->cascadeOnDelete();
            $table->json('vitals')->nullable();
            $table->json('lab_results')->nullable();
            $table->text('medication_adherence')->nullable();
            $table->json('medications_refilled')->nullable();
            $table->text('lifestyle_counseling')->nullable();
            $table->text('dietary_counseling')->nullable();
            $table->text('exercise_recommendations')->nullable();
            $table->text('complication_monitoring')->nullable();
            $table->timestamps();
        });

        Schema::create('programs', function (Blueprint $table) {
            $table->id();
            $table->string('programs');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('program_type', ['nutrition', 'drug', 'sexual_health', 'maternal', 'other']);
            $table->enum('status', ['planned', 'ongoing', 'completed', 'cancelled'])->default('planned');
            $table->decimal('budget', 12, 2)->nullable();
            $table->integer('target_beneficiaries')->nullable();
            $table->string('location')->nullable();
            $table->string('implementing_agency')->nullable();
            $table->foreignId('focal_person_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('program_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('programs')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->timestamp('enrolled_at')->nullable();
            $table->enum('status', ['active', 'inactive', 'completed', 'dropped'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['program_id', 'resident_id']);
        });

        Schema::create('nutrition_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participant_id')->constrained('program_participants')->cascadeOnDelete();
            $table->date('assessment_date');
            $table->decimal('weight', 8, 2);
            $table->decimal('height', 8, 2);
            $table->decimal('bmi', 8, 2)->nullable();
            $table->string('nutrition_status')->nullable();
            $table->string('weight_for_age_status')->nullable();
            $table->string('height_for_age_status')->nullable();
            $table->string('weight_for_height_status')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('encoded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_assessments');
        Schema::dropIfExists('program_participants');
        Schema::dropIfExists('programs');
        Schema::dropIfExists('ncd_checkups');
        Schema::dropIfExists('senior_checkups');
        Schema::dropIfExists('lactating_checkups');
        Schema::dropIfExists('child_checkups');
        Schema::dropIfExists('pregnancy_checkups');
        Schema::dropIfExists('checkup_records');
        Schema::dropIfExists('ncd_records');
        Schema::dropIfExists('senior_records');
        Schema::dropIfExists('lactating_records');
        Schema::dropIfExists('child_records');
        Schema::dropIfExists('pregnancy_records');
        Schema::dropIfExists('patient_records');
        Schema::dropIfExists('maternal_profiles');
        Schema::dropIfExists('opt_plus_assessments');
    }
};