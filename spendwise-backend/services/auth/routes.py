from fastapi import APIRouter, HTTPException, Depends
from .schemas import RegisterRequest, LoginRequest, ProfileUpdate
from .crud import register_user, login_user, get_profile, update_profile
from app.dependencies import get_current_user

router = APIRouter()


@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    try:
        res = register_user(body.email, body.password, body.full_name)
        return {"message": "User registered", "user_id": str(res.user.id)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: LoginRequest):
    try:
        res = login_user(body.email, body.password)
        return {
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "user_id": str(res.user.id),
            "email": res.user.email,
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    profile = get_profile(str(current_user.id))
    return profile or {"id": str(current_user.id), "email": current_user.email}


@router.put("/me")
async def update_me(body: ProfileUpdate, current_user=Depends(get_current_user)):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = update_profile(str(current_user.id), data)
    return result
