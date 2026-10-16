from pathlib import Path
from sqlmodel import Session, SQLModel, create_engine
database_path = Path(__file__).resolve().parent / "studysync.db"

engine = create_engine(f"sqlite:///{database_path}", 
                       connect_args={"check_same_thread" : False},)
def create_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
