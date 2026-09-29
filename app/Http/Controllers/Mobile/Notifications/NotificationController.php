<?php
// app/Http/Controllers/Mobile/Notifications/NotificationController.php

namespace App\Http\Controllers\Mobile\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    use SendsNotifications;

    /**
     * Get notifications for the AUTHENTICATED user only.
     */
    public function index(Request $request)
    {
        try {
            $userId = (int) Auth::id();

            $query = DB::table('notifications')
                ->join(
                    'notification_recipients',
                    'notifications.id',
                    '=',
                    'notification_recipients.notification_id'
                )
                // ✅ STRICT: ONLY the authenticated user's rows
                ->where('notification_recipients.user_id', $userId)
                ->orderBy('notifications.created_at', 'desc')
                ->select([
                    'notifications.id as id',
                    'notifications.title',
                    'notifications.message',
                    'notifications.category',
                    'notifications.deep_link',
                    'notifications.priority',
                    'notifications.reference_type',
                    'notifications.reference_id',
                    'notification_recipients.is_read as is_read',
                    'notification_recipients.read_at as read_at',
                    'notifications.created_at as created_at',
                ]);

            if ($request->boolean('unread_only')) {
                $query->where('notification_recipients.is_read', false);
            }

            if ($request->filled('category')) {
                $query->where('notifications.category', $request->category);
            }

            $perPage = min((int) $request->input('per_page', 20), 100);
            $notifications = $query->paginate($perPage);

            $notifications->getCollection()->transform(function ($item) {
                $item->is_read = (bool) $item->is_read;
                return $item;
            });

            return $this->respondSuccess($notifications);
        } catch (\Exception $e) {
            Log::error('Notifications index error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch notifications', null, 500);
        }
    }

    /**
     * Unread count for the AUTHENTICATED user only.
     */
    public function unreadCount()
    {
        try {
            $userId = (int) Auth::id();

            $count = DB::table('notification_recipients')
                // ✅ STRICT
                ->where('user_id', $userId)
                ->where('is_read', false)
                ->count();

            return $this->respondSuccess(['count' => $count]);
        } catch (\Exception $e) {
            Log::error('Unread count error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch unread count', null, 500);
        }
    }

    /**
     * Mark ONE notification as read — only if owned by the current user.
     */
    public function markRead(Request $request, $id = null)
    {
        try {
            $userId = (int) Auth::id();
            $notificationId = (int) ($id ?? $request->input('notification_id'));

            $validator = Validator::make(
                ['notification_id' => $notificationId],
                ['notification_id' => 'required|integer|min:1']
            );

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            // ✅ Ownership check FIRST
            if (!$this->userOwnsNotification($userId, $notificationId)) {
                // Return 404 (not 403) to avoid leaking that the ID exists
                return $this->respondNotFound('Notification not found');
            }

            DB::table('notification_recipients')
                ->where('notification_id', $notificationId)
                // ✅ STRICT: re-assert ownership at write time
                ->where('user_id', $userId)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                    'updated_at' => now(),
                ]);

            return $this->respondSuccess(null, 'Notification marked as read');
        } catch (\Exception $e) {
            Log::error('Mark read error: ' . $e->getMessage());
            return $this->respondError('Failed to mark as read', null, 500);
        }
    }

    /**
     * Mark all — only the current user's rows.
     */
    public function markAllRead()
    {
        try {
            $userId = (int) Auth::id();

            DB::table('notification_recipients')
                // ✅ STRICT
                ->where('user_id', $userId)
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                    'updated_at' => now(),
                ]);

            return $this->respondSuccess(null, 'All notifications marked as read');
        } catch (\Exception $e) {
            Log::error('Mark all read error: ' . $e->getMessage());
            return $this->respondError('Failed to mark all as read', null, 500);
        }
    }

    /**
     * Delete ONE notification — only if owned.
     */
    public function destroy($id)
    {
        try {
            $userId = (int) Auth::id();
            $notificationId = (int) $id;

            // ✅ Ownership check FIRST
            if (!$this->userOwnsNotification($userId, $notificationId)) {
                return $this->respondNotFound('Notification not found');
            }

            DB::table('notification_recipients')
                ->where('notification_id', $notificationId)
                // ✅ STRICT
                ->where('user_id', $userId)
                ->delete();

            return $this->respondSuccess(null, 'Notification deleted');
        } catch (\Exception $e) {
            Log::error('Delete notification error: ' . $e->getMessage());
            return $this->respondError('Failed to delete notification', null, 500);
        }
    }

    /**
     * Admin utility — send a notification.
     * ✅ RESTRICTED: only Super Admin / Barangay Captain.
     */
    public function send(Request $request)
    {
        $user = Auth::user();

        // ✅ Role guard — reject anyone who isn't Super Admin or Captain
        $allowed = $user->roles()
            ->whereIn('name', ['Super Admin', 'Barangay Captain'])
            ->exists();

        if (!$allowed) {
            return $this->respondForbidden(
                'Only Super Admin or Barangay Captain can send notifications.'
            );
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'category' => 'required|string',
            'user_ids' => 'required|array|min:1|max:100',
            'user_ids.*' => 'exists:users,id',
            'deep_link' => 'nullable|string|max:500',
            'priority' => 'nullable|in:low,normal,high',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $notification = $this->notify(
            $request->user_ids,
            $request->title,
            $request->message,
            $request->category,
            $request->priority ?? 'normal',
            $request->deep_link,
            $user->id
        );

        if (!$notification) {
            return $this->respondError('Failed to send notification', null, 500);
        }

        return $this->respondSuccess($notification, 'Notification sent successfully', 201);
    }
}
