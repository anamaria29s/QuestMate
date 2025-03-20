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
    # path('index/', views.index, name='index'), 
    # path('profile/', views.profile_view, name='profile'), 
    # path('profile/edit/', views.edit_profile, name='edit_profile'),  
    path('api/signup/', signup, name='signup'),
    path('api/login/', login, name='login'),
    # path('api/calendar/', views.get_tasks, name='calendar'),
    # path('api/tasks/', views.get_tasks, name='get_tasks'),
    # # path('api/tasks/add/', views.add_task, name='add_task'),
    # path('api/reminders/', views.get_reminders, name='get_reminders'),
    # path('api/reminders/add/', views.add_reminder, name='add_reminder'),
    path('api/profile/<str:username>/', get_profile, name="get_profile"),
    path('api/profile/<str:username>/update/', update_profile, name="update_profile"),
    path('api/add-friend/', add_friend, name="add_friend"),
    path('api/users/search/', search_users, name='search_users'),
    path('api/send-friend-request/', views.send_friend_request, name="send_friend_request"),
    path('api/accept-friend-request/', views.accept_friend_request, name="accept_friend_request"),
    path('api/reject-friend-request/', views.reject_friend_request, name="reject_friend_request"),
    path('api/friend-requests/', views.get_friend_requests, name="get_friend_requests"),
    path('api/remove-friend/', views.remove_friend, name="remove-friend"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

