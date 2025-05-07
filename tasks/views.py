from organizer import settings
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import UserProfile, Friendship, FriendRequest, Task, SharedTask, SharedCalendar, Membership, UserAchievement, Achievement, UserStats, CalendarStats
from .serializers import   UserProfileUpdateSerializer, TaskSerializer, SharedCalendarSerializer, SharedTaskSerializer, MembershipSerializer, AchievementSerializer, UserAchievementSerializer, UserStatsSerializer, CalendarStatsSerializer, LeaderboardSerializer
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils.timezone import now
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction

def index(request):
    return render(request, 'tasks/index.html')

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    print({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    })
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

@api_view(['POST'])
def token_refresh(request):
    refresh_token = request.data.get('refresh')
    
    if not refresh_token:
        return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        refresh = RefreshToken(refresh_token)
        data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh) 
        }
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def signup(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if len(password) < 8:
        return Response({'error': 'Password is too short, must be at least 8 characters'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already exists'}, status=400)

    try:
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password, email=email)

            if not UserProfile.objects.filter(user=user).exists():
                UserProfile.objects.create(user=user, email=email)

            return Response({'message': 'User created successfully'}, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    if user:
        return Response(get_tokens_for_user(user), status=200)
    return Response({'error': 'Invalid credentials'}, status=401)

@api_view(['GET'])
def get_profile(request, username):
    user = get_object_or_404(User, username=username)
    profile = UserProfile.objects.get(user=user)
    friends = [f.friend.username for f in Friendship.objects.filter(user=user)]
    
    return JsonResponse({
        "username": user.username,
        "email": user.email,
        "bio": profile.bio,
        "birth_date": profile.birth_date,
        "profile_picture": profile.profile_picture.name if profile.profile_picture else None,
        "friends": friends,
    })

@api_view(['PUT'])
@authentication_classes([JWTAuthentication])  
@permission_classes([IsAuthenticated]) 
def update_profile(request, username):

    print("Received Headers:", request.headers)
    print("User:", request.user)
    print("Auth:", request.auth)

    if request.user.username != username:
        return Response({"error": "You can only update your own profile."}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserProfileUpdateSerializer(request.user.profile, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])  
@permission_classes([IsAuthenticated]) 
def add_friend(request):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=401)
    
    friend_username = request.data.get('friend_username')
    if not friend_username:
        return Response({'detail': 'Friend username is required.'}, status=400)

    try:
        user = request.user
        friend = User.objects.get(username=friend_username)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)
    
    if Friendship.objects.filter(user=user, friend=friend).exists() or Friendship.objects.filter(user=friend, friend=user).exists():
        return Response({'detail': 'You are already friends.'}, status=400)
    
    Friendship.objects.create(user=user, friend=friend)
    Friendship.objects.create(user=friend, friend=user)  
    
    return Response({'message': f'{friend_username} added as a friend!'})


@api_view(['GET'])
def search_users(request):
    query = request.GET.get('username', '')  
    if query:
        users = User.objects.filter(username__icontains=query, is_active=True) 
        usernames = [user.username for user in users]
        return Response(usernames)  
    return Response([]) 


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    receiver_username = request.data.get('receiver_username')

    if not receiver_username:
        return Response({"error": "Receiver username is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        receiver = User.objects.get(username=receiver_username)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if FriendRequest.objects.filter(sender=request.user, receiver=receiver, status='pending').exists():
        return Response({"error": "Friend request already sent."}, status=status.HTTP_400_BAD_REQUEST)

    FriendRequest.objects.create(sender=request.user, receiver=receiver)
    return Response({"message": "Friend request sent!"}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def accept_friend_request(request):
    sender_username = request.data.get('sender_username')

    if not sender_username:
        return Response({"error": "Sender username is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sender = User.objects.get(username=sender_username)
        friend_request = FriendRequest.objects.get(sender=sender, receiver=request.user, status='pending')
    except (User.DoesNotExist, FriendRequest.DoesNotExist):
        return Response({"error": "Friend request not found."}, status=status.HTTP_404_NOT_FOUND)

    friend_request.status = 'accepted'
    friend_request.save()

    Friendship.objects.create(user=request.user, friend=sender)
    Friendship.objects.create(user=sender, friend=request.user)

    return Response({"message": f"You are now friends with {sender.username}!"}, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def reject_friend_request(request):
    sender_username = request.data.get('sender_username')

    if not sender_username:
        return Response({"error": "Sender username is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sender = User.objects.get(username=sender_username)
        friend_request = FriendRequest.objects.get(sender=sender, receiver=request.user, status='pending')
    except (User.DoesNotExist, FriendRequest.DoesNotExist):
        return Response({"error": "Friend request not found."}, status=status.HTTP_404_NOT_FOUND)

    friend_request.status = 'rejected'
    friend_request.save()

    return Response({"message": "Friend request rejected."}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_friend_requests(request):
    friend_requests = FriendRequest.objects.filter(receiver=request.user, status='pending')
    request_list = [{"sender": fr.sender.username, "created_at": fr.created_at} for fr in friend_requests]
    return Response({"pending_requests": request_list}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_my_friends(request):
    user = request.user
    friends = Friendship.objects.filter(user=user).select_related('friend')
    friend_usernames = [{"id": f.friend.id, "username": f.friend.username} for f in friends]
    return JsonResponse(friend_usernames, safe=False)


@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def remove_friend(request):
    friend_username = request.data.get("friend_username")

    try:
        friend = User.objects.get(username=friend_username)

        friendship = Friendship.objects.filter(
            Q(user=request.user, friend=friend) | Q(user=friend, friend=request.user)
        )

        if friendship.exists():
            friendship.delete()

            FriendRequest.objects.filter(
                Q(sender=request.user, receiver=friend) | Q(sender=friend, receiver=request.user)
            ).delete()

            return Response({"message": "Friend removed successfully."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Friendship not found."}, status=status.HTTP_404_NOT_FOUND)

    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    

@api_view(['GET'])
@authentication_classes([JWTAuthentication])  
@permission_classes([IsAuthenticated])
def get_tasks(request):
    print(f"User: {request.user}")
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=401)

    date = request.query_params.get('date', now().date())

    tasks = Task.objects.filter(user=request.user, date=date)
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])  
@permission_classes([IsAuthenticated])
def add_task(request):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=401)

    task_data = request.data
    task_data['user'] = request.user.id  

    serializer = TaskSerializer(data=task_data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def edit_task(request, task_id):
    try:
        task = Task.objects.get(id=task_id, user=request.user)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found or you do not have permission to edit this task.'}, status=status.HTTP_404_NOT_FOUND)

    task_data = request.data
    task.title = task_data.get('title', task.title)
    task.description = task_data.get('description', task.description)
    task.date = task_data.get('date', task.date)

    task.save()

    serializer = TaskSerializer(task)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_task(request, task_id):
    try:
        task = Task.objects.get(id=task_id, user=request.user)
        task.delete()
        return Response({'message': 'Task deleted successfully.'}, status=status.HTTP_200_OK)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found or you do not have permission to delete this task.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def toggle_task_completion(request, task_id):
    try:
        task = Task.objects.get(id=task_id, user=request.user)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found or you do not have permission to toggle completion of this task.'}, status=status.HTTP_404_NOT_FOUND)

    was_completed = task.completed
    task.completed = not task.completed
    task.save()
    
    if not was_completed and task.completed:
        from .service import update_task_completion_stats
        update_task_completion_stats(request.user)

    serializer = TaskSerializer(task)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def list_shared_calendars(request):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=401)

    calendars = SharedCalendar.objects.filter(
        Q(owner=request.user) | Q(memberships__receiver=request.user, memberships__status='accepted')
    ).distinct()

    # Get pending invitations
    pending_invites = Membership.objects.filter(
        receiver=request.user,
        status='pending'
    )

    calendars_serializer = SharedCalendarSerializer(calendars, many=True)
    invites_serializer = MembershipSerializer(pending_invites, many=True)

    return Response({
        'calendars': calendars_serializer.data,
        'pending_invites': invites_serializer.data,
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def create_shared_calendar(request):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=401)

    name = request.data.get('name')

    if not name:
        return Response({'detail': 'Missing calendar name.'}, status=status.HTTP_400_BAD_REQUEST)

    calendar = SharedCalendar.objects.create(name=name, owner=request.user)

    return Response(SharedCalendarSerializer(calendar).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def invite_to_calendar(request):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=401)

    calendar_id = request.data.get('calendar_id')
    receiver_id = request.data.get('receiver_id')

    if not calendar_id or not receiver_id:
        return Response({'detail': 'Missing calendar_id or receiver_id.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        calendar = SharedCalendar.objects.get(id=calendar_id)
    except SharedCalendar.DoesNotExist:
        return Response({'detail': 'Calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        receiver = User.objects.get(id=receiver_id)
    except User.DoesNotExist:
        return Response({'detail': 'Receiver not found.'}, status=status.HTTP_404_NOT_FOUND)

    if Membership.objects.filter(calendar=calendar, receiver=receiver).exists():
        return Response({'detail': 'Invitation already sent or user already invited.'}, status=status.HTTP_400_BAD_REQUEST)

    Membership.objects.create(
        calendar=calendar,
        sender=request.user,
        receiver=receiver,
        status='pending'
    )

    return Response({'detail': 'Invitation sent successfully.'}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def accept_calendar_invite(request):
    membership_id = request.data.get('membership_id')

    if not membership_id:
        return Response({'detail': 'Missing membership_id.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invite = Membership.objects.get(id=membership_id, receiver=request.user)
    except Membership.DoesNotExist:
        return Response({'detail': 'Invitation not found.'}, status=status.HTTP_404_NOT_FOUND)

    if invite.status != 'pending':
        return Response({'detail': 'This invitation is already handled.'}, status=status.HTTP_400_BAD_REQUEST)

    invite.status = 'accepted'
    invite.save()

    return Response({'detail': 'Invitation accepted.'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def decline_calendar_invite(request):
    membership_id = request.data.get('membership_id')

    if not membership_id:
        return Response({'detail': 'Missing membership_id.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invite = Membership.objects.get(id=membership_id, receiver=request.user)
    except Membership.DoesNotExist:
        return Response({'detail': 'Invitation not found.'}, status=status.HTTP_404_NOT_FOUND)

    if invite.status != 'pending':
        return Response({'detail': 'This invitation is already handled.'}, status=status.HTTP_400_BAD_REQUEST)

    invite.status = 'rejected'
    invite.save()

    return Response({'detail': 'Invitation rejected.'}, status=status.HTTP_200_OK)



@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def list_calendar_invites(request):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=401)

    invites = Membership.objects.filter(receiver=request.user, status='pending')

    data = [
        {
            'membership_id': invite.id,
            'calendar_name': invite.calendar.name,
            'sender_username': invite.sender.username,
        }
        for invite in invites
    ]

    return Response(data, status=status.HTTP_200_OK)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def add_shared_task(request, calendar_id):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)

    title = request.data.get('title')
    description = request.data.get('description', '')
    date = request.data.get('date')

    if not title or not date:
        return Response({'detail': 'Missing required fields: title or date.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        shared_calendar = SharedCalendar.objects.get(id=calendar_id)
    except SharedCalendar.DoesNotExist:
        return Response({'detail': 'Shared calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

    shared_task = SharedTask(
        calendar=shared_calendar,
        title=title,
        description=description,
        date=date,
        completed=False
    )
    shared_task.save()

    serializer = SharedTaskSerializer(shared_task)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def edit_shared_task(request, calendar_id, shared_task_id):
    try:
        shared_task = SharedTask.objects.get(id=shared_task_id)

        if shared_task.calendar.owner != request.user and not shared_task.calendar.memberships.filter(receiver=request.user, status='accepted').exists():
            return Response({'error': 'You are neither the owner nor a member of this shared calendar.'}, status=status.HTTP_403_FORBIDDEN)

        shared_task.title = request.data.get('title', shared_task.title)
        shared_task.description = request.data.get('description', shared_task.description)
        shared_task.date = request.data.get('date', shared_task.date)

        shared_task.save()

        serializer = SharedTaskSerializer(shared_task)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except SharedTask.DoesNotExist:
        return Response({'error': 'Shared task not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_shared_task(request, calendar_id, shared_task_id):
    try:
        shared_task = SharedTask.objects.get(id=shared_task_id)

        if shared_task.calendar.owner != request.user and not shared_task.calendar.memberships.filter(receiver=request.user, status='accepted').exists():
            return Response({'error': 'You are neither the owner nor a member of this shared calendar.'}, status=status.HTTP_403_FORBIDDEN)

        shared_task.delete()
        return Response({'message': 'Shared task deleted successfully.'}, status=status.HTTP_200_OK)

    except SharedTask.DoesNotExist:
        return Response({'error': 'Shared task not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def toggle_shared_task_completion(request, calendar_id, shared_task_id):
    try:
        shared_task = SharedTask.objects.get(id=shared_task_id)
        calendar = SharedCalendar.objects.get(id=calendar_id)

        if shared_task.calendar.owner != request.user and not shared_task.calendar.memberships.filter(receiver=request.user, status='accepted').exists():
            return Response({'error': 'You are neither the owner nor a member of this shared calendar.'}, status=status.HTTP_403_FORBIDDEN)

        was_completed = shared_task.completed
        shared_task.completed = not shared_task.completed
        shared_task.save()
        
        if not was_completed and shared_task.completed:
            from .service import update_task_completion_stats
            update_task_completion_stats(request.user, calendar)

        serializer = SharedTaskSerializer(shared_task)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except SharedTask.DoesNotExist:
        return Response({'error': 'Shared task not found.'}, status=status.HTTP_404_NOT_FOUND)
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Shared calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_shared_tasks(request, calendar_id):
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication credentials were not provided.'}, status=401)

    task_date = request.query_params.get('date', now().date())

    try:
        shared_calendar = SharedCalendar.objects.get(id=calendar_id)
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Shared calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        if shared_calendar.owner != request.user and not shared_calendar.memberships.filter(receiver=request.user, status='accepted').exists():
            return Response({'error': 'You are neither the owner nor a member of this shared calendar.'}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({'error': f'Error checking membership or ownership: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    tasks = SharedTask.objects.filter(calendar=shared_calendar, date=task_date)

    serializer = SharedTaskSerializer(tasks, many=True)

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_achievements(request):
    user_achievements = UserAchievement.objects.filter(user=request.user).select_related('achievement')
    serializer = UserAchievementSerializer(user_achievements, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_stats(request):
    try:
        user_stats = UserStats.objects.get(user=request.user)
    except UserStats.DoesNotExist:
        user_stats = UserStats.objects.create(user=request.user)
    
    serializer = UserStatsSerializer(user_stats)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_calendar_leaderboard(request, calendar_id):
    try:
        calendar = SharedCalendar.objects.get(id=calendar_id)
        
        has_access = (calendar.owner == request.user or 
                      calendar.memberships.filter(receiver=request.user, status='accepted').exists())
        
        if not has_access:
            return Response(
                {'error': 'You do not have access to this calendar'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        participants = [calendar.owner]
        participants.extend(calendar.accepted_participants())
        
        for user in participants:
            CalendarStats.objects.get_or_create(user=user, calendar=calendar)
        
        leaderboard = CalendarStats.objects.filter(
            calendar=calendar
        ).order_by('-tasks_completed')
        
        serializer = LeaderboardSerializer(leaderboard, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except SharedCalendar.DoesNotExist:
        return Response(
            {'error': 'Calendar not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_available_achievements(request):
    achievements = Achievement.objects.all()
    serializer = AchievementSerializer(achievements, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)