from django.shortcuts import render,redirect
from .models import UserProfile
from .forms import UserProfileForm  # Create a form for UserProfile

def index(request):
    return render(request, 'tasks/index.html')

def profile_view(request):
    profile = UserProfile.objects.get(user=request.user)
    return render(request, 'tasks/profile.html', {'profile': profile})

def edit_profile(request):
    profile = UserProfile.objects.get(user=request.user)
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            return redirect('profile_view')
    else:
        form = UserProfileForm(instance=profile)
    return render(request, 'tasks/edit_profile.html', {'form': form})