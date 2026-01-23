from fastapi import FastAPI
from .database import engine, Base
from .routers import auth

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Goal Navigator API")

app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Goal Navigator API"}
