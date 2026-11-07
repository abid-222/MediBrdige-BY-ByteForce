import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(HTTPException):
    def __init__(self, status: int, code: str, message: str, details=None):
        super().__init__(status_code=status, detail={"code": code, "message": message, "details": details or {}})


def _body(code, message, details=None):
    return {"error": {"code": code, "message": message, "details": details or {}}}


def install_error_handlers(app: FastAPI):
    @app.exception_handler(HTTPException)
    async def http_exc(request: Request, exc: HTTPException):
        d = exc.detail
        if isinstance(d, dict) and "code" in d:
            return JSONResponse(_body(d["code"], d["message"], d.get("details")), status_code=exc.status_code)
        return JSONResponse(_body("http_error", str(d)), status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def val_exc(request: Request, exc: RequestValidationError):
        return JSONResponse(_body("validation_error", "Invalid request", {"errors": jsonable(exc.errors())}), status_code=422)

    @app.exception_handler(Exception)
    async def any_exc(request: Request, exc: Exception):
        rid = getattr(request.state, "request_id", None)
        # Full traceback goes to the server log only (never the response). Passwords/OTPs/tokens are never logged by app code.
        logging.getLogger("medibridge").error("unhandled error rid=%s %s %s", rid, request.method, request.url.path, exc_info=exc)
        return JSONResponse(_body("internal_error", "Something went wrong", {"request_id": rid}), status_code=500)


def jsonable(errs):
    return [{"loc": [str(x) for x in e.get("loc", [])], "msg": str(e.get("msg"))} for e in errs]
