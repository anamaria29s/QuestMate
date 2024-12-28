from asyncio import Event
from datetime import timezone
from django.shortcuts import render,redirect
from .models import UserProfile
from .forms import SignUpForm, UserProfileForm  
from django.contrib.auth import login
import calendar
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

def signup_view(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('profile')
    else:
        form = SignUpForm()
    return render(request, 'tasks/signup.html', {'form': form})

def calendar_view(request):
    current_date = timezone.now()
    current_year = current_date.year
    current_month = current_date.month
    
    events = Event.objects.filter(start_time__year=current_year, start_time__month=current_month)
    
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    
    events_by_day = {day: [] for day in range(1, days_in_month + 1)}
    for event in events:
        event_day = event.start_time.day
        events_by_day[event_day].append(event)

    context = {
        'year': current_year,
        'month': current_month,
        'days_in_month': days_in_month,
        'events_by_day': events_by_day,
    }

    return render(request, 'tasks/calendar.html', context)