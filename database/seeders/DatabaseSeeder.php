<?php
// database/seeders/DatabaseSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\BarangayZone;
use App\Models\Role;
use App\Models\BarangayInfo;
use App\Models\ClearanceConfiguration;
use App\Models\FoodProductionType;
use App\Models\CertificationType;
use App\Models\CertificateRequester;
use App\Models\Resident;
use App\Models\Household;
use App\Models\HouseholdAddress;
use App\Models\HouseGeotag;
use App\Models\User;
use App\Models\HouseholdCensusRecord;
use App\Models\HouseholdEnvironment;
use App\Models\Program;
use App\Models\ProgramParticipant;
use App\Models\NutritionAssessment;
use App\Models\MaternalProfile;
use App\Models\OptPlusAssessment;
use App\Models\PatientRecord;
use App\Models\CheckupRecord;
use App\Models\PregnancyRecord;
use App\Models\ChildRecord;
use App\Models\LactatingRecord;
use App\Models\NcdRecord;
use App\Models\SeniorRecord;
use App\Models\PregnancyCheckup;
use App\Models\ChildCheckup;
use App\Models\LactatingCheckup;
use App\Models\SeniorCheckup;
use App\Models\NcdCheckup;
use App\Models\Certification;
use App\Models\Clearance;
use App\Models\Payment;
use App\Models\TaxPayment;
use App\Models\Penalty;
use App\Models\FinancialReport;
use App\Models\FrontDeskRequest;
use App\Models\FrontDeskQueue;
use App\Models\FrontDeskAppointment;
use App\Models\FrontDeskClaimSlip;
use App\Models\Announcement;
use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Models\AccountActivation;
use App\Models\ZoneCheckIn;
use App\Models\ComplianceRequirement;
use App\Models\ResidentConfirmation;
use App\Models\RecordActivityLog;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ============================================
        // 1. BARANGAY ZONES (9 zones)
        // ============================================
        $zones = [
            ['zone_number' => 1, 'name' => 'Zone 1 - Poblacion',  'latitude' => 8.4198, 'longitude' => 124.5022],
            ['zone_number' => 2, 'name' => 'Zone 2 - Riverside',  'latitude' => 8.4220, 'longitude' => 124.5040],
            ['zone_number' => 3, 'name' => 'Zone 3 - Upland',     'latitude' => 8.4170, 'longitude' => 124.5000],
            ['zone_number' => 4, 'name' => 'Zone 4 - Seaside',    'latitude' => 8.4200, 'longitude' => 124.5060],
            ['zone_number' => 5, 'name' => 'Zone 5 - Highway',    'latitude' => 8.4240, 'longitude' => 124.5010],
            ['zone_number' => 6, 'name' => 'Zone 6 - Interior',   'latitude' => 8.4160, 'longitude' => 124.5080],
            ['zone_number' => 7, 'name' => 'Zone 7 - South',      'latitude' => 8.4150, 'longitude' => 124.5030],
            ['zone_number' => 8, 'name' => 'Zone 8 - Central',    'latitude' => 8.4180, 'longitude' => 124.5070],
            ['zone_number' => 9, 'name' => 'Zone 9 - North',      'latitude' => 8.4250, 'longitude' => 124.5050],
        ];
        foreach ($zones as $zone) {
            BarangayZone::updateOrCreate(
                ['zone_number' => $zone['zone_number']],
                $zone
            );
        }
        $this->command->info('✅ Barangay zones seeded (9)');

        // ============================================
        // 2. ROLES
        // ============================================
        $roles = [
            ['name' => 'Super Admin', 'description' => 'Full system access'],
            ['name' => 'Barangay Captain', 'description' => 'Barangay Captain'],
            ['name' => 'Barangay Secretary', 'description' => 'Barangay Secretary'],
            ['name' => 'Barangay Treasurer', 'description' => 'Barangay Treasurer'],
            ['name' => 'Front Desk Clerk', 'description' => 'Front Desk Clerk'],
            ['name' => 'Midwife', 'description' => 'Midwife Nurse'],
            ['name' => 'Nurse Deployment Program', 'description' => 'Nurse Deployment Program (shares access with Midwife)'],
            ['name' => 'Barangay Health Worker', 'description' => 'Barangay Health Worker'],
            ['name' => 'Barangay Nutrition Scholar', 'description' => 'Barangay Nutrition Scholar'],
            ['name' => 'Zone Leader', 'description' => 'Zone Leader'],
            ['name' => 'Resident', 'description' => 'Resident'],
        ];
        foreach ($roles as $r) {
            Role::updateOrCreate(['name' => $r['name']], $r);
        }
        $roleIds = Role::pluck('id', 'name')->toArray();
        $this->command->info('✅ Roles seeded (' . count($roles) . ')');

        // ============================================
        // 3. BARANGAY INFO
        // ============================================
        BarangayInfo::updateOrCreate(
            ['id' => 1],
            [
                'name' => 'Bagocboc',
                'captain_name' => 'Marcos P. Gonzales',
                'municipality' => 'Opol',
                'province' => 'Misamis Oriental',
                'phone' => '+63 912 345 6789',
                'email' => 'bagocboc.opol@example.com',
                'address' => 'Zone 1, Barangay Bagocboc, Opol, Misamis Oriental',
                'barangay_secretary' => 'Concordio A. Esber',
                'barangay_treasurer' => 'Juan D. Dela Cruz',
                'about_us' => 'Barangay Bagocboc is a progressive barangay in Opol, Misamis Oriental.',
                'mission' => 'To provide quality service to our constituents.',
                'vision' => 'A progressive and peaceful community.',
            ]
        );
        $this->command->info('✅ Barangay info seeded');

        // ============================================
        // 4. CLEARANCE CONFIGURATION
        // ============================================
        ClearanceConfiguration::updateOrCreate(
            ['id' => 1],
            [
                'default_fee' => 50.00,
                'punong_barangay_name' => 'Marcos P. Gonzales',
                'barangay_secretary_name' => 'Concordio A. Esber',
                'header_text' => 'Republic of the Philippines - Province of Misamis Oriental - Municipality of Opol',
                'footer_text' => 'This clearance is valid for one year from the date of issuance.',
                'is_active' => true,
            ]
        );
        $this->command->info('✅ Clearance configuration seeded');

        // ============================================
        // 5. FOOD PRODUCTION TYPES
        // ============================================
        $foodTypes = ['Vegetable Gardening', 'Poultry Raising', 'Fish Pond'];
        foreach ($foodTypes as $name) {
            FoodProductionType::firstOrCreate(['name' => $name]);
        }
        $this->command->info('✅ Food production types seeded (3)');

        // ============================================
        // 6. CERTIFICATION TYPES
        // ============================================
        $certTypes = [
            ['name' => 'Certificate of Residency', 'description' => 'Proof of residency', 'fee' => 50, 'is_active' => true],
            ['name' => 'Certificate of Indigency', 'description' => 'Proof of indigency', 'fee' => 0, 'is_active' => true],
            ['name' => 'Certificate of Good Moral', 'description' => 'Good moral character', 'fee' => 50, 'is_active' => true],
            ['name' => 'Barangay Clearance', 'description' => 'Barangay clearance', 'fee' => 50, 'is_active' => true],
        ];
        foreach ($certTypes as $t) {
            CertificationType::updateOrCreate(['name' => $t['name']], $t);
        }
        $this->command->info('✅ Certification types seeded (4)');

        // ============================================
        // 7. HOUSEHOLDS + RESIDENTS
        //
        // 9 households × 5 members = 45 residents
        // Each household lives in its own zone (1 household per zone).
        // ============================================
        $zoneList = BarangayZone::orderBy('zone_number')->get();

        $firstNamesMale = [
            'Juan',
            'Pedro',
            'Carlos',
            'Luis',
            'Jose',
            'Miguel',
            'Rafael',
            'Eduardo',
            'Ricardo',
            'Antonio',
            'Fernando',
            'Marcos',
            'Alfredo',
            'Rogelio',
            'Ernesto',
            'Manuel',
            'Diego',
            'Victor',
            'Sergio',
            'Andres',
            'Ramon',
            'Nestor',
            'Felipe',
            'Gabriel',
            'Enrique',
        ];
        $firstNamesFemale = [
            'Maria',
            'Ana',
            'Rosa',
            'Liza',
            'Lucia',
            'Carmen',
            'Sofia',
            'Elena',
            'Isabel',
            'Teresa',
            'Rita',
            'Nora',
            'Gloria',
            'Mila',
            'Cristina',
            'Beatriz',
            'Diana',
            'Veronica',
            'Patricia',
            'Monica',
            'Claudia',
            'Sandra',
            'Yolanda',
            'Alma',
            'Lorna',
        ];

        // ✅ 9 family surnames (one per zone)
        $surnames = [
            'Dela Cruz',
            'Santos',
            'Reyes',
            'Garcia',
            'Bautista',
            'Mendoza',
            'Aquino',
            'Fernandez',
            'Gonzales',
        ];

        $allResidents = [];
        $allHouseholds = [];

        foreach ($surnames as $i => $surname) {
            $zone = $zoneList[$i];

            $address = HouseholdAddress::create([
                'zone' => $zone->id,
                'street' => 'Purok ' . ($i + 1),
            ]);

            $household = Household::create([
                'address_id' => $address->id,
                'household_number' => 'BB-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                'household_tracking_number' => 'TRK-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                'status' => 'active',
            ]);
            $allHouseholds[] = $household;

            // Build 5 members per household
            $members = [];

            // Head (male)
            $headAge = rand(35, 60);
            $members[] = [
                'first'  => $firstNamesMale[$i % count($firstNamesMale)],
                'gender' => 'Male',
                'role'   => 'Head',
                'age'    => $headAge,
            ];

            // Spouse (female)
            $spouseAge = $headAge - rand(1, 5);
            $members[] = [
                'first'  => $firstNamesFemale[$i % count($firstNamesFemale)],
                'gender' => 'Female',
                'role'   => 'Spouse',
                'age'    => $spouseAge,
            ];

            // Child 1 (mixed gender, school age)
            $childAge1 = rand(6, 17);
            $members[] = [
                'first'  => $childAge1 % 2 === 0
                    ? $firstNamesFemale[($i + 3) % count($firstNamesFemale)]
                    : $firstNamesMale[($i + 4) % count($firstNamesMale)],
                'gender' => $childAge1 % 2 === 0 ? 'Female' : 'Male',
                'role'   => 'Child',
                'age'    => $childAge1,
            ];

            // Child 2 (mixed gender, school age)
            $childAge2 = rand(8, 17);
            $members[] = [
                'first'  => $childAge2 % 2 === 0
                    ? $firstNamesFemale[($i + 5) % count($firstNamesFemale)]
                    : $firstNamesMale[($i + 6) % count($firstNamesMale)],
                'gender' => $childAge2 % 2 === 0 ? 'Female' : 'Male',
                'role'   => 'Child',
                'age'    => $childAge2,
            ];

            // Relative (could be senior, could be young adult)
            $relativeAge = rand(20, 70);
            $members[] = [
                'first'  => $firstNamesMale[($i + 8) % count($firstNamesMale)],
                'gender' => 'Male',
                'role'   => 'Relative',
                'age'    => $relativeAge,
            ];

            foreach ($members as $j => $member) {
                $resident = Resident::create([
                    'first_name' => $member['first'],
                    'middle_name' => 'Santos',
                    'last_name' => $surname,
                    'suffix' => null,
                    'phone_number' => '0912' . str_pad($i * 10 + $j, 6, '0', STR_PAD_LEFT),
                    'gender' => $member['gender'],
                    'citizenship' => 'Filipino',
                    'birth_date' => now()->subYears($member['age'])->format('Y-m-d'),
                    'place_of_birth' => 'Opol, Misamis Oriental',
                    'civil_status' => in_array($member['role'], ['Child'])
                        ? 'Single'
                        : ($member['role'] === 'Head' || $member['role'] === 'Spouse' ? 'Married' : 'Single'),
                    'voter_status' => $member['age'] >= 18 ? 'Registered Local' : 'Not Registered',
                    'occupation' => $member['role'] === 'Child'
                        ? 'Student'
                        : ($member['age'] >= 60 ? 'Retired' : 'Employee'),
                    'monthly_income' => $member['role'] === 'Child' ? null : rand(8000, 25000),
                    'education_attainment' => $member['age'] < 18
                        ? 'High School'
                        : ($member['age'] < 25 ? 'College Level' : 'College Graduate'),
                    'status' => 'active',
                ]);
                $allResidents[] = $resident;

                DB::table('resident_households')->insert([
                    'resident_id' => $resident->id,
                    'household_id' => $household->id,
                    'relationship_to_household' => $member['role'],
                    'is_primary' => $member['role'] === 'Head',
                    'start_date' => now(),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        $this->command->info('✅ Residents seeded (' . count($allResidents) . ')');
        $this->command->info('✅ Households seeded (' . count($allHouseholds) . ')');

        // ============================================
        // 7B. DERIVED COLLECTIONS
        // ============================================
        $allResidentsCollection = collect($allResidents);

        $children = $allResidentsCollection
            ->filter(fn($r) => $r->age !== null && $r->age < 18)
            ->values();

        $adultFemales = $allResidentsCollection
            ->filter(fn($r) => $r->gender === 'Female' && $r->age !== null && $r->age >= 18)
            ->values();

        $seniors = $allResidentsCollection
            ->filter(fn($r) => $r->age !== null && $r->age >= 60)
            ->values();

        $adults = $allResidentsCollection
            ->filter(fn($r) => $r->age !== null && $r->age >= 18 && $r->age < 60)
            ->values();

        // ============================================
        // 8. HOUSE GEOTAGS
        // ============================================
        foreach ($allHouseholds as $i => $household) {
            $zone = $zoneList[$i % 9];
            HouseGeotag::create([
                'household_id' => $household->id,
                'latitude' => $zone->latitude + ($i * 0.0005),
                'longitude' => $zone->longitude + ($i * 0.0005),
                'captured_at' => now(),
            ]);
        }
        $this->command->info('✅ House geotags seeded (' . count($allHouseholds) . ')');

        // ============================================
        // 9. USERS
        // ============================================
        // Super Admin + 8 staff + 9 zone leaders + 1 resident
        $users = [
            ['email' => 'superadmin@gmail.com',   'role' => 'Super Admin',                 'resident' => null],
            ['email' => 'captain@gmail.com',      'role' => 'Barangay Captain',            'resident' => $allResidents[0]],
            ['email' => 'secretary@gmail.com',    'role' => 'Barangay Secretary',          'resident' => $allResidents[1]],
            ['email' => 'treasurer@gmail.com',    'role' => 'Barangay Treasurer',          'resident' => $allResidents[2]],
            ['email' => 'frontdesk@gmail.com',    'role' => 'Front Desk Clerk',            'resident' => $allResidents[3]],
            ['email' => 'midwife@gmail.com',      'role' => 'Midwife',                     'resident' => $allResidents[4]],
            ['email' => 'ndp@gmail.com',          'role' => 'Nurse Deployment Program',    'resident' => $allResidents[5]],
            ['email' => 'bhw@gmail.com',          'role' => 'Barangay Health Worker',      'resident' => $allResidents[6]],
            ['email' => 'bns@gmail.com',          'role' => 'Barangay Nutrition Scholar',  'resident' => $allResidents[7]],

            // ✅ 9 Zone Leaders, one per zone
            ['email' => 'zoneleader1@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[8]],
            ['email' => 'zoneleader2@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[9]],
            ['email' => 'zoneleader3@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[10]],
            ['email' => 'zoneleader4@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[11]],
            ['email' => 'zoneleader5@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[12]],
            ['email' => 'zoneleader6@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[13]],
            ['email' => 'zoneleader7@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[14]],
            ['email' => 'zoneleader8@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[15]],
            ['email' => 'zoneleader9@gmail.com',  'role' => 'Zone Leader', 'resident' => $allResidents[16]],

            // Resident demo account
            ['email' => 'resident@gmail.com',     'role' => 'Resident',    'resident' => $allResidents[17]],
        ];

        $userMap = [];
        $zoneLeaderUsers = [];

        foreach ($users as $u) {
            $user = User::create([
                'resident_id' => $u['resident']?->id,
                'email' => $u['email'],
                'password' => Hash::make('password'),
                'account_status' => 'active',
                'is_first_login' => false,
                'last_login_at' => now(),
                'phone_verified_at' => now(),
                'email_verified_at' => now(),
            ]);
            $user->roles()->attach($roleIds[$u['role']]);

            // Non-resident roles also get the Resident role
            if ($u['resident'] && $u['role'] !== 'Resident') {
                $user->roles()->syncWithoutDetaching([$roleIds['Resident']]);
            }

            $userMap[$u['role']] = $user;

            // Track zone leaders separately
            if ($u['role'] === 'Zone Leader') {
                $zoneLeaderUsers[] = $user;
            }
        }
        $this->command->info('✅ Users seeded (' . count($users) . ')');

        // ============================================
        // 10. RECORD ACTIVITY LOGS
        // ============================================
        $bhw = $userMap['Barangay Health Worker'];
        foreach ($allHouseholds as $h) {
            RecordActivityLog::create([
                'encoded_by' => $bhw->id,
                'record_id' => $h->id,
                'record_type' => Household::class,
                'action' => 'Added Household',
                'data_status' => 'Approved',
                'details' => "Conducted census for Household #{$h->household_number}",
            ]);
        }
        $this->command->info('✅ Record activity logs seeded (' . count($allHouseholds) . ')');

        // ============================================
        // 11. CENSUS RECORDS
        // ============================================
        foreach ($allHouseholds as $h) {
            $census = HouseholdCensusRecord::create([
                'household_id' => $h->id,
                'census_year' => 2026,
                'census_date' => now()->subMonths(2),
                'monthly_income' => rand(12000, 30000),
                'encoded_by' => $userMap['Barangay Secretary']->id,
                'data_status' => 'Approved',
            ]);

            HouseholdEnvironment::create([
                'household_census_id' => $census->id,
                'toilet_type' => 'Flush',
                'water_source' => 'Piped',
                'garbage_disposal' => 'Collection',
                'tenure_status' => 'Owned',
                'couple_practices_family_planning' => true,
                'uses_iodized_salt' => 'Yes',
                'OSY_count' => 0,
                'ISY_count' => rand(0, 2),
                'type_of_dwelling_unit' => 'Concrete',
            ]);
        }
        $this->command->info('✅ Census records seeded (' . count($allHouseholds) . ')');

        // ============================================
        // 12. PROGRAMS + PARTICIPANTS + NUTRITION ASSESSMENTS
        // ============================================
        $program = Program::create([
            'programs' => 'Nutrition Program',
            'description' => 'Nutrition program for children and pregnant women',
            'start_date' => now()->startOfMonth(),
            'end_date' => now()->addMonths(3),
            'program_type' => 'nutrition',
            'status' => 'ongoing',
            'budget' => 50000,
            'target_beneficiaries' => 100,
            'location' => 'Barangay Hall',
            'implementing_agency' => 'Barangay Health Office',
        ]);

        foreach ($children as $child) {
            $participant = ProgramParticipant::create([
                'program_id' => $program->id,
                'resident_id' => $child->id,
                'enrolled_at' => now(),
                'status' => 'active',
            ]);

            NutritionAssessment::create([
                'participant_id' => $participant->id,
                'assessment_date' => now()->subDays(7),
                'weight' => rand(180, 350) / 10,
                'height' => rand(1050, 1450) / 10,
                'bmi' => rand(150, 220) / 10,
                'nutrition_status' => 'Normal',
                'encoded_by' => $bhw->id,
            ]);
        }
        $this->command->info('✅ Programs + participants + assessments seeded');

        // ============================================
        // 13. MATERNAL PROFILES + OPT PLUS
        // ============================================
        $mothers = $adultFemales->take(4);
        if ($mothers->count() < 2) {
            $mothers = Resident::where('gender', 'Female')->take(4)->get();
        }

        foreach ($mothers as $i => $mother) {
            MaternalProfile::create([
                'resident_id' => $mother->id,
                'pregnancy_status' => $i % 2 === 0 ? 'pregnant' : 'postpartum',
                'expected_delivery_date' => now()->addMonths(rand(2, 6)),
                'last_checkup_date' => now()->subDays(14),
                'family_planning' => false,
                'remarks' => 'Healthy',
            ]);
        }

        foreach ($children as $child) {
            OptPlusAssessment::create([
                'resident_id' => $child->id,
                'assessment_date' => now()->subDays(10),
                'weight_kg' => rand(180, 350) / 10,
                'height_cm' => rand(1050, 1450) / 10,
                'remarks' => 'Normal',
            ]);
        }
        $this->command->info('✅ Maternal profiles + OPT Plus seeded');

        // ============================================
        // 14. PATIENT RECORDS (all 5 types)
        // ============================================
        $midwife = $userMap['Midwife'];

        $pregnantResident  = $mothers->first();
        $lactatingResident = $mothers->count() > 1 ? $mothers[1] : $mothers->first();
        $childResident     = $children->first() ?? $allResidentsCollection->first();

        $seniorResident = $seniors->first()
            ?? $allResidentsCollection->first(fn($r) => $r->age !== null && $r->age >= 60)
            ?? $allResidentsCollection->first();

        $ncdResident = $adults->first(
            fn($r) => !in_array($r->id, [
                $pregnantResident->id,
                $childResident->id,
                $lactatingResident->id,
                $seniorResident->id,
            ])
        ) ?? $adults->first() ?? $allResidentsCollection->first();

        // Pregnant
        $pregnantRecord = PatientRecord::create([
            'resident_id' => $pregnantResident->id,
            'patient_type' => 'pregnant',
            'created_by_user_id' => $midwife->id,
            'status' => 'active',
            'vital_signs' => ['blood_pressure' => '120/80', 'weight' => 60],
        ]);
        PregnancyRecord::create([
            'patient_record_id' => $pregnantRecord->id,
            'resident_id' => $pregnantResident->id,
            'last_menstrual_period' => now()->subMonths(4),
            'expected_delivery_date' => now()->addMonths(5),
            'gestational_age' => 16,
            'gravida' => 2,
            'para' => 1,
            'risk_level' => 'low',
        ]);

        // Child
        $childRecord = PatientRecord::create([
            'resident_id' => $childResident->id,
            'patient_type' => 'child',
            'created_by_user_id' => $midwife->id,
            'status' => 'active',
            'vital_signs' => ['weight' => 25.5, 'height' => 120],
        ]);
        ChildRecord::create([
            'patient_record_id' => $childRecord->id,
            'resident_id' => $childResident->id,
            'birth_weight' => 3.2,
            'birth_height' => 50,
            'gestational_age_at_birth' => 38,
        ]);

        // Lactating
        $lactatingRecord = PatientRecord::create([
            'resident_id' => $lactatingResident->id,
            'patient_type' => 'lactating',
            'created_by_user_id' => $midwife->id,
            'status' => 'active',
        ]);
        LactatingRecord::create([
            'patient_record_id' => $lactatingRecord->id,
            'resident_id' => $lactatingResident->id,
            'breastfeeding_status' => 'exclusive',
            'infant_age' => 3,
        ]);

        // Senior
        $seniorRecord = PatientRecord::create([
            'resident_id' => $seniorResident->id,
            'patient_type' => 'senior',
            'created_by_user_id' => $midwife->id,
            'status' => 'active',
        ]);
        SeniorRecord::create([
            'patient_record_id' => $seniorRecord->id,
            'resident_id' => $seniorResident->id,
            'falls_risk_score' => 3,
            'cognitive_assessment' => 'Normal',
        ]);

        // NCD
        $ncdRecord = PatientRecord::create([
            'resident_id' => $ncdResident->id,
            'patient_type' => 'ncd',
            'created_by_user_id' => $midwife->id,
            'status' => 'active',
        ]);
        NcdRecord::create([
            'patient_record_id' => $ncdRecord->id,
            'resident_id' => $ncdResident->id,
            'ncd_classification' => 'Hypertension',
            'diagnosis_date' => now()->subYear(),
            'current_status' => 'stable',
        ]);

        // Checkups for each type
        $pregnancyCheckup = CheckupRecord::create([
            'patient_record_id' => $pregnantRecord->id,
            'resident_id' => $pregnantResident->id,
            'performed_by_user_id' => $midwife->id,
            'checkup_type' => 'pregnancy',
            'checkup_date' => now()->subDays(7),
            'assessment' => 'Normal pregnancy',
            'status' => 'completed',
        ]);
        PregnancyCheckup::create([
            'checkup_record_id' => $pregnancyCheckup->id,
            'maternal_vitals' => ['blood_pressure' => '120/80'],
            'fetal_heart_rate' => 140,
            'fundal_height' => 20,
        ]);

        $childCheckup = CheckupRecord::create([
            'patient_record_id' => $childRecord->id,
            'resident_id' => $childResident->id,
            'performed_by_user_id' => $midwife->id,
            'checkup_type' => 'child',
            'checkup_date' => now()->subDays(5),
            'assessment' => 'Healthy child',
            'status' => 'completed',
        ]);
        ChildCheckup::create([
            'checkup_record_id' => $childCheckup->id,
            'weight' => 25.5,
            'height' => 120,
            'muac' => 15.5,
            'nutritional_status' => 'Normal',
            'vaccines_given' => [['name' => 'MMR', 'date' => now()->toDateString()]],
        ]);

        $lactatingCheckup = CheckupRecord::create([
            'patient_record_id' => $lactatingRecord->id,
            'resident_id' => $lactatingResident->id,
            'performed_by_user_id' => $midwife->id,
            'checkup_type' => 'lactating',
            'checkup_date' => now()->subDays(4),
            'assessment' => 'Normal lactation',
            'status' => 'completed',
        ]);
        LactatingCheckup::create([
            'checkup_record_id' => $lactatingCheckup->id,
            'feeding_method' => 'exclusive',
            'infant_weight' => 5.5,
        ]);

        $seniorCheckup = CheckupRecord::create([
            'patient_record_id' => $seniorRecord->id,
            'resident_id' => $seniorResident->id,
            'performed_by_user_id' => $midwife->id,
            'checkup_type' => 'senior',
            'checkup_date' => now()->subDays(3),
            'assessment' => 'Stable',
            'status' => 'completed',
        ]);
        SeniorCheckup::create([
            'checkup_record_id' => $seniorCheckup->id,
            'vitals' => ['blood_pressure' => '130/85'],
            'blood_sugar' => 5.4,
        ]);

        $ncdCheckup = CheckupRecord::create([
            'patient_record_id' => $ncdRecord->id,
            'resident_id' => $ncdResident->id,
            'performed_by_user_id' => $midwife->id,
            'checkup_type' => 'ncd',
            'checkup_date' => now()->subDays(2),
            'assessment' => 'BP controlled',
            'status' => 'completed',
        ]);
        NcdCheckup::create([
            'checkup_record_id' => $ncdCheckup->id,
            'vitals' => ['blood_pressure' => '120/80'],
            'lab_results' => ['fbs' => 5.6],
        ]);

        $this->command->info('✅ Patient records + checkups seeded');

        // ============================================
        // 15. CERTIFICATIONS
        // ============================================
        $certTypeIds = CertificationType::pluck('id')->toArray();
        $requestedBy = $userMap['Front Desk Clerk'];
        $processedBy = $userMap['Barangay Secretary'];

        $certData = [
            ['resident' => $allResidents[0],  'type_idx' => 0, 'status' => 'Pending',  'purpose' => 'Employment'],
            ['resident' => $allResidents[1],  'type_idx' => 3, 'status' => 'Approved', 'purpose' => 'School'],
            ['resident' => $allResidents[2],  'type_idx' => 0, 'status' => 'Released', 'purpose' => 'Travel'],
            ['resident' => $allResidents[20], 'type_idx' => 1, 'status' => 'Pending',  'purpose' => 'Financial Assistance'],
            ['resident' => $allResidents[21], 'type_idx' => 2, 'status' => 'Approved', 'purpose' => 'Employment'],
        ];

        $certIndex = 1;
        foreach ($certData as $c) {
            $requester = CertificateRequester::firstOrCreate(
                ['resident_id' => $c['resident']->id],
                ['photo_id' => null]
            );

            $ref = 'CERT-2026-' . str_pad($certIndex, 4, '0', STR_PAD_LEFT);
            $createdAt = now()->subDays(20);
            $approvedAt = in_array($c['status'], ['Approved', 'Released'])
                ? (clone $createdAt)->addDays(2) : null;
            $releasedAt = $c['status'] === 'Released'
                ? (clone $createdAt)->addDays(4) : null;
            $receivedAt = $c['status'] === 'Released'
                ? (clone $createdAt)->addDays(6) : null;

            Certification::create([
                'requester_id' => $requester->id,
                'certification_type_id' => $certTypeIds[$c['type_idx']],
                'requested_by_user_id' => $requestedBy->id,
                'processed_by_user_id' => in_array($c['status'], ['Approved', 'Released']) ? $processedBy->id : null,
                'reference_number' => $ref,
                'purpose' => $c['purpose'],
                'details' => 'Standard request',
                'status' => $c['status'],
                'approved_at' => $approvedAt,
                'released_at' => $releasedAt,
                'received_at' => $receivedAt,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $certIndex++;
        }
        $this->command->info('✅ Certifications seeded (' . count($certData) . ')');

        // ============================================
        // 16. CLEARANCES
        // ============================================
        $clearances = [
            ['resident' => $allResidents[0],  'status' => 'pending'],
            ['resident' => $allResidents[3],  'status' => 'approved'],
            ['resident' => $allResidents[6],  'status' => 'released'],
            ['resident' => $allResidents[22], 'status' => 'pending'],
            ['resident' => $allResidents[23], 'status' => 'approved'],
        ];
        foreach ($clearances as $i => $c) {
            $createdAt = now()->subDays(15);
            Clearance::create([
                'resident_id' => $c['resident']->id,
                'processed_by_user_id' => $processedBy->id,
                'reference_number' => 'CLR-2026-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'purpose' => 'Employment',
                'amount' => 50.00,
                'status' => $c['status'],
                'approved_at' => in_array($c['status'], ['approved', 'released']) ? (clone $createdAt)->addDays(2) : null,
                'released_at' => $c['status'] === 'released' ? (clone $createdAt)->addDays(4) : null,
                'valid_until' => now()->addYear(),
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }
        $this->command->info('✅ Clearances seeded (' . count($clearances) . ')');

        // ============================================
        // 17. PAYMENTS
        // ============================================
        $treasurer = $userMap['Barangay Treasurer'];
        $paymentTypes = ['Barangay Clearance', 'Certificate of Residency', 'Business Clearance'];

        for ($i = 0; $i < 12; $i++) {
            $paidAt = now()->subDays(rand(1, 20));
            Payment::create([
                'resident_id' => $allResidents[$i % 45]->id,
                'processed_by_user_id' => $treasurer->id,
                'or_number' => 'OR-' . $paidAt->format('Ymd') . '-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'amount' => 50.00,
                'payment_type' => $paymentTypes[$i % 3],
                'payment_method' => $i % 2 === 0 ? 'Cash' : 'GCash',
                'description' => 'Payment for ' . $paymentTypes[$i % 3],
                'status' => 'completed',
                'paid_at' => $paidAt,
                'created_at' => $paidAt,
                'updated_at' => $paidAt,
            ]);
        }
        $this->command->info('✅ Payments seeded (12)');

        // ============================================
        // 18. TAX PAYMENTS
        // ============================================
        $taxTypes = ['Cedula', 'Real Property Tax', 'Business Tax'];
        for ($i = 0; $i < 8; $i++) {
            $paidAt = now()->subDays(rand(1, 20));
            TaxPayment::create([
                'resident_id' => $allResidents[$i]->id,
                'processed_by_user_id' => $treasurer->id,
                'receipt_number' => 'TAX-2026-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'taxpayer_name' => $allResidents[$i]->first_name . ' ' . $allResidents[$i]->last_name,
                'tax_type' => $taxTypes[$i % 3],
                'amount' => rand(100, 500),
                'payment_method' => 'Cash',
                'status' => 'paid',
                'paid_at' => $paidAt,
                'created_at' => $paidAt,
                'updated_at' => $paidAt,
            ]);
        }
        $this->command->info('✅ Tax payments seeded (8)');

        // ============================================
        // 19. PENALTIES
        // ============================================
        Penalty::create([
            'resident_id' => $allResidents[3]->id,
            'issued_by_user_id' => $processedBy->id,
            'reference_number' => 'PNL-2026-0001',
            'reason' => 'Late submission of documents',
            'amount' => 100,
            'status' => 'pending',
            'issued_at' => now()->subDays(10),
        ]);
        Penalty::create([
            'resident_id' => $allResidents[6]->id,
            'issued_by_user_id' => $processedBy->id,
            'reference_number' => 'PNL-2026-0002',
            'reason' => 'Violation of ordinance',
            'amount' => 150,
            'status' => 'paid',
            'issued_at' => now()->subDays(15),
            'paid_at' => now()->subDays(5),
        ]);
        Penalty::create([
            'resident_id' => $allResidents[30]->id,
            'issued_by_user_id' => $processedBy->id,
            'reference_number' => 'PNL-2026-0003',
            'reason' => 'Curfew violation',
            'amount' => 75,
            'status' => 'pending',
            'issued_at' => now()->subDays(3),
        ]);
        $this->command->info('✅ Penalties seeded (3)');

        // ============================================
        // 20. FINANCIAL REPORTS
        // ============================================
        $captain = $userMap['Barangay Captain'];
        FinancialReport::create([
            'title' => 'Monthly Collection Report - September 2026',
            'report_type' => 'collection',
            'period' => 'September 2026',
            'total_amount' => 25000,
            'notes' => 'Monthly collection summary',
            'status' => 'approved',
            'created_by_user_id' => $treasurer->id,
            'approved_by_user_id' => $captain->id,
            'submitted_at' => now()->subDays(10),
            'approved_at' => now()->subDays(8),
        ]);
        FinancialReport::create([
            'title' => 'Certificate Issuance Report',
            'report_type' => 'certificate',
            'period' => 'Q3 2026',
            'total_amount' => 5000,
            'notes' => 'Certificates issued in Q3',
            'status' => 'pending',
            'created_by_user_id' => $treasurer->id,
            'submitted_at' => now()->subDays(2),
        ]);
        $this->command->info('✅ Financial reports seeded (2)');

        // ============================================
        // 21. FRONT DESK REQUEST / QUEUE / APPOINTMENT / CLAIM SLIP
        // ============================================
        $frontDesk = $userMap['Front Desk Clerk'];

        $request = FrontDeskRequest::create([
            'resident_id' => $allResidents[0]->id,
            'service_type' => 'Barangay Clearance',
            'purpose' => 'Employment',
            'priority' => 'high',
            'reference_number' => 'REQ-202609-0001',
            'status' => 'processing',
            'created_by_user_id' => $frontDesk->id,
            'processed_by_user_id' => $frontDesk->id,
            'processed_at' => now()->subHours(2),
        ]);
        FrontDeskQueue::create([
            'resident_id' => $allResidents[0]->id,
            'request_id' => $request->id,
            'service_type' => 'Barangay Clearance',
            'position' => 1,
            'status' => 'serving',
            'joined_at' => now()->subHours(1),
            'called_at' => now()->subMinutes(30),
        ]);
        FrontDeskAppointment::create([
            'resident_id' => $allResidents[1]->id,
            'service_type' => 'Certificate of Residency',
            'appointment_date' => now()->addDays(2),
            'appointment_time' => '09:00',
            'reference_number' => 'APT-202609-0001',
            'status' => 'scheduled',
            'created_by_user_id' => $frontDesk->id,
        ]);

        $completedRequest = FrontDeskRequest::create([
            'resident_id' => $allResidents[2]->id,
            'service_type' => 'Certificate of Residency',
            'purpose' => 'School',
            'priority' => 'normal',
            'reference_number' => 'REQ-202609-0002',
            'status' => 'completed',
            'created_by_user_id' => $frontDesk->id,
            'processed_by_user_id' => $frontDesk->id,
            'processed_at' => now()->subDays(2),
            'issued_at' => now()->subDay(),
        ]);
        FrontDeskClaimSlip::create([
            'request_id' => $completedRequest->id,
            'resident_id' => $allResidents[2]->id,
            'reference_number' => 'CLM-202609-0001',
            'document_type' => 'Certificate of Residency',
            'status' => 'pending',
            'issued_by_user_id' => $frontDesk->id,
            'issued_at' => now()->subDay(),
        ]);
        $this->command->info('✅ Front desk requests/queue/appointments/claim slips seeded');

        // ============================================
        // 22. ANNOUNCEMENTS
        // ============================================
        Announcement::create([
            'created_by_user_id' => $captain->id,
            'title' => 'Barangay Assembly',
            'message' => 'Barangay assembly will be held on Saturday at 9:00 AM.',
            'target_group' => 'All',
            'priority' => 'high',
            'status' => 'Published',
            'expires_at' => now()->addDays(7),
        ]);
        Announcement::create([
            'created_by_user_id' => $captain->id,
            'title' => 'Health Mission',
            'message' => 'Free health checkup and vaccination.',
            'target_group' => 'All',
            'priority' => 'medium',
            'status' => 'Published',
            'expires_at' => now()->addDays(14),
        ]);
        $this->command->info('✅ Announcements seeded (2)');

        // ============================================
        // 23. NOTIFICATIONS
        // ============================================
        $allUsers = User::all();
        foreach (
            [
                ['title' => 'Welcome to Barangay Bagocboc', 'message' => 'Welcome to the system.', 'category' => 'general', 'priority' => 'high'],
                ['title' => 'Certificate Ready', 'message' => 'Your certificate is ready.', 'category' => 'certificate', 'priority' => 'normal'],
            ] as $n
        ) {
            $notification = Notification::create([
                'sender_user_id' => $captain->id,
                'title' => $n['title'],
                'message' => $n['message'],
                'category' => $n['category'],
                'priority' => $n['priority'],
            ]);
            foreach ($allUsers as $u) {
                NotificationRecipient::create([
                    'notification_id' => $notification->id,
                    'user_id' => $u->id,
                    'is_read' => false,
                ]);
            }
        }
        $this->command->info('✅ Notifications seeded (2)');

        // ============================================
        // 24. COMPLIANCE REQUIREMENTS
        // ============================================
        ComplianceRequirement::create([
            'resident_id' => $allResidents[0]->id,
            'zone_id' => $zoneList[0]->id,
            'name' => 'Barangay Clearance',
            'description' => 'Required for employment',
            'requirement' => 'Valid ID and proof of residency',
            'penalty' => 50,
            'status' => 'pending',
            'due_date' => now()->addDays(15),
            'is_active' => 'active',
        ]);
        ComplianceRequirement::create([
            'resident_id' => $allResidents[3]->id,
            'zone_id' => $zoneList[1]->id,
            'name' => 'Certificate of Residency',
            'description' => 'Required for school',
            'requirement' => 'Valid ID',
            'penalty' => 50,
            'status' => 'completed',
            'due_date' => now()->addDays(10),
            'completed_at' => now(),
            'is_active' => 'active',
        ]);
        $this->command->info('✅ Compliance requirements seeded (2)');

        // ============================================
        // 25. RESIDENT CONFIRMATIONS
        //
        // ✅ One per zone leader (9 total), each for a different resident.
        // ============================================
        foreach ($zoneLeaderUsers as $index => $zoneLeader) {
            // Rotate through residents so each zone leader confirms someone different
            $pickIndex = ($index * 4 + 2) % count($allResidents);
            $residentToConfirm = $allResidentsCollection[$pickIndex]
                ?? $allResidentsCollection->first();

            ResidentConfirmation::create([
                'resident_id' => $residentToConfirm->id,
                'requested_by_user_id' => $frontDesk->id,
                'zone_leader_id' => $zoneLeader->id,
                'status' => $index % 3 === 0 ? 'confirmed' : 'pending',
                'notes' => 'Verify residency for Zone ' . ($index + 1),
            ]);
        }
        $this->command->info('✅ Resident confirmations seeded (' . count($zoneLeaderUsers) . ')');

        // ============================================
        // 26. ACCOUNT ACTIVATION
        // ============================================
        AccountActivation::create([
            'resident_id' => $allResidents[4]->id,
            'reference_number' => '123 456 789 000',
            'id_type' => 'National ID',
            'status' => 'pending',
        ]);
        $this->command->info('✅ Account activation seeded (1)');

        // ============================================
        // 27. ZONE CHECK-INS
        //
        // ✅ One per zone leader (9 total), one per zone.
        // ============================================
        foreach ($zoneLeaderUsers as $index => $zoneLeader) {
            $zone = $zoneList[$index % 9];
            ZoneCheckIn::create([
                'zone_leader_id' => $zoneLeader->id,
                'zone_id' => $zone->id,
                'latitude' => $zone->latitude,
                'longitude' => $zone->longitude,
                'notes' => 'Routine check for ' . $zone->name,
                'status' => 'clear',
                'checked_in_at' => now()->subHours($index),
            ]);
        }
        $this->command->info('✅ Zone check-ins seeded (' . count($zoneLeaderUsers) . ')');

        // ============================================
        // FINAL SUMMARY
        // ============================================
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════');
        $this->command->info('🎉 ALL SEEDERS COMPLETED SUCCESSFULLY!');
        $this->command->info('═══════════════════════════════════════');
        $this->command->info('📊 DATA SUMMARY:');
        $this->command->info('   - Barangay Zones: ' . BarangayZone::count());
        $this->command->info('   - Roles: ' . Role::count());
        $this->command->info('   - Residents: ' . Resident::count());
        $this->command->info('   - Households: ' . Household::count());
        $this->command->info('   - Users: ' . User::count());
        $this->command->info('   - Certifications: ' . Certification::count());
        $this->command->info('   - Clearances: ' . Clearance::count());
        $this->command->info('   - Payments: ' . Payment::count());
        $this->command->info('   - Tax Payments: ' . TaxPayment::count());
        $this->command->info('   - Patient Records: ' . PatientRecord::count());
        $this->command->info('═══════════════════════════════════════');
        $this->command->info('');
        $this->command->info('🔑 LOGIN CREDENTIALS (password: password)');
        $this->command->info('   - Super Admin: superadmin@gmail.com');
        $this->command->info('   - Captain: captain@gmail.com');
        $this->command->info('   - Secretary: secretary@gmail.com');
        $this->command->info('   - Treasurer: treasurer@gmail.com');
        $this->command->info('   - Front Desk: frontdesk@gmail.com');
        $this->command->info('   - Midwife: midwife@gmail.com');
        $this->command->info('   - NDP: ndp@gmail.com');
        $this->command->info('   - BHW: bhw@gmail.com');
        $this->command->info('   - BNS: bns@gmail.com');
        for ($i = 1; $i <= 9; $i++) {
            $this->command->info("   - Zone Leader {$i}: zoneleader{$i}@gmail.com");
        }
        $this->command->info('   - Resident: resident@gmail.com');
        $this->command->info('═══════════════════════════════════════');
    }
}
