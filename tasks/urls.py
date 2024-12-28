from django.urls import path
from . import views  
from .views import index, profile_view, edit_profile
from django.contrib.auth import views as auth_views
from django.contrib.auth.views import LoginView
from .views import signup_view

urlpatterns = [
    path('', views.index, name='index'), 
    path('profile/', views.profile_view, name='profile'), 
    path('profile/edit/', views.edit_profile, name='edit_profile'),  
    #path('login/', LoginView.as_view(template_name='tasks/login.html'), name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('calendar/', views.calendar_view, name='calendar'), 
]

