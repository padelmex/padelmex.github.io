.PHONY: test serve clean

# Run all tests
test:
	@node tests/test-runner.js

# Start development server
serve:
	@echo "Starting development server at http://localhost:8000"
	@python3 -m http.server 8000

# Clean up (currently nothing to clean, but here for future use)
clean:
	@echo "Nothing to clean"

# Default target
.DEFAULT_GOAL := test
