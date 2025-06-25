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
from .models import UserProfile, Friendship, FriendRequest, Task, SharedTask, SharedCalendar, Membership, UserAchievement, Achievement, UserStats, CalendarStats, TaskCategory, SharedTaskCategory
from .serializers import   UserProfileUpdateSerializer, TaskSerializer, SharedCalendarSerializer, SharedTaskSerializer, MembershipSerializer, AchievementSerializer, UserAchievementSerializer, UserStatsSerializer, CalendarStatsSerializer, LeaderboardSerializer, TaskCategorySerializer, SharedTaskCategorySerializer
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils.timezone import now
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q

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

    is_all_day = task_data.get('is_all_day', True)
    if is_all_day == 'false' or is_all_day == False:
        task_data['is_all_day'] = False
        
        start_time = task_data.get('start_time')
        end_time = task_data.get('end_time')
        
        if not start_time or not end_time:
            return Response({
                'error': 'Start time and end time are required for non-all-day tasks.'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        task_data['is_all_day'] = True
        task_data['start_time'] = None
        task_data['end_time'] = None
        
    # Handle priority validation
    priority = task_data.get('priority', 'medium')
    valid_priorities = ['low', 'medium', 'high']
    if priority not in valid_priorities:
        return Response({
            'error': f'Invalid priority. Must be one of: {", ".join(valid_priorities)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle category
    category_id = task_data.get('category')
    if category_id:
        try:
            # Verify category belongs to the user
            category = TaskCategory.objects.get(id=category_id, user=request.user)
        except TaskCategory.DoesNotExist:
            return Response({
                'error': 'Category not found or you do not have permission to use this category.'
            }, status=status.HTTP_400_BAD_REQUEST)

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
        return Response({'error': 'Task not found or you do not have permission to edit this task.'}, 
                       status=status.HTTP_404_NOT_FOUND)

    task_data = request.data
    is_all_day = task_data.get('is_all_day', task.is_all_day)
    
    if is_all_day == 'false' or is_all_day == False:
        task.is_all_day = False
        
        start_time = task_data.get('start_time')
        end_time = task_data.get('end_time')
        
        if not start_time or not end_time:
            return Response({
                'error': 'Start time and end time are required for non-all-day tasks.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        task.start_time = start_time
        task.end_time = end_time
    else:
        task.is_all_day = True
        task.start_time = None
        task.end_time = None

    task.title = task_data.get('title', task.title)
    task.description = task_data.get('description', task.description)
    task.date = task_data.get('date', task.date)
    
    # Handle priority update
    priority = task_data.get('priority')
    if priority is not None:
        valid_priorities = ['low', 'medium', 'high']
        if priority not in valid_priorities:
            return Response({
                'error': f'Invalid priority. Must be one of: {", ".join(valid_priorities)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        task.priority = priority
    

    # Handle category update
    category_id = task_data.get('category')
    if category_id is not None:
        if category_id == "":  # Remove category
            task.category = None
        else:
            try:
                category = TaskCategory.objects.get(id=category_id, user=request.user)
                task.category = category
            except TaskCategory.DoesNotExist:
                return Response({
                    'error': 'Category not found or you do not have permission to use this category.'
                }, status=status.HTTP_400_BAD_REQUEST)

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

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def shared_calendar_detail(request, calendar_id):

    try:
        calendar = SharedCalendar.objects.get(id=calendar_id)
        
        is_owner = calendar.owner == request.user
        is_member = Membership.objects.filter(
            calendar=calendar,
            receiver=request.user,
            status='accepted'
        ).exists()
        
        if not (is_owner or is_member):
            return Response({'detail': 'You do not have access to this calendar.'}, status=403)
        
        serializer = SharedCalendarSerializer(calendar)
        calendar_data = serializer.data
        
        calendar_data['is_owner'] = is_owner
        calendar_data['member_count'] = calendar.memberships.filter(status='accepted').count() + 1  
        
        return Response(calendar_data)
        
    except SharedCalendar.DoesNotExist:
        return Response({'detail': 'Calendar not found.'}, status=404)
    except Exception as e:
        print(f"Error in shared_calendar_detail: {e}")
        return Response({'detail': 'An error occurred while fetching calendar details.'}, status=500)
    
@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_shared_calendar(request, calendar_id):
    try:
        calendar = get_object_or_404(SharedCalendar, id=calendar_id)
        
        if calendar.owner != request.user:
            return Response({
                'detail': 'Only the calendar owner can delete this calendar.'
            }, status=403)
        
        calendar_name = calendar.name
        
        with transaction.atomic():
            SharedTask.objects.filter(calendar=calendar).delete()
            
            Membership.objects.filter(calendar=calendar).delete()
            
            SharedTaskCategory.objects.filter(calendar=calendar).delete()
            
            calendar.delete()
        
        return Response({
            'detail': f'Calendar "{calendar_name}" has been successfully deleted.',
            'success': True
        }, status=200)
        
    except SharedCalendar.DoesNotExist:
        return Response({
            'detail': 'Calendar not found.'
        }, status=404)
    except Exception as e:
        print(f"Error deleting shared calendar: {e}")
        return Response({
            'detail': 'An error occurred while deleting the calendar.',
            'success': False
        }, status=500)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def leave_shared_calendar(request, calendar_id):
    try:
        calendar = get_object_or_404(SharedCalendar, id=calendar_id)
        
        if calendar.owner == request.user:
            return Response({
                'detail': 'Calendar owners cannot leave their own calendar. Delete the calendar instead.'
            }, status=400)
        
        try:
            membership = Membership.objects.get(
                calendar=calendar,
                receiver=request.user,
                status='accepted'
            )
            membership.delete()
            
            return Response({
                'detail': f'You have successfully left "{calendar.name}".',
                'success': True
            }, status=200)
            
        except Membership.DoesNotExist:
            return Response({
                'detail': 'You are not a member of this calendar.'
            }, status=400)
        
    except SharedCalendar.DoesNotExist:
        return Response({
            'detail': 'Calendar not found.'
        }, status=404)
    except Exception as e:
        print(f"Error leaving shared calendar: {e}")
        return Response({
            'detail': 'An error occurred while leaving the calendar.',
            'success': False
        }, status=500)
    
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
        return Response({'detail': 'Authentication credentials were not provided.'}, 
                       status=status.HTTP_401_UNAUTHORIZED)

    title = request.data.get('title')
    description = request.data.get('description', '')
    date = request.data.get('date')
    is_all_day = request.data.get('is_all_day', True)
    start_time = None
    end_time = None
    category_id = request.data.get('category')
    priority = request.data.get('priority', 'medium')

    if not title or not date:
        return Response({'detail': 'Missing required fields: title or date.'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Handle priority validation
    valid_priorities = ['low', 'medium', 'high']
    if priority not in valid_priorities:
        return Response({
            'error': f'Invalid priority. Must be one of: {", ".join(valid_priorities)}'
        }, status=status.HTTP_400_BAD_REQUEST)

    if is_all_day == 'false' or is_all_day is False:
        is_all_day = False
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        
        if not start_time or not end_time:
            return Response({
                'error': 'Start time and end time are required for non-all-day tasks.'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        is_all_day = True

    try:
        shared_calendar = SharedCalendar.objects.get(id=calendar_id)
        # Check if user has access to this calendar
        if shared_calendar.owner != request.user and not shared_calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You do not have permission to add tasks to this calendar.'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        # Check category if provided
        category = None
        if category_id:
            try:
                category = SharedTaskCategory.objects.get(id=category_id, calendar=shared_calendar)
            except SharedTaskCategory.DoesNotExist:
                return Response({
                    'error': 'Category not found or does not belong to this calendar.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        shared_task = SharedTask(
            calendar=shared_calendar,
            title=title,
            description=description,
            date=date,
            created_by=request.user,  # ADD THIS LINE
            is_all_day=is_all_day,
            start_time=start_time,
            end_time=end_time,
            completed=False,
            category=category,
            priority=priority
        )
        shared_task.save()
        print(f"After save, created_by: {shared_task.created_by}")

        serializer = SharedTaskSerializer(shared_task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except SharedCalendar.DoesNotExist:
        return Response({'detail': 'Shared calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def edit_shared_task(request, calendar_id, shared_task_id):
    try:
        shared_task = SharedTask.objects.get(id=shared_task_id)

        if shared_task.calendar.owner != request.user and not shared_task.calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You are neither the owner nor a member of this shared calendar.'}, 
                           status=status.HTTP_403_FORBIDDEN)

        shared_task.title = request.data.get('title', shared_task.title)
        shared_task.description = request.data.get('description', shared_task.description)
        shared_task.date = request.data.get('date', shared_task.date)

        # Handle priority update
        priority = request.data.get('priority')
        if priority is not None:
            valid_priorities = ['low', 'medium', 'high']
            if priority not in valid_priorities:
                return Response({
                    'error': f'Invalid priority. Must be one of: {", ".join(valid_priorities)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            shared_task.priority = priority
        
        is_all_day = request.data.get('is_all_day', shared_task.is_all_day)
        if is_all_day == 'false' or is_all_day is False:
            shared_task.is_all_day = False
            
            start_time = request.data.get('start_time')
            end_time = request.data.get('end_time')
            
            if not start_time or not end_time:
                return Response({
                    'error': 'Start time and end time are required for non-all-day tasks.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            shared_task.start_time = start_time
            shared_task.end_time = end_time
        else:
            shared_task.is_all_day = True
            shared_task.start_time = None
            shared_task.end_time = None
            
        
        # Handle category update
        category_id = request.data.get('category')
        if category_id is not None:
            if category_id == "":  # Remove category
                shared_task.category = None
            else:
                try:
                    category = SharedTaskCategory.objects.get(id=category_id, calendar=shared_task.calendar)
                    shared_task.category = category
                except SharedTaskCategory.DoesNotExist:
                    return Response({
                        'error': 'Category not found or does not belong to this calendar.'
                    }, status=status.HTTP_400_BAD_REQUEST)

        # NOTE: We don't update created_by during editing - it should remain the original creator

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


        if shared_task.completed:
            from .service import decrement_task_completion_stats
            decrement_task_completion_stats(request.user, shared_task.calendar)

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
            # Task marked as complete - increment stats
            from .service import update_task_completion_stats
            update_task_completion_stats(request.user, calendar)
        elif was_completed and not shared_task.completed:
            # Task unmarked (went from complete to incomplete) - decrement stats
            from .service import decrement_task_completion_stats
            decrement_task_completion_stats(request.user, calendar)

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


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def task_category_list(request):
    if request.method == 'GET':
        categories = TaskCategory.objects.filter(user=request.user)
        serializer = TaskCategorySerializer(categories, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = TaskCategorySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def create_task_category(request):
    serializer = TaskSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def update_task_category(request, category_id):
    try:
        category = TaskCategory.objects.get(id=category_id, user=request.user)
    except TaskCategory.DoesNotExist:
        return Response({'error': 'Category not found or you do not have permission.'}, 
                        status=status.HTTP_404_NOT_FOUND)
    
    serializer = TaskCategorySerializer(
        category, 
        data=request.data, 
        partial=True,
        context={'request': request} 
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_task_category(request, category_id):
    try:
        category = TaskCategory.objects.get(id=category_id, user=request.user)
        category.delete()
        return Response({'message': 'Category deleted successfully.'}, status=status.HTTP_200_OK)
    except TaskCategory.DoesNotExist:
        return Response({'error': 'Category not found or you do not have permission.'}, 
                        status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_shared_task_categories(request, calendar_id):
    try:
        calendar = SharedCalendar.objects.get(id=calendar_id)
        if calendar.owner != request.user and not calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You do not have access to this calendar.'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        categories = SharedTaskCategory.objects.filter(calendar=calendar)
        serializer = SharedTaskCategorySerializer(categories, many=True)  # Fixed serializer name
        return Response(serializer.data, status=status.HTTP_200_OK)
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def create_shared_task_category(request, calendar_id):
    try:
        calendar = SharedCalendar.objects.get(id=calendar_id)
        if calendar.owner != request.user and not calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You do not have permission to create categories for this calendar.'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        serializer = SharedTaskCategorySerializer(data=request.data)  # Fixed serializer name
        if serializer.is_valid():
            serializer.save(calendar=calendar)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # Add debugging information
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def update_shared_task_category(request, calendar_id, category_id):
    try:
        calendar = SharedCalendar.objects.get(id=calendar_id)
        if calendar.owner != request.user and not calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You do not have permission to update categories for this calendar.'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        category = SharedTaskCategory.objects.get(id=category_id, calendar=calendar)
        serializer = SharedTaskCategorySerializer(category, data=request.data, partial=True)  # Fixed serializer name
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Add debugging information
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Calendar not found.'}, status=status.HTTP_404_NOT_FOUND)
    except SharedTaskCategory.DoesNotExist:
        return Response({'error': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_shared_task_category(request, calendar_id, category_id):
    try:
        calendar = SharedCalendar.objects.get(id=calendar_id)
        if calendar.owner != request.user and not calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You do not have permission to delete categories for this calendar.'},
                           status=status.HTTP_403_FORBIDDEN)
        
        category = SharedTaskCategory.objects.get(id=category_id, calendar=calendar)
        category.delete()
        return Response({'message': 'Category deleted successfully.'}, status=status.HTTP_200_OK)
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Calendar not found.'}, status=status.HTTP_404_NOT_FOUND)
    except SharedTaskCategory.DoesNotExist:
        return Response({'error': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)
    
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_tasks_by_priority(request, priority_level):
    valid_priorities = ['low', 'medium', 'high']
    if priority_level not in valid_priorities:
        return Response({
            'error': f'Invalid priority level. Must be one of: {", ".join(valid_priorities)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get sort order parameter (default: ascending)
    sort_order = request.GET.get('sort', 'asc').lower()
    if sort_order not in ['asc', 'desc']:
        return Response({
            'error': 'Invalid sort order. Must be "asc" or "desc"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    tasks = Task.objects.filter(user=request.user, priority=priority_level)
    
    # Apply sorting based on sort_order
    if sort_order == 'desc':
        tasks = tasks.order_by('-date', '-start_time')
    else:
        tasks = tasks.order_by('date', 'start_time')
    
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_tasks_sorted_by_priority(request):
    # Get priority sort order parameter
    priority_sort = request.GET.get('priority_sort', 'high_first').lower()
    valid_priority_sorts = ['high_first', 'low_first']
    
    if priority_sort not in valid_priority_sorts:
        return Response({
            'error': f'Invalid priority sort. Must be one of: {", ".join(valid_priority_sorts)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get date sort order parameter
    date_sort = request.GET.get('date_sort', 'asc').lower()
    if date_sort not in ['asc', 'desc']:
        return Response({
            'error': 'Invalid date sort order. Must be "asc" or "desc"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Define priority ordering based on preference
    if priority_sort == 'high_first':
        priority_case = "CASE WHEN priority='high' THEN 1 WHEN priority='medium' THEN 2 WHEN priority='low' THEN 3 END"
    else:  # low_first
        priority_case = "CASE WHEN priority='low' THEN 1 WHEN priority='medium' THEN 2 WHEN priority='high' THEN 3 END"
    
    tasks = Task.objects.filter(user=request.user).extra(
        select={'priority_order': priority_case}
    )
    
    # Apply date sorting
    if date_sort == 'desc':
        tasks = tasks.order_by('priority_order', '-date', '-start_time')
    else:
        tasks = tasks.order_by('priority_order', 'date', 'start_time')
    
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_shared_tasks_by_priority(request, calendar_id, priority_level):
    valid_priorities = ['low', 'medium', 'high']
    if priority_level not in valid_priorities:
        return Response({
            'error': f'Invalid priority level. Must be one of: {", ".join(valid_priorities)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get sort order parameter (default: ascending)
    sort_order = request.GET.get('sort', 'asc').lower()
    if sort_order not in ['asc', 'desc']:
        return Response({
            'error': 'Invalid sort order. Must be "asc" or "desc"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        shared_calendar = SharedCalendar.objects.get(id=calendar_id)
        # Check access permissions
        if shared_calendar.owner != request.user and not shared_calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You do not have permission to view tasks in this calendar.'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        shared_tasks = SharedTask.objects.filter(
            calendar=shared_calendar, 
            priority=priority_level
        )
        
        # Apply sorting based on sort_order
        if sort_order == 'desc':
            shared_tasks = shared_tasks.order_by('-date', '-start_time')
        else:
            shared_tasks = shared_tasks.order_by('date', 'start_time')
        
        serializer = SharedTaskSerializer(shared_tasks, many=True)
        return Response(serializer.data)
        
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Shared calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_shared_tasks_sorted_by_priority(request, calendar_id):
    # Get priority sort order parameter
    priority_sort = request.GET.get('priority_sort', 'high_first').lower()
    valid_priority_sorts = ['high_first', 'low_first']
    
    if priority_sort not in valid_priority_sorts:
        return Response({
            'error': f'Invalid priority sort. Must be one of: {", ".join(valid_priority_sorts)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get date sort order parameter
    date_sort = request.GET.get('date_sort', 'asc').lower()
    if date_sort not in ['asc', 'desc']:
        return Response({
            'error': 'Invalid date sort order. Must be "asc" or "desc"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        shared_calendar = SharedCalendar.objects.get(id=calendar_id)
        # Check access permissions
        if shared_calendar.owner != request.user and not shared_calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You do not have permission to view tasks in this calendar.'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        # Define priority ordering based on preference
        if priority_sort == 'high_first':
            priority_case = "CASE WHEN priority='high' THEN 1 WHEN priority='medium' THEN 2 WHEN priority='low' THEN 3 END"
        else:  # low_first
            priority_case = "CASE WHEN priority='low' THEN 1 WHEN priority='medium' THEN 2 WHEN priority='high' THEN 3 END"
        
        shared_tasks = SharedTask.objects.filter(calendar=shared_calendar).extra(
            select={'priority_order': priority_case}
        )
        
        # Apply date sorting
        if date_sort == 'desc':
            shared_tasks = shared_tasks.order_by('priority_order', '-date', '-start_time')
        else:
            shared_tasks = shared_tasks.order_by('priority_order', 'date', 'start_time')
        
        serializer = SharedTaskSerializer(shared_tasks, many=True)
        return Response(serializer.data)
        
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Shared calendar not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_priority_stats(request):
    # Get sort order for priority stats
    sort_order = request.GET.get('sort', 'asc').lower()
    if sort_order not in ['asc', 'desc']:
        return Response({
            'error': 'Invalid sort order. Must be "asc" or "desc"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    stats_query = Task.objects.filter(user=request.user).values('priority').annotate(
        total=Count('id'),
        completed=Count('id', filter=Q(completed=True)),
        pending=Count('id', filter=Q(completed=False))
    )
    
    if sort_order == 'desc':
        stats = stats_query.order_by('-priority')
    else:
        stats = stats_query.order_by('priority')
    
    return Response(list(stats))

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_shared_priority_stats(request, calendar_id):
    # Get sort order for priority stats
    sort_order = request.GET.get('sort', 'asc').lower()
    if sort_order not in ['asc', 'desc']:
        return Response({
            'error': 'Invalid sort order. Must be "asc" or "desc"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        shared_calendar = SharedCalendar.objects.get(id=calendar_id)
        # Check access permissions
        if shared_calendar.owner != request.user and not shared_calendar.memberships.filter(
                receiver=request.user, status='accepted').exists():
            return Response({'error': 'You do not have permission to view statistics for this calendar.'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        stats_query = SharedTask.objects.filter(calendar=shared_calendar).values('priority').annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(completed=True)),
            pending=Count('id', filter=Q(completed=False))
        )
        
        if sort_order == 'desc':
            stats = stats_query.order_by('-priority')
        else:
            stats = stats_query.order_by('priority')
        
        return Response(list(stats))
        
    except SharedCalendar.DoesNotExist:
        return Response({'error': 'Shared calendar not found.'}, status=status.HTTP_404_NOT_FOUND)