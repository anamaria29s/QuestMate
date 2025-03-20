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
from .models import UserProfile, Friendship, FriendRequest
from .serializers import   UserProfileUpdateSerializer
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

def index(request):
    return render(request, 'tasks/index.html')

# Generate JWT Token
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
def signup(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=400)

    user = User.objects.create_user(username=username, password=password)
    return Response(get_tokens_for_user(user), status=201)


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
        "email": user.username,
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