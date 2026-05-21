from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import UserRegister
from app.utils.security import hash_password, verify_password


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email.lower()).first()

    def register(self, data: UserRegister) -> User:
        if self.get_user_by_email(data.email):
            raise ValueError("Email already registered")

        user = User(
            email=data.email.lower(),
            hashed_password=hash_password(data.password),
            full_name=data.full_name.strip(),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> User | None:
        user = self.get_user_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user
