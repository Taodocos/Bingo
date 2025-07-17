#!/bin/bash
PORT=${PORT:-8000}  # Default to 8000 if PORT is not set
gunicorn app:app --bind 0.0.0.0:$PORT