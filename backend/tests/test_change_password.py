from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import HTTPException
import pytest

from app.api.v1.auth import router, schemas, service
from app.core.security import hash_password, verify_password


def test_change_user_password_validates_and_updates() -> None:
    user = SimpleNamespace(password_hash=hash_password("OldPassword123!"))
    db = MagicMock()

    with pytest.raises(HTTPException) as exc_wrong:
        service.change_user_password(db, user, "WrongPassword!", "NewPassword456!")
    assert exc_wrong.value.status_code == 400
    assert exc_wrong.value.detail == "Current password is incorrect."

    with pytest.raises(HTTPException) as exc_same:
        service.change_user_password(db, user, "OldPassword123!", "OldPassword123!")
    assert exc_same.value.status_code == 400

    resp = router.change_password(
        payload=schemas.ChangePasswordRequest(
            current_password="OldPassword123!",
            new_password="NewPassword456!",
        ),
        db=db,
        current_user=user,
    )
    assert resp.message == "Password updated successfully."
    assert verify_password("NewPassword456!", user.password_hash) is True
    db.commit.assert_called_once()
