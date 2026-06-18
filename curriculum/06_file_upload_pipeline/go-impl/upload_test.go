package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"
)

func testServer(t *testing.T, max int64) *Server {
	t.Helper()
	s, err := NewServer(DefaultConfig(), slog.New(slog.NewJSONHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	s.cfg.StorageDir = t.TempDir()
	s.cfg.MaxBytes = max
	_ = os.MkdirAll(s.cfg.StorageDir+"/tmp", 0o755)
	_ = os.MkdirAll(s.cfg.StorageDir+"/files", 0o755)
	return s
}
func multipartBody(t *testing.T, name, ct string, data []byte, fields map[string]string) (*bytes.Buffer, string) {
	t.Helper()
	b := &bytes.Buffer{}
	mw := multipart.NewWriter(b)
	for k, v := range fields {
		_ = mw.WriteField(k, v)
	}
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="file"; filename="`+name+`"`)
	h.Set("Content-Type", ct)
	p, err := mw.CreatePart(h)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = p.Write(data)
	_ = mw.Close()
	return b, mw.FormDataContentType()
}

func TestUploadCompletesWithChecksumAndMetadata(t *testing.T) {
	s := testServer(t, 1<<20)
	data := []byte("hello streaming")
	body, ct := multipartBody(t, "note.txt", "text/plain", data, map[string]string{"author": "learner"})
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ct)
	rr := httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var u Upload
	if err := json.Unmarshal(rr.Body.Bytes(), &u); err != nil {
		t.Fatal(err)
	}
	sum := sha256.Sum256(data)
	want := "sha256:" + hex.EncodeToString(sum[:])
	if u.Checksum == nil || *u.Checksum != want {
		t.Fatalf("checksum=%v want %s", u.Checksum, want)
	}
	if u.Status != StatusCompleted || u.Size != int64(len(data)) || u.Metadata.MimeType != "text/plain" || u.Metadata.ClientMetadata["author"] != "learner" {
		t.Fatalf("bad upload: %+v", u)
	}
}

func TestRejectsInvalidTypeSizeAndChecksum(t *testing.T) {
	s := testServer(t, 5)
	for _, tc := range []struct {
		name, file, ct string
		data           []byte
		fields         map[string]string
		want           int
	}{
		{"type", "bad.exe", "application/x-msdownload", []byte("x"), nil, http.StatusUnsupportedMediaType},
		{"size", "big.txt", "text/plain", []byte("123456"), nil, http.StatusRequestEntityTooLarge},
		{"checksum", "ok.txt", "text/plain", []byte("123"), map[string]string{"expectedChecksum": "sha256:bad"}, http.StatusConflict},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body, ct := multipartBody(t, tc.file, tc.ct, tc.data, tc.fields)
			req := httptest.NewRequest(http.MethodPost, "/upload", body)
			req.Header.Set("Content-Type", ct)
			rr := httptest.NewRecorder()
			s.Handler().ServeHTTP(rr, req)
			if rr.Code != tc.want {
				t.Fatalf("status=%d want %d body=%s", rr.Code, tc.want, rr.Body.String())
			}
		})
	}
}

func TestFilesStatusDeleteAndHealth(t *testing.T) {
	s := testServer(t, 1<<20)
	body, ct := multipartBody(t, "note.txt", "text/plain", []byte("abc"), nil)
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ct)
	rr := httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)
	var u Upload
	_ = json.Unmarshal(rr.Body.Bytes(), &u)
	for _, path := range []string{"/healthz", "/files", "/files/" + u.ID, "/files/" + u.ID + "/status"} {
		r := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, r)
		if w.Code != http.StatusOK {
			t.Fatalf("%s -> %d", path, w.Code)
		}
	}
	r := httptest.NewRequest(http.MethodDelete, "/files/"+u.ID, nil)
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, r)
	if w.Code != http.StatusAccepted {
		t.Fatalf("delete=%d", w.Code)
	}
	got, _ := s.reg.get(u.ID)
	if got.Status != StatusCancelled {
		t.Fatalf("status=%s", got.Status)
	}
	notFound := httptest.NewRecorder()
	s.Handler().ServeHTTP(notFound, httptest.NewRequest(http.MethodGet, "/files/nope", nil))
	if notFound.Code != http.StatusNotFound {
		t.Fatalf("not found=%d", notFound.Code)
	}
}

func TestMalformedMissingAndMemoryBounded(t *testing.T) {
	s := testServer(t, 10<<20)
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/upload", strings.NewReader("bad")))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("malformed=%d", w.Code)
	}
	var before, after runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&before)
	body, ct := multipartBody(t, "large.bin", "application/octet-stream", bytes.Repeat([]byte("a"), 2<<20), nil)
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ct)
	rr := httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)
	runtime.GC()
	runtime.ReadMemStats(&after)
	if rr.Code != http.StatusCreated {
		t.Fatalf("status=%d", rr.Code)
	}
	if int64(after.Alloc-before.Alloc) > 50<<20 {
		t.Fatalf("memory grew too much: %d", int64(after.Alloc-before.Alloc))
	}
}

func TestProgressRegistryConfigAndRunHelpers(t *testing.T) {
	t.Setenv("MAX_UPLOAD_BYTES", "1234")
	t.Setenv("PORT", "9999")
	cfg := DefaultConfig()
	if cfg.MaxBytes != 1234 || cfg.Port != "9999" {
		t.Fatalf("bad env config: %+v", cfg)
	}
	r := NewRegistry()
	id := r.nextID()
	now := time.Now()
	checksum := "sha256:x"
	r.save(&Upload{ID: id, Filename: "x.txt", Size: 7, Status: StatusCompleted, Checksum: &checksum, CreatedAt: now, UpdatedAt: now})
	items, next := r.list("completed", 1, "")
	if len(items) != 1 || next != nil {
		t.Fatalf("items=%d next=%v", len(items), next)
	}
	u, ok := r.get(id)
	if !ok || progressOf(u).ReceivedBytes != 7 {
		t.Fatalf("missing progress")
	}
	ctx, cancel := context.WithCancel(context.Background())
	r.setCancel(id, cancel)
	if !r.cancel(id) {
		t.Fatalf("cancel not called")
	}
	r.clearCancel(id)
	select {
	case <-ctx.Done():
	default:
		t.Fatalf("context not cancelled")
	}
	if got := envInt64("DOES_NOT_EXIST", 42); got != 42 {
		t.Fatalf("envInt64=%d", got)
	}
	_ = strconv.Itoa(len(items))
}

func TestChecksumSuccessImageMetadataPaginationAndMethods(t *testing.T) {
	s := testServer(t, 1<<20)
	data := []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}
	sum := sha256.Sum256(data)
	body, ct := multipartBody(t, "tiny.png", "image/png", data, map[string]string{"expectedChecksum": "sha256:" + hex.EncodeToString(sum[:])})
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ct)
	rr := httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var u Upload
	_ = json.Unmarshal(rr.Body.Bytes(), &u)
	if u.Metadata.Thumbnail == "not_applicable" || u.ExpectedChecksum == nil {
		t.Fatalf("bad image metadata: %+v", u.Metadata)
	}
	list := httptest.NewRecorder()
	s.Handler().ServeHTTP(list, httptest.NewRequest(http.MethodGet, "/files?status=completed&limit=1", nil))
	if list.Code != http.StatusOK || !strings.Contains(list.Body.String(), u.ID) {
		t.Fatalf("filtered list failed: %d %s", list.Code, list.Body.String())
	}
	for _, path := range []string{"/files", "/files/" + u.ID} {
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, httptest.NewRequest(http.MethodPost, path, nil))
		if w.Code != http.StatusNotFound {
			t.Fatalf("%s method status=%d", path, w.Code)
		}
	}
}

func TestStreamPartHonorsPreCancelledContextAndNilLogger(t *testing.T) {
	cfg := DefaultConfig()
	cfg.StorageDir = t.TempDir()
	s, err := NewServer(cfg, nil)
	if err != nil {
		t.Fatal(err)
	}
	body, ct := multipartBody(t, "late.txt", "text/plain", []byte("cancel me"), nil)
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ct)
	mr, err := req.MultipartReader()
	if err != nil {
		t.Fatal(err)
	}
	part, err := mr.NextPart()
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	u := &Upload{ID: "cancelled", Status: StatusReceiving, CreatedAt: time.Now(), UpdatedAt: time.Now(), Metadata: UploadMetadata{ClientMetadata: map[string]string{}}, Chunks: []Chunk{}}
	err = s.streamPart(ctx, u, part, "")
	if err == nil || u.Status != StatusCancelled {
		t.Fatalf("expected cancelled stream, status=%s err=%v", u.Status, err)
	}
}
