from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import   UserProfile, User, Friendship, Task, SharedCalendar, SharedTask, Membership, Achievement, UserStats, UserAchievement, CalendarStats


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(required=False, allow_blank=True)  
    birth_date = serializers.DateField(required=False, allow_null=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True) 
    friends = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['bio', 'birth_date', 'profile_picture', 'friends']

    def get_friends(self, obj):
        # Get the list of friends from the Friendship model
        friends = Friendship.objects.filter(user=obj.user).values_list('friend__username', flat=True)
        return list(friends)

    def update(self, instance, validated_data):
        instance.bio = validated_data.get('bio', instance.bio)
        instance.birth_date = validated_data.get('birth_date', instance.birth_date)
        
        if 'profile_picture' in validated_data:
            instance.profile_picture = validated_data.get('profile_picture', instance.profile_picture)

        instance.save()
        return instance


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'

class SharedTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedTask
        fields = ['id', 'calendar', 'title', 'description', 'date', 'completed']

        
class SharedCalendarSerializer(serializers.ModelSerializer):
    tasks = SharedTaskSerializer(many=True, read_only=True)
    owner = serializers.SerializerMethodField() 

    class Meta:
        model = SharedCalendar
        fields = ['id', 'name', 'owner', 'tasks']
    
    def get_owner(self, obj):
        return obj.owner.username if obj.owner else None


class MembershipSerializer(serializers.ModelSerializer):
    calendar = SharedCalendarSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'calendar']

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'name', 'description', 'icon', 'requirement_type', 'threshold']


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'date_earned']


class UserStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserStats
        fields = ['total_tasks_completed', 'current_streak', 'longest_streak', 'last_active_date']


class CalendarStatsSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    
    class Meta:
        model = CalendarStats
        fields = ['id', 'user', 'username', 'tasks_completed', 'last_updated']
    
    def get_username(self, obj):
        return obj.user.username if obj.user else None


class LeaderboardSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    
    class Meta:
        model = CalendarStats
        fields = ['username', 'tasks_completed']
    
    def get_username(self, obj):
        return obj.user.username if obj.user else None