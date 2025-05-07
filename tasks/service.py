from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import F, Count
from .models import UserStats, CalendarStats, User, UserAchievement, Achievement, Task
def update_task_completion_stats(user, calendar=None):
    
    try:
        stats = UserStats.objects.get(user=user)
    except UserStats.DoesNotExist:
        stats = UserStats.objects.create(user=user)
    
    stats.total_tasks_completed += 1
    
    today = timezone.now().date()
    if stats.last_active_date:
        if (today - stats.last_active_date) == timedelta(days=1):
            stats.current_streak += 1
            if stats.current_streak > stats.longest_streak:
                stats.longest_streak = stats.current_streak
        elif (today - stats.last_active_date) > timedelta(days=1):
            stats.current_streak = 1
    else:
        stats.current_streak = 1
    
    stats.last_active_date = today
    stats.save()
    
    if calendar:
        calendar_stats, created = CalendarStats.objects.get_or_create(
            user=user,
            calendar=calendar
        )
        calendar_stats.tasks_completed += 1
        calendar_stats.save()
    
    check_achievements(user)


def check_achievements(user):
    try:
        stats = UserStats.objects.get(user=user)
    except UserStats.DoesNotExist:
        return

    earned_achievement_ids = UserAchievement.objects.filter(user=user).values_list('achievement_id', flat=True)
    available_achievements = Achievement.objects.exclude(id__in=earned_achievement_ids)
    
    today = timezone.now().date()
    
    for achievement in available_achievements:
        earned = False
        
        if achievement.requirement_type == 'daily':
            task_count = Task.objects.filter(
                user=user, 
                completed=True,
                date=today
            ).count()
            earned = task_count >= achievement.threshold
            
        elif achievement.requirement_type == 'weekly':
            week_start = today - timedelta(days=today.weekday())
            task_count = Task.objects.filter(
                user=user, 
                completed=True,
                date__gte=week_start,
                date__lte=today
            ).count()
            earned = task_count >= achievement.threshold
            
        elif achievement.requirement_type == 'streak':
            earned = stats.current_streak >= achievement.threshold
            
        elif achievement.requirement_type == 'total':
            earned = stats.total_tasks_completed >= achievement.threshold
        
        if earned:
            UserAchievement.objects.create(user=user, achievement=achievement)