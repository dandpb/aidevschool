#!/usr/bin/env python3
"""Cliente PostgreSQL mínimo (wire protocol v3, Python stdlib only).

Camada de transporte do drill de restore (AID-2953): prova que dumps
off-box restauram num PG descartável. O toolchain do substrate é shell +
Python stdlib — e o PG embutido do Paperclip (@embedded-postgres) ships
initdb/pg_ctl/postgres SEM psql, daí este cliente.

Escopo deliberadamente pequeno: simple query protocol + COPY FROM stdin
(os dumps `paperclip-*.sql.gz` usam COPY blocks), auth `trust` SOMENTE
(cluster descartável de drill local — password auth não é suportado de
propósito; nada aqui deve apontar para o PG de produção).

Nada aqui avalia evidência ou mastery — storage move bytes e reporta
recibos (producer ≠ verifier).
"""

from __future__ import annotations

import socket
import struct


class PGError(RuntimeError):
    """Erro do servidor: fields (single-letter codes) do 'E' ErrorResponse."""

    def __init__(self, fields: dict[str, str]):
        self.fields = fields
        message = fields.get("M", "unknown error")
        detail = fields.get("D", "")
        code = fields.get("C", "")
        text = f"PGError [{code}]: {message}"
        if detail:
            text += f" — {detail}"
        super().__init__(text)


def _recv_exact(sock: socket.socket, size: int) -> bytes:
    buf = b""
    while len(buf) < size:
        chunk = sock.recv(size - len(buf))
        if not chunk:
            raise ConnectionError("conexão fechada pelo servidor")
        buf += chunk
    return buf


class PGConnection:
    """Uma sessão PG. Queries simples; sessão única mantém transações."""

    def __init__(self, host: str, port: int, user: str, database: str):
        self.sock = socket.create_connection((host, port), timeout=600)
        self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        params = {
            "user": user,
            "database": database,
            "client_encoding": "UTF8",
            "DateStyle": "ISO, MDY",
        }
        body = struct.pack("!i", 196608)  # protocol 3.0
        for key, value in params.items():
            body += f"{key}\0{value}\0".encode()
        body += b"\0"
        self.sock.sendall(struct.pack("!i", len(body) + 4) + body)
        self._startup()

    # -------------------------------------------------------------- startup

    def _startup(self) -> None:
        while True:
            first = _recv_exact(self.sock, 1)
            if first == b"E":
                raise PGError(self._read_error_body())
            if first == b"Z":  # ReadyForQuery — startup concluído
                self._skip_message(first)
                return
            if first != b"R":
                self._skip_message(first)
                continue
            length = struct.unpack("!i", _recv_exact(self.sock, 4))[0]
            payload = _recv_exact(self.sock, length - 4)
            code = struct.unpack("!i", payload[:4])[0]
            if code == 0:  # AuthenticationOk (trust)
                continue
            if code == 3:  # cleartext password
                raise PGError(
                    {"M": "auth password exigida — este cliente é "
                     "trust-only (drills locais descartáveis)"}
                )
            raise PGError({"M": f"auth não suportada (código {code})"})

    def _read_error_body(self) -> dict[str, str]:
        length = struct.unpack("!i", _recv_exact(self.sock, 4))[0]
        payload = _recv_exact(self.sock, length - 4)
        fields: dict[str, str] = {}
        for part in payload.split(b"\0"):
            if part:
                fields[part[:1].decode("ascii", "replace")] = part[1:].decode(
                    "utf-8", "replace"
                )
        return fields

    def _skip_message(self, type_byte: bytes) -> None:
        length = struct.unpack("!i", _recv_exact(self.sock, 4))[0]
        _recv_exact(self.sock, length - 4)

    # -------------------------------------------------------------- queries

    def execute(
        self, sql: str, copy_stream=None
    ) -> tuple[str, list[str], list[list[str | None]]]:
        """Executa SQL; devolve (commandTag, colunas, linhas).

        `copy_stream`: gerador de bytes para COPY FROM stdin (cada item é
        enviado como CopyData; None => COPY sem stream vira erro do server).
        """
        payload = sql.encode("utf-8") + b"\0"
        self.sock.sendall(b"Q" + struct.pack("!i", len(payload) + 4) + payload)
        cols: list[str] = []
        rows: list[list[str | None]] = []
        tag = ""
        while True:
            type_byte = _recv_exact(self.sock, 1)
            if type_byte == b"T":  # RowDescription
                length = struct.unpack("!i", _recv_exact(self.sock, 4))[0]
                body = _recv_exact(self.sock, length - 4)
                count = struct.unpack("!h", body[:2])[0]
                pos = 2
                cols = []
                for _ in range(count):
                    end = body.index(b"\0", pos)
                    cols.append(body[pos:end].decode("utf-8", "replace"))
                    # name\0 + tableoid(4) + colattr(2) + typeoid(4) +
                    # typlen(2) + typmod(4) + format(2)
                    pos = end + 1 + 4 + 2 + 4 + 2 + 4 + 2
            elif type_byte == b"D":  # DataRow
                length = struct.unpack("!i", _recv_exact(self.sock, 4))[0]
                body = _recv_exact(self.sock, length - 4)
                count = struct.unpack("!h", body[:2])[0]
                pos = 2
                row: list[str | None] = []
                for _ in range(count):
                    size = struct.unpack("!i", body[pos : pos + 4])[0]
                    pos += 4
                    if size < 0:
                        row.append(None)
                    else:
                        row.append(body[pos : pos + size].decode("utf-8", "replace"))
                        pos += size
                rows.append(row)
            elif type_byte == b"C":  # CommandComplete
                length = struct.unpack("!i", _recv_exact(self.sock, 4))[0]
                tag = _recv_exact(self.sock, length - 4).rstrip(b"\0").decode()
            elif type_byte == b"E":  # ErrorResponse
                raise PGError(self._read_error_body())
            elif type_byte == b"N":  # NoticeResponse — ignorada
                self._skip_message(type_byte)
            elif type_byte == b"S" or type_byte == b"K":  # params / key data
                self._skip_message(type_byte)
            elif type_byte == b"G":  # CopyInResponse — COPY FROM stdin
                self._skip_rest_of_copy_header()
                self._stream_copy_in(copy_stream)
            elif type_byte == b"H":  # CopyOutResponse
                raise PGError({"M": "COPY TO stdout não suportado"})
            elif type_byte == b"Z":  # ReadyForQuery
                self._skip_message(type_byte)
                return tag, cols, rows
            else:
                self._skip_message(type_byte)

    def _skip_rest_of_copy_header(self) -> None:
        # 'H' body já parcialmente lido? Não: ainda não lemos length.
        length = struct.unpack("!i", _recv_exact(self.sock, 4))[0]
        _recv_exact(self.sock, length - 4)

    def _stream_copy_in(self, copy_stream) -> None:
        if copy_stream is None:
            self.sock.sendall(b"f" + struct.pack("!i", 4 + 5) + b"fail\0")
            return
        for chunk in copy_stream:
            self.sock.sendall(b"d" + struct.pack("!i", len(chunk) + 4) + chunk)
        self.sock.sendall(b"c" + struct.pack("!i", 4))

    def close(self) -> None:
        try:
            self.sock.sendall(b"X" + struct.pack("!i", 4))
        except OSError:
            pass
        finally:
            self.sock.close()
