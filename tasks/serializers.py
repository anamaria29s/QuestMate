from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import   UserProfile, User, Friendship, Task, SharedCalendar, SharedTask, Membership, Achievement, UserStats, UserAchievement, CalendarStats, TaskCategory, SharedTaskCategory




class UserProfileUpdateSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(required=False, allow_blank=True)  
    birth_date = serializers.DateField(required=False, allow_null=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True) 
    friends = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()  

    class Meta:
        model = UserProfile
        fields = ['bio', 'birth_date', 'profile_picture', 'friends', 'email']  

    def get_friends(self, obj):
        friends = Friendship.objects.filter(user=obj.user).values_list('friend__username', flat=True)
        return list(friends)

    def get_email(self, obj):  
        return obj.user.email

    def update(self, instance, validated_data):
        instance.bio = validated_data.get('bio', instance.bio)
        instance.birth_date = validated_data.get('birth_date', instance.birth_date)
        
        if 'profile_picture' in validated_data:
            instance.profile_picture = validated_data.get('profile_picture', instance.profile_picture)

        instance.save()
        return instance


class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = ['id', 'name', 'color']
        
    def validate(self, data):
        user = self.context['request'].user
        name = data.get('name')

        queryset = TaskCategory.objects.filter(user=user, name__iexact=name)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)

        if queryset.exists():
            raise serializers.ValidationError("A category with this name already exists.")

        return data


    def create(self, validated_data):
        if 'request' not in self.context:
            raise serializers.ValidationError("Request context required for creation")
            
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)

class SharedTaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedTaskCategory
        fields = ['id', 'name', 'color', 'calendar']
        read_only_fields = ['calendar']  # Calendar is set in the view, not from the request

    def create(self, validated_data):
        return SharedTaskCategory.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.color = validated_data.get('color', instance.color)
        instance.save()
        return instance

class TaskSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = ['id', 'user', 'title', 'description', 'date', 'is_all_day', 
                  'start_time', 'end_time', 'completed', 'category', 
                  'category_name', 'category_color', 'category_id', 'priority']
    
    def get_category_name(self, obj):
        return obj.category.name if obj.category else None
    
    def get_category_color(self, obj):
        return obj.category.color if obj.category else None
    
    def get_category_id(self, obj):
        return obj.category.id if obj.category else None

class SharedCalendarSerializer(serializers.ModelSerializer):
    owner_username = serializers.SerializerMethodField()
    
    class Meta:
        model = SharedCalendar
        fields = ['id', 'name', 'owner', 'owner_username', 'created_at']
    
    def get_owner_username(self, obj):
        return obj.owner.username

class SharedTaskSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    completed_by_username = serializers.SerializerMethodField()
    joined_users = serializers.SerializerMethodField()
    
    class Meta:
        model = SharedTask
        fields = ['id', 'calendar', 'title', 'description', 'date', 'is_all_day', 
                  'start_time', 'end_time', 'completed', 'category',
                  'category_name', 'category_color', 'category_id', 'priority', 
                  'created_by', 'created_by_username', 'completed_by', 'completed_by_username',
                  'joined_users']
    
    def get_category_name(self, obj):
        return obj.category.name if obj.category else None
    
    def get_category_color(self, obj):
        return obj.category.color if obj.category else None
    
    def get_category_id(self, obj):
        return obj.category.id if obj.category else None
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None
    
    def get_completed_by_username(self, obj):
        return obj.completed_by.username if obj.completed_by else None
    
    def get_joined_users(self, obj):
        return [
            {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
            for user in obj.joined_users.all()
        ]
       
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