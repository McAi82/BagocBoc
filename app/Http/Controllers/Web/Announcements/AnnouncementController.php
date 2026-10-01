<?php

namespace App\Http\Controllers\Web\Announcements;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Resident;
use App\Models\User;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AnnouncementController extends Controller
{
    use SendsNotifications;

    /**
     * Roles permitted to create / update / delete announcements.
     */
    private const MANAGE_ROLES = ['Super Admin', 'Barangay Captain'];

    /**
     * Get all announcements (every authenticated user can view).
     */
    public function index(Request $request)
    {
        $query = Announcement::with(['createdBy']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('target_group')) {
            $query->where('target_group', $request->target_group);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('message', 'LIKE', "%{$search}%");
            });
        }

        // Only show Published + non-expired to non-managers
        $userRoles = $this->currentUserRoles();
        $isManager = count(array_intersect($userRoles, self::MANAGE_ROLES)) > 0;

        if (!$isManager) {
            $query->where('status', 'Published')
                ->where(function ($sq) {
                    $sq->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                });
        }

        $announcements = $query->orderBy('created_at', 'desc')->paginate(10);

        return $this->respondSuccess($announcements);
    }

    /**
     * Create announcement — notifies ALL users.
     */
    public function store(Request $request)
    {
        if (!$this->canManage()) {
            return $this->respondForbidden(
                'Only Super Admin or Barangay Captain can create announcements.',
            );
        }

        $validator = Validator::make($request->all(), [
            'title'        => 'required|string|max:255',
            'message'      => 'required|string',
            'target_group' => 'required|in:All,Youth,Senior Citizens,Heads of Family,Voters,Pregnant Women,Lactating Mothers',
            'priority'     => 'required|in:low,medium,high',
            'action_url'   => 'nullable|string|max:500',
            'image_url'    => 'nullable|string|max:500',
            'expires_at'   => 'nullable|date|after:now',
            'status'       => 'sometimes|in:Published,Draft,Archived',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $announcement = Announcement::create([
            'created_by_user_id' => Auth::id(),
            'title'              => $request->title,
            'message'            => $request->message,
            'target_group'       => $request->target_group,
            'priority'           => $request->priority,
            'action_url'         => $request->action_url,
            'image_url'          => $request->image_url,
            'expires_at'         => $request->expires_at,
            'status'             => $request->input('status', 'Published'),
        ]);

        // ✅ Broadcast to ALL active users when published
        if ($announcement->status === 'Published') {
            $this->notifyAllUsers($announcement);
        }

        return $this->respondSuccess(
            $announcement->load('createdBy'),
            'Announcement created successfully',
            201,
        );
    }

    /**
     * Show announcement.
     */
    public function show($id)
    {
        $announcement = Announcement::with('createdBy')->find($id);

        if (!$announcement) {
            return $this->respondNotFound('Announcement not found');
        }

        return $this->respondSuccess($announcement);
    }

    /**
     * Update announcement.
     */
    public function update(Request $request, $id)
    {
        if (!$this->canManage()) {
            return $this->respondForbidden(
                'Only Super Admin or Barangay Captain can update announcements.',
            );
        }

        $announcement = Announcement::find($id);

        if (!$announcement) {
            return $this->respondNotFound('Announcement not found');
        }

        $validator = Validator::make($request->all(), [
            'title'        => 'sometimes|string|max:255',
            'message'      => 'sometimes|string',
            'target_group' => 'sometimes|in:All,Youth,Senior Citizens,Heads of Family,Voters,Pregnant Women,Lactating Mothers',
            'priority'     => 'sometimes|in:low,medium,high',
            'action_url'   => 'nullable|string|max:500',
            'image_url'    => 'nullable|string|max:500',
            'expires_at'   => 'nullable|date|after:now',
            'status'       => 'sometimes|in:Published,Draft,Archived',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $wasDraft = $announcement->status !== 'Published';
        $announcement->update($request->all());

        // If the announcement just became Published, broadcast to everyone
        if ($wasDraft && $announcement->status === 'Published') {
            $this->notifyAllUsers($announcement);
        }

        return $this->respondSuccess(
            $announcement->fresh()->load('createdBy'),
            'Announcement updated successfully',
        );
    }

    /**
     * Delete announcement.
     */
    public function destroy($id)
    {
        if (!$this->canManage()) {
            return $this->respondForbidden(
                'Only Super Admin or Barangay Captain can delete announcements.',
            );
        }

        $announcement = Announcement::find($id);

        if (!$announcement) {
            return $this->respondNotFound('Announcement not found');
        }

        $announcement->delete();

        return $this->respondSuccess(null, 'Announcement deleted successfully');
    }

    /**
     * Get all announcements for mobile (public list, still auth-protected).
     */
    public function getPublic(Request $request)
    {
        $query = Announcement::where('status', 'Published')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });

        if ($request->filled('target_group')) {
            $query->where('target_group', $request->target_group);
        }

        $announcements = $query->orderBy('created_at', 'desc')->get();

        return $this->respondSuccess($announcements);
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    /**
     * Resolve the current user's role names.
     */
    private function currentUserRoles(): array
    {
        $user = Auth::user();
        if (!$user) return [];

        return $user->roles()->pluck('name')->toArray();
    }

    /**
     * Check if the current user can manage announcements.
     */
    private function canManage(): bool
    {
        $roles = $this->currentUserRoles();
        return count(array_intersect($roles, self::MANAGE_ROLES)) > 0;
    }

    /**
     * Send the announcement notification to EVERY active user.
     */
    private function notifyAllUsers(Announcement $announcement): void
    {
        try {
            $userIds = User::where('account_status', 'active')
                ->pluck('id')
                ->toArray();

            if (empty($userIds)) return;

            $priority = $announcement->priority === 'high' ? 'high' : 'normal';

            $this->notify(
                $userIds,
                '📢 ' . $announcement->title,
                $announcement->message,
                'announcement',
                $priority,
                $announcement->action_url ?: '/barangay-bagocboc/announcements',
                Auth::id(),
                'announcement',
                $announcement->id,
            );
        } catch (\Exception $e) {
            Log::error('Announcement broadcast error: ' . $e->getMessage());
        }
    }
}
