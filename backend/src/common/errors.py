"""Structured API errors."""


class ApiError(Exception):
    """An error that is safe to show to the client."""

    def __init__(self, status, code, message, field=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.field = field

    def to_body(self):
        err = {"code": self.code, "message": self.message}
        if self.field:
            err["field"] = self.field
        return {"error": err}


def bad_request(message, field=None):
    return ApiError(400, "validation_error", message, field)


def not_found(what="Resource"):
    return ApiError(404, "not_found", f"{what} not found")


def forbidden(message="You do not have permission to do this"):
    return ApiError(403, "forbidden", message)
