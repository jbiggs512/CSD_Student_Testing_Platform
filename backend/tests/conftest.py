
import os
import uuid

import pytest

from sqlalchemy import create_engine, text, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from fastapi.testclient import TestClient

from app.main import app as fastapi_app
from app.api.deps import get_db
from app.db.base import Base
from app.db.scripts.seed_roles import seed_roles
from app.db.scripts.seed_courses import seed_courses
from app.db.scripts.seed_test import seed_test_data

# Imports for auth fixtures
from app.core.security import hash_password
from app.db.models import Role, User
from app.enums import AccountStatus, UserRole

# Import models so SQLAlchemy registers them with Base.metadata
import app.db.models


@pytest.fixture(scope="session")
def test_database_url():
    """
    Create a temporary PostgreSQL database for the entire test run.
    Drop it once all tests have finished.
    """

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")

    database_name = f"altius_test_{uuid.uuid4().hex[:8]}"

    admin_engine = create_engine(
        database_url,
        isolation_level="AUTOCOMMIT",
    )

    database_created = False

    try:
        with admin_engine.connect() as connection:
            connection.execute(
                text(f'CREATE DATABASE "{database_name}"')
            )

        database_created = True

        # Keep the SQLAlchemy URL object so the password is not masked.
        test_url = admin_engine.url.set(database=database_name)

        yield test_url

    finally:
        if database_created:
            with admin_engine.connect() as connection:
                # Terminate remaining connections before dropping the database.
                connection.execute(
                    text("""
                        SELECT pg_terminate_backend(pid)
                        FROM pg_stat_activity
                        WHERE datname = :database_name
                        AND pid <> pg_backend_pid()
                    """),
                    {"database_name": database_name},
                )

                connection.execute(
                    text(f'DROP DATABASE IF EXISTS "{database_name}"')
                )

        admin_engine.dispose()


@pytest.fixture(scope="session")
def test_engine(test_database_url):
    """
    Create the test database schema and seed baseline data.
    This engine is shared across the test session.
    """

    engine = create_engine(
        test_database_url,
        poolclass=NullPool,
    )

    try:
        Base.metadata.create_all(bind=engine)

        # Seed roles once. These are baseline records shared by all tests.
        TestingSessionLocal = sessionmaker(
            bind=engine,
            autoflush=False,
            autocommit=False,
        )

        with TestingSessionLocal.begin() as db:
            seed_roles(db)
            seed_courses(db)
            seed_test_data(db)

        yield engine

    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture(scope="session")
def session_factory(test_engine):
    """
    Provide a session factory using the temporary PostgreSQL database.
    """

    return sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
    )


@pytest.fixture
def db_session(test_engine):
    """
    Give each test its own transaction.

    All changes made during the test are rolled back afterwards,
    including changes committed by the application.
    """

    connection = test_engine.connect()
    transaction = connection.begin()

    db = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
    )

    try:
        yield db

    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    """
    Provide a FastAPI TestClient using the isolated test database session.
    """

    def override_get_db():
        yield db_session

    # Preserve any existing dependency overrides.
    previous_overrides = fastapi_app.dependency_overrides.copy()

    fastapi_app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(fastapi_app) as test_client:
            yield test_client

    finally:
        fastapi_app.dependency_overrides.clear()
        fastapi_app.dependency_overrides.update(previous_overrides)

@pytest.fixture
def auth_headers(client, db_session):
    """
    Provide a factory for authenticating as different user roles.

    Creates a real user, logs them in through the API,
    and returns their Bearer access token header.
    """

    def _auth_headers(role: UserRole, username: str = None) -> dict:
        role_record = db_session.scalar(
            select(Role).where(Role.role_name == role.value)
        )

        assert role_record is not None

        # Generate a unique username for each test user.
        if username is None:
            username = f"TEST_{role.value}_{uuid.uuid4().hex[:8]}"

        password = "TestPassword123!"

        user = User(
            username=username,
            first_name="Test",
            last_name=role.value.title(),
            email=f"{username}@example.com",
            password_hash=hash_password(password),
            role_id=role_record.role_id,
            account_status=AccountStatus.ACTIVE,
        )

        db_session.add(user)
        db_session.commit()

        # Authenticate through the actual login endpoint.
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": username,
                "password": password,
            },
        )

        assert response.status_code == 200, response.text

        access_token = response.json()["access_token"]

        return {
            "Authorization": f"Bearer {access_token}"
        }

    return _auth_headers