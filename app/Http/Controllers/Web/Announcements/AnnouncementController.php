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
     * Get all announcements
     */
    public function index(Request $request)
    {
        $query = Announcement::with(['createdBy']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('target_group')) {
            $query->where('target_group', $request->target_group);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('message', 'LIKE', "%{$search}%");
            });
        }

        $query->where(function ($q) {
            $q->where('status', 'Published')
                ->where(function ($sq) {
                    $sq->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                });
        });

        $announcements = $query->orderBy('created_at', 'desc')->paginate(10);

        return $this->respondSuccess($announcements);
    }

    /**
     * Create announcement
     * ✅ Notifies users in the target group
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'target_group' => 'required|in:All,Youth,Senior Citizens,Heads of Family,Voters,Pregnant Women,Lactating Mothers',
            'priority' => 'required|in:low,medium,high',
            'action_url' => 'nullable|string|max:500',
            'image_url' => 'nullable|string|max:500',
            'expires_at' => 'nullable|date|after:now',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $announcement = Announcement::create([
            'created_by_user_id' => Auth::id(),
            'title' => $request->title,
            'message' => $request->message,
            'target_group' => $request->target_group,
            'priority' => $request->priority,
            'action_url' => $request->action_url,
            'image_url' => $request->image_url,
            'expires_at' => $request->expires_at,
            'status' => 'Published',
        ]);

        // ✅ Notify users in the target group
        $this->notifyTargetGroup($announcement);

        return $this->respondSuccess(
            $announcement->load('createdBy'),
            'Announcement created successfully',
            201
        );
    }

    /**
     * Show announcement
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
     * Update announcement
     */
    public function update(Request $request, $id)
    {
        $announcement = Announcement::find($id);

        if (!$announcement) {
            return $this->respondNotFound('Announcement not found');
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'message' => 'sometimes|string',
            'target_group' => 'sometimes|in:All,Youth,Senior Citizens,Heads of Family,Voters,Pregnant Women,Lactating Mothers',
            'priority' => 'sometimes|in:low,medium,high',
            'action_url' => 'nullable|string|max:500',
            'image_url' => 'nullable|string|max:500',
            'expires_at' => 'nullable|date|after:now',
            'status' => 'sometimes|in:Published,Draft,Archived',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $announcement->update($request->all());

        return $this->respondSuccess(
            $announcement->load('createdBy'),
            'Announcement updated successfully'
        );
    }

    /**
     * Delete announcement
     */
    public function destroy($id)
    {
        $announcement = Announcement::find($id);

        if (!$announcement) {
            return $this->respondNotFound('Announcement not found');
        }

        $announcement->delete();

        return $this->respondSuccess(null, 'Announcement deleted successfully');
    }

    /**
     * Get all announcements for mobile
     */
    public function getPublic(Request $request)
    {
        $query = Announcement::where('status', 'Published')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });

        if ($request->has('target_group')) {
            $query->where('target_group', $request->target_group);
        }

        $announcements = $query->orderBy('created_at', 'desc')->get();

        return $this->respondSuccess($announcements);
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    /**
     * Send notifications to users matching the target group
     */
    private function notifyTargetGroup(Announcement $announcement): void
    {
        try {
            $userIds = $this->resolveTargetGroupUserIds($announcement->target_group);
            if (empty($userIds)) return;

            $priority = $announcement->priority === 'high' ? 'high' : 'normal';

            $this->notify(
                $userIds,
                '📢 ' . $announcement->title,
                $announcement->message,
                'announcement',
                $priority,
                $announcement->action_url ?: '/announcements',
                Auth::id(),
                'announcement',
                $announcement->id
            );
        } catch (\Exception $e) {
            Log::error('Announcement notify error: ' . $e->getMessage());
        }
    }

    /**
     * Resolve a target group to a list of user IDs
     */
    private function resolveTargetGroupUserIds(string $targetGroup): array
    {
        switch ($targetGroup) {
            case 'All':
                // Everyone who has a user account
                return User::whereNotNull('account_status')
                    ->where('account_status', 'active')
                    ->pluck('id')
                    ->toArray();

            case 'Youth':
                return $this->userIdsByAge(15, 30);

            case 'Senior Citizens':
                return $this->userIdsByAge(60, 200);

            case 'Heads of Family':
                // Users whose resident is the primary of a household
                return User::whereHas('resident', function ($q) {
                    $q->whereHas('households', function ($hq) {
                        $hq->where('resident_households.is_primary', true);
                    });
                })->pluck('id')->toArray();

            case 'Voters':
                return User::whereHas('resident', function ($q) {
                    $q->whereIn('voter_status', ['Registered Local', 'Registered_Outside']);
                })->pluck('id')->toArray();

            case 'Pregnant Women':
                return User::whereHas('resident', function ($q) {
                    $q->whereHas('maternalProfiles', function ($mq) {
                        $mq->where('pregnancy_status', 'pregnant');
                    })->orWhereHas('maternalProfile', function ($mq) {
                        $mq->where('pregnancy_status', 'pregnant');
                    });
                })->pluck('id')->toArray();

            case 'Lactating Mothers':
                return User::whereHas('resident', function ($q) {
                    $q->whereHas('maternalProfiles', function ($mq) {
                        $mq->where('pregnancy_status', 'postpartum');
                    })->orWhereHas('maternalProfile', function ($mq) {
                        $mq->where('pregnancy_status', 'postpartum');
                    });
                })->pluck('id')->toArray();

            default:
                return [];
        }
    }

    /**
     * Get user IDs by resident age range
     */
    private function userIdsByAge(int $minAge, int $maxAge): array
    {
        $minDate = now()->subYears($maxAge)->toDateString();
        $maxDate = now()->subYears($minAge)->toDateString();

        return User::whereHas('resident', function ($q) use ($minDate, $maxDate) {
            $q->whereBetween('birth_date', [$minDate, $maxDate]);
        })->pluck('id')->toArray();
    }
}
