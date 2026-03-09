import json
import os
import sys

# Add the project root strictly to pythonpath
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.openapi.utils import get_openapi
from app.main import app

def main():
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version="3.0.3",
        description=app.description,
        routes=app.routes,
    )
    
    # We recursively convert them to standard nullable OpenAPI 3.0 types
    # We ALSO remove 'format: date-time' because FastAPI naive dates fail to parse in strict Go time
    def remove_unsupported_schemas(d):
        if isinstance(d, dict):
            if "anyOf" in d and len(d["anyOf"]) == 2:
                types = [item.get("type") for item in d["anyOf"] if isinstance(item, dict)]
                if "null" in types:
                    non_null_item = next((item for item in d["anyOf"] if item.get("type") != "null"), None)
                    if non_null_item:
                        del d["anyOf"]
                        d.update(non_null_item)
                        d["nullable"] = True
            if d.get("format") == "date-time":
                del d["format"]
            for k, v in list(d.items()):
                remove_unsupported_schemas(v)
        elif isinstance(d, list):
            for item in d:
                remove_unsupported_schemas(item)
                
    remove_unsupported_schemas(openapi_schema)
    
    output_path = os.path.join(os.path.dirname(__file__), '..', 'openapi-generated.json')
    with open(output_path, 'w') as f:
        json.dump(openapi_schema, f, indent=2)
        
    print(f"OpenAPI spec successfully exported to {output_path}")

if __name__ == "__main__":
    main()
