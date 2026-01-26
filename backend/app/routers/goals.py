from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, auth, database

router = APIRouter(prefix="/goals", tags=["goals"])

@router.post("/", response_model=schemas.GoalResponse)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_goal = models.Goal(**goal.dict(), user_id=current_user.id)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@router.get("/", response_model=List[schemas.GoalResponse])
def get_goals(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()

@router.get("/{goal_id}", response_model=schemas.GoalResponse)
def get_goal(goal_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted"}

# Управление шагами
@router.post("/{goal_id}/steps", response_model=schemas.StepResponse)
def create_step(goal_id: int, step: schemas.StepCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    new_step = models.Step(**step.dict(), goal_id=goal_id)
    db.add(new_step)
    db.commit()
    db.refresh(new_step)
    return new_step
