#!/usr/bin/env python3
"""Cliente S3 mínimo (SigV4, Python stdlib only) para o pipeline de mídia.

Camada de transporte do pipeline AID-2925 (ADR AID-2886 ACEITA — R2 + CDN):
fala a API S3-compatível do Cloudflare R2 (endpoint
`https://<account>.r2.cloudflarestorage.com`, região `auto`) ou de qualquer
S3-compatível (MinIO, moto, fake de teste). Sem dependências externas — o
toolchain do substrate é shell + Python stdlib + sha256.

Escopo deliberadamente pequeno: apenas as operações que o pipeline usa
(create/head bucket, put/get/head/delete object, list v2, tagging,
versioning). Nada aqui avalia evidência ou mastery — storage move bytes e
reporta recibos (producer ≠ verifier).

Configuração por ambiente (mesmo contrato do media_pipeline.py):
  ADS_MEDIA_ENDPOINT      ex.: https://<account>.r2.cloudflarestorage.com
  ADS_MEDIA_ACCESS_KEY_ID / ADS_MEDIA_SECRET_ACCESS_KEY
  ADS_MEDIA_REGION        default: auto (R2)
"""

from __future__ import annotations

import base64
import datetime as _dt
import hashlib
import hmac
import http.client
import os
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

S3_ALGO = "AWS4-HMAC-SHA256"


class S3Error(RuntimeError):
    """Erro de API: status HTTP + código + message + requestid (recibo)."""

    def __init__(self, status: int, code: str, message: str, request_id: str = ""):
        super().__init__(f"HTTP {status} {code}: {message} (requestid={request_id})")
        self.status = status
        self.code = code


def content_md64(body: bytes) -> str:
    """Content-MD5 (base64) — exigido pelo S3 em PutObjectTagging/DeleteObjects."""
    return base64.b64encode(hashlib.md5(body).digest()).decode("ascii")


def _hmac(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _uri_encode(value: str, encode_slash: bool = True) -> str:
    safe = "" if encode_slash else "/"
    return urllib.parse.quote(value, safe=safe)


class S3Client:
    def __init__(
        self,
        endpoint: str,
        access_key_id: str,
        secret_access_key: str,
        region: str = "auto",
        bucket: str = "",
    ):
        self.endpoint = endpoint.rstrip("/")
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self.region = region or "auto"
        self.bucket = bucket

    @classmethod
    def from_env(cls, bucket: str = "") -> "S3Client":
        endpoint = os.environ.get("ADS_MEDIA_ENDPOINT", "")
        if not endpoint:
            raise SystemExit(
                "ADS_MEDIA_ENDPOINT ausente (ex.: https://<acct>.r2.cloudflarestorage.com)"
            )
        return cls(
            endpoint=endpoint,
            access_key_id=os.environ.get("ADS_MEDIA_ACCESS_KEY_ID", ""),
            secret_access_key=os.environ.get("ADS_MEDIA_SECRET_ACCESS_KEY", ""),
            region=os.environ.get("ADS_MEDIA_REGION", "auto"),
            bucket=bucket or os.environ.get("ADS_MEDIA_BUCKET", "aidevschool-media"),
        )

    # ---------------------------------------------------------------- request

    def _request(
        self,
        method: str,
        key: str = "",
        query: dict[str, str] | None = None,
        body: bytes = b"",
        headers: dict[str, str] | None = None,
        bucket: str | None = None,
    ) -> http.client.HTTPResponse:
        bucket = self.bucket if bucket is None else bucket
        parsed = urllib.parse.urlparse(self.endpoint)
        host = parsed.netloc
        # path-style: /<bucket>/<key> — suportado por R2, S3 e compatíveis.
        raw_path = "/" + bucket + ("/" + key.lstrip("/") if key else "")
        # canonical URI: cada segmento codificado, barras preservadas.
        canonical_uri = "/" + "/".join(_uri_encode(seg) for seg in raw_path.split("/")[1:])
        query = {k: v for k, v in (query or {}).items() if v is not None}
        sorted_q = sorted(query.items())
        canonical_qs = "&".join(
            f"{_uri_encode(k)}={_uri_encode(str(v))}" for k, v in sorted_q
        )
        request_url = (
            f"{self.endpoint}{urllib.parse.quote(raw_path, safe='/')}"
            + (f"?{urllib.parse.urlencode(query)}" if query else "")
        )

        now = _dt.datetime.now(_dt.timezone.utc)
        amz_date = now.strftime("%Y%m%dT%H%M%SZ")
        date_stamp = now.strftime("%Y%m%d")
        payload_hash = hashlib.sha256(body).hexdigest()
        base_headers = {
            "host": host,
            "x-amz-content-sha256": payload_hash,
            "x-amz-date": amz_date,
        }
        extra = {k.lower(): v for k, v in (headers or {}).items()}
        if body and "content-type" not in extra:
            # urllib default seria x-www-form-urlencoded, que faz gateways
            # WSGI consumirem o stream como form antes do handler ler o XML.
            extra["content-type"] = "application/xml"
        all_headers = {**base_headers, **extra}
        signed = ";".join(sorted(all_headers))
        canonical_headers = "".join(f"{k}:{all_headers[k]}\n" for k in sorted(all_headers))
        canonical_request = "\n".join(
            [method, canonical_uri, canonical_qs, canonical_headers, signed, payload_hash]
        )
        scope = f"{date_stamp}/{self.region}/s3/aws4_request"
        string_to_sign = "\n".join(
            [
                S3_ALGO,
                amz_date,
                scope,
                hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
            ]
        )
        k_date = _hmac(("AWS4" + self.secret_access_key).encode(), date_stamp)
        k_region = _hmac(k_date, self.region)
        k_service = _hmac(k_region, "s3")
        k_signing = _hmac(k_service, "aws4_request")
        signature = hmac.new(
            k_signing, string_to_sign.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        authorization = (
            f"{S3_ALGO} Credential={self.access_key_id}/{scope}, "
            f"SignedHeaders={signed}, Signature={signature}"
        )

        req_headers = {"Authorization": authorization}
        req_headers.update(extra)
        request = urllib.request.Request(
            request_url, data=body if method in ("PUT", "POST") else None, method=method
        )
        for name, value in req_headers.items():
            request.add_unredirected_header(name, value)
        try:
            response = urllib.request.urlopen(request, timeout=60)
        except urllib.error.HTTPError as error:
            raise _wrap_error(error) from error
        return response


def _wrap_error(error) -> S3Error:
    body = error.read()
    code, message, request_id = "", "", ""
    try:
        root = ET.fromstring(body)
        for child in root:
            tag = child.tag.split("}")[1] if "}" in child.tag else child.tag
            if tag == "Code":
                code = child.text or ""
            elif tag == "Message":
                message = child.text or ""
            elif tag == "RequestId":
                request_id = child.text or ""
    except ET.ParseError:
        message = body[:200].decode("utf-8", "replace")
    return S3Error(error.code, code or "Unknown", message, request_id)


# ------------------------------------------------------------------ helpers


def read_response(response) -> bytes:
    return response.read()


def parse_xml(raw: bytes) -> ET.Element:
    return ET.fromstring(raw)
