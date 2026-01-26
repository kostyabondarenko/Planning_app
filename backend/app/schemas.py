from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Схемы для Шагов
class StepBase(BaseModel):
    title: str
    is_completed: bool = False
    order: int = 0

class StepCreate(StepBase):
    pass

class StepResponse(StepBase):
    id: int
    goal_id: int

    class Config:
        from_attributes = True

# Схемы для Целей
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    status: str = "in_progress"

class GoalCreate(GoalBase):
    pass

class GoalResponse(GoalBase):
    id: int
    user_id: int
    steps: List[StepResponse] = []

    class Config:
        from_attributes = True
