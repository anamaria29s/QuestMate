from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from . import views  
from django.contrib.auth import views as auth_views
from django.contrib.auth.views import LoginView
from rest_framework_simplejwt.views import TokenRefreshView
from .views import signup, login, get_profile, add_friend, update_profile, search_users
urlpatterns = [
    path('', views.index, name='index'), 
    path('api/signup/', signup, name='signup'),
    path('api/login/', login, name='login'),
    path('api/token/refresh/', views.token_refresh, name='token_refresh'),

    # Tasks
    path('api/tasks/', views.get_tasks, name='get_tasks'),
    path('api/tasks/<int:task_id>/edit/', views.edit_task, name='edit_task'),
    path('api/tasks/<int:task_id>/delete/', views.delete_task, name='delete_task'),
    path('api/tasks/<int:task_id>/toggle/', views.toggle_task_completion, name='toggle_task_completion'),
    path('api/tasks/add/', views.add_task, name='add_task'),

    # Profile & Friends
    path('api/profile/<str:username>/', get_profile, name="get_profile"),
    path('api/profile/<str:username>/update/', update_profile, name="update_profile"),
    path('api/add-friend/', add_friend, name="add_friend"),
    path('api/users/search/', search_users, name='search_users'),
    path('api/send-friend-request/', views.send_friend_request, name="send_friend_request"),
    path('api/accept-friend-request/', views.accept_friend_request, name="accept_friend_request"),
    path('api/reject-friend-request/', views.reject_friend_request, name="reject_friend_request"),
    path('api/friend-requests/', views.get_friend_requests, name="get_friend_requests"),
    path('api/remove-friend/', views.remove_friend, name="remove-friend"),
    path('api/friends/', views.get_my_friends, name='get_my_friends'),


    # Shared Calendars
    path('api/shared-calendars/', views.list_shared_calendars, name='list_shared_calendars'),
    path('api/shared-calendars/<int:calendar_id>/', views.shared_calendar_detail, name='shared_calendar_detail'),
    path('api/shared-calendars/create/', views.create_shared_calendar, name='create_shared_calendar'),
    path('api/shared-calendars/invite/', views.invite_to_calendar, name='invite_to_calendar'),
    path('api/shared-calendars/accept/', views.accept_calendar_invite, name='accept_calendar_invite'),
    path('api/shared-calendars/decline/', views.decline_calendar_invite, name='decline_calendar_invite'),
    path('api/shared-calendars/invites/', views.list_calendar_invites, name='list_calendar_invites'),
     # Delete calendar (owner only)
    path('api/shared-calendars/<int:calendar_id>/delete/', views.delete_shared_calendar, name='delete_shared_calendar'),
    # Leave calendar (members only)
    path('api/shared-calendars/<int:calendar_id>/leave/', views.leave_shared_calendar, name='leave_shared_calendar'),

    # Shared Tasks
    path('api/shared-tasks/<int:calendar_id>/', views.get_shared_tasks, name='get_shared_tasks'),
    path('api/shared-tasks/<int:calendar_id>/<int:shared_task_id>/edit/', views.edit_shared_task, name='edit_shared_task'),
    path('api/shared-tasks/<int:calendar_id>/<int:shared_task_id>/delete/', views.delete_shared_task, name='delete_shared_task'),
    path('api/shared-tasks/<int:calendar_id>/<int:shared_task_id>/toggle/', views.toggle_shared_task_completion, name='toggle_shared_task_completion'),
    path('api/shared-tasks/<int:calendar_id>/add/', views.add_shared_task, name='add_shared_task'),

    # User achievements endpoints
    path('api/user/achievements/', views.get_user_achievements, name='user_achievements'),
    path('api/user/stats/', views.get_user_stats, name='user_stats'),
    path('api/achievements/', views.get_available_achievements, name='available_achievements'),

    # Calendar leaderboard endpoint
    path('api/calendars/<int:calendar_id>/leaderboard/', views.get_calendar_leaderboard, name='calendar_leaderboard'),

    # Personal Task Categories
    path('api/task-categories/', views.task_category_list, name='task_category_list'),
    path('api/task-categories/create/', views.create_task_category, name='create_task_category'),
    path('api/task-categories/<int:category_id>/update/', views.update_task_category, name='update_task_category'),
    path('api/task-categories/<int:category_id>/delete/', views.delete_task_category, name='delete_task_category'),

    # Shared Task Categories
    path('api/shared-calendars/<int:calendar_id>/categories/', views.get_shared_task_categories, name='get_shared_task_categories'),
    path('api/shared-calendars/<int:calendar_id>/categories/create/', views.create_shared_task_category, name='create_shared_task_category'),
    path('api/shared-calendars/<int:calendar_id>/categories/<int:category_id>/update/', views.update_shared_task_category, name='update_shared_task_category'),
    path('api/shared-calendars/<int:calendar_id>/categories/<int:category_id>/delete/', views.delete_shared_task_category, name='delete_shared_task_category'),

     # Tasks with priority filtering and sorting
    path('api/tasks/priority/<str:priority_level>/', views.get_tasks_by_priority, name='get_tasks_by_priority'),
    path('api/tasks/sorted/', views.get_tasks_sorted_by_priority, name='get_tasks_sorted_by_priority'),
    
    # Shared Tasks with priority filtering and sorting
    path('api/shared-tasks/<int:calendar_id>/priority/<str:priority_level>/', views.get_shared_tasks_by_priority, name='get_shared_tasks_by_priority'),
    path('api/shared-tasks/<int:calendar_id>/sorted/', views.get_shared_tasks_sorted_by_priority, name='get_shared_tasks_sorted_by_priority'),

    # Priority statistics/overview
    path('api/tasks/priority-stats/', views.get_priority_stats, name='get_priority_stats'),
    path('api/shared-tasks/<int:calendar_id>/priority-stats/', views.get_shared_priority_stats, name='get_shared_priority_stats'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

