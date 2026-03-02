from app.core.security import validate_password_complexity

def test_validate_password_complexity_valid():
    assert validate_password_complexity("Strong!Pass123_") is True
    assert validate_password_complexity("1aA!1234") is True

def test_validate_password_complexity_invalid_length():
    assert validate_password_complexity("Short1!") is False # 7 chars
    assert validate_password_complexity("VeryLongPasswordThatExceedsThirtyTwoCharacters!1") is False # 48 chars

def test_validate_password_complexity_missing_components():
    assert validate_password_complexity("nouppercase1!") is False
    assert validate_password_complexity("NOLOWERCASE1!") is False
    assert validate_password_complexity("NoDigitsHere!") is False
    assert validate_password_complexity("NoSpecialChar123") is False
