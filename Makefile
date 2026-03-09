.PHONY: all generate build clean init-go

# The name of our generated binary
CLI_BIN = stenella-cli

# Tools installation target
init-go:
	@echo "Installing go tools..."
	go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
	go get github.com/spf13/cobra@latest

# Extract the latest OpenAPI Spec from Python
export-api:
	@echo "Exporting OpenAPI spec from python app..."
	uv run python scripts/export_openapi.py

# Generate the Go Client Code
generate: export-api
	@echo "Generating Go API client..."
	mkdir -p internal/cli/client
	$$(go env GOPATH)/bin/oapi-codegen -generate types,client -package client openapi-generated.json > internal/cli/client/client.gen.go
	go mod tidy

# Build the CLI application
build: generate
	@echo "Building $(CLI_BIN)..."
	go build -o $(CLI_BIN) ./cmd/stenella-cli

# Clean up
clean:
	@echo "Cleaning up..."
	rm -f $(CLI_BIN)
	rm -f openapi-generated.json
	rm -f internal/cli/client/client.gen.go
