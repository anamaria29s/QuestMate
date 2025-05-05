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

class Task(models.Model):
    user = models.ForeignKey(User, related_name="tasks", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    completed = models.BooleanField(default=False)

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



    

class SharedTask(models.Model):
    calendar = models.ForeignKey(SharedCalendar, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    completed = models.BooleanField(default=False)

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

