from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Dependency injected into route handlers.
    Yields a DB session and always closes it — even if the route raises an error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
