"""Report file storage. local = folder on disk; supabase = PRIVATE Supabase Storage bucket via the server-side service key.
The service key never leaves the API process; browsers only ever receive short-lived signed /files/<token> links from this API."""
import contextlib, os, tempfile
import httpx
from app.core.config import settings
from app.core.errors import AppError

_http = httpx.request   # tests replace this


def _sb_headers():
    return {"Authorization": f"Bearer {settings.supabase_service_role_key}", "apikey": settings.supabase_service_role_key}


def _sb_url(key: str) -> str:
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{key}"


def put(key: str, data: bytes, mime: str) -> str:
    """Stores bytes and returns the file_ref to keep in the database."""
    if settings.storage_backend == "supabase":
        r = _http("POST", _sb_url(key), content=data, timeout=60, headers={**_sb_headers(), "Content-Type": mime, "x-upsert": "true"})
        if r.status_code >= 300:
            raise AppError(502, "storage_error", "Could not store the file. Please try again.")
        return f"sb:{key}"
    os.makedirs(settings.upload_dir, exist_ok=True)
    path = os.path.join(settings.upload_dir, key.replace("/", "_"))
    with open(path, "wb") as fh:
        fh.write(data)
    return path


def read(ref: str) -> bytes:
    if ref.startswith("sb:"):
        r = _http("GET", _sb_url(ref[3:]), timeout=60, headers=_sb_headers())
        if r.status_code >= 300:
            raise AppError(502, "storage_error", "Could not load the file. Please try again.")
        return r.content
    with open(ref, "rb") as fh:
        return fh.read()


@contextlib.contextmanager
def local_path(ref: str):
    """Yields a filesystem path for OCR/PDF libraries (downloads to a temp file for remote storage, then deletes it)."""
    if not ref.startswith("sb:"):
        yield ref
        return
    fd, tmp = tempfile.mkstemp()
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(read(ref))
        yield tmp
    finally:
        with contextlib.suppress(OSError):
            os.remove(tmp)
