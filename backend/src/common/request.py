"""Small wrapper around an API Gateway HTTP API (v2) event."""
import base64
import json

from . import auth
from .errors import bad_request


class Request:
    def __init__(self, event, params=None):
        self.event = event
        self.params = params or {}
        self._user = None
        self._body = None

    @property
    def user(self):
        if self._user is None:
            self._user = auth.current_user(self.event)
        return self._user

    @property
    def is_admin(self):
        return auth.is_admin(self.event)

    @property
    def query(self):
        return self.event.get("queryStringParameters") or {}

    @property
    def body(self):
        """Parsed JSON object. Unknown keys are ignored by handlers (never trusted)."""
        if self._body is None:
            raw = self.event.get("body")
            if raw in (None, ""):
                self._body = {}
            else:
                if self.event.get("isBase64Encoded"):
                    raw = base64.b64decode(raw).decode("utf-8")
                if len(raw) > 200_000:
                    raise bad_request("Request body too large")
                try:
                    parsed = json.loads(raw)
                except ValueError:
                    raise bad_request("Body must be valid JSON")
                if not isinstance(parsed, dict):
                    raise bad_request("Body must be a JSON object")
                self._body = parsed
        return self._body
