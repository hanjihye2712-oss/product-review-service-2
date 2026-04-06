from fastapi import FastAPI  
  
app = FastAPI(title="AI Server")  
  
@app.get("/")  
def root():  
    return {"message": "AI server is running"}