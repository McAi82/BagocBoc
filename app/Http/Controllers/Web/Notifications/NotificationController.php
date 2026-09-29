<?php

namespace App\Http\Controllers\Web\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\NotificationRecipient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class NotificationController extends Controller
{
    /**
     * Get user notifications
     */
    public function index(Request $request)
    {
        $userId = Auth::id();

        $query = DB::table('notifications')
            ->join('notification_recipients', 'notifications.id', '=', 'notification_recipients.notification_id')
            ->where('notification_recipients.user_id', $userId)
            ->orderBy('notifications.created_at', 'desc')
            ->select([
                'notifications.id as id',
                'notifications.title',
                'notifications.message',
                'notifications.category',
                'notifications.deep_link',
                'notifications.priority',
                'notification_recipients.is_read as is_read',
                'notification_recipients.read_at as read_at',
                'notifications.created_at as created_at',
            ]);

        if ($request->has('unread_only') && $request->unread_only) {
            $query->where('notification_recipients.is_read', false);
        }

        $notifications = $query->get();

        return $this->respondSuccess($notifications);
    }

    /**
     * Get unread count
     */
    public function unreadCount()
    {
        $userId = Auth::id();

        $count = DB::table('notification_recipients')
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->count();

        return $this->respondSuccess(['count' => $count]);
    }

    /**
     * Mark notification as read
     */
    public function markRead(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'notification_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $userId = Auth::id();
        $notificationId = $request->notification_id;

        $updated = DB::table('notification_recipients')
            ->where('notification_id', $notificationId)
            ->where('user_id', $userId)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        if (!$updated) {
            return $this->respondNotFound('Notification not found or not permitted');
        }

        return $this->respondSuccess(null, 'Notification marked as read');
    }

    /**
     * Mark all notifications as read
     */
    public function markAllRead()
    {
        $userId = Auth::id();

        DB::table('notification_recipients')
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return $this->respondSuccess(null, 'All notifications marked as read');
    }

    /**
     * Delete notification
     */
    public function destroy($id)
    {
        $userId = Auth::id();

        $deleted = DB::table('notification_recipients')
            ->where('notification_id', $id)
            ->where('user_id', $userId)
            ->delete();

        if (!$deleted) {
            return $this->respondNotFound('Notification not found or not permitted');
        }

        return $this->respondSuccess(null, 'Notification deleted successfully');
    }

    /**
     * Send notification (admin)
     */
    public function send(Request $request)
{
    $validator = Validator::make($request->all(), [
        'title' => 'required|string|max:255',
        'message' => 'required|string',
        'category' => 'required|string',
        'user_ids' => 'required|array',
        'user_ids.*' => 'exists:users,id',
        'deep_link' => 'nullable|string',
        'priority' => 'nullable|in:low,normal,high',
    ]);

    if ($validator->fails()) {
        return $this->respondError('Validation error', $validator->errors(), 422);
    }

    $notification = Notification::create([
        'sender_user_id' => Auth::id(),
        'title' => $request->title,
        'message' => $request->message,
        'category' => $request->category,
        'deep_link' => $request->deep_link,
        'priority' => $request->priority ?? 'normal',
    ]);

    foreach ($request->user_ids as $userId) {
        NotificationRecipient::create([
            'notification_id' => $notification->id,
            'user_id' => $userId,
            'is_read' => false,
        ]);
    }

    return $this->respondSuccess($notification, 'Notification sent successfully', 201);
}
}