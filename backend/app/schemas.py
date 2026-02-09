from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional, List, Literal
from datetime import datetime, date


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


# ============================================
# Схемы для страницы "Цели" (002-goals-page)
# ============================================


# --- Регулярные действия ---
class RecurringActionBase(BaseModel):
    title: str
    weekdays: List[int]  # [1,3,5] = пн, ср, пт (1-7)

    @field_validator("weekdays")
    @classmethod
    def validate_weekdays(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("weekdays cannot be empty")
        for day in v:
            if day < 1 or day > 7:
                raise ValueError("weekdays must be between 1 and 7")
        return sorted(set(v))


class RecurringActionCreate(RecurringActionBase):
    pass


class RecurringActionResponse(RecurringActionBase):
    id: int
    milestone_id: int
    created_at: Optional[datetime] = None
    completion_percent: float = 0.0  # Вычисляемый процент выполнения
    model_config = ConfigDict(from_attributes=True)


# --- Лог регулярных действий ---
class RecurringActionLogBase(BaseModel):
    date: date
    completed: bool = False


class RecurringActionLogCreate(RecurringActionLogBase):
    pass


class RecurringActionLogResponse(RecurringActionLogBase):
    id: int
    recurring_action_id: int
    model_config = ConfigDict(from_attributes=True)


# --- Однократные действия ---
class OneTimeActionBase(BaseModel):
    title: str
    deadline: date


class OneTimeActionCreate(OneTimeActionBase):
    pass


class OneTimeActionUpdate(BaseModel):
    title: Optional[str] = None
    deadline: Optional[date] = None
    completed: Optional[bool] = None


class OneTimeActionResponse(OneTimeActionBase):
    id: int
    milestone_id: int
    completed: bool = False
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Вехи (Milestones) ---
class MilestoneBase(BaseModel):
    title: str
    start_date: date
    end_date: date
    completion_condition: Optional[str] = None  # например "80%"
    completion_percent: int = 80  # требуемый процент (0-100)

    @field_validator("completion_percent")
    @classmethod
    def validate_completion_percent(cls, v: int) -> int:
        if v < 0 or v > 100:
            raise ValueError("completion_percent must be between 0 and 100")
        return v

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: date, info) -> date:
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class MilestoneCreate(MilestoneBase):
    recurring_actions: List[RecurringActionCreate] = []
    one_time_actions: List[OneTimeActionCreate] = []


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    completion_condition: Optional[str] = None
    completion_percent: Optional[int] = None


# --- Закрытие вехи ---
class MilestoneCloseAction(BaseModel):
    """Действие при закрытии вехи, когда условие не выполнено."""

    action: str  # "close_as_is", "extend", "reduce_percent"
    new_end_date: Optional[date] = None  # Для action="extend"
    new_completion_percent: Optional[int] = None  # Для action="reduce_percent"

    @field_validator("new_completion_percent")
    @classmethod
    def validate_new_percent(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 0 or v > 100):
            raise ValueError("new_completion_percent must be between 0 and 100")
        return v


class MilestoneResponse(MilestoneBase):
    id: int
    goal_id: int
    created_at: Optional[datetime] = None
    recurring_actions: List[RecurringActionResponse] = []
    one_time_actions: List[OneTimeActionResponse] = []
    progress: float = 0.0  # Вычисляемый общий прогресс вехи
    is_closed: bool = False  # Веха официально закрыта
    model_config = ConfigDict(from_attributes=True)


# --- Расширенные схемы Goal для страницы "Цели" ---
class GoalV2Base(BaseModel):
    """Базовая схема для новой версии целей (с периодами)."""

    title: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: Optional[date], info) -> Optional[date]:
        if (
            v
            and "start_date" in info.data
            and info.data["start_date"]
            and v < info.data["start_date"]
        ):
            raise ValueError("end_date must be after start_date")
        return v


class GoalV2Create(GoalV2Base):
    """Создание цели с вехами."""

    milestones: List[MilestoneCreate] = []


class GoalV2Response(GoalV2Base):
    """Ответ с целью и вехами."""

    id: int
    user_id: int
    created_at: Optional[datetime] = None
    milestones: List[MilestoneResponse] = []
    progress: float = 0.0  # Общий прогресс цели
    is_completed: bool = False  # Все вехи закрыты?
    model_config = ConfigDict(from_attributes=True)


# ============================================
# Схемы для страницы "Ближайшие дни" (003-upcoming-page)
# ============================================


class TaskView(BaseModel):
    """Виртуальная модель задачи для Kanban-доски."""

    id: str  # составной ID: "recurring-{action_id}-{date}" или "onetime-{action_id}"
    type: Literal["recurring", "one-time"]
    title: str
    date: date
    milestone_id: int
    milestone_title: str
    completed: bool
    original_id: int  # ID исходного RecurringAction или OneTimeAction
    log_id: Optional[int] = None  # ID RecurringActionLog (только для регулярных)


class TaskRangeResponse(BaseModel):
    """Ответ GET /api/tasks/range."""

    tasks: List[TaskView]


class TaskComplete(BaseModel):
    """Тело PUT /api/tasks/{id}/complete."""

    type: Literal["recurring", "one-time"]
    completed: bool
    date: date
    log_id: Optional[int] = None  # Для регулярных — ID существующего лога


class TaskCompleteResponse(BaseModel):
    """Ответ PUT /api/tasks/{id}/complete."""

    success: bool
    milestone_progress: float


class TaskReschedule(BaseModel):
    """Тело PUT /api/tasks/{id}/reschedule."""

    type: Literal["recurring", "one-time"]
    old_date: date
    new_date: date
    log_id: Optional[int] = None  # Для регулярных — ID существующего лога


class TaskCreate(BaseModel):
    """Тело POST /api/tasks/."""

    type: Literal["recurring", "one-time"]
    title: str
    milestone_id: int
    deadline: Optional[date] = None  # Для однократных
    weekdays: Optional[List[int]] = None  # Для регулярных [1-7]

    @field_validator("weekdays")
    @classmethod
    def validate_weekdays(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None:
            if not v:
                raise ValueError("weekdays cannot be empty")
            for day in v:
                if day < 1 or day > 7:
                    raise ValueError("weekdays must be between 1 and 7")
            return sorted(set(v))
        return v


class TaskCreateResponse(BaseModel):
    """Ответ POST /api/tasks/."""

    id: int
    type: Literal["recurring", "one-time"]
    title: str


# ============================================
# Схемы для страницы "Календарь" (004-calendar-page)
# ============================================


class CalendarGoalBrief(BaseModel):
    """Краткая информация о цели в контексте дня."""

    id: int
    title: str
    color: str  # HEX-цвет цели (берётся из палитры)


class CalendarDayBrief(BaseModel):
    """Краткая информация о дне для календарной сетки."""

    date: date
    tasks_total: int
    tasks_completed: int
    goals: List[CalendarGoalBrief]
    has_milestone: bool
    milestone_title: Optional[str] = None


class CalendarMonthResponse(BaseModel):
    """Ответ GET /api/calendar/month."""

    year: int
    month: int
    days: List[CalendarDayBrief]


class CalendarTaskView(BaseModel):
    """Задача в контексте детализации дня."""

    id: int
    title: str
    type: Literal["recurring", "one-time"]
    goal_id: int
    goal_title: str
    goal_color: str
    completed: bool


class CalendarMilestoneView(BaseModel):
    """Веха в контексте детализации дня."""

    id: int
    title: str
    goal_title: str


class CalendarDayResponse(BaseModel):
    """Ответ GET /api/calendar/day/{date}."""

    date: date
    weekday: str
    goals: List[CalendarGoalBrief]
    tasks: List[CalendarTaskView]
    milestones: List[CalendarMilestoneView]


class TimelineMilestone(BaseModel):
    """Веха в контексте timeline."""

    id: int
    title: str
    completed: bool


class TimelineGoal(BaseModel):
    """Цель с прогрессом и вехами для timeline."""

    id: int
    title: str
    color: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    progress_percent: float
    milestones: List[TimelineMilestone]


class CalendarTimelineResponse(BaseModel):
    """Ответ GET /api/calendar/timeline."""

    goals: List[TimelineGoal]
