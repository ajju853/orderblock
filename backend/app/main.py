from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.data.storage import store

app = FastAPI(
    title="BlockMind AI Trading Analysis Engine",
    description="Deterministic Market Structure, Order Block, FVG and Local Ollama Trading Platform",
    version="1.0.0"
)

# Enable CORS for local web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    store.preload_samples()
    print(f"BlockMind AI Engine started with {len(store.list_instruments())} active instruments.")

@app.get("/")
def root():
    return {
        "app": "BlockMind AI",
        "status": "online",
        "docs": "/docs",
        "api_v1": "/api/v1/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
