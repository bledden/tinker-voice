# Tinker API Service

FastAPI wrapper for [Thinking Machines Tinker](https://tinker.computer) fine-tuning SDK.

## Why This Service?

Tinker's fine-tuning API requires a Python SDK (`TrainingClient`) to initiate training jobs. This service wraps the SDK in a REST API that ChatMLE's Bun backend can call.

## Deployment

### Railway

```bash
# From tinker-service directory
railway init
railway up
```

### Render

1. Create new Web Service
2. Point to `tinker-service` directory
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Docker

```bash
docker build -t tinker-service .
docker run -p 8000:8000 tinker-service
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/train` | Start a training job |
| GET | `/jobs` | List all jobs |
| GET | `/jobs/{job_id}` | Get job status |
| POST | `/jobs/{job_id}/cancel` | Cancel a job |

## Authentication

Pass your Tinker API key in the `X-Tinker-Key` header:

```bash
curl -X POST http://localhost:8000/train \
  -H "X-Tinker-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3-8b", "dataset_url": "https://..."}'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Server port |

## Local Development

```bash
pip install -r requirements.txt
python main.py
```

Then visit http://localhost:8000/docs for interactive API documentation.
