import os
import pytest
import importlib
from unittest.mock import patch
from app.core import config

def test_get_settings_reads_from_env_file():
    # Test that get_settings respects ENV_FILE environment variable
    temp_env_path = "env/temp_test.env"
    os.makedirs("env", exist_ok=True)
    with open(temp_env_path, "w") as f:
        f.write("PROJECT_NAME='Dynamic Config Test'\n")
        f.write("FIRST_SUPERUSER='dynamic@test.com'\n")
    
    with patch.dict(os.environ, {"ENV_FILE": temp_env_path}):
        # Reload the module to force re-evaluation of SettingsConfigDict
        importlib.reload(config)
        new_settings = config.Settings()
        assert new_settings.PROJECT_NAME == "Dynamic Config Test"
        assert new_settings.FIRST_SUPERUSER == "dynamic@test.com"
    
    # Clean up and restore original state
    if os.path.exists(temp_env_path):
        os.remove(temp_env_path)
    importlib.reload(config)

def test_env_overrides_env_file():
    # Test that real environment variables still override values in the env_file
    temp_env_path = "env/temp_test_override.env"
    os.makedirs("env", exist_ok=True)
    with open(temp_env_path, "w") as f:
        f.write("PROJECT_NAME='Default from file'\n")
    
    with patch.dict(os.environ, {
        "ENV_FILE": temp_env_path,
        "PROJECT_NAME": "Override from Env"
    }):
        importlib.reload(config)
        new_settings = config.Settings()
        assert new_settings.PROJECT_NAME == "Override from Env"
        
    if os.path.exists(temp_env_path):
        os.remove(temp_env_path)
    importlib.reload(config)

def test_superuser_fallback():
    # Test that settings fallback to defaults if not in any env file
    temp_env_path = "env/temp_test_fallback.env"
    os.makedirs("env", exist_ok=True)
    with open(temp_env_path, "w") as f:
        f.write("PROJECT_NAME='Fallback Test'\\n")
    
    with patch.dict(os.environ, {"ENV_FILE": temp_env_path}):
        importlib.reload(config)
        new_settings = config.Settings()
        # Should use defaults since they aren't in the env file
        assert new_settings.FIRST_SUPERUSER == "admin@smplfd.in"
        assert new_settings.FIRST_SUPERUSER_PASSWORD == "spinner"
        
    if os.path.exists(temp_env_path):
        os.remove(temp_env_path)
    importlib.reload(config)
