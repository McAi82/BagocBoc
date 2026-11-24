<?php
// database/seeders/DatabaseSeeder.php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Barangay Bagocboc (Opol, Misamis Oriental) demo data.
 *
 * Run on a fresh database:   php artisan migrate:fresh --seed
 *
 *  - 9 zones, 36 households (4 per zone), ~146 residents, ~34 user accounts
 *  - Every transaction points at real rows: certificates/clearances -> front desk request ->
 *    claim slip, payments -> OR number -> payable (certification / clearance / penalty),
 *    patient records -> checkups -> subtype tables, kids <-> mothers <-> households, etc.
 *  - Written with DB::table() inserts so it does not depend on $fillable / casts of your models.
 *  - Seeded with a fixed mt_srand() so every run produces the same people. All dates are
 *    relative to now(), so the data never goes stale.
 *
 * Columns intentionally left NULL (they would point at files / values that do not exist):
 *   profile_photo_path, id_front/back_path, certificate_requesters.photo_id, certification
 *   file_url / document_path / pdf_url / document_name / download_token, house_geotags.qr_code,
 *   barangay_infos.logo_url / seal_url, announcements.image_url / action_url, notifications.deep_link.
 */
class DatabaseSeeder extends Seeder
{
    private const M = 'App\\Models\\';

    private const MALE = [
        'Juan',
        'Pedro',
        'Jose',
        'Ramon',
        'Rogelio',
        'Ernesto',
        'Alfredo',
        'Eduardo',
        'Ricardo',
        'Antonio',
        'Fernando',
        'Manuel',
        'Rodrigo',
        'Danilo',
        'Romeo',
        'Rolando',
        'Renato',
        'Noel',
        'Arnel',
        'Jerome',
        'Jayson',
        'Kevin',
        'Joel',
        'Ronnie',
        'Allan',
        'Dennis',
        'Leonardo',
        'Nestor',
        'Virgilio',
        'Teodoro',
        'Bernardo',
        'Domingo',
        'Felipe',
        'Gilbert',
        'Harold',
        'Erwin',
        'Reynaldo',
        'Rodel',
        'Samuel',
        'Wilfredo'
    ];
    private const FEMALE = [
        'Maria',
        'Ana',
        'Rosa',
        'Lorna',
        'Gloria',
        'Teresita',
        'Mila',
        'Cristina',
        'Maricel',
        'Jocelyn',
        'Marites',
        'Rowena',
        'Analyn',
        'Evelyn',
        'Cherry',
        'Leah',
        'Joy',
        'Rhea',
        'Jenny',
        'Glenda',
        'Nenita',
        'Luzviminda',
        'Remedios',
        'Corazon',
        'Divina',
        'Elena',
        'Flordeliza',
        'Imelda',
        'Josefina',
        'Lourdes',
        'Marilou',
        'Norma',
        'Perla',
        'Rebecca',
        'Susan',
        'Vilma',
        'Cynthia',
        'Shiela',
        'Angelica',
        'Kristine'
    ];
    private const KID_M = [
        'Jaycee',
        'Rhey',
        'Kyle',
        'Lance',
        'Mark',
        'Justin',
        'Aaron',
        'Ethan',
        'Jhon Rey',
        'Prince',
        'Carl',
        'Nathan',
        'Miguel',
        'Gabriel',
        'Angelo',
        'Jerico',
        'Xander',
        'Zion',
        'Vince',
        'Caleb',
        'Joshua',
        'Dave',
        'Ryan',
        'Cedric'
    ];
    private const KID_F = [
        'Angel',
        'Bea',
        'Chloe',
        'Danica',
        'Eunice',
        'Faith',
        'Hannah',
        'Jasmine',
        'Kyla',
        'Lyka',
        'Mikaela',
        'Nicole',
        'Princess',
        'Queenie',
        'Shane',
        'Trisha',
        'Yna',
        'Zia',
        'Althea',
        'Mary Grace',
        'Stephanie',
        'Alyssa',
        'Jhoana',
        'Kaye'
    ];
    private const SURNAMES = [
        'Abella',
        'Acuña',
        'Alcantara',
        'Bacalso',
        'Bautista',
        'Cabahug',
        'Dagatan',
        'Echavez',
        'Fernandez',
        'Gonzales',
        'Esber',
        'Dela Cruz',
        'Garcia',
        'Mendoza',
        'Navarro',
        'Ocampo',
        'Pabillore',
        'Quiñones',
        'Ramos',
        'Reyes',
        'Salazar',
        'Santos',
        'Tabamo',
        'Tumulak',
        'Villanueva',
        'Aquino',
        'Rosales',
        'Domingo',
        'Mercado',
        'Cuevas',
        'Natividad',
        'Padilla',
        'Lagumbay',
        'Ybañez',
        'Torralba',
        'Banaag'
    ];
    private const STREETS = [
        'Sampaguita St.',
        'Rizal St.',
        'Mabini St.',
        'Bonifacio St.',
        'National Highway',
        'Narra St.',
        'Ilang-Ilang St.',
        'Mahogany Rd.',
        'Coastal Rd.',
        'Acacia St.'
    ];
    private const BIRTHPLACES = [
        'Opol, Misamis Oriental',
        'Opol, Misamis Oriental',
        'Opol, Misamis Oriental',
        'Opol, Misamis Oriental',
        'Cagayan de Oro City, Misamis Oriental',
        'Cagayan de Oro City, Misamis Oriental',
        'El Salvador City, Misamis Oriental',
        'Initao, Misamis Oriental',
        'Tagoloan, Misamis Oriental',
        'Gingoog City, Misamis Oriental',
        'Manolo Fortich, Bukidnon',
        'Butuan City, Agusan del Norte'
    ];
    private const MALE_JOBS = [
        ['Farmer', 6000, 11000],
        ['Fisherman', 5000, 10000],
        ['Tricycle Driver', 8000, 14000],
        ['Carpenter', 10000, 16000],
        ['Construction Worker', 9000, 14000],
        ['Security Guard', 12000, 15000],
        ['Sari-Sari Store Owner', 8000, 18000],
        ['Vendor', 6000, 12000],
        ['Mechanic', 10000, 16000],
        ['Plantation Worker', 9000, 13000],
        ['Barangay Tanod', 3000, 5000]
    ];
    private const FEMALE_JOBS = [
        ['Housewife', 0, 0],
        ['Housewife', 0, 0],
        ['Housewife', 0, 0],
        ['Vendor', 6000, 12000],
        ['Sari-Sari Store Owner', 8000, 18000],
        ['Dressmaker', 6000, 10000],
        ['Public School Teacher', 28000, 36000],
        ['Cashier', 11000, 14000],
        ['Laundrywoman', 4000, 8000],
        ['Factory Worker', 12000, 16000]
    ];
    // Philippine EPI schedule (name, due age in months)
    private const EPI = [
        ['BCG', 0],
        ['Hepatitis B (birth dose)', 0],
        ['Pentavalent #1', 1.5],
        ['OPV #1', 1.5],
        ['PCV #1', 1.5],
        ['Pentavalent #2', 2.5],
        ['OPV #2', 2.5],
        ['PCV #2', 2.5],
        ['Pentavalent #3', 3.5],
        ['OPV #3', 3.5],
        ['IPV #1', 3.5],
        ['PCV #3', 3.5],
        ['IPV #2', 9],
        ['MMR #1', 9],
        ['MMR #2', 12],
        ['Td/MR (Grade 1)', 72]
    ];
    private const MILESTONES = [
        [1, 'Responds to sound'],
        [2, 'Social smile'],
        [3, 'Holds head steady'],
        [4, 'Follows objects, coos'],
        [6, 'Rolls over, sits with support'],
        [9, 'Sits without support, babbles'],
        [12, 'Pulls to stand, says first words'],
        [18, 'Walks independently, says several words'],
        [24, 'Runs, uses two-word phrases'],
        [36, 'Speaks in sentences, climbs stairs'],
        [48, 'Hops on one foot, draws a person'],
        [60, 'Counts to 10, dresses independently']
    ];

    private Carbon $now;
    private Carbon $goLive;
    private int $year;
    private string $pw;
    private array $roleIds = [];
    private array $zones = [];
    private array $R = [];            // residents by id
    private array $H = [];            // households by index
    private array $key = [];          // "h:Role" => resident id
    private array $over = [];         // name / job overrides for officials & staff
    private array $U = [];            // users by key
    private array $userByRes = [];    // resident id => user id
    private array $zl = [];           // zone idx => ['user' => id, 'name' => string]
    private array $acctRes = [];      // residents with a Resident account (activated)
    private array $usedEmails = [];
    private array $logs = [];
    private array $notifs = [];
    private array $payQueue = [];
    private array $seq = [];
    private array $kid = [];          // child id => measurement info
    private array $patients = [];     // resident id => [patient record ids]
    private array $programIds = [];
    private array $budgetNotes = [];
    private ?int $lastCertId = null;

    // ------------------------------------------------------------------ helpers
    private function r(int $a, int $b): int
    {
        return mt_rand($a, $b);
    }
    private function f(int $a, int $b): float
    {
        return mt_rand($a, $b) / 100;
    }
    private function pick(array $a)
    {
        return $a[mt_rand(0, count($a) - 1)];
    }
    private function chance(int $p): bool
    {
        return mt_rand(1, 100) <= $p;
    }
    private function j($v): string
    {
        return json_encode($v, JSON_UNESCAPED_UNICODE);
    }
    private function pad($n, int $l = 4): string
    {
        return str_pad((string) $n, $l, '0', STR_PAD_LEFT);
    }
    private function money(float $v): float
    {
        return round($v / 500) * 500;
    }
    private function nextSeq(string $k): int
    {
        return $this->seq[$k] = ($this->seq[$k] ?? 0) + 1;
    }

    private function dAgo(int $days): Carbon
    {
        if ($days <= 0) {
            return $this->now->copy()->subMinutes($this->r(5, 240));
        }
        return $this->now->copy()->subDays($days)->setTime($this->r(8, 16), $this->r(0, 59), $this->r(0, 59));
    }

    private function cap(Carbon $c): Carbon
    {
        return $c->gt($this->now) ? $this->now->copy()->subMinutes($this->r(1, 30)) : $c;
    }

    private function ins(string $table, array $row, bool $ts = true): int
    {
        if ($ts) {
            $row['created_at'] = $row['created_at'] ?? $this->now;
            $row['updated_at'] = $row['updated_at'] ?? $row['created_at'];
        }
        return (int) DB::table($table)->insertGetId($row);
    }

    private function full(int $id): string
    {
        $r = $this->R[$id];
        return trim($r['first'] . ' ' . $r['last'] . ($r['suffix'] ? ' ' . $r['suffix'] : ''));
    }

    private function log(?int $user, string $model, int $id, string $action, string $status, string $details, Carbon $at): void
    {
        if (!$user) {
            return;
        }
        $at = $this->cap($at);
        $this->logs[] = [
            'encoded_by' => $user,
            'record_id' => $id,
            'record_type' => self::M . $model,
            'action' => $action,
            'data_status' => $status,
            'details' => $details,
            'created_at' => $at,
            'updated_at' => $at
        ];
    }

    private function notify(
        ?int $sender,
        string $title,
        string $message,
        string $category,
        string $priority,
        ?string $refModel,
        ?int $refId,
        array $recipients,
        Carbon $at,
        int $readPct = 60
    ): void {
        $recipients = array_values(array_unique(array_filter($recipients)));
        if (!$recipients) {
            return;
        }
        $at = $this->cap($at);
        $this->notifs[] = compact('sender', 'title', 'message', 'category', 'priority', 'refModel', 'refId', 'recipients', 'at', 'readPct');
    }

    private function maiden(string $not): string
    {
        do {
            $s = $this->pick(self::SURNAMES);
        } while ($s === $not);
        return $s;
    }

    private function email(string $first, string $last): string
    {
        $slug = fn($s) => strtolower(preg_replace('/[^a-z]/i', '', Str::ascii($s)));
        $base = $slug($first) . '.' . $slug($last);
        $e = $base . '@gmail.com';
        $i = 1;
        while (isset($this->usedEmails[$e])) {
            $e = $base . (++$i) . '@gmail.com';
        }
        $this->usedEmails[$e] = true;
        return $e;
    }

    // ------------------------------------------------------------------ main
    public function run(): void
    {
        if (DB::table('residents')->exists()) {
            $this->command->warn('Database already contains data. Run: php artisan migrate:fresh --seed');
            return;
        }

        mt_srand(20261124);
        $this->now = now();
        $this->goLive = now()->subDays(120);
        $this->year = (int) $this->now->format('Y');
        $this->pw = Hash::make('password');

        DB::transaction(function () {
            $this->seedReference();
            $this->seedHouseholdsAndResidents();
            $this->seedStaffUsers();
            $this->seedAccounts();
            $this->seedCensus();
            $this->seedHealth();
            $this->seedCertifications();
            $this->seedClearances();
            $this->seedFrontDeskExtras();
            $this->seedComplianceAndPenalties();
            $this->seedStandalonePaymentsAndTax();
            $this->flushPayments();
            $this->seedAnnouncements();
            $this->seedZoneCheckIns();
            $this->seedSurveys();
            $this->seedFinancialReports();
            $this->flushLogsAndNotifications();
        });

        $this->summary();
    }

    // ------------------------------------------------------------------ 1. reference data
    private function seedReference(): void
    {
        $zones = [
            ['zone_number' => 1, 'name' => 'Zone 1 - Santo Niño', 'latitude' => 8.4198, 'longitude' => 124.5022],
            ['zone_number' => 2, 'name' => 'Zone 2 - Poblacion', 'latitude' => 8.4220, 'longitude' => 124.5040],
            ['zone_number' => 3, 'name' => 'Zone 3 - Bayugbayogan', 'latitude' => 8.4170, 'longitude' => 124.5000],
            ['zone_number' => 4, 'name' => 'Zone 4 - Inayao', 'latitude' => 8.4200, 'longitude' => 124.5060],
            ['zone_number' => 5, 'name' => 'Zone 5 - Masayon', 'latitude' => 8.4240, 'longitude' => 124.5010],
            ['zone_number' => 6, 'name' => 'Zone 6 - Nakulian', 'latitude' => 8.4160, 'longitude' => 124.5080],
            ['zone_number' => 7, 'name' => 'Zone 7 - Kala Kala', 'latitude' => 8.4150, 'longitude' => 124.5030],
            ['zone_number' => 8, 'name' => 'Zone 8 - Siot', 'latitude' => 8.4180, 'longitude' => 124.5070],
            ['zone_number' => 9, 'name' => 'Zone 9 - Tingkulan', 'latitude' => 8.4250, 'longitude' => 124.5050],
        ];
        foreach ($zones as $i => $z) {
            $id = $this->ins('barangay_zones', $z + ['created_at' => $this->goLive]);
            $this->zones[$i] = $z + ['id' => $id];
        }

        $roles = [
            ['Super Admin', 'Full system access'],
            ['Barangay Captain', 'Barangay Captain'],
            ['Barangay Secretary', 'Barangay Secretary'],
            ['Barangay Treasurer', 'Barangay Treasurer'],
            ['Front Desk Clerk', 'Front Desk Clerk'],
            ['Midwife', 'Midwife Nurse'],
            ['Nurse Deployment Program', 'Nurse Deployment Program (shares access with Midwife)'],
            ['Barangay Health Worker', 'Barangay Health Worker'],
            ['Barangay Nutrition Scholar', 'Barangay Nutrition Scholar'],
            ['Zone Leader', 'Zone Leader'],
            ['Resident', 'Resident'],
        ];
        foreach ($roles as [$n, $d]) {
            $this->roleIds[$n] = $this->ins('roles', ['name' => $n, 'description' => $d], false);
        }

        $this->ins('barangay_infos', [
            'name' => 'Bagocboc',
            'captain_name' => 'Marcos P. Gonzales',
            'municipality' => 'Opol',
            'province' => 'Misamis Oriental',
            'phone' => '+63 912 345 6789',
            'email' => 'bagocboc.opol@example.com',
            'address' => 'Zone 1, Barangay Bagocboc, Opol, Misamis Oriental',
            'barangay_secretary' => 'Concordio A. Esber',
            'barangay_treasurer' => 'Juan D. Dela Cruz',
            'about_us' => 'Barangay Bagocboc is a coastal barangay in the Municipality of Opol, Misamis Oriental, composed of nine zones. '
                . 'The barangay government delivers frontline services including certification, health, nutrition and peace-and-order programs.',
            'mission' => 'To deliver fast, transparent and compassionate public service to every household of Bagocboc.',
            'vision' => 'A progressive, healthy, peaceful and disaster-resilient community.',
            'created_at' => $this->goLive,
        ]);

        $this->ins('clearance_configurations', [
            'default_fee' => 50.00,
            'punong_barangay_name' => 'Marcos P. Gonzales',
            'barangay_secretary_name' => 'Concordio A. Esber',
            'header_text' => 'Republic of the Philippines - Province of Misamis Oriental - Municipality of Opol - Barangay Bagocboc',
            'footer_text' => 'This clearance is valid for one year from the date of issuance. Not valid without the dry seal of the barangay.',
            'is_active' => true,
            'created_at' => $this->goLive,
        ]);

        foreach (['Vegetable Gardening', 'Poultry Raising', 'Fish Pond', 'Livestock Raising (Hogs/Goats)', 'Fruit-Bearing Trees'] as $n) {
            $this->ins('food_production_types', ['name' => $n], false);
        }

        foreach (
            [
                ['Certificate of Residency', 'Proof that the person is a bona fide resident of the barangay', 50],
                ['Certificate of Indigency', 'Proof that the person belongs to an indigent household', 0],
                ['Certificate of Good Moral', 'Certification of good moral character and standing in the community', 50],
                ['Barangay Clearance', 'Clearance for employment, business and other legal purposes', 50],
            ] as [$n, $d, $fee]
        ) {
            $this->ins('certification_types', ['name' => $n, 'description' => $d, 'fee' => $fee, 'is_active' => true, 'created_at' => $this->goLive]);
        }
        $this->command->info('✅ Reference data seeded');
    }

    // ------------------------------------------------------------------ 2. households + residents
    private function seedHouseholdsAndResidents(): void
    {
        $types = [
            'school',
            'teen',
            'multigen',
            'school',
            'multigen',
            'teen',
            'school',
            'teen',
            'multigen',   // 0-8  zone leaders
            'teen',
            'school',
            'multigen',                                                                  // 9-11 captain / secretary / treasurer
            'young_infant',
            'expecting',
            'elderly_couple',
            'single_mother',
            'young_infant',
            'elderly_single', // 12-17
            'expecting',
            'young_infant',
            'school',
            'elderly_couple',
            'single_mother',
            'multigen',            // 18-23
            'school',
            'expecting',
            'elderly_single',
            'young_infant',
            'teen',
            'elderly_couple',               // 24-29
            'single_mother',
            'expecting',
            'school',
            'young_infant',
            'multigen',
            'teen'
        ];                     // 30-35

        $this->over = [
            '9:Head' => ['first' => 'Marcos', 'middle' => 'Pacatang', 'email' => 'captain@gmail.com', 'occupation' => 'Punong Barangay', 'income' => 25000],
            '10:Head' => ['first' => 'Concordio', 'middle' => 'Abella', 'email' => 'secretary@gmail.com', 'occupation' => 'Barangay Secretary', 'income' => 18000],
            '11:Head' => ['first' => 'Juan', 'middle' => 'Dagatan', 'email' => 'treasurer@gmail.com', 'occupation' => 'Barangay Treasurer', 'income' => 15000],
            '4:Spouse' => ['email' => 'frontdesk@gmail.com', 'occupation' => 'Barangay Hall Staff (Front Desk)', 'income' => 12000],
            '3:Spouse' => ['email' => 'midwife@gmail.com', 'occupation' => 'Rural Health Midwife', 'income' => 24000, 'edu' => 'College Graduate'],
            '6:Spouse' => ['email' => 'ndp@gmail.com', 'occupation' => 'Registered Nurse (NDP)', 'income' => 22000, 'edu' => 'College Graduate'],
            '0:Spouse' => ['email' => 'bhw@gmail.com', 'occupation' => 'Barangay Health Worker', 'income' => 3500],
            '1:Spouse' => ['email' => 'bns@gmail.com', 'occupation' => 'Barangay Nutrition Scholar', 'income' => 3500],
            '20:Spouse' => ['email' => 'resident@gmail.com'],
        ];
        for ($z = 0; $z < 9; $z++) {
            $this->over["$z:Head"] = ($this->over["$z:Head"] ?? []) + ['email' => 'zoneleader' . ($z + 1) . '@gmail.com'];
        }
        foreach ($this->over as $o) {
            if (isset($o['email'])) {
                $this->usedEmails[$o['email']] = true;
            }
        }

        foreach ($types as $h => $type) {
            $sur = self::SURNAMES[$h];
            $zoneIdx = $h % 9;
            $zone = $this->zones[$zoneIdx];
            $created = $this->goLive->copy()->addDays($this->r(1, 25))->setTime($this->r(8, 16), $this->r(0, 59));
            $street = 'Purok ' . $this->r(1, 7) . ', ' . $this->pick(self::STREETS);

            $addr = $this->ins('household_addresses', ['zone' => $zone['id'], 'street' => $street, 'created_at' => $created]);
            $hhId = $this->ins('households', [
                'address_id' => $addr,
                'household_tracking_number' => 'TRK-' . $this->year . '-' . $this->pad($h + 1),
                'household_number' => 'BB-' . $this->pad($h + 1, 3),
                'status' => 'active',
                'created_at' => $created,
            ]);
            $this->H[$h] = [
                'id' => $hhId,
                'zone' => $zoneIdx,
                'type' => $type,
                'sur' => $sur,
                'street' => $street,
                'created' => $created,
                'members' => [],
                'number' => 'BB-' . $this->pad($h + 1, 3)
            ];

            foreach ($this->members($h, $type, $sur) as $p) {
                $id = $this->addResident($h, $p, $created, $hhId);
                $this->H[$h]['members'][] = $id;
                $this->key["$h:{$p['role']}"] = $id;
            }

            $this->ins('house_geotags', [
                'household_id' => $hhId,
                'latitude' => round($zone['latitude'] + $this->r(-15, 15) / 10000, 8),
                'longitude' => round($zone['longitude'] + $this->r(-15, 15) / 10000, 8),
                'captured_at' => $created->copy()->addDays($this->r(1, 6)),
                'qr_data' => $this->j([
                    'household_number' => 'BB-' . $this->pad($h + 1, 3),
                    'tracking_number' => 'TRK-' . $this->year . '-' . $this->pad($h + 1),
                    'zone' => $zone['zone_number'],
                    'barangay' => 'Bagocboc'
                ]),
                'qr_generated_at' => $created->copy()->addDays($this->r(1, 6)),
                'created_at' => $created,
            ]);
        }

        // residents who moved out of their parents' household when they married (history rows)
        foreach ([[16, 20], [19, 24], [33, 32]] as [$h, $oldH]) {
            $rid = $this->key["$h:Spouse"];
            DB::table('resident_households')->insert([
                'resident_id' => $rid,
                'household_id' => $this->H[$oldH]['id'],
                'relationship_to_household' => 'Child',
                'is_primary' => false,
                'start_date' => $this->R[$rid]['birth']->toDateString(),
                'end_date' => $this->now->copy()->subYears($this->r(1, 3))->toDateString(),
                'status' => 'moveout',
                'created_at' => $this->H[$oldH]['created'],
                'updated_at' => $this->H[$oldH]['created'],
            ]);
        }
        $this->command->info('✅ Households (' . count($this->H) . ') and residents (' . count($this->R) . ') seeded');
    }

    private function members(int $h, string $type, string $sur): array
    {
        $sm = $this->maiden($sur); // mother's maiden surname -> used as the kids' middle name
        $P = fn(string $role, string $g, ?int $age, array $o = []) => $o + ['role' => $role, 'g' => $g, 'age' => $age];
        $kid = fn(int $age, array $o = []) => $P('Child', $this->chance(50) ? 'Male' : 'Female', $age, $o + ['civil' => 'Single', 'middle' => $sm, 'last' => $sur]);
        $headM = fn(int $age, array $o = []) => $P('Head', 'Male', $age, $o + ['civil' => 'Married', 'middle' => $this->maiden($sur), 'last' => $sur]);
        $wife = fn(int $age, array $o = []) => $P('Spouse', 'Female', $age, $o + ['civil' => 'Married', 'middle' => $this->maiden($sur), 'last' => $sur]);

        switch ($type) {
            case 'young_infant':
                $ha = $this->r(24, 33);
                $m = [$headM($ha), $wife(max(21, $ha - $this->r(0, 3))), $kid(0, ['days' => $this->r(30, 160)])];
                if (in_array($h, [16, 27], true)) {
                    $m[] = $kid($this->r(2, 3));
                }
                break;
            case 'expecting':
                $ha = $this->r(27, 38);
                $m = [$headM($ha), $wife(max(24, $ha - $this->r(1, 4))), $kid($this->r(2, 5))];
                break;
            case 'school':
                $m = [$headM($this->r(36, 48)), $wife($this->r(34, 46)), $kid($this->r(7, 12)), $kid($this->r(9, 16))];
                break;
            case 'teen':
                $m = [$headM($this->r(42, 54)), $wife($this->r(40, 52)), $kid($this->r(13, 19)), $kid($this->r(12, 17))];
                $third = [1 => 'pending', 7 => 'pending', 28 => 'inactive'];
                if (isset($third[$h])) {
                    $m[] = $kid($this->r(18, 20), ['status' => $third[$h], 'student' => $h !== 7]);
                }
                break;
            case 'multigen':
                $ha = $this->r(38, 50);
                $m = [
                    $headM($ha),
                    $wife($this->r(36, 48)),
                    $kid($this->r(5, 14)),
                    $kid($this->r(8, 17)),
                    $P('Parent', 'Female', $ha + $this->r(22, 30), ['civil' => 'Widow', 'last' => $sur, 'middle' => $this->maiden($sur)])
                ];
                break;
            case 'elderly_couple':
                $ha = $this->r(63, 78);
                $m = [$headM($ha), $wife(max(60, $ha - $this->r(0, 5))), $kid($this->r(26, 36), ['student' => false])];
                break;
            case 'single_mother':
                $k1 = $this->r(8, 16);
                $k2 = $this->r(10, 17);
                $ha = max($this->r(36, 54), max($k1, $k2) + 20);
                $mm = $this->maiden($sur);
                $m = [
                    $P('Head', 'Female', $ha, ['civil' => $h === 30 ? 'Legally Separated' : 'Widow', 'middle' => $this->maiden($sur), 'last' => $sur]),
                    $kid($k1, ['middle' => $mm]),
                    $kid($k2, ['middle' => $mm])
                ];
                if ($h === 15 || $h === 22) {
                    $m[] = $P('Spouse', 'Male', $ha + $this->r(1, 4), [
                        'civil' => 'Married',
                        'middle' => $this->maiden($sur),
                        'last' => $sur,
                        'vital' => $h === 15 ? 'deceased' : 'decedent'
                    ]);
                }
                break;
            case 'elderly_single':
            default:
                $ha = $this->r(68, 82);
                $m = [
                    $P('Head', 'Female', $ha, ['civil' => 'Widow', 'middle' => $this->maiden($sur), 'last' => $sur]),
                    $P('Child', 'Female', $this->r(40, 50), ['civil' => 'Single', 'middle' => $this->maiden($sur), 'last' => $sur, 'student' => false]),
                    $P('Relative', $this->chance(50) ? 'Male' : 'Female', $this->r(9, 15), ['civil' => 'Single', 'middle' => $this->maiden($sur), 'last' => $this->maiden($sur)]),
                    $P('Spouse', 'Male', $ha + $this->r(1, 5), [
                        'civil' => 'Married',
                        'middle' => $this->maiden($sur),
                        'last' => $sur,
                        'vital' => $h === 17 ? 'decedent' : 'deceased'
                    ])
                ];
                break;
        }

        $taken = [];
        foreach ($m as &$p) {
            if (isset($this->over["$h:{$p['role']}"])) {
                $p = $this->over["$h:{$p['role']}"] + $p;
            }
            if (!isset($p['first'])) {
                $young = isset($p['days']) || ($p['age'] ?? 99) < 18;
                $pool = $young ? ($p['g'] === 'Male' ? self::KID_M : self::KID_F) : ($p['g'] === 'Male' ? self::MALE : self::FEMALE);
                do {
                    $p['first'] = $this->pick($pool);
                } while (isset($taken[$p['first']]));
            }
            $taken[$p['first']] = true;
        }
        unset($p);

        // some sons are named after their father (Jr.)
        if ($m[0]['g'] === 'Male' && $m[0]['role'] === 'Head') {
            foreach ($m as &$p) {
                if ($p['role'] === 'Child' && $p['g'] === 'Male' && !isset($p['status']) && $this->chance(30)) {
                    $p['first'] = $m[0]['first'];
                    $p['suffix'] = 'Jr.';
                    break;
                }
            }
            unset($p);
        }
        return $m;
    }

    private function job(string $g, int $age, bool $student, string $vital): array
    {
        if ($vital !== 'alive') {
            return ['Retired', 0];
        }
        if ($age < 5) {
            return ['None', 0];
        }
        if ($age < 18 || $student) {
            return ['Student', 0];
        }
        if ($age >= 65) {
            return ['Retired', $this->pick([500, 2500, 3500, 5000])];
        }
        if ($age <= 24 && $this->chance(30)) {
            return ['Unemployed', 0];
        }
        [$o, $lo, $hi] = $this->pick($g === 'Male' ? self::MALE_JOBS : self::FEMALE_JOBS);
        return [$o, $hi ? $this->money($this->r($lo, $hi)) : 0];
    }

    private function education(int $age, bool $student, bool $senior): string
    {
        if ($age < 4) return 'None';
        if ($age < 6) return 'Kindergarten';
        if ($age < 12) return 'Elementary';
        if ($age < 16) return 'Junior High School';
        if ($age < 18) return 'Senior High School';
        if ($age < 25) return $student ? 'College Level' : 'High School Graduate';
        if ($senior) return $this->pick(['Elementary Graduate', 'Elementary Level', 'High School Level', 'High School Graduate']);
        return $this->pick(['High School Graduate', 'Senior High School Graduate', 'College Level', 'College Graduate', 'Vocational Graduate', 'Elementary Graduate']);
    }

    private function addResident(int $h, array $p, Carbon $hhCreated, int $hhId): int
    {
        if (isset($p['days'])) {
            $birth = $this->now->copy()->subDays($p['days']);
            $age = 0;
        } else {
            $age = (int) $p['age'];
            $birth = $this->now->copy()->subYears($age)->subDays($this->r(0, 300));
        }
        $vital = $p['vital'] ?? 'alive';
        $status = $p['status'] ?? ($vital === 'alive' ? 'active' : 'inactive');
        $student = $p['student'] ?? (($age >= 5 && $age <= 17) ? true : (($age >= 18 && $age <= 24 && $p['role'] === 'Child') ? $this->chance(45) : false));
        [$occ, $inc] = isset($p['occupation']) ? [$p['occupation'], $p['income']] : $this->job($p['g'], $age, $student, $vital);
        $edu = $p['edu'] ?? $this->education($age, $student, $age >= 60);

        $created = $hhCreated->copy()->addHours($this->r(1, 60));
        if ($status === 'pending') $created = $this->dAgo($this->r(2, 9));
        if ($status === 'inactive' && $vital === 'alive') $created = $this->dAgo(16);

        if ($age >= 18 && $vital === 'alive' && $status === 'active') {
            $voter = $this->chance(3) ? 'Registered_Outside' : (($age <= 19 && $this->chance(40)) ? 'Not Registered' : 'Registered Local');
        } else {
            $voter = 'Not Registered';
        }

        $email = $p['email'] ?? ($age >= 15 ? $this->email($p['first'], $p['last']) : null);
        $id = $this->ins('residents', [
            'first_name' => $p['first'],
            'middle_name' => $p['middle'] ?? null,
            'last_name' => $p['last'],
            'suffix' => $p['suffix'] ?? null,
            'phone_number' => $age >= 15 ? '09' . $this->pick(['17', '18', '27', '39', '55', '66', '75', '95']) . sprintf('%07d', $this->r(0, 9999999)) : null,
            'email' => $email,
            'gender' => $p['g'],
            'citizenship' => 'Filipino',
            'birth_date' => $birth->toDateString(),
            'place_of_birth' => $age === 0 ? 'Opol, Misamis Oriental' : $this->pick(self::BIRTHPLACES),
            'civil_status' => $p['civil'] ?? 'Single',
            'voter_status' => $voter,
            'occupation' => $occ,
            'monthly_income' => $inc,
            'education_attainment' => $edu,
            'status' => $status,
            'vital_status' => $vital,
            'created_at' => $created,
        ]);

        if (in_array($p['role'], ['Head', 'Spouse'], true)) {
            $start = $this->now->copy()->subYears(min($age - 18, $this->r(3, 20)))->subDays($this->r(0, 200))->toDateString();
        } elseif ($p['role'] === 'Child') {
            $start = $birth->toDateString();
        } else {
            $start = $this->now->copy()->subYears($this->r(1, 8))->toDateString();
        }
        DB::table('resident_households')->insert([
            'resident_id' => $id,
            'household_id' => $hhId,
            'relationship_to_household' => $p['role'],
            'is_primary' => $p['role'] === 'Head',
            'start_date' => $start,
            'end_date' => null,
            'status' => 'active',
            'created_at' => $created,
            'updated_at' => $created,
        ]);

        $this->R[$id] = [
            'id' => $id,
            'h' => $h,
            'role' => $p['role'],
            'g' => $p['g'],
            'birth' => $birth,
            'age' => $age,
            'first' => $p['first'],
            'last' => $p['last'],
            'suffix' => $p['suffix'] ?? null,
            'vital' => $vital,
            'status' => $status,
            'student' => $student,
            'active' => $vital === 'alive' && $status === 'active',
            'income' => (float) $inc,
            'email' => $email,
            'created' => $created,
            'edu' => $edu
        ];
        return $id;
    }

    // ------------------------------------------------------------------ 3. users
    private function makeUser(string $key, string $email, string $role, ?int $resId, Carbon $created, array $extra = []): int
    {
        $id = $this->ins('users', $extra + [
            'resident_id' => $resId,
            'email' => $email,
            'password' => $this->pw,
            'account_status' => 'active',
            'is_first_login' => false,
            'last_login_at' => $this->dAgo($this->r(0, 3)),
            'phone_verified_at' => $created->copy()->addHours(2),
            'email_verified_at' => $created->copy()->addHours(1),
            'profile_photo_path' => null,
            'remember_token' => Str::random(10),
            'created_at' => $created,
        ]);
        DB::table('user_roles')->insert(['user_id' => $id, 'role_id' => $this->roleIds[$role]]);
        if ($resId && $role !== 'Resident') {
            DB::table('user_roles')->insert(['user_id' => $id, 'role_id' => $this->roleIds['Resident']]);
        }
        $this->U[$key] = $id;
        if ($resId) {
            $this->userByRes[$resId] = $id;
        }
        return $id;
    }

    private function seedStaffUsers(): void
    {
        $staff = [
            ['superadmin', 'superadmin@gmail.com', 'Super Admin', null],
            ['captain', 'captain@gmail.com', 'Barangay Captain', '9:Head'],
            ['secretary', 'secretary@gmail.com', 'Barangay Secretary', '10:Head'],
            ['treasurer', 'treasurer@gmail.com', 'Barangay Treasurer', '11:Head'],
            ['frontdesk', 'frontdesk@gmail.com', 'Front Desk Clerk', '4:Spouse'],
            ['midwife', 'midwife@gmail.com', 'Midwife', '3:Spouse'],
            ['ndp', 'ndp@gmail.com', 'Nurse Deployment Program', '6:Spouse'],
            ['bhw', 'bhw@gmail.com', 'Barangay Health Worker', '0:Spouse'],
            ['bns', 'bns@gmail.com', 'Barangay Nutrition Scholar', '1:Spouse'],
        ];
        foreach ($staff as [$k, $email, $role, $res]) {
            $this->makeUser($k, $email, $role, $res ? $this->key[$res] : null, $this->goLive->copy()->addHours($this->r(1, 20)));
        }
        for ($z = 0; $z < 9; $z++) {
            $rid = $this->key["$z:Head"];
            $uid = $this->makeUser('zl' . $z, 'zoneleader' . ($z + 1) . '@gmail.com', 'Zone Leader', $rid, $this->goLive->copy()->addDays(1)->addHours($z));
            $this->zl[$z] = ['user' => $uid, 'name' => $this->full($rid)];
        }
        $this->command->info('✅ Staff + zone leader users seeded (' . count($this->U) . ')');
    }

    private function zoneLeaderOf(int $resId): array
    {
        return $this->zl[$this->H[$this->R[$resId]['h']]['zone']];
    }

    // ------------------------------------------------------------------ 4. accounts, confirmations, activations, OTPs
    private function seedAccounts(): void
    {
        $fd = $this->U['frontdesk'];
        $sec = $this->U['secretary'];
        $otpHash = Hash::make('482913');
        $idTypes = ['National ID', "Driver's License", "Voter's ID", 'UMID', 'Postal ID', 'PRC ID', 'Senior Citizen ID'];
        $n = 0;

        // approved activations -> confirmed residency -> user account -> registration OTP
        $activated = ['20:Spouse', '12:Spouse', '13:Spouse', '16:Spouse', '18:Spouse', '19:Spouse', '25:Head', '14:Head', '21:Spouse', '24:Spouse', '32:Head', '33:Spouse', '34:Spouse'];
        foreach ($activated as $i => $k) {
            $rid = $this->key[$k];
            $r = $this->R[$rid];
            $zl = $this->zoneLeaderOf($rid);
            $actAt = $this->dAgo($this->r(10, 85));
            $confAt = $actAt->copy()->subDays(2);
            $first = $i >= count($activated) - 2;

            $this->ins('resident_confirmations', [
                'resident_id' => $rid,
                'requested_by_user_id' => $fd,
                'zone_leader_id' => $zl['user'],
                'status' => 'confirmed',
                'notes' => 'Residency verification for account activation (Zone ' . $this->zones[$this->H[$r['h']]['zone']]['zone_number'] . ').',
                'confirmed_at' => $confAt->copy()->addDay(),
                'created_at' => $confAt,
            ]);
            $this->ins('account_activations', [
                'resident_id' => $rid,
                'reference_number' => 'ACT-' . $this->year . '-' . $this->pad(++$n),
                'id_type' => $this->pick($idTypes),
                'status' => 'approved',
                'remarks' => 'ID checked against resident record; photo matches.',
                'approved_at' => $actAt->copy()->addDay(),
                'approved_by_user_id' => $sec,
                'created_at' => $actAt,
            ]);
            $userAt = $actAt->copy()->addDay()->addHours(2);
            $uid = $this->makeUser('res' . $rid, $r['email'], 'Resident', $rid, $userAt, $first
                ? ['is_first_login' => true, 'last_login_at' => null] : ['last_login_at' => $this->dAgo($this->r(0, 25))]);
            $this->acctRes[] = $rid;
            $this->ins('otps_codes', [
                'user_id' => $uid,
                'email' => $r['email'],
                'code_hash' => $otpHash,
                'purpose' => 'registration',
                'expires_at' => $userAt->copy()->addMinutes(10),
                'used_at' => $userAt->copy()->addMinutes(3),
                'attempts' => $this->r(0, 1),
                'sent_at' => $userAt,
                'created_at' => $userAt,
            ]);
            if (!$first) {
                $this->ins('otps_codes', [
                    'user_id' => $uid,
                    'email' => $r['email'],
                    'code_hash' => $otpHash,
                    'purpose' => 'is_first_login',
                    'expires_at' => $userAt->copy()->addDay()->addMinutes(10),
                    'used_at' => $userAt->copy()->addDay()->addMinutes(2),
                    'attempts' => 0,
                    'sent_at' => $userAt->copy()->addDay(),
                    'created_at' => $userAt->copy()->addDay(),
                ]);
            } else {
                $sent = $this->now->copy()->subMinutes(25);
                $this->ins('otps_codes', [
                    'user_id' => $uid,
                    'email' => $r['email'],
                    'code_hash' => $otpHash,
                    'purpose' => 'is_first_login',
                    'expires_at' => $sent->copy()->addMinutes(10),
                    'used_at' => null,
                    'attempts' => 0,
                    'sent_at' => $sent,
                    'created_at' => $sent
                ]);
            }
            $this->log($sec, 'AccountActivation', $rid, 'Approved Account Activation', 'Approved', "Approved account for {$this->full($rid)}", $actAt->copy()->addDay());
            $this->notify(
                $sec,
                'Account Activated',
                'Your resident account has been approved. You can now request certificates online.',
                'account',
                'normal',
                'AccountActivation',
                $rid,
                [$uid],
                $actAt->copy()->addDay(),
                100
            );
        }

        // pending activations: residency confirmed, ID awaiting the secretary
        foreach (['27:Spouse', '31:Spouse'] as $k) {
            $rid = $this->key[$k];
            $r = $this->R[$rid];
            $at = $this->dAgo($this->r(1, 4));
            $this->ins('resident_confirmations', [
                'resident_id' => $rid,
                'requested_by_user_id' => $fd,
                'zone_leader_id' => $this->zoneLeaderOf($rid)['user'],
                'status' => 'confirmed',
                'notes' => 'Residency verification for account activation.',
                'confirmed_at' => $at->copy()->subDay(),
                'created_at' => $at->copy()->subDays(2),
            ]);
            $this->ins('account_activations', [
                'resident_id' => $rid,
                'reference_number' => 'ACT-' . $this->year . '-' . $this->pad(++$n),
                'id_type' => $this->pick($idTypes),
                'status' => 'pending',
                'remarks' => 'Submitted online; awaiting ID verification.',
                'approved_at' => null,
                'approved_by_user_id' => null,
                'created_at' => $at,
            ]);
            $sent = $at->copy()->addMinutes(5);
            $this->ins('otps_codes', [
                'user_id' => null,
                'email' => $r['email'],
                'code_hash' => $otpHash,
                'purpose' => 'registration',
                'expires_at' => $sent->copy()->addMinutes(10),
                'used_at' => $sent->copy()->addMinutes(4),
                'attempts' => 1,
                'sent_at' => $sent,
                'created_at' => $sent
            ]);
        }

        // newly registered residents waiting for their zone leader (pending), and one rejected registration
        foreach ([[1, 'pending'], [7, 'pending'], [28, 'rejected']] as [$h, $st]) {
            $rid = $this->key["$h:Child"];
            $r = $this->R[$rid];
            $zl = $this->zoneLeaderOf($rid);
            $row = ['resident_id' => $rid, 'requested_by_user_id' => $fd, 'zone_leader_id' => $zl['user'], 'created_at' => $r['created']->copy()->addHours(3)];
            if ($st === 'pending') {
                $this->ins('resident_confirmations', $row + ['status' => 'pending', 'notes' => 'Newly registered (turned 18). Please confirm residency in Zone '
                    . $this->zones[$this->H[$h]['zone']]['zone_number'] . '.']);
                $this->notify(
                    $fd,
                    'Residency Confirmation Needed',
                    "Please confirm that {$this->full($rid)} resides in your zone.",
                    'confirmation',
                    'high',
                    'ResidentConfirmation',
                    $rid,
                    [$zl['user']],
                    $r['created']->copy()->addHours(3),
                    20
                );
            } else {
                $rej = $r['created']->copy()->addDays(2);
                $this->ins('resident_confirmations', $row + [
                    'status' => 'rejected',
                    'notes' => 'Registration submitted at the front desk.',
                    'rejected_at' => $rej,
                    'rejection_reason' => 'Zone leader could not verify that the applicant lives in the zone.'
                ]);
                $this->ins('account_activations', [
                    'resident_id' => $rid,
                    'reference_number' => 'ACT-' . $this->year . '-' . $this->pad(++$n),
                    'id_type' => 'Postal ID',
                    'status' => 'rejected',
                    'remarks' => 'Residency not confirmed by the zone leader. Please re-apply with proof of residence.',
                    'approved_at' => null,
                    'approved_by_user_id' => null,
                    'created_at' => $r['created']->copy()->addDay()
                ]);
            }
        }

        // a couple of password-related OTPs for staff
        foreach ([['secretary', 'password_reset'], ['midwife', 'change_password']] as [$u, $purpose]) {
            $sent = $this->dAgo($this->r(5, 40));
            $this->ins('otps_codes', [
                'user_id' => $this->U[$u],
                'email' => $u === 'secretary' ? 'secretary@gmail.com' : 'midwife@gmail.com',
                'code_hash' => $otpHash,
                'purpose' => $purpose,
                'expires_at' => $sent->copy()->addMinutes(10),
                'used_at' => $sent->copy()->addMinutes(2),
                'attempts' => 0,
                'sent_at' => $sent,
                'created_at' => $sent
            ]);
        }
        $this->command->info('✅ Accounts, confirmations, activations, OTPs seeded');
    }

    // ------------------------------------------------------------------ 5. census
    private function seedCensus(): void
    {
        $bhw = $this->U['bhw'];
        $foodIds = DB::table('food_production_types')->orderBy('id')->pluck('id')->all();
        $rent = [12, 16, 19, 33];

        foreach ($this->H as $h => &$H) {
            $members = array_map(fn($id) => $this->R[$id], $H['members']);
            $income = array_sum(array_map(fn($m) => $m['active'] ? $m['income'] : 0, $members));
            $H['income'] = $income;
            $at = $this->dAgo($this->r(35, 100));

            $censusId = $this->ins('household_census_records', [
                'household_id' => $H['id'],
                'census_year' => $this->year,
                'census_date' => $at->toDateString(),
                'monthly_income' => $income,
                'encoded_by' => $bhw,
                'data_status' => $h % 9 === 4 ? 'Saved' : 'Approved',
                'created_at' => $at,
            ]);

            $couple = isset($this->key["$h:Spouse"]) && $this->R[$this->key["$h:Spouse"]]['active'] && $this->R[$this->key["$h:Spouse"]]['age'] <= 49
                && $this->R[$this->key["$h:Head"]]['active'];
            $isy = $osy = 0;
            foreach ($members as $m) {
                if ($m['active'] && $m['age'] >= 6 && $m['age'] <= 24) {
                    $m['student'] ? $isy++ : $osy++;
                }
            }
            $tenure = in_array($h, $rent, true) ? 'Rent' : ($h === 22 ? 'Rent Free Without Consent' : ($h === 30 ? 'Informal Settler' : 'Owned'));
            $lo = $income < 12000;
            $hi = $income > 25000;
            $H['census'] = [
                'toilet' => $lo ? $this->pick(['Water-sealed (Shared)', 'Pit Latrine', 'Water-sealed (Own)']) : 'Water-sealed (Own)',
                'water' => $hi ? 'Piped (Level III)' : $this->pick(['Piped (Level III)', 'Deep Well', 'Shared Faucet (Level II)', 'Spring', 'Dug Well']),
                'garbage' => $this->pick(['Barangay Collection', 'Barangay Collection', 'Composting & Segregation', 'Burning', 'Burying']),
                'dwelling' => $lo ? $this->pick(['Light materials (Nipa/Bamboo)', 'Wood', 'Semi-concrete']) : ($hi ? $this->pick(['Semi-concrete', 'Concrete', 'Concrete'])
                    : $this->pick(['Wood', 'Semi-concrete', 'Concrete'])),
                'salt' => $this->chance(85) ? 'Yes' : ($this->chance(66) ? 'No' : 'Unknown'),
                'fp' => $couple && $this->chance(55),
                'tenure' => $tenure,
                'isy' => $isy,
                'osy' => $osy,
            ];
            $c = $H['census'];
            $this->ins('household_environments', [
                'household_census_id' => $censusId,
                'toilet_type' => $c['toilet'],
                'water_source' => $c['water'],
                'garbage_disposal' => $c['garbage'],
                'tenure_status' => $tenure,
                'couple_practices_family_planning' => $c['fp'],
                'uses_iodized_salt' => $c['salt'],
                'OSY_count' => $osy,
                'ISY_count' => $isy,
                'type_of_dwelling_unit' => $c['dwelling'],
            ], false);

            $take = $this->r(1, 3);
            $ids = $foodIds;
            shuffle($ids);
            foreach (array_slice($ids, 0, $take) as $fid) {
                DB::table('census_food_productions')->insert(['household_census_record_id' => $censusId, 'food_production_type_id' => $fid]);
            }

            $this->log($bhw, 'Household', $H['id'], 'Added Household', 'Approved', "Conducted census for Household #{$H['number']}", $H['created']->copy()->addDays(2));
            $this->log(
                $bhw,
                'HouseholdCensusRecord',
                $censusId,
                'Created Census',
                $h % 9 === 4 ? 'Saved' : 'Approved',
                "Census {$this->year} encoded for Household #{$H['number']}",
                $at
            );
            foreach ($H['members'] as $rid) {
                $r = $this->R[$rid];
                $this->log($bhw, 'Resident', $rid, 'Created Residents', 'Approved', "Registered a new resident: {$r['first']} {$r['last']}", $r['created']);
                if ($r['vital'] !== 'alive') {
                    $this->log($bhw, 'Resident', $rid, 'updated', 'Updated', "Vital status of {$r['first']} {$r['last']} set to {$r['vital']}", $r['created']->copy()->addDays(1));
                }
            }
        }
        unset($H);
        $this->command->info('✅ Census, environments, food production seeded');
    }

    // ------------------------------------------------------------------ 6. health
    private function ageYrs(Carbon $birth, Carbon $at): float
    {
        return max(0, ($at->getTimestamp() - $birth->getTimestamp()) / (365.25 * 86400));
    }

    private function ageMonths(Carbon $birth, Carbon $at): float
    {
        return $this->ageYrs($birth, $at) * 12;
    }

    private function median(float $a): array
    {
        if ($a < 1) {
            $h = 50 + 25 * $a;
            $w = 3.3 + 6.2 * $a;
        } elseif ($a < 2) {
            $h = 75 + 11 * ($a - 1);
            $w = 9.5 + 2.5 * ($a - 1);
        } elseif ($a < 5) {
            $h = 86 + 7.5 * ($a - 2);
            $w = 12 + 2 * ($a - 2);
        } elseif ($a < 12) {
            $h = 108.5 + 6 * ($a - 5);
            $w = 18 + 2.7 * ($a - 5);
        } else {
            $h = 150.5 + 4 * ($a - 12);
            $w = 37 + 4 * ($a - 12);
        }
        return [$w, $h];
    }

    private function growthProfile(): array
    {
        $x = $this->r(1, 100);
        if ($x <= 7) return ['w' => $this->f(70, 80), 'h' => $this->f(96, 100), 'u' => true];
        if ($x <= 13) return ['w' => $this->f(86, 94), 'h' => $this->f(88, 93), 'u' => false];
        if ($x <= 19) return ['w' => $this->f(122, 135), 'h' => $this->f(100, 104), 'u' => false];
        return ['w' => $this->f(93, 110), 'h' => $this->f(97, 103), 'u' => false];
    }

    /** Approximate WHO-style growth classification (demo accuracy, not a clinical tool). */
    private function measure(array $pf, Carbon $birth, Carbon $at, float $boost = 0): array
    {
        $a = $this->ageYrs($birth, $at);
        [$mw, $mh] = $this->median($a);
        $w = round($mw * ($pf['w'] + $boost), 2);
        $h = round($mh * $pf['h'], 1);
        $bmi = $w / (($h / 100) ** 2);
        $wfa = $w / $mw;
        $hfa = $h / $mh;
        $wfh = $bmi / ($mw / (($mh / 100) ** 2));
        $wfaS = $wfa < 0.75 ? 'Severely Underweight' : ($wfa < 0.85 ? 'Underweight' : ($wfa > 1.2 ? 'Overweight' : 'Normal'));
        $hfaS = $hfa < 0.90 ? 'Severely Stunted' : ($hfa < 0.94 ? 'Stunted' : 'Normal');
        $wfhS = $wfh < 0.80 ? 'Severely Wasted' : ($wfh < 0.88 ? 'Wasted' : ($wfh > 1.3 ? 'Obese' : ($wfh > 1.2 ? 'Overweight' : 'Normal')));
        $status = str_contains($wfaS, 'Underweight') ? 'Underweight' : ($wfaS === 'Overweight' ? 'Overweight' : 'Normal');
        if ($a < 5) {
            $muac = $wfhS === 'Severely Wasted' ? $this->f(1180, 1240) : ($wfhS === 'Wasted' ? $this->f(1250, 1340) : $this->f(1360, 1620));
        } else {
            $muac = round(16.5 + ($a - 5) * 0.5 + $this->r(-5, 10) / 10, 1);
        }
        if ($a < 1) $head = 35 + 11.5 * $a;
        elseif ($a < 3) $head = 46.5 + 2.2 * ($a - 1);
        else $head = 51 + min(3, 0.3 * ($a - 3));
        return [
            'a' => $a,
            'w' => $w,
            'h' => $h,
            'bmi' => round($bmi, 2),
            'wfa' => $wfaS,
            'hfa' => $hfaS,
            'wfh' => $wfhS,
            'status' => $status,
            'muac' => round($muac, 2),
            'head' => round($head + $this->r(-4, 4) / 10, 1)
        ];
    }

    private function vitals(bool $adult, bool $high = false, ?float $wt = null, ?float $ht = null, float $ageY = 30): array
    {
        $v = ['temperature_c' => round(36.2 + $this->r(0, 6) / 10, 1)];
        if ($adult) {
            $v['blood_pressure'] = $high ? $this->pick(['146/94', '152/96', '158/98', '164/100']) : $this->pick(['110/70', '118/76', '120/80', '124/82', '128/84']);
            $v['pulse_rate'] = $this->r(68, 92);
            $v['respiratory_rate'] = $this->r(16, 20);
        } else {
            $v['pulse_rate'] = $ageY < 1 ? $this->r(110, 140) : ($ageY < 5 ? $this->r(90, 115) : $this->r(75, 100));
            $v['respiratory_rate'] = $ageY < 1 ? $this->r(30, 40) : ($ageY < 5 ? $this->r(22, 30) : $this->r(18, 24));
        }
        if ($wt !== null) $v['weight_kg'] = $wt;
        if ($ht !== null) $v['height_cm'] = $ht;
        return $v;
    }

    private function emergencyContact(int $rid): string
    {
        $hh = $this->R[$rid]['h'];
        foreach ($this->H[$hh]['members'] as $id) {
            $m = $this->R[$id];
            if ($id !== $rid && $m['active'] && $m['age'] >= 18 && $m['email']) {
                $phone = DB::table('residents')->where('id', $id)->value('phone_number');
                return $this->full($id) . ' (' . ($m['role'] === 'Head' ? 'Household Head' : ($m['role'] === 'Spouse' ? 'Spouse' : 'Family member')) . ') - ' . $phone;
            }
        }
        return 'Barangay Health Worker - 0917 000 0000';
    }

    private function seedHealth(): void
    {
        $mid = $this->U['midwife'];
        $ndp = $this->U['ndp'];
        $bhw = $this->U['bhw'];
        $bns = $this->U['bns'];
        $cap = $this->U['captain'];
        $performers = [$mid, $ndp];

        // ---- programs created directly by staff
        $prog = fn(array $r) => $this->ins('programs', $r);
        $this->programIds['feeding'] = $prog([
            'programs' => 'Supplementary Feeding Program',
            'description' => 'Hot meals and monthly growth monitoring for children 6 months to 12 years old identified through Operation Timbang Plus.',
            'start_date' => $this->now->copy()->subMonths(3)->startOfMonth()->toDateString(),
            'end_date' => $this->now->copy()->addMonths(3)->endOfMonth()->toDateString(),
            'program_type' => 'nutrition',
            'status' => 'ongoing',
            'budget' => 85000,
            'target_beneficiaries' => 60,
            'location' => 'Barangay Hall Covered Court',
            'implementing_agency' => 'Barangay Nutrition Committee',
            'focal_person_id' => $bns,
            'created_at' => $this->goLive->copy()->addDays(10)
        ]);
        $this->programIds['maternal'] = $prog([
            'programs' => 'Maternal and Newborn Care Program',
            'description' => 'Prenatal and postnatal checkups, iron-folic acid supplementation, birth planning and breastfeeding support.',
            'start_date' => $this->goLive->toDateString(),
            'end_date' => $this->now->copy()->endOfYear()->toDateString(),
            'program_type' => 'maternal',
            'status' => 'ongoing',
            'budget' => 40000,
            'target_beneficiaries' => 12,
            'location' => 'Barangay Health Center',
            'implementing_agency' => 'Barangay Health Office',
            'focal_person_id' => $mid,
            'created_at' => $this->goLive->copy()->addDays(3)
        ]);
        $this->programIds['seniors'] = $prog([
            'programs' => 'Senior Citizens Wellness Program',
            'description' => 'Monthly blood pressure and blood sugar monitoring, maintenance medicine refills and falls prevention for seniors.',
            'start_date' => $this->now->copy()->subDays(45)->toDateString(),
            'end_date' => $this->now->copy()->addDays(135)->toDateString(),
            'program_type' => 'other',
            'status' => 'ongoing',
            'budget' => 25000,
            'target_beneficiaries' => 20,
            'location' => 'Barangay Health Center',
            'implementing_agency' => 'Barangay Health Office',
            'focal_person_id' => $this->U['ndp'],
            'created_at' => $this->now->copy()->subDays(50)
        ]);
        $this->programIds['drug'] = $prog([
            'programs' => 'Drug Abuse Prevention Awareness Drive',
            'description' => 'Youth and adult awareness sessions on illegal drugs, conducted with the Barangay Anti-Drug Abuse Council.',
            'start_date' => $this->now->copy()->subDays(110)->toDateString(),
            'end_date' => $this->now->copy()->subDays(50)->toDateString(),
            'program_type' => 'drug',
            'status' => 'completed',
            'budget' => 15000,
            'target_beneficiaries' => 30,
            'location' => 'Bagocboc Elementary School',
            'implementing_agency' => 'Barangay Anti-Drug Abuse Council (BADAC)',
            'focal_person_id' => $bhw,
            'created_at' => $this->now->copy()->subDays(114)
        ]);
        $this->programIds['adolescent'] = $prog([
            'programs' => 'Adolescent Health and Family Planning Seminar',
            'description' => 'Seminar series on reproductive health, responsible parenthood and family planning methods for couples and adolescents.',
            'start_date' => $this->now->copy()->subDays(70)->toDateString(),
            'end_date' => $this->now->copy()->addDays(20)->toDateString(),
            'program_type' => 'sexual_health',
            'status' => 'ongoing',
            'budget' => 20000,
            'target_beneficiaries' => 30,
            'location' => 'Barangay Health Center',
            'implementing_agency' => 'Municipal Health Office - Opol',
            'focal_person_id' => $mid,
            'created_at' => $this->now->copy()->subDays(75)
        ]);

        $enroll = function (string $prog, int $rid, Carbon $at, string $status, string $notes): int {
            return $this->ins('program_participants', [
                'program_id' => $this->programIds[$prog],
                'resident_id' => $rid,
                'enrolled_at' => $at,
                'status' => $status,
                'notes' => $notes,
                'created_at' => $at
            ]);
        };

        // ---- children 0-12: patient record, checkups, growth, OPT Plus, nutrition program
        $childTexts = [
            'Underweight' => [
                'Enrolled in supplementary feeding; counsel caregiver on energy-dense complementary foods; deworming and vitamin A given.',
                'Weight below expected for age. Monitor monthly.'
            ],
            'Overweight' => ['Counsel on limiting sugary drinks and snacks; encourage daily physical activity.', 'Weight above expected for age.'],
            'Normal' => ['Continue balanced diet; breastfeeding for infants; continue routine immunization.', 'Growth appropriate for age.'],
        ];
        foreach ($this->R as $rid => $r) {
            if (!$r['active'] || $r['age'] > 12) continue;
            $birth = $r['birth'];
            $L = $this->dAgo($this->r(5, 14));
            $pf = $this->growthProfile();
            $latest = $this->measure($pf, $birth, $L);
            $lbw = $this->chance(8);
            $info = [
                'bw' => $lbw ? $this->f(220, 249) : $this->f(250, 400),
                'bh' => $this->f(4700, 5300),
                'bhc' => $this->f(3200, 3650),
                'ga' => $lbw ? $this->r(34, 36) : $this->r(37, 41),
                'type' => $this->chance(82) ? 'Normal Spontaneous Delivery' : 'Cesarean Section',
            ];
            $info['comp'] = $lbw ? 'Low birth weight; monitored at the health center' : ($this->chance(85) ? 'None' : $this->pick(['Neonatal jaundice (phototherapy)', 'Mild respiratory distress, resolved']));
            $this->kid[$rid] = ['latest' => $latest, 'L' => $L, 'pf' => $pf, 'info' => $info];

            // checkup dates (oldest first)
            $first = $birth->copy()->addDays(7);
            $dates = [$L];
            if ($L->copy()->subDays(42)->gt($first)) $dates[] = $L->copy()->subDays(42);
            if ($r['age'] < 2 && $L->copy()->subDays(84)->gt($first)) $dates[] = $L->copy()->subDays(84);
            if ($r['age'] < 1 && count($dates) < 3 && $first->lt(end($dates)->copy()->subDays(14))) $dates[] = $first;
            usort($dates, fn($a, $b) => $a->getTimestamp() <=> $b->getTimestamp());

            $perf = $r['age'] < 1 ? $mid : $this->pick($performers);
            $pid = $this->ins('patient_records', [
                'resident_id' => $rid,
                'patient_type' => 'child',
                'vital_signs' => $this->j($this->vitals(false, false, $latest['w'], $latest['h'], $latest['a'])),
                'created_by_user_id' => $perf,
                'updated_by_user_id' => $perf,
                'status' => 'active',
                'created_at' => $dates[0],
                'updated_at' => end($dates),
            ]);
            $this->patients[$rid][] = $pid;
            $ageNow = $this->ageMonths($birth, $this->now);
            $given = array_map(fn($v) => $v[0], array_filter(self::EPI, fn($v) => $v[1] <= $ageNow));
            $chronic = $this->chance(4);
            $this->ins('child_records', [
                'patient_record_id' => $pid,
                'resident_id' => $rid,
                'birth_weight' => $info['bw'],
                'birth_height' => $info['bh'],
                'birth_head_circumference' => $info['bhc'],
                'gestational_age_at_birth' => $info['ga'],
                'birth_type' => $info['type'],
                'birth_complications' => $info['comp'],
                'immunization_history' => implode(', ', $given) ?: 'None yet',
                'allergies' => $chronic ? 'Dust mites' : $this->pick(['None known', 'None known', 'None known', 'Seafood']),
                'chronic_conditions' => $chronic ? 'Mild persistent asthma' : 'None',
                'current_weight' => $latest['w'],
                'current_height' => $latest['h'],
                'current_muac' => $latest['muac'],
                'current_nutritional_status' => strtolower($latest['status']),
                'created_at' => $dates[0],
                'updated_at' => end($dates),
            ]);

            $prevM = null;
            foreach ($dates as $i => $d) {
                $m = $i === count($dates) - 1 ? $latest : $this->measure($pf, $birth, $d);
                $cm = $this->ageMonths($birth, $d);
                $from = $prevM ?? ($cm < 1 ? -1 : $cm - 3);
                $vac = array_values(array_map(fn($v) => ['name' => $v[0], 'date' => $d->toDateString()], array_filter(self::EPI, fn($v) => $v[1] > $from && $v[1] <= $cm)));
                $next = $dates[$i + 1] ?? $d->copy()->addDays($r['age'] < 2 ? 30 : 60)->addDays($this->r(0, 7));
                if ($i === count($dates) - 1) $next = $this->now->copy()->addDays($this->r(14, 35));
                [$counsel, $assess] = $childTexts[$m['status']];
                $cp = $this->ins('checkup_records', [
                    'patient_record_id' => $pid,
                    'resident_id' => $rid,
                    'performed_by_user_id' => $perf,
                    'checkup_type' => 'child',
                    'checkup_date' => $d,
                    'vital_signs' => $this->j($this->vitals(false, false, $m['w'], $m['h'], $m['a'])),
                    'assessment' => $assess,
                    'diagnosis' => $m['status'] === 'Normal' ? 'Well child' : ($m['status'] === 'Underweight' ? 'Underweight for age' : 'Overweight for age'),
                    'treatment' => $vac ? 'Immunization given per EPI schedule' : 'No treatment needed',
                    'recommendations' => $counsel,
                    'follow_up_date' => $next->toDateString(),
                    'status' => 'completed',
                    'notes' => $m['hfa'] !== 'Normal' ? 'Height-for-age: ' . $m['hfa'] : 'No concerns raised by caregiver.',
                    'created_at' => $d,
                ]);
                $ms = array_values(array_map(fn($x) => $x[1], array_filter(self::MILESTONES, fn($x) => $x[0] <= $cm)));
                $this->ins('child_checkups', [
                    'checkup_record_id' => $cp,
                    'weight' => $m['w'],
                    'height' => $m['h'],
                    'muac' => $m['muac'],
                    'head_circumference' => $m['head'],
                    'vaccines_given' => $this->j($vac),
                    'developmental_assessment' => $cm < 60 ? 'Gross motor, fine motor, language and social skills appropriate for age.' : 'Normal development; performing well in school.',
                    'developmental_milestones' => $this->j($ms ?: ['Newborn reflexes present']),
                    'nutritional_status' => $m['status'],
                    'nutritional_counseling' => $counsel,
                    'interventions' => $m['status'] === 'Underweight' ? 'Referred to Supplementary Feeding Program; vitamin A and deworming given' : 'Routine care; growth chart updated',
                    'created_at' => $d,
                ]);
                $prevM = $cm;
            }
            $this->log($perf, 'PatientRecord', $pid, 'Created Child Patient Record', 'Approved', "Child record opened for {$r['first']} {$r['last']}", $dates[0]);

            // Operation Timbang Plus: children 0-59 months
            if ($latest['a'] < 5) {
                $this->ins('opt_plus_assessments', [
                    'assessment_date' => $L->toDateString(),
                    'resident_id' => $rid,
                    'weight_kg' => $latest['w'],
                    'height_cm' => $latest['h'],
                    'remarks' => "WFA: {$latest['wfa']}; HFA: {$latest['hfa']}; WFH: {$latest['wfh']}",
                    'created_at' => $L
                ]);
            }
            // Supplementary feeding: 6 months - 12 years
            if ($ageNow >= 6) {
                $enrolled = $this->dAgo($this->r(75, 92));
                if ($enrolled->lt($birth->copy()->addDays(180))) $enrolled = $birth->copy()->addDays(180);
                if ($enrolled->gt($L->copy()->subDays(14))) $enrolled = $L->copy()->subDays(1);
                $partId = $enroll('feeding', $rid, $enrolled, 'active', $latest['status'] === 'Normal' ? 'Enrolled for growth monitoring and feeding.' : 'Enrolled as ' . strtolower($latest['status']) . ' child (priority for feeding).');
                $base = $this->measure($pf, $birth, $enrolled, $pf['u'] ? -0.03 : 0);
                $this->ins('nutrition_assessments', [
                    'participant_id' => $partId,
                    'assessment_date' => $enrolled->toDateString(),
                    'weight' => $base['w'],
                    'height' => $base['h'],
                    'bmi' => $base['bmi'],
                    'nutrition_status' => $base['status'],
                    'weight_for_age_status' => $base['wfa'],
                    'height_for_age_status' => $base['hfa'],
                    'weight_for_height_status' => $base['wfh'],
                    'remarks' => 'Baseline assessment at enrollment.',
                    'encoded_by' => $bns,
                    'created_at' => $enrolled
                ]);
                $this->ins('nutrition_assessments', [
                    'participant_id' => $partId,
                    'assessment_date' => $L->toDateString(),
                    'weight' => $latest['w'],
                    'height' => $latest['h'],
                    'bmi' => $latest['bmi'],
                    'nutrition_status' => $latest['status'],
                    'weight_for_age_status' => $latest['wfa'],
                    'height_for_age_status' => $latest['hfa'],
                    'weight_for_height_status' => $latest['wfh'],
                    'remarks' => $latest['status'] === 'Normal' ? 'Growth on track; continue monthly weighing.' : 'Continue feeding; reassess next month.',
                    'encoded_by' => $bns,
                    'created_at' => $L
                ]);
            }
        }
        $this->command->info('✅ Child records, OPT Plus, nutrition program seeded');

        // ---- pregnant women
        $iron = 'Ferrous sulfate 60 mg + folic acid 400 mcg once daily';
        foreach ([['13:Spouse', 14], ['18:Spouse', 22], ['25:Spouse', 30], ['31:Spouse', 36]] as [$k, $ga]) {
            $rid = $this->key[$k];
            $r = $this->R[$rid];
            $lmp = $this->now->copy()->subDays($ga * 7);
            $edd = $lmp->copy()->addDays(280);
            $para = $this->r(0, 3);
            $gravida = $para + 1;
            $risk = $gravida >= 4 ? 'high' : ($r['age'] >= 35 ? 'medium' : 'low');
            $dates = [$this->dAgo(8), $this->dAgo(36)];
            if ($ga >= 17) $dates[] = $this->dAgo(64);
            usort($dates, fn($a, $b) => $a->getTimestamp() <=> $b->getTimestamp());
            $wt = (float) $this->r(52, 68);
            $pid = $this->ins('patient_records', [
                'resident_id' => $rid,
                'patient_type' => 'pregnant',
                'vital_signs' => $this->j($this->vitals(true, false, $wt)),
                'created_by_user_id' => $mid,
                'updated_by_user_id' => $mid,
                'status' => 'active',
                'created_at' => $dates[0],
                'updated_at' => end($dates)
            ]);
            $this->patients[$rid][] = $pid;
            $this->ins('pregnancy_records', [
                'patient_record_id' => $pid,
                'resident_id' => $rid,
                'last_menstrual_period' => $lmp->toDateString(),
                'expected_delivery_date' => $edd->toDateString(),
                'gestational_age' => $ga,
                'gravida' => $gravida,
                'para' => $para,
                'obstetric_history' => "G{$gravida}P{$para}" . ($para ? ': ' . $para . ' previous term delivery(ies), no complications' : ': first pregnancy'),
                'risk_level' => $risk,
                'immunization_status' => 'Tetanus-diphtheria (Td) 2 doses completed',
                'prenatal_logs' => count($dates) . ' prenatal visits recorded at the Barangay Health Center',
                'allergies' => 'No known allergies',
                'medical_history' => 'No history of hypertension or diabetes',
                'current_medications' => $iron . '; calcium carbonate 500 mg twice daily',
                'created_at' => $dates[0],
                'updated_at' => end($dates),
            ]);
            foreach ($dates as $i => $d) {
                $daysAgo = intdiv($this->now->getTimestamp() - $d->getTimestamp(), 86400);
                $gaAt = max(8, $ga - intdiv($daysAgo, 7));
                $perf = $i % 2 ? $this->U['ndp'] : $mid;
                $follow = $dates[$i + 1] ?? $this->now->copy()->addDays($this->r(14, 28));
                $vit = $this->vitals(true, false, $wt - ($ga - $gaAt) * 0.3);
                $cp = $this->ins('checkup_records', [
                    'patient_record_id' => $pid,
                    'resident_id' => $rid,
                    'performed_by_user_id' => $perf,
                    'checkup_type' => 'pregnancy',
                    'checkup_date' => $d,
                    'vital_signs' => $this->j($vit),
                    'assessment' => "Pregnancy at {$gaAt} weeks AOG; fetal movement felt; no danger signs.",
                    'diagnosis' => $risk === 'high' ? 'Pregnancy, high risk (grand multigravida)' : 'Normal intrauterine pregnancy',
                    'treatment' => $iron,
                    'recommendations' => 'Continue supplements, balanced diet, rest; report bleeding, severe headache or reduced fetal movement immediately.',
                    'follow_up_date' => $follow->toDateString(),
                    'status' => 'completed',
                    'notes' => 'Birth plan and facility delivery discussed.',
                    'created_at' => $d,
                ]);
                $this->ins('pregnancy_checkups', [
                    'checkup_record_id' => $cp,
                    'maternal_vitals' => $this->j($vit),
                    'fetal_assessment' => 'Regular fetal heart tones; presentation ' . ($gaAt >= 34 ? 'cephalic' : 'not yet determined'),
                    'fetal_heart_rate' => $this->r(128, 156),
                    'fundal_height' => $gaAt >= 20 ? $gaAt : round($gaAt * 0.85, 1),
                    'interventions' => 'Iron-folic acid dispensed; health education on danger signs' . ($i === 0 ? '; Td dose given' : ''),
                    'micronutrients' => $iron . '; calcium 500 mg BID',
                    'iron_supplement' => true,
                    'folic_acid' => true,
                    'clinical_assessment' => 'Satisfactory maternal and fetal condition.',
                    'created_at' => $d,
                ]);
            }
            $this->ins('maternal_profiles', [
                'resident_id' => $rid,
                'pregnancy_status' => 'pregnant',
                'expected_delivery_date' => $edd->toDateString(),
                'last_checkup_date' => end($dates)->toDateString(),
                'family_planning' => false,
                'remarks' => "{$ga} weeks AOG; {$risk} risk; taking iron-folic acid.",
                'created_at' => $dates[0]
            ]);
            $enroll('maternal', $rid, $dates[0], 'active', 'Enrolled in prenatal care.');
            $this->log($mid, 'PatientRecord', $pid, 'Created Pregnancy Record', 'Approved', "Pregnancy record opened for {$r['first']} {$r['last']} ({$ga} weeks AOG)", $dates[0]);
        }

        // ---- postpartum / lactating mothers (their babies already have child records above)
        foreach (['12:Spouse', '16:Spouse', '19:Spouse', '27:Spouse', '33:Spouse'] as $idx => $k) {
            $rid = $this->key[$k];
            $r = $this->R[$rid];
            $babyId = null;
            foreach ($this->H[$r['h']]['members'] as $mid2) {
                if ($this->R[$mid2]['age'] === 0) $babyId = $mid2;
            }
            $baby = $this->R[$babyId];
            $bm = (int) floor($this->ageMonths($baby['birth'], $this->now));
            $dates = [$baby['birth']->copy()->addDays(7), $this->dAgo(6)];
            $exclusive = $idx !== 2;
            $method = $exclusive ? 'exclusive' : 'mixed';
            [$bw] = [$this->kid[$babyId]['latest']['w']];
            $pid = $this->ins('patient_records', [
                'resident_id' => $rid,
                'patient_type' => 'lactating',
                'vital_signs' => $this->j($this->vitals(true, false, (float) $this->r(50, 62))),
                'created_by_user_id' => $mid,
                'updated_by_user_id' => $mid,
                'status' => 'active',
                'created_at' => $dates[0],
                'updated_at' => $dates[1]
            ]);
            $this->patients[$rid][] = $pid;
            $fpm = $bm < 6 ? 'Lactational amenorrhea method (LAM)' : 'Progestin-only pills';
            $this->ins('lactating_records', [
                'patient_record_id' => $pid,
                'resident_id' => $rid,
                'breastfeeding_status' => $method,
                'infant_age' => $bm,
                'feeding_method' => $method,
                'latching_assessment' => 'Good latch and effective suckling observed',
                'nutritional_status' => 'Normal',
                'family_planning_method' => $fpm,
                'maternal_health_status' => 'Good; ' . ($this->kid[$babyId]['info']['type'] === 'Cesarean Section' ? 'cesarean wound healing well' : 'no postpartum complications'),
                'infant_weight' => $bw,
                'infant_health_status' => 'Active, feeding well, no signs of illness',
                'created_at' => $dates[0],
                'updated_at' => $dates[1],
            ]);
            foreach ($dates as $i => $d) {
                $follow = $i === 0 ? $dates[1] : $this->now->copy()->addDays($this->r(14, 30));
                $iw = $i === 0 ? round($this->kid[$babyId]['info']['bw'] + 0.1, 2) : $bw;
                $cp = $this->ins('checkup_records', [
                    'patient_record_id' => $pid,
                    'resident_id' => $rid,
                    'performed_by_user_id' => $i === 0 ? $mid : $this->U['ndp'],
                    'checkup_type' => 'lactating',
                    'checkup_date' => $d,
                    'vital_signs' => $this->j($this->vitals(true)),
                    'assessment' => 'Postpartum mother; lactation established.',
                    'diagnosis' => 'Normal puerperium',
                    'treatment' => 'Vitamin A and iron supplementation',
                    'recommendations' => 'Continue ' . $method . ' breastfeeding; maintain hydration and balanced diet.',
                    'follow_up_date' => $follow->toDateString(),
                    'status' => 'completed',
                    'notes' => 'Infant checked together with mother.',
                    'created_at' => $d,
                ]);
                $this->ins('lactating_checkups', [
                    'checkup_record_id' => $cp,
                    'feeding_method' => $method,
                    'latching_assessment' => 'Proper positioning and latch',
                    'engorgement_status' => $i === 0 ? 'Mild' : 'None',
                    'nutritional_counseling' => 'Increase fluids, protein and vegetable intake while breastfeeding',
                    'infant_weight' => $iw,
                    'infant_health_status' => 'Gaining weight appropriately',
                    'family_planning_counseling' => 'Discussed birth spacing and available methods',
                    'family_planning_method' => $fpm,
                    'created_at' => $d,
                ]);
            }
            $this->ins('maternal_profiles', [
                'resident_id' => $rid,
                'pregnancy_status' => 'postpartum',
                'expected_delivery_date' => $baby['birth']->toDateString(),
                'last_checkup_date' => $dates[1]->toDateString(),
                'family_planning' => $idx % 2 === 0,
                'remarks' => 'Delivered via ' . ($this->kid[$babyId]['info']['type'] === 'Cesarean Section' ? 'cesarean section' : 'normal delivery') . '; ' . $method . ' breastfeeding.',
                'created_at' => $dates[0]
            ]);
            $enroll('maternal', $rid, $dates[0], 'active', 'Enrolled in postnatal care.');
            $this->log($mid, 'PatientRecord', $pid, 'Created Lactating Record', 'Approved', "Lactating record opened for {$r['first']} {$r['last']}", $dates[0]);
        }
        // one terminated pregnancy on file
        foreach ([32, 24, 3, 6, 10, 20, 0] as $h) {
            $rid = $this->key["$h:Spouse"] ?? null;
            if ($rid && $this->R[$rid]['age'] <= 42) {
                $this->ins('maternal_profiles', [
                    'resident_id' => $rid,
                    'pregnancy_status' => 'terminated',
                    'expected_delivery_date' => null,
                    'last_checkup_date' => $this->dAgo(50)->toDateString(),
                    'family_planning' => true,
                    'remarks' => 'Spontaneous abortion at 9 weeks AOG; post-abortion counseling and follow-up completed.',
                    'created_at' => $this->dAgo(52)
                ]);
                $enroll('maternal', $rid, $this->dAgo(52), 'dropped', 'Pregnancy terminated (spontaneous abortion).');
                break;
            }
        }
        $this->command->info('✅ Maternal profiles, pregnancy and lactating records seeded');

        // ---- seniors + NCD
        $seniors = array_values(array_filter($this->R, fn($r) => $r['active'] && $r['age'] >= 60));
        $ncdSeniors = [];
        foreach ($seniors as $i => $s) {
            if ($i % 2 === 0) $ncdSeniors[] = $s['id'];
        }
        $adultsNcd = array_values(array_filter($this->R, fn($r) => $r['active'] && $r['age'] >= 45 && $r['age'] < 60));
        shuffle($adultsNcd);
        $ncdIds = array_merge($ncdSeniors, array_map(fn($r) => $r['id'], array_slice($adultsNcd, 0, 8)));

        $ncdClass = [];
        foreach ($ncdIds as $rid) {
            $ncdClass[$rid] = $this->pick(['Hypertension', 'Hypertension', 'Hypertension', 'Type 2 Diabetes Mellitus', 'Hypertension and Type 2 Diabetes']);
        }
        $meds = [
            'Hypertension' => 'Amlodipine 5 mg once daily',
            'Type 2 Diabetes Mellitus' => 'Metformin 500 mg twice daily',
            'Hypertension and Type 2 Diabetes' => 'Losartan 50 mg once daily; Metformin 500 mg twice daily'
        ];

        foreach ($seniors as $s) {
            $rid = $s['id'];
            $cls = $ncdClass[$rid] ?? null;
            $dates = [$this->dAgo(9), $this->dAgo(40)];
            usort($dates, fn($a, $b) => $a->getTimestamp() <=> $b->getTimestamp());
            $perf = $this->U['ndp'];
            $score = min(12, 1 + intdiv($s['age'] - 60, 5) + $this->r(0, 3));
            $cond = $cls ? ($cls . '; osteoarthritis') : $this->pick(['Osteoarthritis', 'Presbyopia', 'Osteoarthritis; presbyopia']);
            $medList = $cls ? $meds[$cls] . '; paracetamol 500 mg as needed' : 'Multivitamins; paracetamol 500 mg as needed';
            $high = $cls && str_contains($cls, 'Hypertension') && $this->chance(30);
            $pid = $this->ins('patient_records', [
                'resident_id' => $rid,
                'patient_type' => 'senior',
                'vital_signs' => $this->j($this->vitals(true, $high, (float) $this->r(45, 70))),
                'created_by_user_id' => $perf,
                'updated_by_user_id' => $perf,
                'status' => 'active',
                'created_at' => $dates[0],
                'updated_at' => $dates[1]
            ]);
            $this->patients[$rid][] = $pid;
            $this->ins('senior_records', [
                'patient_record_id' => $pid,
                'resident_id' => $rid,
                'falls_risk_score' => $score,
                'cognitive_assessment' => $s['age'] >= 78 && $this->chance(40) ? 'Mini-Cog 3/5: mild impairment suspected' : 'Mini-Cog 5/5: normal',
                'memory_status' => $s['age'] >= 78 && $this->chance(40) ? 'Mild forgetfulness' : 'Intact',
                'chronic_conditions' => $cond,
                'medication_list' => $medList,
                'allergies' => $this->pick(['No known allergies', 'No known allergies', 'Sulfa drugs']),
                'activity_level' => $s['age'] >= 75 ? 'Independent in basic ADLs; walks with a cane' : 'Independent in ADLs; walks daily',
                'support_system' => 'Lives with family; relatives assist with medications and clinic visits',
                'emergency_contact' => $this->emergencyContact($rid),
                'created_at' => $dates[0],
                'updated_at' => $dates[1],
            ]);
            foreach ($dates as $i => $d) {
                $vit = $this->vitals(true, $high && $i === 1, (float) $this->r(45, 70));
                $cp = $this->ins('checkup_records', [
                    'patient_record_id' => $pid,
                    'resident_id' => $rid,
                    'performed_by_user_id' => $perf,
                    'checkup_type' => 'senior',
                    'checkup_date' => $d,
                    'vital_signs' => $this->j($vit),
                    'assessment' => $high && $i === 1 ? 'Elevated blood pressure; advised rest and medication compliance' : 'Stable; no new complaints',
                    'diagnosis' => $cond,
                    'treatment' => $medList,
                    'recommendations' => 'Low-salt diet, daily light exercise, fall-proof the home; return for monthly monitoring.',
                    'follow_up_date' => ($dates[$i + 1] ?? $this->now->copy()->addDays($this->r(14, 30)))->toDateString(),
                    'status' => 'completed',
                    'notes' => 'Enrolled in Senior Citizens Wellness Program.',
                    'created_at' => $d,
                ]);
                $this->ins('senior_checkups', [
                    'checkup_record_id' => $cp,
                    'vitals' => $this->j($vit),
                    'blood_sugar' => $cls && str_contains($cls, 'Diabetes') ? $this->f(600, 950) : $this->f(480, 620),
                    'falls_reassessment' => max(0, $score + $this->r(-1, 1)),
                    'cognitive_check' => 'Oriented to time, place and person',
                    'medication_adherence' => $cls ? 'Takes maintenance medicines as prescribed' : 'No maintenance medicines',
                    'medications_refilled' => $this->j($cls ? explode('; ', $meds[$cls]) : []),
                    'created_at' => $d,
                ]);
            }
            $enroll('seniors', $rid, $this->now->copy()->subDays($this->r(5, 40)), 'active', 'Enrolled in monthly wellness monitoring.');
            $this->log($perf, 'PatientRecord', $pid, 'Created Senior Record', 'Approved', "Senior record opened for {$s['first']} {$s['last']}", $dates[0]);
        }

        foreach ($ncdIds as $idx => $rid) {
            $r = $this->R[$rid];
            $cls = $ncdClass[$rid];
            $dates = [$this->dAgo(12), $this->dAgo(45)];
            usort($dates, fn($a, $b) => $a->getTimestamp() <=> $b->getTimestamp());
            $perf = $idx % 2 ? $this->U['bhw'] : $this->U['ndp'];
            $status = $this->pick(['stable', 'stable', 'improving', 'uncontrolled']);
            $high = $status === 'uncontrolled';
            $dx = $this->now->copy()->subYears($this->r(1, min(9, $r['age'] - 30)))->subDays($this->r(0, 300));
            $labs = fn() => $this->j([
                'fbs_mmol' => str_contains($cls, 'Diabetes') ? $this->f(650, 1050) : $this->f(480, 560),
                'total_cholesterol_mmol' => $this->f(450, 640),
                'creatinine_umol' => $this->r(62, 104),
                'hba1c_pct' => str_contains($cls, 'Diabetes') ? $this->f(660, 880) : null
            ]);
            $pid = $this->ins('patient_records', [
                'resident_id' => $rid,
                'patient_type' => 'ncd',
                'vital_signs' => $this->j($this->vitals(true, $high, (float) $this->r(55, 85))),
                'created_by_user_id' => $perf,
                'updated_by_user_id' => $perf,
                'status' => 'active',
                'created_at' => $dates[0],
                'updated_at' => $dates[1]
            ]);
            $this->patients[$rid][] = $pid;
            $this->ins('ncd_records', [
                'patient_record_id' => $pid,
                'resident_id' => $rid,
                'ncd_classification' => $cls,
                'diagnosis_date' => $dx->toDateString(),
                'lab_results' => $labs(),
                'medications' => $meds[$cls],
                'complications' => $high ? 'None yet; borderline kidney function being monitored' : 'None',
                'lifestyle_factors' => $this->pick(['Non-smoker; sedentary; high-salt diet', 'Ex-smoker; moderate alcohol; physically active', 'Smoker (10 pack-years); high-salt diet']),
                'allergies' => 'No known allergies',
                'treatment_history' => "Diagnosed {$dx->format('Y')}; on maintenance medicine since diagnosis",
                'current_status' => $status,
                'created_at' => $dates[0],
                'updated_at' => $dates[1],
            ]);
            foreach ($dates as $i => $d) {
                $vit = $this->vitals(true, $high && $i === 1, (float) $this->r(55, 85));
                $cp = $this->ins('checkup_records', [
                    'patient_record_id' => $pid,
                    'resident_id' => $rid,
                    'performed_by_user_id' => $perf,
                    'checkup_type' => 'ncd',
                    'checkup_date' => $d,
                    'vital_signs' => $this->j($vit),
                    'assessment' => $high && $i === 1 ? 'BP above target; reviewed adherence' : 'BP and blood sugar within target',
                    'diagnosis' => $cls,
                    'treatment' => $meds[$cls],
                    'recommendations' => 'Low-salt, low-sugar diet; 30 minutes of exercise 5 days a week; monthly monitoring.',
                    'follow_up_date' => ($dates[$i + 1] ?? $this->now->copy()->addDays($this->r(14, 30)))->toDateString(),
                    'status' => 'completed',
                    'notes' => 'Maintenance medicines checked.',
                    'created_at' => $d,
                ]);
                $this->ins('ncd_checkups', [
                    'checkup_record_id' => $cp,
                    'vitals' => $this->j($vit),
                    'lab_results' => $labs(),
                    'medication_adherence' => $high ? 'Missed some doses this month' : 'Good adherence',
                    'medications_refilled' => $this->j(explode('; ', $meds[$cls])),
                    'lifestyle_counseling' => 'Smoking cessation and alcohol reduction advised',
                    'dietary_counseling' => 'Reduce salt, fried food and sugary drinks',
                    'exercise_recommendations' => 'Brisk walking 30 minutes, 5 days a week',
                    'complication_monitoring' => 'Monitor kidney function, eyes and feet yearly',
                    'created_at' => $d,
                ]);
            }
            $this->log($perf, 'PatientRecord', $pid, 'Created NCD Record', 'Approved', "NCD record opened for {$r['first']} {$r['last']} ({$cls})", $dates[0]);
        }
        $this->command->info('✅ Senior + NCD records seeded');

        // ---- remaining program participants
        $teens = array_values(array_filter($this->R, fn($r) => $r['active'] && $r['age'] >= 13 && $r['age'] <= 17));
        $males = array_values(array_filter($this->R, fn($r) => $r['active'] && $r['g'] === 'Male' && $r['age'] >= 18 && $r['age'] <= 45));
        shuffle($males);
        $drugAt = $this->now->copy()->subDays(105);
        foreach ($teens as $i => $t) {
            $enroll('drug', $t['id'], $drugAt, $i % 9 === 8 ? 'dropped' : 'completed', 'Youth drug-awareness sessions.');
        }
        foreach (array_slice($males, 0, 8) as $m) {
            $enroll('drug', $m['id'], $drugAt, 'completed', 'Adult drug-awareness session.');
        }
        $wives = array_values(array_filter($this->R, fn($r) => $r['active'] && $r['role'] === 'Spouse' && $r['g'] === 'Female' && $r['age'] <= 45));
        foreach (array_slice($wives, 0, 18) as $w) {
            $enroll('adolescent', $w['id'], $this->now->copy()->subDays($this->r(5, 65)), 'active', 'Responsible parenthood and family planning sessions.');
        }
        foreach (array_slice(array_values(array_filter($teens, fn($t) => $t['age'] >= 15)), 0, 8) as $t) {
            $enroll('adolescent', $t['id'], $this->now->copy()->subDays($this->r(5, 65)), 'active', 'Adolescent health session.');
        }

        $this->seedProgramRequests($enroll);
    }

    private function seedProgramRequests(\Closure $enroll): void
    {
        $cap = $this->U['captain'];
        $staffIds = [$this->U['captain'], $this->U['secretary'], $this->U['treasurer'], $this->U['midwife'], $this->U['ndp'], $this->U['bhw'], $this->U['bns']];
        $approved = [
            ['Free Medical and Dental Mission', 'other', 'midwife', 12, 45000, 150, 'Bagocboc Covered Court', 'planned', 'Residents rarely reach the municipal hospital; a mission brings consultations, dental extraction and free medicines to the barangay.'],
            ['Anti-Rabies Vaccination and Dog Registration', 'other', 'bhw', 5, 12000, 120, 'Barangay Hall', 'planned', 'Stray and unvaccinated dogs are a rabies risk, especially for children.'],
            ['Teen Pregnancy Prevention Forum', 'sexual_health', 'ndp', 25, 10000, 50, 'Bagocboc Elementary School', 'planned', 'Rising adolescent pregnancies in the municipality call for early reproductive-health education.'],
        ];
        $n = 0;
        foreach ($approved as [$title, $type, $by, $startIn, $budget, $target, $loc, $pstatus, $why]) {
            $reqAt = $this->dAgo($this->r(14, 20));
            $revAt = $reqAt->copy()->addDays($this->r(1, 3));
            $start = $this->now->copy()->addDays($startIn);
            $pid = $this->ins('programs', [
                'programs' => $title,
                'description' => $why,
                'start_date' => $start->toDateString(),
                'end_date' => $start->copy()->addDays(1)->toDateString(),
                'program_type' => $type,
                'status' => $pstatus,
                'budget' => $budget,
                'target_beneficiaries' => $target,
                'location' => $loc,
                'implementing_agency' => 'Barangay Health Office',
                'focal_person_id' => $this->U[$by],
                'created_at' => $revAt
            ]);
            $this->programIds['req' . $n] = $pid;
            $rid = $this->ins('program_requests', [
                'requested_by_user_id' => $this->U[$by],
                'title' => $title,
                'description' => $why,
                'justification' => $why,
                'program_type' => $type,
                'start_date' => $start->toDateString(),
                'end_date' => $start->copy()->addDays(1)->toDateString(),
                'target_beneficiaries' => $target,
                'location' => $loc,
                'budget' => $budget,
                'status' => 'approved',
                'reviewed_by_user_id' => $cap,
                'reviewed_at' => $revAt,
                'review_remarks' => 'Approved. Coordinate with the Treasurer for the budget release.',
                'program_id' => $pid,
                'notified_user_ids' => $this->j($staffIds),
                'created_at' => $reqAt,
                'updated_at' => $revAt,
            ]);
            $this->log($cap, 'ProgramRequest', $rid, 'Approved Program Request', 'Approved', "Approved: {$title}", $revAt);
            $this->notify($cap, 'Program Request Approved', "Your request \"{$title}\" was approved.", 'program', 'high', 'ProgramRequest', $rid, [$this->U[$by]], $revAt, 90);
            $this->notify($cap, 'New Barangay Program', "{$title} has been approved and scheduled.", 'program', 'normal', 'ProgramRequest', $rid, array_diff($staffIds, [$this->U[$by]]), $revAt, 50);
            $n++;
        }
        // pre-registration for the medical mission
        $pool = array_values(array_filter($this->R, fn($r) => $r['active'] && $r['age'] >= 40));
        shuffle($pool);
        foreach (array_slice($pool, 0, 12) as $p) {
            $this->ins('program_participants', [
                'program_id' => $this->programIds['req0'],
                'resident_id' => $p['id'],
                'enrolled_at' => $this->dAgo($this->r(1, 8)),
                'status' => 'active',
                'notes' => 'Pre-registered for consultation.'
            ]);
        }

        $others = [
            ['Dengue Prevention and Clean-Up Drive', 'other', 'bhw', 'pending', 'Dengue cases usually rise in the rainy months; a clean-up and larvae-source reduction drive is needed.', 8000, 200, 8, 15],
            ['Nutrition Month Cooking Demonstration', 'nutrition', 'bns', 'pending', 'Teach mothers low-cost nutritious recipes using locally available food.', 6000, 40, 30, 4],
            ['Zumba Wellness Fest', 'other', 'bns', 'rejected', 'Community fitness activity to promote active lifestyle.', 65000, 100, 18, 10],
            ['Livelihood Skills Training', 'other', 'midwife', 'cancelled', 'Skills training for mothers; requester withdrew because the partner agency was unavailable.', 20000, 30, 40, 15],
        ];
        foreach ($others as [$title, $type, $by, $st, $why, $budget, $target, $startIn, $daysAgo]) {
            $reqAt = $this->dAgo($daysAgo);
            $start = $this->now->copy()->addDays($startIn);
            $row = [
                'requested_by_user_id' => $this->U[$by],
                'title' => $title,
                'description' => $why,
                'justification' => $why,
                'program_type' => $type,
                'start_date' => $start->toDateString(),
                'end_date' => $start->copy()->addDays(2)->toDateString(),
                'target_beneficiaries' => $target,
                'location' => 'Barangay Hall',
                'budget' => $budget,
                'status' => $st,
                'created_at' => $reqAt
            ];
            if ($st === 'rejected') {
                $row += [
                    'reviewed_by_user_id' => $cap,
                    'reviewed_at' => $reqAt->copy()->addDays(2),
                    'review_remarks' => 'Rejected: the requested budget exceeds the available health fund. Please resubmit with a smaller scope.',
                    'program_id' => null,
                    'notified_user_ids' => $this->j([$this->U[$by]])
                ];
            } elseif ($st === 'cancelled') {
                $row += ['reviewed_by_user_id' => null, 'reviewed_at' => null, 'review_remarks' => 'Cancelled by the requester.', 'program_id' => null, 'notified_user_ids' => null];
            } else {
                $row += ['reviewed_by_user_id' => null, 'reviewed_at' => null, 'review_remarks' => null, 'program_id' => null, 'notified_user_ids' => null];
            }
            $rid = $this->ins('program_requests', $row);
            $this->log($this->U[$by], 'ProgramRequest', $rid, 'Submitted Program Request', ucfirst($st), "Submitted: {$title}", $reqAt);
            if ($st === 'pending') {
                $this->notify($this->U[$by], 'New Program Request', "{$title} is awaiting your review.", 'program', 'high', 'ProgramRequest', $rid, [$cap], $reqAt, 20);
            }
            if ($st === 'rejected') {
                $this->notify($cap, 'Program Request Rejected', "Your request \"{$title}\" was rejected. See the remarks.", 'program', 'normal', 'ProgramRequest', $rid, [$this->U[$by]], $reqAt->copy()->addDays(2), 100);
            }
        }
        $this->command->info('✅ Programs, participants, program requests seeded');
    }

    // ------------------------------------------------------------------ 7. certifications
    private function adultsPool(): array
    {
        return array_values(array_map(fn($r) => $r['id'], array_filter($this->R, fn($r) => $r['active'] && $r['age'] >= 18)));
    }

    private function requesterId(int $rid): int
    {
        static $map = [];
        return $map[$rid] ??= $this->ins('certificate_requesters', ['resident_id' => $rid, 'photo_id' => null, 'created_at' => $this->R[$rid]['created']->copy()->addDays(1)]);
    }

    private function queuePayment(string $kind, int $payableId, int $rid, string $type, float $amount, string $method, string $desc, Carbon $paidAt, array $link = []): void
    {
        $this->payQueue[] = compact('kind', 'payableId', 'rid', 'type', 'amount', 'method', 'desc', 'paidAt', 'link');
    }

    private function seedCertifications(): void
    {
        $sec = $this->U['secretary'];
        $fd = $this->U['frontdesk'];
        $types = DB::table('certification_types')->orderBy('id')->get();
        $adults = $this->adultsPool();
        $demo = $this->key['20:Spouse'];
        $purposes = [
            0 => ['Employment', 'School Enrollment', 'Bank Requirement', 'Passport Application', 'Scholarship', 'Loan Application'],
            1 => ['Medical Assistance', 'Financial Assistance', 'Scholarship', 'Burial Assistance', 'PhilHealth Application'],
            2 => ['Employment', 'School Requirement', 'Board Exam Application', 'Overseas Employment'],
            3 => ['Employment', 'Business Permit', 'Police Clearance', 'Travel']
        ];
        $plan = array_merge(
            array_fill(0, 5, 'Pending'),
            array_fill(0, 4, 'In Review'),
            array_fill(0, 5, 'Approved'),
            array_fill(0, 5, 'Ready for Release'),
            array_fill(0, 15, 'Released'),
            array_fill(0, 3, 'Rejected'),
            array_fill(0, 2, 'Cancelled'),
            ['Deleted']
        );
        shuffle($plan);
        $days = [
            'Pending' => [0, 6],
            'In Review' => [1, 4],
            'Approved' => [3, 10],
            'Ready for Release' => [4, 12],
            'Released' => [10, 100],
            'Rejected' => [15, 60],
            'Cancelled' => [15, 60],
            'Deleted' => [15, 40]
        ];

        $specs = [];
        $archived = ['Rejected' => 2, 'Cancelled' => 1];
        foreach ($plan as $i => $st) {
            if ($i % 10 === 0) {
                $res = $demo;
                $virtual = true;
            } elseif ($this->chance(35)) {
                $res = $this->pick($this->acctRes);
                $virtual = true;
            } else {
                $res = $this->pick($adults);
                $virtual = false;
            }
            $ti = $this->pick([0, 0, 0, 1, 1, 2, 3, 3]);
            $created = $this->dAgo($this->r(...$days[$st]));
            $arch = false;
            if (isset($archived[$st]) && $archived[$st] > 0) {
                $archived[$st]--;
                $arch = true;
            }
            $specs[] = compact('st', 'res', 'virtual', 'ti', 'created', 'arch') + ['deleted' => $st === 'Deleted'];
        }
        usort($specs, fn($a, $b) => $a['created']->getTimestamp() <=> $b['created']->getTimestamp());

        foreach ($specs as $n => $s) {
            $status = $s['deleted'] ? 'Pending' : $s['st'];
            $type = $types[$s['ti']];
            $res = $s['res'];
            $c = $s['created'];
            $approved = $issued = $released = $received = null;
            if (in_array($status, ['Approved', 'Ready for Release', 'Released'], true)) {
                $approved = $this->cap($c->copy()->addDays($this->r(1, 3))->addHours($this->r(0, 4)));
            }
            if (in_array($status, ['Ready for Release', 'Released'], true)) $issued = $this->cap($approved->copy()->addDays($this->r(1, 2)));
            if ($status === 'Released') {
                $released = $this->cap($issued->copy()->addDays($this->r(0, 2))->addHours($this->r(1, 4)));
                $received = $this->cap($released->copy()->addMinutes($this->r(5, 90)));
            }
            $purpose = $this->pick($purposes[$s['ti']]);
            $ref = 'CERT-' . $this->year . '-' . $this->pad($n + 1);
            $H = $this->H[$this->R[$res]['h']];
            $zl = $this->zl[$H['zone']];
            $requestedBy = $s['virtual'] ? $this->userByRes[$res] : $fd;
            $processed = $status === 'Pending' ? null : $sec;
            $fee = (float) $type->fee;
            $paidStatus = $fee <= 0 ? null : (in_array($status, ['Approved', 'Ready for Release', 'Released'], true) ? 'Paid' : (in_array($status, ['Pending', 'In Review'], true) ? 'Pending' : null));
            $remarks = [
                'Pending' => 'Request received; awaiting verification.',
                'In Review' => 'Under review by the Barangay Secretary.',
                'Approved' => 'Approved by the Barangay Secretary; document is being prepared.',
                'Ready for Release' => 'Ready for pick-up at the Barangay Hall during office hours.',
                'Released' => 'Released to the requester.',
                'Rejected' => $this->pick(['Incomplete requirements: valid ID not submitted.', 'Unable to verify residency with the Zone Leader.', 'Duplicate request: a valid certificate is still active.']),
                'Cancelled' => $this->pick(['Cancelled by the requester.', 'Request withdrawn: no longer needed.'])
            ][$status];
            $zlStatus = in_array($status, ['Pending', 'In Review', 'Cancelled'], true) ? 'Pending' : ($status === 'Rejected' && str_contains($remarks, 'residency') ? 'Rejected' : 'Approved');
            $zlDate = $zlStatus === 'Pending' ? null : $this->cap($c->copy()->addHours($this->r(3, 30)));

            $row = [
                'requester_id' => $this->requesterId($res),
                'certification_type_id' => $type->id,
                'requested_by_user_id' => $requestedBy,
                'processed_by_user_id' => $processed,
                'reference_number' => $ref,
                'purpose' => $purpose,
                'details' => "Requested for {$purpose}. Resident of Zone {$this->zones[$H['zone']]['zone_number']}, {$H['street']}.",
                'remarks' => $remarks,
                'file_url' => null,
                'document_path' => null,
                'pdf_url' => null,
                'downloaded_at' => ($status === 'Released' && $s['virtual']) ? $this->cap($released->copy()->addHours(1)) : null,
                'download_token' => null,
                'download_token_expires_at' => null,
                'document_name' => null,
                'status' => $status,
                'approved_at' => $approved,
                'released_at' => $released,
                'received_at' => $received,
                'issued_at' => $issued,
                'expiry_date' => $issued ? $issued->copy()->addMonths(6)->toDateString() : null,
                'zl_clearance_status' => $zlStatus,
                'zl_clearance_notes' => $zlStatus === 'Pending' ? 'Awaiting zone leader verification.'
                    : ($zlStatus === 'Approved' ? "Resident verified by Zone Leader {$zl['name']} (Zone {$this->zones[$H['zone']]['zone_number']})." : "Zone Leader {$zl['name']} could not verify residency."),
                'zl_clearance_date' => $zlDate,
                'submission_channel' => $s['virtual'] ? 'virtual' : 'physical',
                'virtual_documents' => $this->j($s['virtual'] ? [
                    ['document_type' => 'Valid ID', 'verification_status' => $status === 'Pending' || $status === 'In Review' ? 'Pending' : 'Verified'],
                    ['document_type' => 'Proof of Residency', 'verification_status' => $status === 'Pending' || $status === 'In Review' ? 'Pending' : 'Verified']
                ] : []),
                'payment_method' => $fee > 0 ? 'cash' : null,
                'payment_status' => $paidStatus,
                'payment_reference' => null,
                'created_at' => $c,
                'updated_at' => $released ?? $issued ?? $approved ?? $c,
            ];
            if ($s['deleted']) $row['deleted_at'] = $c->copy()->addDays(2);
            if ($s['arch'] || $s['deleted']) {
                $at = $this->now->copy()->subDays($this->r(1, 12))->setTime($this->r(8, 16), $this->r(0, 59));
                $row += [
                    'archived_at' => $at,
                    'archived_by_user_id' => $sec,
                    'archive_reason' => $s['deleted'] ? 'deleted' : strtolower($status),
                    'status_before_archive' => $status === 'Cancelled' ? 'Pending' : ($status === 'Rejected' ? 'In Review' : 'Pending')
                ];
            }
            $id = $this->ins('certifications', $row);

            // payment
            if ($fee > 0 && $status !== 'Rejected' && $status !== 'Cancelled') {
                $paid = $paidStatus === 'Paid';
                $paidAt = $paid ? $this->cap($approved->copy()->addHours($this->r(1, 5))) : null;
                $cpId = $this->ins('certificate_payments', [
                    'certification_id' => $id,
                    'amount' => $fee,
                    'payment_method' => 'Cash',
                    'reference_number' => $ref,
                    'official_receipt_number' => null,
                    'status' => $paid ? 'Paid' : 'Pending',
                    'paid_at' => $paidAt,
                    'created_at' => $c,
                    'deleted_at' => $s['deleted'] ? $c->copy()->addDays(2) : null
                ]);
                if ($paid) {
                    $this->queuePayment('Certification', $id, $res, $type->name, $fee, 'Cash', "Payment for {$type->name} ({$ref})", $paidAt, ['cert_payment' => $cpId, 'cert' => $id]);
                }
            }

            // documents
            $docs = $s['virtual'] ? [['Valid ID', $requestedBy], ['Proof of Residency', $requestedBy]] : [['Valid ID (presented at the desk)', $fd]];
            foreach ($docs as $di => [$dt, $by]) {
                $vs = in_array($status, ['Pending', 'In Review'], true) ? 'Pending' : (($status === 'Rejected' && $di === 0 && str_contains($remarks, 'valid ID')) ? 'Rejected' : (in_array($status, ['Rejected', 'Cancelled'], true) ? 'Pending' : 'Verified'));
                $this->ins('certification_documents', [
                    'certification_id' => $id,
                    'document_type' => $dt,
                    'uploaded_by_user_id' => $by,
                    'verification_status' => $vs,
                    'verified_by_user_id' => $vs === 'Pending' ? null : $sec,
                    'verified_at' => $vs === 'Pending' ? null : $this->cap($c->copy()->addHours($this->r(4, 40))),
                    'remarks' => $vs === 'Verified' ? 'Document is clear and matches the resident record.' : ($vs === 'Rejected' ? 'Valid ID is missing or unreadable.' : 'Awaiting verification.'),
                    'created_at' => $c,
                    'deleted_at' => $s['deleted'] ? $c->copy()->addDays(2) : null
                ]);
            }

            // front desk request for walk-ins
            if (!$s['virtual']) {
                $map = [
                    'Pending' => 'pending',
                    'In Review' => 'processing',
                    'Approved' => 'processing',
                    'Ready for Release' => 'completed',
                    'Released' => 'completed',
                    'Rejected' => 'cancelled',
                    'Cancelled' => 'cancelled'
                ][$status];
                $o = ['issued' => $issued, 'processed' => $approved ?? $c->copy()->addHours(2), 'cancelled' => $c->copy()->addDays(1)];
                if ($status === 'Ready for Release') $o['slip'] = 'pending';
                if ($status === 'Released') {
                    $o['slip'] = 'claimed';
                    $o['claimed'] = $received;
                }
                if ($s['arch']) $o['archive'] = ['at' => $row['archived_at'], 'reason' => strtolower($status), 'before' => 'pending'];
                $this->fdRequest($res, $type->name, $purpose, $map, $c, $o);
            } elseif (in_array($status, ['Approved', 'Ready for Release', 'Released', 'Rejected'], true)) {
                $title = ['Approved' => 'Certificate Approved', 'Ready for Release' => 'Certificate Ready for Pick-up', 'Released' => 'Certificate Released', 'Rejected' => 'Certificate Request Rejected'][$status];
                $this->notify(
                    $sec,
                    $title,
                    "{$type->name} ({$ref}): " . $remarks,
                    'certificate',
                    $status === 'Rejected' ? 'high' : 'normal',
                    'Certification',
                    $id,
                    [$this->userByRes[$res]],
                    $released ?? $issued ?? $approved ?? $c->copy()->addDay(),
                    $status === 'Released' ? 100 : 55
                );
            }
            if ($status === 'Pending' && !$s['deleted']) {
                $this->notify($requestedBy, 'New Certificate Request', "{$type->name} ({$ref}) is waiting for review.", 'request', 'normal', 'Certification', $id, [$sec, $fd], $c, 40);
            }
            $this->log($requestedBy, 'Certification', $id, 'Submitted Certificate Request', 'Pending', "{$type->name} requested ({$ref})", $c);
            if ($status !== 'Pending') {
                $this->log($sec, 'Certification', $id, 'Updated Certificate Status', $status, "{$ref} marked {$status}", $released ?? $issued ?? $approved ?? $c->copy()->addDay());
            }
        }
        $this->command->info('✅ Certifications seeded (' . count($specs) . ')');
    }

    // ------------------------------------------------------------------ 8. clearances
    private function seedClearances(): void
    {
        $sec = $this->U['secretary'];
        $adults = $this->adultsPool();
        $plan = array_merge(
            array_fill(0, 4, 'pending'),
            array_fill(0, 3, 'approved'),
            array_fill(0, 3, 'ready_for_release'),
            array_fill(0, 10, 'released'),
            array_fill(0, 2, 'rejected'),
            array_fill(0, 2, 'cancelled')
        );
        shuffle($plan);
        $days = ['pending' => [0, 6], 'approved' => [3, 9], 'ready_for_release' => [4, 12], 'released' => [10, 100], 'rejected' => [15, 60], 'cancelled' => [15, 60]];
        $purposes = ['Employment', 'Business Permit', 'Travel / Passport', 'School Enrollment', 'Bank Account Opening', 'Loan Application', 'Scholarship', 'Police Clearance Requirement'];
        $archive = ['rejected' => 1, 'cancelled' => 1];
        $fee = (float) DB::table('clearance_configurations')->value('default_fee');

        $specs = [];
        foreach ($plan as $i => $st) {
            $res = $i === 0 ? $this->key['20:Spouse'] : $this->pick($adults);
            $arch = false;
            if (isset($archive[$st]) && $archive[$st] > 0) {
                $archive[$st]--;
                $arch = true;
            }
            $specs[] = ['st' => $st, 'res' => $res, 'created' => $this->dAgo($this->r(...$days[$st])), 'arch' => $arch];
        }
        usort($specs, fn($a, $b) => $a['created']->getTimestamp() <=> $b['created']->getTimestamp());

        foreach ($specs as $n => $s) {
            $st = $s['st'];
            $c = $s['created'];
            $res = $s['res'];
            $approved = $issued = $released = $received = null;
            if (in_array($st, ['approved', 'ready_for_release', 'released'], true)) $approved = $this->cap($c->copy()->addDays($this->r(1, 3))->addHours($this->r(0, 4)));
            if (in_array($st, ['ready_for_release', 'released'], true)) $issued = $this->cap($approved->copy()->addDays($this->r(1, 2)));
            if ($st === 'released') {
                $released = $this->cap($issued->copy()->addDays($this->r(0, 2))->addHours($this->r(1, 4)));
                $received = $this->cap($released->copy()->addMinutes($this->r(5, 90)));
            }
            $purpose = $this->pick($purposes);
            $ref = 'CLR-' . $this->year . '-' . $this->pad($n + 1);
            $remarks = [
                'pending' => 'Awaiting evaluation by the Barangay Secretary.',
                'approved' => 'Approved; for printing and signature.',
                'ready_for_release' => 'Ready for pick-up at the Barangay Hall.',
                'released' => 'Released to the requester.',
                'rejected' => $this->pick(['Pending case record: please settle with the barangay first.', 'Incomplete requirements.']),
                'cancelled' => 'Cancelled by the requester.'
            ][$st];
            $row = [
                'resident_id' => $res,
                'processed_by_user_id' => $sec,
                'reference_number' => $ref,
                'purpose' => $purpose,
                'amount' => $fee,
                'status' => $st,
                'document_path' => null,
                'document_name' => null,
                'approved_at' => $approved,
                'released_at' => $released,
                'received_at' => $received,
                'issued_at' => $issued,
                'valid_until' => $issued ? $issued->copy()->addYear()->toDateString() : null,
                'remarks' => $remarks,
                'created_at' => $c,
                'updated_at' => $released ?? $issued ?? $approved ?? $c
            ];
            $at = null;
            if ($s['arch']) {
                $at = $this->now->copy()->subDays($this->r(1, 12))->setTime($this->r(8, 16), $this->r(0, 59));
                $row += ['archived_at' => $at, 'archived_by_user_id' => $sec, 'archive_reason' => $st, 'status_before_archive' => $st === 'rejected' ? 'pending' : 'pending'];
            }
            $id = $this->ins('clearances', $row);
            if ($approved) {
                $this->queuePayment('Clearance', $id, $res, 'Barangay Clearance', $fee, $this->chance(80) ? 'Cash' : 'GCash', "Payment for Barangay Clearance ({$ref})", $this->cap($approved->copy()->addHours($this->r(1, 5))));
            }
            $map = ['pending' => 'pending', 'approved' => 'processing', 'ready_for_release' => 'completed', 'released' => 'completed', 'rejected' => 'cancelled', 'cancelled' => 'cancelled'][$st];
            $o = ['issued' => $issued, 'processed' => $approved ?? $c->copy()->addHours(2), 'cancelled' => $c->copy()->addDay()];
            if ($st === 'ready_for_release') $o['slip'] = 'pending';
            if ($st === 'released') {
                $o['slip'] = 'claimed';
                $o['claimed'] = $received;
            }
            if ($s['arch']) $o['archive'] = ['at' => $at, 'reason' => $st, 'before' => 'pending'];
            $this->fdRequest($res, 'Barangay Clearance', $purpose, $map, $c, $o);
            $this->log($this->U['frontdesk'], 'Clearance', $id, 'Created Clearance', 'Pending', "Barangay clearance requested ({$ref})", $c);
            if ($st !== 'pending') $this->log($sec, 'Clearance', $id, 'Updated Clearance Status', ucfirst(str_replace('_', ' ', $st)), "{$ref} marked {$st}", $released ?? $issued ?? $approved ?? $c->copy()->addDay());
        }
        $this->command->info('✅ Clearances seeded (' . count($specs) . ')');
    }

    // ------------------------------------------------------------------ 9. front desk
    private function fdRequest(int $res, string $service, string $purpose, string $status, Carbon $created, array $o = []): int
    {
        $fd = $this->U['frontdesk'];
        $r = $this->R[$res];
        $ym = $created->format('Ym');
        $priority = ($r['age'] >= 60 || isset($this->patients[$res])) ? 'high' : ($this->chance(70) ? 'normal' : ($this->chance(60) ? 'low' : ($this->chance(80) ? 'high' : 'urgent')));
        $processedAt = in_array($status, ['pending'], true) ? null : $this->cap($o['processed'] ?? $created->copy()->addHours(2));
        $row = [
            'resident_id' => $res,
            'service_type' => $service,
            'purpose' => $purpose,
            'priority' => $priority,
            'reference_number' => 'REQ-' . $ym . '-' . $this->pad($this->nextSeq("req$ym")),
            'status' => $status,
            'created_by_user_id' => $fd,
            'processed_by_user_id' => $status === 'pending' ? null : $fd,
            'processed_at' => $processedAt,
            'issued_at' => $status === 'completed' ? ($o['issued'] ?? $processedAt) : null,
            'forwarded_to_office' => null,
            'forwarded_notes' => null,
            'forwarded_by_user_id' => null,
            'forwarded_at' => null,
            'cancelled_at' => null,
            'cancelled_by_user_id' => null,
            'created_at' => $created,
            'updated_at' => $processedAt ?? $created,
        ];
        if ($status === 'forwarded') {
            $row['forwarded_to_office'] = $o['office'];
            $row['forwarded_notes'] = $o['notes'];
            $row['forwarded_by_user_id'] = $fd;
            $row['forwarded_at'] = $processedAt;
        }
        if ($status === 'cancelled') {
            $row['cancelled_at'] = $this->cap($o['cancelled'] ?? $created->copy()->addDay());
            $row['cancelled_by_user_id'] = $fd;
            $row['updated_at'] = $row['cancelled_at'];
        }
        if (isset($o['archive'])) {
            $row += ['archived_at' => $o['archive']['at'], 'archived_by_user_id' => $fd, 'archive_reason' => $o['archive']['reason'], 'status_before_archive' => $o['archive']['before']];
        }
        $id = $this->ins('front_desk_requests', $row);
        $this->fdLast = $id;

        if (isset($o['slip'])) {
            $claimed = $o['slip'] === 'claimed';
            $issuedAt = $row['issued_at'] ?? $processedAt;
            $this->ins('front_desk_claim_slips', [
                'request_id' => $id,
                'resident_id' => $res,
                'reference_number' => 'CLM-' . $ym . '-' . $this->pad($this->nextSeq("clm$ym")),
                'document_type' => $service,
                'status' => $claimed ? 'claimed' : 'pending',
                'issued_by_user_id' => $fd,
                'issued_at' => $issuedAt,
                'claimed_at' => $claimed ? ($o['claimed'] ?? $issuedAt) : null,
                'claimed_by_user_id' => $claimed ? $fd : null,
                'created_at' => $issuedAt
            ]);
        }
        $this->log($fd, 'FrontDeskRequest', $id, 'Created Front Desk Request', ucfirst($status), "{$service} request for {$r['first']} {$r['last']}", $created);
        return $id;
    }
    private int $fdLast = 0;

    private function seedFrontDeskExtras(): void
    {
        $fd = $this->U['frontdesk'];
        $adults = $this->adultsPool();

        // forwarded / walk-in requests that are not certificates
        $misc = [
            ['Blotter / Complaint Referral', 'Neighbor dispute over a property boundary', 'forwarded', 'Office of the Punong Barangay', 'Schedule Lupon mediation within 3 days.'],
            ['Social Pension Inquiry', 'Senior citizen social pension enrollment', 'forwarded', 'MSWDO - Opol', 'Resident is 67 and meets the age requirement; endorsed for assessment.'],
            ['Birth Certificate Assistance', 'Late registration of birth', 'forwarded', 'Municipal Civil Registrar - Opol', 'Requirements checklist provided to the resident.'],
            ['Livelihood Assistance', 'Application for livelihood starter kit', 'forwarded', 'MSWDO - Opol', 'Endorsed with barangay certification of indigency.'],
            ['Barangay ID', 'Identification', 'completed', null, null],
            ['Barangay ID', 'Identification', 'completed', null, null],
            ['Business Clearance', 'New sari-sari store', 'completed', null, null],
            ['Barangay ID', 'Lost ID replacement', 'cancelled', null, null],
        ];
        foreach ($misc as $i => [$service, $purpose, $status, $office, $notes]) {
            $created = $this->dAgo($this->r(6, 70));
            $o = ['office' => $office, 'notes' => $notes, 'processed' => $created->copy()->addHours(3), 'issued' => $created->copy()->addDays(1), 'cancelled' => $created->copy()->addHours(5)];
            if ($status === 'completed') {
                $o['slip'] = 'claimed';
                $o['claimed'] = $created->copy()->addDays(1)->addHours(2);
            }
            $this->fdRequest($this->pick($adults), $service, $purpose, $status, $created, $o);
        }

        // today's live queue
        $today = [
            ['Barangay Clearance', 'Employment', 'completed', 'done'],
            ['Certificate of Residency', 'School Enrollment', 'completed', 'done'],
            ['Business Clearance', 'Business permit renewal', 'processing', 'serving'],
            ['Certificate of Indigency', 'Medical assistance', 'pending', 'waiting'],
            ['Barangay ID', 'Identification', 'pending', 'waiting'],
            ['Certificate of Good Moral', 'Employment', 'pending', 'waiting'],
        ];
        foreach ($today as $i => [$service, $purpose, $status, $q]) {
            $res = $this->pick($adults);
            $joined = $this->now->copy()->subMinutes(75 - $i * 11);
            $o = ['processed' => $joined->copy()->addMinutes(10), 'issued' => $joined->copy()->addMinutes(25)];
            if ($status === 'completed') {
                $o['slip'] = 'claimed';
                $o['claimed'] = $joined->copy()->addMinutes(28);
            }
            $reqId = $this->fdRequest($res, $service, $purpose, $status, $joined, $o);
            $this->ins('front_desk_queue', [
                'resident_id' => $res,
                'request_id' => $reqId,
                'service_type' => $service,
                'position' => $i + 1,
                'status' => $q,
                'joined_at' => $joined,
                'called_at' => $q === 'waiting' ? null : $joined->copy()->addMinutes(8),
                'created_at' => $joined
            ]);
        }

        // appointments (linked to open requests for the first few)
        $open = DB::table('front_desk_requests')->whereIn('status', ['pending', 'processing'])->whereNull('archived_at')->orderByDesc('id')->limit(6)->get();
        $slots = ['08:30', '09:00', '09:30', '10:00', '10:30', '13:30', '14:00', '14:30', '15:00', '15:30'];
        foreach ($open as $i => $req) {
            $this->appt($req->resident_id, $req->id, $req->service_type, $i < 4 ? 'scheduled' : 'confirmed', $this->now->copy()->addDays($this->r(1, 7)), $slots);
        }
        $adults2 = $this->acctRes;
        for ($i = 0; $i < 8; $i++) {
            $st = ['completed', 'completed', 'completed', 'cancelled', 'scheduled', 'confirmed', 'completed', 'confirmed'][$i];
            $date = in_array($st, ['scheduled', 'confirmed'], true) ? $this->now->copy()->addDays($this->r(1, 10)) : $this->now->copy()->subDays($this->r(3, 40));
            $this->appt($i === 0 ? $this->key['20:Spouse'] : $this->pick($adults2), null, $this->pick(['Barangay Clearance', 'Certificate of Residency', 'Certificate of Good Moral', 'Barangay ID']), $st, $date, $slots);
        }
        $this->command->info('✅ Front desk requests, queue, appointments, claim slips seeded');
    }

    private function appt(int $res, ?int $reqId, string $service, string $status, Carbon $date, array $slots): void
    {
        $created = $status === 'completed' || $status === 'cancelled' ? $date->copy()->subDays($this->r(2, 6)) : $this->dAgo($this->r(0, 4));
        $created = $this->cap($created);
        $ym = $created->format('Ym');
        $acct = $this->userByRes[$res] ?? null;
        $id = $this->ins('front_desk_appointments', [
            'resident_id' => $res,
            'request_id' => $reqId,
            'service_type' => $service,
            'appointment_date' => $date->toDateString(),
            'appointment_time' => $this->pick($slots),
            'notes' => $status === 'cancelled' ? 'Resident could not attend; to reschedule.' : 'Please bring a valid ID and your reference number.',
            'reference_number' => 'APT-' . $ym . '-' . $this->pad($this->nextSeq("apt$ym")),
            'status' => $status,
            'created_by_user_id' => $acct ?? $this->U['frontdesk'],
            'cancelled_at' => $status === 'cancelled' ? $this->cap($date->copy()->subDay()) : null,
            'created_at' => $created
        ]);
        if ($acct && in_array($status, ['scheduled', 'confirmed'], true)) {
            $this->notify($this->U['frontdesk'], 'Appointment ' . ucfirst($status), "Your {$service} appointment is on {$date->format('M j, Y')}.", 'appointment', 'normal', 'FrontDeskAppointment', $id, [$acct], $created, 50);
        }
    }

    // ------------------------------------------------------------------ 10. compliance + penalties
    private function seedComplianceAndPenalties(): void
    {
        $sec = $this->U['secretary'];
        $cap = $this->U['captain'];
        $adults = $this->adultsPool();
        $items = [
            ['Household Census Update', 'Update household information for the annual census', 'Present household members and proof of residence', 100],
            ['Barangay Assembly Attendance', 'Attend the semestral barangay assembly', 'Sign the attendance sheet', 100],
            ['Waste Segregation Compliance', 'Segregate biodegradable and non-biodegradable waste', 'Two color-coded bins at home', 200],
            ['Anti-Rabies Dog Vaccination', 'Vaccinate and register household dogs', 'Vaccination card for each dog', 300],
            ['Child Immunization Compliance', 'Bring children to the scheduled immunization day', 'Child immunization card', 0],
            ['Cedula (Community Tax Certificate)', 'Secure the annual community tax certificate', 'Valid ID', 0],
        ];
        $plan = array_merge(array_fill(0, 8, 'pending'), array_fill(0, 9, 'completed'), array_fill(0, 5, 'overdue'), array_fill(0, 2, 'exempted'));
        shuffle($plan);
        $penN = 0;
        $penalty = function (int $res, string $reason, string $desc, float $amt, string $status, Carbon $issued, ?string $remarks = null) use (&$penN, $sec, $cap): void {
            $ref = 'PNL-' . $this->year . '-' . $this->pad(++$penN);
            $paidAt = $status === 'paid' ? $this->cap($issued->copy()->addDays($this->r(1, 6))) : null;
            $id = $this->ins('penalties', [
                'resident_id' => $res,
                'issued_by_user_id' => $this->chance(60) ? $sec : $cap,
                'reference_number' => $ref,
                'reason' => $reason,
                'description' => $desc,
                'amount' => $amt,
                'status' => $status,
                'issued_at' => $issued,
                'paid_at' => $paidAt,
                'remarks' => $remarks ?? ($status === 'paid' ? 'Settled at the Treasurer\'s office.' : ($status === 'waived' ? 'Waived by the Barangay Captain.' : 'Please settle within 30 days.')),
                'created_at' => $issued,
                'updated_at' => $paidAt ?? $issued
            ]);
            if ($status === 'paid') {
                $this->queuePayment('Penalty', $id, $res, 'Penalty - ' . $reason, $amt, 'Cash', "Payment of penalty {$ref}: {$reason}", $paidAt);
            }
            $this->log($sec, 'Penalty', $id, 'Issued Penalty', ucfirst($status), "{$ref}: {$reason}", $issued);
            if (isset($this->userByRes[$res])) {
                $this->notify($sec, 'Penalty Issued', "A penalty ({$ref}) of ₱" . number_format($amt, 2) . " was issued: {$reason}.", 'penalty', 'high', 'Penalty', $id, [$this->userByRes[$res]], $issued, 50);
            }
        };

        $overduePenaltyStatus = ['pending', 'paid', 'waived', 'pending', 'paid'];
        $o = 0;
        foreach ($plan as $i => $st) {
            $res = $i === 0 ? $this->key['20:Spouse'] : $this->pick($adults);
            [$name, $desc, $req, $pen] = $items[$i % count($items)];
            $H = $this->H[$this->R[$res]['h']];
            $zoneId = $this->zones[$H['zone']]['id'];
            $created = $this->dAgo($this->r(20, 90));
            $due = $st === 'overdue' ? $this->dAgo($this->r(3, 15)) : ($st === 'pending' ? $this->now->copy()->addDays($this->r(5, 25)) : $this->dAgo($this->r(10, 50)));
            if ($st === 'overdue' && $pen == 0) $pen = 100;
            $done = $st === 'completed' ? $this->cap($due->copy()->subDays($this->r(1, 8))) : null;
            $this->ins('compliance_requirements', [
                'resident_id' => $res,
                'zone_id' => $zoneId,
                'name' => $name,
                'description' => $desc,
                'requirement' => $req,
                'penalty' => $pen,
                'status' => $st,
                'due_date' => $due,
                'completed_at' => $done,
                'completion_notes' => $st === 'completed' ? 'Verified by the Zone Leader.' : ($st === 'exempted' ? 'Exempted: senior citizen / bedridden household member.' : ($st === 'overdue' ? 'Not completed by the due date.' : 'Awaiting completion.')),
                'completed_by_user_id' => $st === 'completed' ? $this->zl[$H['zone']]['user'] : null,
                'is_active' => $st === 'exempted' ? 'inactive' : 'active',
                'created_at' => $created,
            ]);
            if ($st === 'overdue') {
                $penalty($res, $name . ' - overdue', "Penalty for failure to complete: {$name}.", (float) $pen, $overduePenaltyStatus[$o++ % 5], $due->copy()->addDays(1));
            }
            if ($st === 'pending' && isset($this->userByRes[$res])) {
                $this->notify($sec, 'Compliance Reminder', "{$name} is due on {$due->format('M j, Y')}.", 'compliance', 'normal', null, null, [$this->userByRes[$res]], $this->dAgo($this->r(0, 3)), 30);
            }
        }
        // standalone penalties
        $penalty($this->pick($adults), 'Illegal dumping of garbage', 'Garbage dumped along the coastal road.', 500, 'pending', $this->dAgo($this->r(2, 10)));
        $penalty($this->pick($adults), 'Videoke past 10:00 PM', 'Noise complaint filed by neighbors.', 300, 'paid', $this->dAgo($this->r(15, 40)));
        $penalty($this->pick($adults), 'Unregistered tricycle operating in the barangay', 'Tricycle without barangay franchise sticker.', 500, 'paid', $this->dAgo($this->r(20, 60)));
        $penalty($this->pick($adults), 'Curfew violation (minor) - parent liable', 'Minor found outside past curfew hours.', 200, 'waived', $this->dAgo($this->r(10, 30)));
        $this->command->info('✅ Compliance requirements and penalties seeded');
    }

    // ------------------------------------------------------------------ 11. other payments + tax
    private function seedStandalonePaymentsAndTax(): void
    {
        $adults = $this->adultsPool();
        $types = [['Barangay ID', 100], ['Business Clearance', 300], ['Building/Construction Clearance', 500], ['Sound System / Event Permit', 200], ['Cutting Permit', 150]];
        for ($i = 0; $i < 20; $i++) {
            [$t, $amt] = $this->pick($types);
            $res = $this->pick($adults);
            $at = $this->dAgo($this->r(1, 100));
            $st = $i === 7 ? 'pending' : ($i === 13 ? 'failed' : 'completed');
            $method = $i % 3 === 0 ? 'GCash' : 'Cash';
            if ($st === 'completed') {
                $this->queuePayment('', 0, $res, $t, (float) $amt, $method, "Payment for {$t}", $at);
            } else {
                $this->payQueue[] = [
                    'kind' => '',
                    'payableId' => 0,
                    'rid' => $res,
                    'type' => $t,
                    'amount' => (float) $amt,
                    'method' => 'GCash',
                    'desc' => "Payment for {$t}",
                    'paidAt' => $at,
                    'link' => ['status' => $st]
                ];
            }
        }

        // community tax / real property / business tax receipts
        $tr = $this->U['treasurer'];
        $specs = [];
        for ($i = 0; $i < 30; $i++) {
            $res = $this->pick($adults);
            $r = $this->R[$res];
            $tax = $i < 22 ? 'Cedula' : ($i < 27 ? 'Real Property Tax' : 'Business Tax');
            $name = $this->full($res);
            if ($tax === 'Cedula') $amt = 5 + (int) floor($r['income'] * 12 / 1000);
            elseif ($tax === 'Real Property Tax') $amt = $this->money($this->r(600, 3500));
            else {
                $amt = $this->money($this->r(1500, 6000));
                $name .= ' (Sari-Sari Store)';
            }
            $pending = $i === 4 || $i === 25;
            $specs[] = ['res' => $res, 'name' => $name, 'tax' => $tax, 'amt' => max(5, $amt), 'at' => $this->dAgo($this->r(1, 100)), 'pending' => $pending, 'm' => $this->chance(80) ? 'Cash' : 'GCash'];
        }
        usort($specs, fn($a, $b) => $a['at']->getTimestamp() <=> $b['at']->getTimestamp());
        foreach ($specs as $n => $s) {
            $id = $this->ins('tax_payments', [
                'resident_id' => $s['res'],
                'processed_by_user_id' => $tr,
                'receipt_number' => 'TAX-' . $this->year . '-' . $this->pad($n + 1),
                'taxpayer_name' => $s['name'],
                'tax_type' => $s['tax'],
                'amount' => $s['amt'],
                'payment_method' => $s['m'],
                'status' => $s['pending'] ? 'pending' : 'paid',
                'paid_at' => $s['pending'] ? null : $s['at'],
                'remarks' => $s['pending'] ? 'Awaiting payment at the Treasurer\'s office.' : ($s['tax'] === 'Cedula' ? 'Community tax certificate for ' . $this->year . '.' : 'Paid in full.'),
                'created_at' => $s['at']
            ]);
            $this->log($tr, 'TaxPayment', $id, 'Recorded Tax Payment', $s['pending'] ? 'Pending' : 'Paid', "{$s['tax']} - {$s['name']}", $s['at']);
        }
        $this->command->info('✅ Other payments and tax payments seeded');
    }

    /** Assign OR numbers chronologically, then write `payments` and back-fill the receipt numbers. */
    private function flushPayments(): void
    {
        $tr = $this->U['treasurer'];
        usort($this->payQueue, fn($a, $b) => $a['paidAt']->getTimestamp() <=> $b['paidAt']->getTimestamp());
        foreach ($this->payQueue as $p) {
            $status = $p['link']['status'] ?? 'completed';
            $or = 'OR-' . $p['paidAt']->format('Ymd') . '-' . $this->pad($this->nextSeq('or' . $p['paidAt']->format('Ymd')));
            $row = [
                'resident_id' => $p['rid'],
                'processed_by_user_id' => $tr,
                'or_number' => $or,
                'amount' => $p['amount'],
                'payment_type' => $p['type'],
                'payment_method' => $p['method'],
                'description' => $p['desc'],
                'status' => $status,
                'paid_at' => $status === 'completed' ? $p['paidAt'] : null,
                'payable_type' => $p['kind'] ? self::M . $p['kind'] : null,
                'payable_id' => $p['kind'] ? $p['payableId'] : null,
                'created_at' => $p['paidAt']
            ];
            $id = $this->ins('payments', $row);
            if (isset($p['link']['cert_payment'])) {
                DB::table('certificate_payments')->where('id', $p['link']['cert_payment'])->update(['official_receipt_number' => $or]);
                DB::table('certifications')->where('id', $p['link']['cert'])->update(['payment_reference' => $or]);
            }
            if ($status === 'completed') {
                $this->log($tr, 'Payment', $id, 'Recorded Payment', 'Completed', "{$or}: {$p['type']} - ₱" . number_format($p['amount'], 2), $p['paidAt']);
                if (isset($this->userByRes[$p['rid']])) {
                    $this->notify(
                        $tr,
                        'Payment Received',
                        "Official receipt {$or} for {$p['type']} (₱" . number_format($p['amount'], 2) . ').',
                        'payment',
                        'normal',
                        'Payment',
                        $id,
                        [$this->userByRes[$p['rid']]],
                        $p['paidAt'],
                        70
                    );
                }
            }
        }
        $this->command->info('✅ Payments written (' . count($this->payQueue) . ')');
    }

    // ------------------------------------------------------------------ 12. announcements
    private function seedAnnouncements(): void
    {
        $cap = $this->U['captain'];
        $all = array_values($this->U);
        $items = [
            ['Barangay Assembly', 'The semestral barangay assembly will be held this Saturday at 9:00 AM at the Barangay Hall. All household heads are encouraged to attend.', 'All', 'high', 'Published', 7, 3],
            ['Free Flu and Pneumonia Vaccination for Seniors', 'Senior citizens may avail of free vaccines at the Barangay Health Center. Bring your Senior Citizen ID.', 'Senior Citizens', 'high', 'Published', 20, 6],
            ['Garbage Collection Schedule', 'Biodegradable waste is collected every Monday and Thursday; non-biodegradable every Wednesday. Please segregate your garbage.', 'All', 'medium', 'Published', 60, 25],
            ['Supplementary Feeding Schedule', 'The feeding program runs every Tuesday and Friday at the Covered Court. Parents of enrolled children, please bring the child health card.', 'Parents', 'medium', 'Published', 30, 12],
            ['Typhoon Preparedness Advisory', 'Prepare your go-bags, secure your roofs and know the evacuation centers. Follow the BDRRMC announcements.', 'All', 'high', 'Published', 10, 2],
            ['Zone Leaders Meeting', 'Monthly meeting of all Zone Leaders at the Barangay Hall, 2:00 PM. Please bring your zone reports and check-in logs.', 'Zone Leaders', 'medium', 'Published', 6, 1],
            ['Cedula Deadline Reminder', 'Secure your community tax certificate at the Treasurer\'s office. Office hours are Monday to Friday, 8:00 AM to 5:00 PM.', 'Residents', 'low', 'Published', 25, 8],
            ['Christmas Peace and Order Advisory', 'Firecrackers are regulated. Report suspicious activities to the barangay tanod. Curfew for minors remains at 10:00 PM.', 'All', 'medium', 'Draft', 30, 0],
            ['Household Census Update Drive', 'BHWs will visit households to update census data. Please prepare a list of household members.', 'Residents', 'medium', 'Archived', -10, 70],
            ['Health Workers Training', 'Refresher training on maternal and child health for BHWs and the BNS.', 'Barangay Health Workers', 'low', 'Published', 14, 4],
        ];
        foreach ($items as [$title, $msg, $target, $prio, $status, $expDays, $ago]) {
            $at = $this->dAgo($ago);
            $id = $this->ins('announcements', [
                'created_by_user_id' => $cap,
                'title' => $title,
                'message' => $msg,
                'target_group' => $target,
                'priority' => $prio,
                'action_url' => null,
                'image_url' => null,
                'expires_at' => $this->now->copy()->addDays($expDays),
                'status' => $status,
                'created_at' => $at
            ]);
            $this->log($cap, 'Announcement', $id, $status === 'Published' ? 'Published Announcement' : 'Saved Announcement', $status, $title, $at);
            if ($status === 'Published' && $ago <= 12) {
                $this->notify($cap, $title, mb_strimwidth($msg, 0, 110, '...'), 'announcement', $prio === 'high' ? 'high' : 'normal', 'Announcement', $id, $all, $at, 55);
            }
        }
        $this->command->info('✅ Announcements seeded');
    }

    // ------------------------------------------------------------------ 13. zone check-ins
    private function seedZoneCheckIns(): void
    {
        $findings = [
            'clear' => [['Routine patrol completed. No incident.', 'All households visited were in order. No incident or complaint.']],
            'needs_attention' => [
                ['Clogged drainage along the main street.', 'Drainage canal near Purok 3 is blocked; needs clearing before the rains.'],
                ['Streetlight not working.', 'Two streetlights are out at the corner; reported for repair.'],
                ['Stray dogs near the school.', 'Several stray dogs seen roaming; requested coordination for anti-rabies drive.']
            ],
            'urgent' => [['Flooding after heavy rain.', 'Water entered several homes. Families advised to prepare for possible evacuation.']],
        ];
        for ($z = 0; $z < 9; $z++) {
            $zone = $this->zones[$z];
            for ($k = 0; $k < 5; $k++) {
                $at = $this->dAgo(7 * $k + $this->r(0, 4));
                $roll = $this->r(1, 100);
                $st = $roll <= 70 ? 'clear' : ($roll <= 95 ? 'needs_attention' : 'urgent');
                [$note, $find] = $this->pick($findings[$st]);
                $this->ins('zone_check_ins', [
                    'zone_leader_id' => $this->zl[$z]['user'],
                    'zone_id' => $zone['id'],
                    'latitude' => round($zone['latitude'] + $this->r(-10, 10) / 10000, 8),
                    'longitude' => round($zone['longitude'] + $this->r(-10, 10) / 10000, 8),
                    'notes' => $note . ' (' . $zone['name'] . ')',
                    'status' => $st,
                    'checked_in_at' => $at,
                    'findings' => $find,
                    'attachments' => $this->j([]),
                    'created_at' => $at
                ]);
            }
        }
        $this->command->info('✅ Zone check-ins seeded (45)');
    }

    // ------------------------------------------------------------------ 14. surveys
    private function seedSurveys(): void
    {
        $bhw = $this->U['bhw'];
        foreach ($this->H as $h => $H) {
            if ($h >= 30) continue; // 30 households answered; the rest are still to be surveyed
            $members = array_map(fn($id) => $this->R[$id], $H['members']);
            $live = array_filter($members, fn($m) => $m['vital'] === 'alive');
            $c = $H['census'];
            $respondent = $this->key["$h:Head"];
            $at = $this->dAgo($this->r(5, 70));
            $submitted = $h % 5 !== 4;
            $answers = [
                'household_size' => count($live),
                'monthly_income' => $H['income'],
                'water_source' => $c['water'],
                'toilet_type' => $c['toilet'],
                'garbage_disposal' => $c['garbage'],
                'has_electricity' => true,
                'owns_cellphone' => true,
                'has_internet_access' => $H['income'] > 15000 && $this->chance(70),
                'with_senior_member' => (bool) array_filter($live, fn($m) => $m['age'] >= 60),
                'with_pregnant_member' => in_array($H['type'], ['expecting'], true),
                'with_child_under_5' => (bool) array_filter($live, fn($m) => $m['age'] < 5),
                'with_member_in_school' => $c['isy'] > 0,
                'has_emergency_plan' => $this->chance(60),
                'satisfaction_with_barangay_services' => $this->r(3, 5),
                'top_concern' => $this->pick(['Drainage and flooding', 'Street lighting', 'Garbage collection', 'Livelihood opportunities', 'Access to health services']),
            ];
            $id = $this->ins('survey_responses', [
                'household_id' => $H['id'],
                'respondent_id' => $respondent,
                'answers' => $this->j($answers),
                'completed_at' => $submitted ? $at : null,
                'encoded_by' => $bhw,
                'status' => $submitted ? 'submitted' : 'draft',
                'created_at' => $at
            ]);
            $this->log($bhw, 'SurveyResponse', $id, $submitted ? 'Submitted Survey' : 'Saved Survey Draft', $submitted ? 'Approved' : 'Saved', "Household survey for #{$H['number']}", $at);
        }
        $this->command->info('✅ Household surveys seeded (30)');
    }

    // ------------------------------------------------------------------ 15. financial reports (totals computed from real rows)
    private function seedFinancialReports(): void
    {
        $tr = $this->U['treasurer'];
        $cap = $this->U['captain'];
        $sum = function (string $table, string $dateCol, string $amtCol, Carbon $s, Carbon $e, array $where) {
            $q = DB::table($table)->whereBetween($dateCol, [$s, $e]);
            foreach ($where as $col => $val) $q->where($col, $val);
            return [(float) $q->sum($amtCol), (int) $q->count()];
        };
        $report = function (string $title, string $type, Carbon $s, Carbon $e, string $status, ?Carbon $submitted, ?Carbon $approved, ?string $reject = null) use ($sum, $tr, $cap) {
            [$pay, $pc] = $sum('payments', 'paid_at', 'amount', $s, $e, ['status' => 'completed']);
            [$tax, $tc] = $sum('tax_payments', 'paid_at', 'amount', $s, $e, ['status' => 'paid']);
            [$cert, $cc] = $sum('certificate_payments', 'paid_at', 'amount', $s, $e, ['status' => 'Paid']);
            [$pen, $nc] = $sum('penalties', 'paid_at', 'amount', $s, $e, ['status' => 'paid']);
            $total = ['collection' => $pay + $tax, 'certificate' => $cert, 'tax' => $tax, 'penalty' => $pen][$type];
            $count = ['collection' => $pc + $tc, 'certificate' => $cc, 'tax' => $tc, 'penalty' => $nc][$type];
            $byType = DB::table('payments')->where('status', 'completed')->whereBetween('paid_at', [$s, $e])->groupBy('payment_type')->selectRaw('payment_type, SUM(amount) as total, COUNT(*) as n')->get()
                ->map(fn($r) => ['payment_type' => $r->payment_type, 'total' => (float) $r->total, 'count' => (int) $r->n])->all();
            $this->ins('financial_reports', [
                'created_by_user_id' => $tr,
                'approved_by_user_id' => $status === 'approved' ? $cap : null,
                'title' => $title,
                'report_type' => $type,
                'period' => $s->format('M j') . ' - ' . $e->format('M j, Y'),
                'total_amount' => $total,
                'notes' => ['approved' => 'Reconciled with the official receipt book.', 'pending' => 'Submitted for approval.', 'draft' => 'Draft: figures still being reconciled.', 'rejected' => 'Please recheck entries.'][$status],
                'status' => $status,
                'submitted_at' => $submitted,
                'approved_at' => $approved,
                'rejection_reason' => $reject,
                'report_data' => $this->j([
                    'transactions' => $count,
                    'payments_by_type' => $byType,
                    'tax_collected' => $tax,
                    'certificate_fees' => $cert,
                    'penalties' => $pen,
                    'period_start' => $s->toDateString(),
                    'period_end' => $e->toDateString()
                ]),
                'created_at' => $submitted ?? $e
            ]);
        };

        for ($m = 3; $m >= 1; $m--) {
            $s = $this->now->copy()->subMonthsNoOverflow($m)->startOfMonth();
            $e = $s->copy()->endOfMonth();
            $sub = $e->copy()->addDays(2);
            $appr = $e->copy()->addDays($this->r(3, 5));
            $label = $s->format('F Y');
            $report("Collection Report - {$label}", 'collection', $s, $e, 'approved', $sub, $appr);
            if ($m === 1) {
                $report("Certificate Fees Report - {$label}", 'certificate', $s, $e, 'approved', $sub, $appr);
            }
            if ($m === 2) {
                $report("Tax Collection Report - {$label}", 'tax', $s, $e, 'rejected', $sub, null, 'Total does not match the receipt book (TAX series). Please recheck the cedula entries and resubmit.');
            }
        }
        $ms = $this->now->copy()->startOfMonth();
        $report('Collection Report - ' . $ms->format('F Y') . ' (Month-to-Date)', 'collection', $ms, $this->now->copy(), 'pending', $this->now->copy()->subDay(), null);
        $report('Penalty Collection Report - ' . $ms->format('F Y'), 'penalty', $ms, $this->now->copy(), 'draft', null, null);
        $this->command->info('✅ Financial reports seeded (computed from actual payments)');
    }

    // ------------------------------------------------------------------ flush buffers
    private function flushLogsAndNotifications(): void
    {
        usort($this->logs, fn($a, $b) => $a['created_at']->getTimestamp() <=> $b['created_at']->getTimestamp());
        foreach (array_chunk($this->logs, 200) as $chunk) {
            DB::table('record_activity_logs')->insert($chunk);
        }

        usort($this->notifs, fn($a, $b) => $a['at']->getTimestamp() <=> $b['at']->getTimestamp());
        foreach ($this->notifs as $n) {
            $nid = $this->ins('notifications', [
                'sender_user_id' => $n['sender'],
                'title' => $n['title'],
                'message' => $n['message'],
                'category' => $n['category'],
                'reference_type' => $n['refModel'] ? self::M . $n['refModel'] : null,
                'reference_id' => $n['refModel'] ? $n['refId'] : null,
                'deep_link' => null,
                'priority' => $n['priority'],
                'created_at' => $n['at']
            ]);
            $rows = [];
            foreach ($n['recipients'] as $uid) {
                $read = $this->chance($n['readPct']);
                $readAt = $read ? $this->cap($n['at']->copy()->addMinutes($this->r(5, 2500))) : null;
                $rows[] = ['notification_id' => $nid, 'user_id' => $uid, 'is_read' => $read, 'read_at' => $readAt, 'created_at' => $n['at'], 'updated_at' => $readAt ?? $n['at']];
            }
            DB::table('notification_recipients')->insert($rows);
        }
        $this->command->info('✅ Activity logs (' . count($this->logs) . ') and notifications (' . count($this->notifs) . ') seeded');
    }

    // ------------------------------------------------------------------ summary
    private function summary(): void
    {
        $c = fn(string $t) => DB::table($t)->count();
        $line = fn(string $s) => $this->command->info($s);
        $line('');
        $line('═══════════════════════════════════════');
        $line('🎉 ALL SEEDERS COMPLETED SUCCESSFULLY!');
        $line('═══════════════════════════════════════');
        $line('   Zones: ' . $c('barangay_zones') . ' | Households: ' . $c('households') . ' | Residents: ' . $c('residents')
            . ' (alive ' . DB::table('residents')->where('vital_status', 'alive')->count() . ', deceased ' . DB::table('residents')->where('vital_status', 'deceased')->count()
            . ', decedent ' . DB::table('residents')->where('vital_status', 'decedent')->count() . ')');
        $line('   Users: ' . $c('users') . ' | Programs: ' . $c('programs') . ' | Participants: ' . $c('program_participants'));
        $line('   Patient records: ' . $c('patient_records') . ' | Checkups: ' . $c('checkup_records') . ' | Nutrition assessments: ' . $c('nutrition_assessments'));
        $line('   Certifications: ' . $c('certifications') . ' | Clearances: ' . $c('clearances') . ' | Front desk requests: ' . $c('front_desk_requests'));
        $line('   Payments: ' . $c('payments') . ' | Tax payments: ' . $c('tax_payments') . ' | Penalties: ' . $c('penalties'));
        $line('   Notifications: ' . $c('notifications') . ' | Activity logs: ' . $c('record_activity_logs'));
        $line('═══════════════════════════════════════');
        $line('🔑 LOGIN CREDENTIALS (password: password)');
        foreach (
            [
                'superadmin' => 'Super Admin',
                'captain' => 'Captain',
                'secretary' => 'Secretary',
                'treasurer' => 'Treasurer',
                'frontdesk' => 'Front Desk',
                'midwife' => 'Midwife',
                'ndp' => 'NDP',
                'bhw' => 'BHW',
                'bns' => 'BNS'
            ] as $e => $label
        ) {
            $line("   - {$label}: {$e}@gmail.com");
        }
        for ($i = 1; $i <= 9; $i++) {
            $line("   - Zone Leader {$i}: zoneleader{$i}@gmail.com (Zone {$i})");
        }
        $line('   - Resident: resident@gmail.com');
        $line('═══════════════════════════════════════');
    }
}
