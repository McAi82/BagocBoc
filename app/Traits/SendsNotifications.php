<?php
// app/Traits/SendsNotifications.php

namespace App\Traits;

use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Models\User;
use App\Models\Resident;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

trait SendsNotifications
{
    /**
     * Send a notification to a list of user IDs.
     * Silently drops any user IDs that don't exist or are inactive.
     */
    protected function notify(
        array $userIds,
        string $title,
        string $message,
        string $category = 'general',
        string $priority = 'normal',
        ?string $deepLink = null,
        ?int $senderUserId = null,
        ?string $referenceType = null,
        ?int $referenceId = null
    ): ?Notification {
        try {
            // ✅ Filter to only ACTIVE users that actually exist
            $validUserIds = User::whereIn('id', $userIds)
                ->where('account_status', 'active')
                ->pluck('id')
                ->toArray();

            if (empty($validUserIds)) {
                Log::info('Notify skipped: no valid recipients', [
                    'requested' => $userIds,
                    'title' => $title,
                ]);
                return null;
            }

            $notification = Notification::create([
                'sender_user_id' => $senderUserId,
                'title' => $title,
                'message' => $message,
                'category' => $category,
                'priority' => $priority,
                'deep_link' => $deepLink,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
            ]);

            // ✅ Bulk insert for performance, one row per recipient
            $rows = array_map(function ($uid) use ($notification) {
                return [
                    'notification_id' => $notification->id,
                    'user_id' => $uid,
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }, $validUserIds);

            NotificationRecipient::insert($rows);

            Log::info('Notification sent', [
                'notification_id' => $notification->id,
                'title' => $title,
                'recipients' => count($validUserIds),
            ]);

            return $notification;
        } catch (\Exception $e) {
            Log::error('Notify error: ' . $e->getMessage(), [
                'title' => $title,
                'user_ids' => $userIds,
            ]);
            return null;
        }
    }

    /**
     * Notify a single user. Skips silently if user doesn't exist or is inactive.
     */
    protected function notifyUser(
        int $userId,
        string $title,
        string $message,
        string $category = 'general',
        string $priority = 'normal',
        ?string $deepLink = null,
        ?int $senderUserId = null,
        ?string $referenceType = null,
        ?int $referenceId = null
    ): ?Notification {
        return $this->notify(
            [$userId],
            $title,
            $message,
            $category,
            $priority,
            $deepLink,
            $senderUserId,
            $referenceType,
            $referenceId
        );
    }

    /**
     * Notify all users with a given role.
     * IMPORTANT: Only use for role-wide messages (announcements, etc.).
     * Do NOT use for personal messages like "your certificate is ready".
     */
    protected function notifyRole(
        string $roleName,
        string $title,
        string $message,
        string $category = 'general',
        string $priority = 'normal',
        ?string $deepLink = null,
        ?int $senderUserId = null,
        ?string $referenceType = null,
        ?int $referenceId = null
    ): ?Notification {
        $userIds = User::whereHas('roles', function ($q) use ($roleName) {
            $q->where('name', $roleName);
        })
            ->where('account_status', 'active')
            ->pluck('id')
            ->toArray();

        return $this->notify(
            $userIds,
            $title,
            $message,
            $category,
            $priority,
            $deepLink,
            $senderUserId,
            $referenceType,
            $referenceId
        );
    }

    /**
     * Notify multiple roles.
     */
    protected function notifyRoles(
        array $roleNames,
        string $title,
        string $message,
        string $category = 'general',
        string $priority = 'normal',
        ?string $deepLink = null,
        ?int $senderUserId = null
    ): ?Notification {
        $userIds = User::whereHas('roles', function ($q) use ($roleNames) {
            $q->whereIn('name', $roleNames);
        })
            ->where('account_status', 'active')
            ->pluck('id')
            ->toArray();

        return $this->notify(
            $userIds,
            $title,
            $message,
            $category,
            $priority,
            $deepLink,
            $senderUserId
        );
    }

    /**
     * ✅ SCOPED: Notify only Zone Leaders whose zone matches the given zone.
     * Use this instead of notifyRole('Zone Leader', ...) whenever the
     * notification is zone-specific (registrations, geotags, check-ins...).
     */
    protected function notifyZoneLeadersInZone(
        int $zoneId,
        string $title,
        string $message,
        string $category = 'general',
        string $priority = 'normal',
        ?string $deepLink = null,
        ?int $senderUserId = null,
        ?string $referenceType = null,
        ?int $referenceId = null
    ): ?Notification {
        $userIds = $this->getUserIdsForRoleInZone('Zone Leader', $zoneId);

        return $this->notify(
            $userIds,
            $title,
            $message,
            $category,
            $priority,
            $deepLink,
            $senderUserId,
            $referenceType,
            $referenceId
        );
    }

    /**
     * ✅ SCOPED: Notify only BHWs whose zone matches the given zone.
     */
    protected function notifyBHWsInZone(
        int $zoneId,
        string $title,
        string $message,
        string $category = 'general',
        string $priority = 'normal',
        ?string $deepLink = null,
        ?int $senderUserId = null,
        ?string $referenceType = null,
        ?int $referenceId = null
    ): ?Notification {
        $userIds = $this->getUserIdsForRoleInZone('Barangay Health Worker', $zoneId);

        return $this->notify(
            $userIds,
            $title,
            $message,
            $category,
            $priority,
            $deepLink,
            $senderUserId,
            $referenceType,
            $referenceId
        );
    }

    /**
     * ✅ Resolve a resident's user account.
     * Throws no errors — returns null if:
     *   - resident_id is null
     *   - no user account exists for that resident
     *   - the account is inactive
     */
    protected function getUserByResidentId(?int $residentId): ?User
    {
        if (!$residentId) return null;

        return User::where('resident_id', $residentId)
            ->where('account_status', 'active')
            ->first();
    }

    /**
     * ✅ Find the user account for the head of a household.
     * Used when a household-level notification needs to go to the primary resident.
     */
    protected function getUserForHouseholdHead(int $householdId): ?User
    {
        $headResidentId = DB::table('resident_households')
            ->where('household_id', $householdId)
            ->where('status', 'active')
            ->where('is_primary', true)
            ->value('resident_id');

        return $this->getUserByResidentId($headResidentId);
    }

    /**
     * ✅ Get all active user IDs for a role, scoped to a specific zone.
     * A user is "in a zone" if their own resident profile is tied to a
     * household in that zone.
     */
    protected function getUserIdsForRoleInZone(string $roleName, int $zoneId): array
    {
        return User::whereHas('roles', function ($q) use ($roleName) {
            $q->where('name', $roleName);
        })
            ->where('account_status', 'active')
            ->whereHas('resident', function ($q) use ($zoneId) {
                $q->whereHas('households', function ($hq) use ($zoneId) {
                    $hq->whereHas('address', function ($aq) use ($zoneId) {
                        $aq->where('zone', $zoneId);
                    });
                });
            })
            ->pluck('id')
            ->toArray();
    }

    /**
     * ✅ Guard: assert that a user owns a notification before allowing
     * any mutation (mark-read, delete). Returns true if owned, false otherwise.
     * Use this in every controller method that mutates a single notification.
     */
    protected function userOwnsNotification(int $userId, int $notificationId): bool
    {
        return NotificationRecipient::where('notification_id', $notificationId)
            ->where('user_id', $userId)
            ->exists();
    }
}
