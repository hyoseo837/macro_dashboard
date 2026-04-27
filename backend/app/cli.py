import argparse
import asyncio

from sqlalchemy import select

from .auth import hash_password
from .db import SessionLocal
from .models import User


async def _create_admin(email: str, password: str) -> None:
    async with SessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            print(f"User {email} already exists")
            return

        user = User(
            email=email,
            hashed_password=hash_password(password),
            is_admin=True,
        )
        db.add(user)
        await db.commit()
        print(f"Admin user created: {email}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="macro-cli")
    sub = parser.add_subparsers(dest="command")

    create_admin = sub.add_parser("create-admin")
    create_admin.add_argument("--email", required=True)
    create_admin.add_argument("--password", required=True)

    args = parser.parse_args()

    if args.command == "create-admin":
        if len(args.password) < 8:
            print("Error: password must be at least 8 characters")
            return
        asyncio.run(_create_admin(args.email, args.password))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
