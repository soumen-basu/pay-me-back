# Project Stenella

## Overview
Base framework for creating apps, using Docker for standard deployments using CI/CD, and configuration driven development, so that mocks and stubs can be used in Development and Test environments, and real external APIs are used in Staging and Prod environments.

## System Requirements
1. Use Python, definitely Python3, preferrably v3.12.
1. Use `uv` instead of `pip` to manage dependencies.
1. Prefer `FastAPI` for building webapps.
1. Prefer to use explicit types for Python, for type safety. Use explicit types for function definitions, variable definitions, etc.

## Development Methodology
1. Follow a mix of Spec Driven Development and Test Driven Development: use specs like SystemSpecifications.md, requirements.md, ProductRequirements.md to understand the current feature under development.  Ask questions to resolve ambiguity where required. 
1. Before touching the file system, provide an Implementation Plan for review and approval.
1. Create tests for new features, and report on test coverage before and after the feature code is added.

