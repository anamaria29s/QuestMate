from django.contrib import admin
from .models import  UserProfile, Task, Friendship, SharedTask, FriendRequest, SharedCalendar, Membership

admin.site.register(UserProfile)
admin.site.register(Task)
admin.site.register(Friendship)
admin.site.register(SharedTask)
admin.site.register(SharedCalendar)
admin.site.register(Membership)
admin.site.register(FriendRequest)
#admin.site.register(Test)

# admin.site.register(CalendarRequests)


