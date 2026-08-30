# Python 3.12 to match the version CI tests against — a service that is
# tested on one runtime and shipped on another is only half tested.
FROM python:3.12-slim

WORKDIR /app

# Dependencies before source, so editing app code does not re-run the install.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Non-root, matching backend/Dockerfile. Standard practice for anything
# beyond a local throwaway.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000

# urllib rather than curl: the slim image has no curl, and installing one
# purely for a healthcheck adds a package and an attack surface to every
# deployment. Python is already here.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health').read()"]

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
