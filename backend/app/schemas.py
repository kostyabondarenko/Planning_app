from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

# Схемы для ToDo
class TodoBase(BaseModel):
    title: str
    date: datetime
    is_completed: bool = False
    step_id: Optional[int] = None

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    step_id: Optional[int] = None

class TodoResponse(TodoBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)

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
    progress: float = 0.0
    model_config = ConfigDict(from_attributes=True)

class UserStats(BaseModel):
    total_goals: int
    completed_goals: int
    average_progress: float
    total_steps: int
    completed_steps: int
