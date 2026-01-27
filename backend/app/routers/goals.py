from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, auth, database

router = APIRouter(prefix="/goals", tags=["goals"])

@router.post("/", response_model=schemas.GoalResponse)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_goal = models.Goal(**goal.model_dump(), user_id=current_user.id)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@router.get("/", response_model=List[schemas.GoalResponse])
def get_goals(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    goals = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()
    for goal in goals:
        total_steps = len(goal.steps)
        if total_steps > 0:
            completed_steps = sum(1 for step in goal.steps if step.is_completed)
            goal.progress = (completed_steps / total_steps) * 100
        else:
            goal.progress = 0.0
    return goals

@router.get("/stats", response_model=schemas.UserStats)
def get_user_stats(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    goals = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()
    
    total_goals = len(goals)
    completed_goals = sum(1 for g in goals if g.status == "completed")
    
    total_steps = 0
    completed_steps = 0
    total_progress = 0.0
    
    for goal in goals:
        goal_total_steps = len(goal.steps)
        goal_completed_steps = sum(1 for s in goal.steps if s.is_completed)
        
        total_steps += goal_total_steps
        completed_steps += goal_completed_steps
        
        if goal_total_steps > 0:
            total_progress += (goal_completed_steps / goal_total_steps) * 100
            
    avg_progress = (total_progress / total_goals) if total_goals > 0 else 0.0
    
    return {
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "average_progress": avg_progress,
        "total_steps": total_steps,
        "completed_steps": completed_steps
    }

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
    
    new_step = models.Step(**step.model_dump(), goal_id=goal_id)
    db.add(new_step)
    db.commit()
    db.refresh(new_step)
    return new_step
