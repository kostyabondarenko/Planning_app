from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, goals, todos, goals_v2, tasks, calendar


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Goal Navigator API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(goals.router)
app.include_router(todos.router)
app.include_router(goals_v2.router)  # API v2 для страницы "Цели"
app.include_router(tasks.router)  # API для страницы "Ближайшие дни"
app.include_router(calendar.router)  # API для страницы "Календарь"


@app.get("/")
async def root():
    return {"message": "Welcome to Goal Navigator API"}
