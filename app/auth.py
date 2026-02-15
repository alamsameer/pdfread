from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from gotrue.errors import AuthApiError
from .config import settings

# Initialize Supabase Client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Bearer Token Scheme
security = HTTPBearer()

class UserWrapper:
    def __init__(self, user_data):
        self.id = getattr(user_data, "id", None)
        if not self.id and isinstance(user_data, dict):
             self.id = user_data.get("id")
        self.email = getattr(user_data, "email", None)
        if not self.email and isinstance(user_data, dict):
             self.email = user_data.get("email")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the JWT token using Supabase logic.
    Returns a standardized user object with .id attribute.
    """
    token = credentials.credentials
    
    try:
        # Verify user using Supabase Auth
        user_response = supabase.auth.get_user(token)
        
        # Debug logging to see what we actually get
        # import logging
        # logger = logging.getLogger("auth")
        # logger.info(f"User Response Type: {type(user_response)}")
        # logger.info(f"User Response: {user_response}")

        user = None
        
        # Supabase-py v2 often returns a UserResponse object where .user is the User object
        if hasattr(user_response, "user") and user_response.user:
            user = user_response.user
        elif isinstance(user_response, dict) and "user" in user_response:
             user = user_response["user"]
        else:
             # Fallback: maybe it IS the user object?
             user = user_response

        if not user:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # If user is a User object (pydantic model), it has .id
        # If it's a dict, safely extract.
        # Our wrapper handles both.
        return UserWrapper(user)
        
    except Exception as e:
        # logger.error(f"Auth failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
