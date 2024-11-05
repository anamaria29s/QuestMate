from django.urls import path
from . import views  
from .views import index, profile_view, edit_profile
urlpatterns = [
    path('', views.index, name='index'), 
    path('profile/', views.profile_view, name='profile'), 
    path('profile/edit/', views.edit_profile, name='edit_profile'),  
]
