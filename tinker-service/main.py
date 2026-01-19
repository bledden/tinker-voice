"""
Tinker API Service - FastAPI wrapper for Thinking Machines Tinker SDK
Enables fine-tuning through ChatMLE without direct SDK integration in the frontend.
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os

app = FastAPI(
    title="Tinker API Service",
    description="Proxy service for Thinking Machines Tinker fine-tuning API",
    version="0.1.0"
)

# CORS for ChatMLE frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class TrainRequest(BaseModel):
    model: str
    dataset_url: str
    training_type: str = "lora"  # lora, qlora, full
    epochs: int = 3
    learning_rate: float = 2e-5
    batch_size: int = 4


class TrainResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, running, completed, failed
    progress: Optional[float] = None
    current_step: Optional[int] = None
    total_steps: Optional[int] = None
    loss: Optional[float] = None
    error: Optional[str] = None
    model_id: Optional[str] = None  # Available when completed


class ListJobsResponse(BaseModel):
    jobs: List[JobStatus]


# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "tinker-api"}


# Start a training job
@app.post("/train", response_model=TrainResponse)
async def start_training(
    request: TrainRequest,
    x_tinker_key: str = Header(..., alias="X-Tinker-Key")
):
    """
    Start a new fine-tuning job with Tinker.

    Requires X-Tinker-Key header with your Tinker API key.
    """
    try:
        # Import Tinker SDK
        from tinker import TrainingClient

        client = TrainingClient(api_key=x_tinker_key)

        # Start training job
        job = client.train(
            model=request.model,
            dataset=request.dataset_url,
            training_type=request.training_type,
            epochs=request.epochs,
            learning_rate=request.learning_rate,
            batch_size=request.batch_size,
        )

        return TrainResponse(
            job_id=job.id,
            status="pending",
            message=f"Training job started for model {request.model}"
        )

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Tinker SDK not installed. Run: pip install tinker-sdk"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get job status
@app.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(
    job_id: str,
    x_tinker_key: str = Header(..., alias="X-Tinker-Key")
):
    """
    Get the status of a training job.
    """
    try:
        from tinker import RestClient

        client = RestClient(api_key=x_tinker_key)
        job = client.get_training_run(job_id)

        return JobStatus(
            job_id=job.id,
            status=job.status,
            progress=getattr(job, 'progress', None),
            current_step=getattr(job, 'current_step', None),
            total_steps=getattr(job, 'total_steps', None),
            loss=getattr(job, 'loss', None),
            error=getattr(job, 'error', None),
            model_id=getattr(job, 'model_id', None),
        )

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Tinker SDK not installed. Run: pip install tinker-sdk"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# List all jobs
@app.get("/jobs", response_model=ListJobsResponse)
async def list_jobs(
    x_tinker_key: str = Header(..., alias="X-Tinker-Key"),
    limit: int = 20
):
    """
    List all training jobs for the account.
    """
    try:
        from tinker import RestClient

        client = RestClient(api_key=x_tinker_key)
        jobs = client.list_training_runs(limit=limit)

        return ListJobsResponse(
            jobs=[
                JobStatus(
                    job_id=job.id,
                    status=job.status,
                    progress=getattr(job, 'progress', None),
                    current_step=getattr(job, 'current_step', None),
                    total_steps=getattr(job, 'total_steps', None),
                    loss=getattr(job, 'loss', None),
                    error=getattr(job, 'error', None),
                    model_id=getattr(job, 'model_id', None),
                )
                for job in jobs
            ]
        )

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Tinker SDK not installed. Run: pip install tinker-sdk"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Cancel a job
@app.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    x_tinker_key: str = Header(..., alias="X-Tinker-Key")
):
    """
    Cancel a running training job.
    """
    try:
        from tinker import RestClient

        client = RestClient(api_key=x_tinker_key)
        client.cancel_training_run(job_id)

        return {"message": f"Job {job_id} cancellation requested"}

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Tinker SDK not installed. Run: pip install tinker-sdk"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
