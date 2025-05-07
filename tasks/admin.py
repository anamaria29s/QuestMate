from django.contrib import admin
from .models import  UserProfile, Task, Friendship, SharedTask, FriendRequest, SharedCalendar, Membership, Achievement, UserAchievement, UserStats, CalendarStats

admin.site.register(UserProfile)
admin.site.register(Task)
admin.site.register(Friendship)
admin.site.register(SharedTask)
admin.site.register(SharedCalendar)
admin.site.register(Membership)
admin.site.register(FriendRequest)
admin.site.register(Achievement)
admin.site.register(UserAchievement)
admin.site.register(CalendarStats)
admin.site.register(UserStats)

# admin.site.register(CalendarRequests)


