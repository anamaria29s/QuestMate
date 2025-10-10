from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    email= models.CharField(max_length=50, blank=True)
    bio = models.TextField(blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    

    def __str__(self):
        return self.user.username

class FriendRequest(models.Model):
    sender = models.ForeignKey(User, related_name="sent_requests", on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name="received_requests", on_delete=models.CASCADE)
    status = models.CharField(
        max_length=10,
        choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('sender', 'receiver')

    def __str__(self):
        return f"{self.sender} -> {self.receiver} ({self.status})"
    
class Friendship(models.Model):
    user = models.ForeignKey(User, related_name="friendships", on_delete=models.CASCADE)
    friend = models.ForeignKey(User, related_name="friends", on_delete=models.CASCADE)

    class Meta:
        unique_together = ('user', 'friend')

    def __str__(self):
        return f"{self.user.username} is friends with {self.friend.username}"

class TaskCategory(models.Model):
    user = models.ForeignKey(User, related_name="categories", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20)  
    
    class Meta:
        unique_together = ('user', 'name')
        verbose_name_plural = "Task Categories"
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"

class Task(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    user = models.ForeignKey(User, related_name="tasks", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    is_all_day = models.BooleanField(default=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    category = models.ForeignKey(TaskCategory, related_name="tasks", on_delete=models.SET_NULL, null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')

    def __str__(self):
        return self.title

class SharedCalendar(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_calendars')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


    def accepted_participants(self):
        return User.objects.filter(received_calendar_invites__calendar=self, received_calendar_invites__status='accepted')


class SharedTaskCategory(models.Model):
    calendar = models.ForeignKey(SharedCalendar, related_name="categories", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20)  
    
    class Meta:
        unique_together = ('calendar', 'name')
        verbose_name_plural = "Shared Task Categories"
    
    def __str__(self):
        return f"{self.name} ({self.calendar.name})"

class SharedTask(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    calendar = models.ForeignKey(SharedCalendar, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks', null=True, blank=True)
    is_all_day = models.BooleanField(default=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_shared_tasks')
    category = models.ForeignKey(SharedTaskCategory, related_name="tasks", on_delete=models.SET_NULL, null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # New field for joined users
    joined_users = models.ManyToManyField(User, related_name='joined_shared_tasks', blank=True)

    def __str__(self):
        return f"{self.title} ({self.calendar.name})"


class Membership(models.Model):
    status = models.CharField(
        max_length=10,
        choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')],
        default='pending'
    )
    calendar = models.ForeignKey(SharedCalendar,related_name='memberships', on_delete=models.CASCADE, null=True, blank=True)  
    sender = models.ForeignKey(User, related_name='sent_calendar_invites', on_delete=models.CASCADE, null=True, blank=True)
    receiver = models.ForeignKey(User, related_name='received_calendar_invites', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        unique_together = ('calendar', 'receiver')
    def __str__(self):
        sender_username = getattr(self.sender, 'username', 'Unknown')
        receiver_username = getattr(self.receiver, 'username', 'Unknown')
        calendar_name = getattr(self.calendar, 'name', 'No Calendar')
        return f"{sender_username} -> {receiver_username} @ {calendar_name} ({self.status})"

class Achievement(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default="trophy")  
    requirement_type = models.CharField(
        max_length=20,
        choices=[
            ('daily', 'Daily Tasks'),
            ('weekly', 'Weekly Tasks'),
            ('streak', 'Streak'),
            ('total', 'Total Tasks'),
        ]
    )
    threshold = models.IntegerField()  
    
    def __str__(self):
        return self.name


class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    date_earned = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'achievement')
    
    def __str__(self):
        return f"{self.user.username} earned {self.achievement.name}"


class UserStats(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='stats')
    total_tasks_completed = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    
    def __str__(self):
        return f"Stats for {self.user.username}"


class CalendarStats(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_stats')
    calendar = models.ForeignKey(SharedCalendar, on_delete=models.CASCADE, related_name='user_stats')
    tasks_completed = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'calendar')
    
    def __str__(self):
        return f"{self.user.username}'s stats for {self.calendar.name}"