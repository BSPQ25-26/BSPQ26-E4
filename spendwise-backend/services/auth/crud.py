from core.database import supabase


def register_user(email: str, password: str, full_name: str = None):
    res = supabase.auth.sign_up({"email": email, "password": password})
    if res.user:
        profile_data = {"id": str(res.user.id), "email": email}
        if full_name:
            profile_data["full_name"] = full_name
        supabase.table("user_profiles").insert(profile_data).execute()
    return res


def login_user(email: str, password: str):
    return supabase.auth.sign_in_with_password({"email": email, "password": password})


def get_profile(user_id: str):
    res = supabase.table("user_profiles").select("*").eq("id", user_id).single().execute()
    return res.data


def update_profile(user_id: str, data: dict):
    res = supabase.table("user_profiles").update(data).eq("id", user_id).execute()
    return res.data[0] if res.data else None
