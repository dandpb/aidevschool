package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type UploadStatus string

const (
	StatusReceiving  UploadStatus = "receiving"
	StatusProcessing UploadStatus = "processing"
	StatusCompleted  UploadStatus = "completed"
	StatusFailed     UploadStatus = "failed"
	StatusCancelled  UploadStatus = "cancelled"
)

type UploadError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable"`
}

type Chunk struct {
	Index      int       `json:"index"`
	Offset     int64     `json:"offset"`
	Size       int       `json:"size"`
	ReceivedAt time.Time `json:"receivedAt"`
}

type UploadMetadata struct {
	MimeType       string            `json:"mimeType"`
	Extension      string            `json:"extension"`
	Width          *int              `json:"width,omitempty"`
	Height         *int              `json:"height,omitempty"`
	ClientMetadata map[string]string `json:"clientMetadata,omitempty"`
	Thumbnail      string            `json:"thumbnailStatus,omitempty"`
}

type Upload struct {
	ID               string         `json:"id"`
	Filename         string         `json:"filename"`
	Size             int64          `json:"size"`
	Chunks           []Chunk        `json:"chunks"`
	Status           UploadStatus   `json:"status"`
	Checksum         *string        `json:"checksum"`
	ExpectedChecksum *string        `json:"expectedChecksum,omitempty"`
	Metadata         UploadMetadata `json:"metadata"`
	StoragePath      string         `json:"storagePath"`
	ThumbnailPath    *string        `json:"thumbnailPath,omitempty"`
	Error            *UploadError   `json:"error"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
	CompletedAt      *time.Time     `json:"completedAt,omitempty"`
}

type Progress struct {
	ID              string       `json:"id"`
	Status          UploadStatus `json:"status"`
	ReceivedBytes   int64        `json:"receivedBytes"`
	TotalBytes      *int64       `json:"totalBytes"`
	ProgressPercent *float64     `json:"progressPercent"`
	Error           *UploadError `json:"error"`
}

type Config struct {
	Port            string
	StorageDir      string
	MaxBytes        int64
	AllowedTypes    map[string]bool
	AllowedExts     map[string]bool
	ReadBufferBytes int
}

func DefaultConfig() Config {
	return Config{
		Port:            envString("PORT", "8086"),
		StorageDir:      envString("UPLOAD_STORAGE_DIR", filepath.Join(os.TempDir(), "file-upload-pipeline-go")),
		MaxBytes:        envInt64("MAX_UPLOAD_BYTES", 1<<30),
		ReadBufferBytes: 32 * 1024,
		AllowedTypes: map[string]bool{
			"text/plain": true, "image/png": true, "image/jpeg": true,
			"image/gif": true, "application/octet-stream": true,
		},
		AllowedExts: map[string]bool{".txt": true, ".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".bin": true},
	}
}

type Registry struct {
	mu      sync.RWMutex
	uploads map[string]*Upload
	cancels map[string]context.CancelFunc
	now     func() time.Time
	seq     int64
}

func NewRegistry() *Registry {
	return &Registry{uploads: map[string]*Upload{}, cancels: map[string]context.CancelFunc{}, now: time.Now}
}

func (r *Registry) nextID() string {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.seq++
	return fmt.Sprintf("upl_go_%06d", r.seq)
}

func (r *Registry) save(u *Upload) {
	r.mu.Lock()
	defer r.mu.Unlock()
	copy := *u
	copy.Chunks = append([]Chunk(nil), u.Chunks...)
	r.uploads[u.ID] = &copy
}

func (r *Registry) get(id string) (*Upload, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.uploads[id]
	if !ok {
		return nil, false
	}
	copy := *u
	copy.Chunks = append([]Chunk(nil), u.Chunks...)
	return &copy, true
}

func (r *Registry) list(status string, limit int, cursor string) ([]Upload, *string) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if limit <= 0 || limit > 100 {
		limit = 100
	}
	ids := make([]string, 0, len(r.uploads))
	for id := range r.uploads {
		ids = append(ids, id)
	}
	start := 0
	for i, id := range ids {
		if id == cursor {
			start = i + 1
		}
	}
	items := []Upload{}
	for i := start; i < len(ids) && len(items) < limit; i++ {
		u := r.uploads[ids[i]]
		if status == "" || string(u.Status) == status {
			items = append(items, *u)
		}
	}
	var next *string
	if start+len(items) < len(ids) {
		v := ids[start+len(items)-1]
		next = &v
	}
	return items, next
}

func (r *Registry) setCancel(id string, cancel context.CancelFunc) {
	r.mu.Lock()
	r.cancels[id] = cancel
	r.mu.Unlock()
}
func (r *Registry) clearCancel(id string) { r.mu.Lock(); delete(r.cancels, id); r.mu.Unlock() }
func (r *Registry) cancel(id string) bool {
	r.mu.RLock()
	c := r.cancels[id]
	r.mu.RUnlock()
	if c != nil {
		c()
		return true
	}
	return false
}

type Server struct {
	cfg Config
	reg *Registry
	log *slog.Logger
}

func NewServer(cfg Config, log *slog.Logger) (*Server, error) {
	if err := os.MkdirAll(filepath.Join(cfg.StorageDir, "tmp"), 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Join(cfg.StorageDir, "files"), 0o755); err != nil {
		return nil, err
	}
	if log == nil {
		log = slog.New(slog.NewJSONHandler(io.Discard, nil))
	}
	return &Server{cfg: cfg, reg: NewRegistry(), log: log}, nil
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.health)
	mux.HandleFunc("/upload", s.upload)
	mux.HandleFunc("/files", s.files)
	mux.HandleFunc("/files/", s.fileByID)
	return s.logRequests(mux)
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		s.log.Info("request", "method", r.Method, "path", r.URL.Path, "duration_ms", time.Since(start).Milliseconds())
	})
}
func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) upload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.NotFound(w, r)
		return
	}
	mr, err := r.MultipartReader()
	if err != nil {
		writeErr(w, http.StatusBadRequest, "malformed_multipart", "request must be multipart", false)
		return
	}
	id := r.Header.Get("X-Upload-ID")
	if id == "" {
		id = s.reg.nextID()
	}
	ctx, cancel := context.WithCancel(r.Context())
	s.reg.setCancel(id, cancel)
	defer s.reg.clearCancel(id)
	defer cancel()
	now := time.Now()
	upload := &Upload{ID: id, Status: StatusReceiving, CreatedAt: now, UpdatedAt: now, Metadata: UploadMetadata{ClientMetadata: map[string]string{}}, Chunks: []Chunk{}}
	s.reg.save(upload)
	expected := ""
	for {
		part, err := mr.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			s.fail(upload, "malformed_multipart", err.Error(), false)
			writeErr(w, http.StatusBadRequest, "malformed_multipart", "malformed multipart", false)
			return
		}
		if part.FormName() != "file" {
			b, _ := io.ReadAll(io.LimitReader(part, 4096))
			if part.FormName() == "expectedChecksum" {
				expected = string(b)
			} else {
				upload.Metadata.ClientMetadata[part.FormName()] = string(b)
			}
			continue
		}
		if err := s.streamPart(ctx, upload, part, expected); err != nil {
			s.respondStreamErr(w, err, upload)
			return
		}
		writeJSON(w, http.StatusCreated, upload)
		return
	}
	s.fail(upload, "malformed_multipart", "missing file part", false)
	writeErr(w, http.StatusBadRequest, "malformed_multipart", "missing file part", false)
}

type streamErr struct {
	status int
	code   string
	msg    string
}

func (e streamErr) Error() string { return e.msg }

func (s *Server) streamPart(ctx context.Context, u *Upload, part *multipart.Part, expected string) error {
	u.Filename = filepath.Base(part.FileName())
	if u.Filename == "." {
		u.Filename = "upload.bin"
	}
	ext := strings.ToLower(filepath.Ext(u.Filename))
	mimeType := part.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = mime.TypeByExtension(ext)
	}
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	u.Metadata.MimeType = strings.Split(mimeType, ";")[0]
	u.Metadata.Extension = ext
	if !s.cfg.AllowedExts[ext] || !s.cfg.AllowedTypes[u.Metadata.MimeType] {
		s.fail(u, "invalid_file_type", "file type is not allowed", false)
		return streamErr{http.StatusUnsupportedMediaType, "invalid_file_type", "file type is not allowed"}
	}
	if expected != "" {
		v := expected
		u.ExpectedChecksum = &v
	}
	tmp, err := os.CreateTemp(filepath.Join(s.cfg.StorageDir, "tmp"), u.ID+"-*")
	if err != nil {
		s.fail(u, "disk_full", err.Error(), true)
		return streamErr{http.StatusInsufficientStorage, "disk_full", "storage unavailable"}
	}
	tmpPath := tmp.Name()
	defer tmp.Close()
	h := sha256.New()
	buf := make([]byte, s.cfg.ReadBufferBytes)
	var offset int64
	chunkIndex := 0
	for {
		select {
		case <-ctx.Done():
			tmp.Close()
			os.Remove(tmpPath)
			s.failStatus(u, StatusCancelled, "network_interruption", "upload cancelled", true)
			return streamErr{http.StatusAccepted, "cancelled", "upload cancelled"}
		default:
		}
		n, readErr := part.Read(buf)
		if n > 0 {
			u.Size += int64(n)
			if u.Size > s.cfg.MaxBytes {
				tmp.Close()
				os.Remove(tmpPath)
				s.fail(u, "size_exceeded", "maximum upload size exceeded", false)
				return streamErr{http.StatusRequestEntityTooLarge, "size_exceeded", "maximum upload size exceeded"}
			}
			if _, err := h.Write(buf[:n]); err != nil {
				return err
			}
			if _, err := tmp.Write(buf[:n]); err != nil {
				s.fail(u, "disk_full", err.Error(), true)
				return streamErr{http.StatusInsufficientStorage, "disk_full", "storage unavailable"}
			}
			u.Chunks = append(u.Chunks, Chunk{Index: chunkIndex, Offset: offset, Size: n, ReceivedAt: time.Now()})
			chunkIndex++
			offset += int64(n)
			u.UpdatedAt = time.Now()
			s.reg.save(u)
		}
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			tmp.Close()
			os.Remove(tmpPath)
			s.fail(u, "network_interruption", readErr.Error(), true)
			return streamErr{499, "network_interruption", "stream interrupted"}
		}
	}
	computed := "sha256:" + hex.EncodeToString(h.Sum(nil))
	u.Checksum = &computed
	if expected != "" && expected != computed && expected != strings.TrimPrefix(computed, "sha256:") {
		tmp.Close()
		os.Remove(tmpPath)
		s.fail(u, "checksum_mismatch", "computed checksum did not match expected checksum", false)
		return streamErr{http.StatusConflict, "checksum_mismatch", "computed checksum did not match expected checksum"}
	}
	u.Status = StatusProcessing
	u.UpdatedAt = time.Now()
	s.reg.save(u)
	finalPath := filepath.Join(s.cfg.StorageDir, "files", u.ID+ext)
	if err := os.Rename(tmpPath, finalPath); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		s.fail(u, "disk_full", err.Error(), true)
		return streamErr{http.StatusInsufficientStorage, "disk_full", "storage unavailable"}
	}
	u.StoragePath = finalPath
	u.Status = StatusCompleted
	done := time.Now()
	u.CompletedAt = &done
	u.UpdatedAt = done
	u.Metadata.Thumbnail = thumbnailStatus(u.Metadata.MimeType)
	s.reg.save(u)
	return nil
}

func thumbnailStatus(m string) string {
	if strings.HasPrefix(m, "image/") {
		return "documented: original stored; thumbnail generation uses temp-file backed processors in production"
	}
	return "not_applicable"
}
func (s *Server) fail(u *Upload, code, msg string, retry bool) {
	s.failStatus(u, StatusFailed, code, msg, retry)
}
func (s *Server) failStatus(u *Upload, st UploadStatus, code, msg string, retry bool) {
	u.Status = st
	u.Error = &UploadError{Code: code, Message: msg, Retryable: retry}
	u.UpdatedAt = time.Now()
	s.reg.save(u)
}
func (s *Server) respondStreamErr(w http.ResponseWriter, err error, u *Upload) {
	if se, ok := err.(streamErr); ok {
		if se.status == http.StatusAccepted {
			writeJSON(w, se.status, map[string]string{"id": u.ID, "status": string(u.Status)})
			return
		}
		writeErr(w, se.status, se.code, se.msg, false)
		return
	}
	writeErr(w, http.StatusInternalServerError, "internal_error", "internal error", true)
}

func (s *Server) files(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.NotFound(w, r)
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, next := s.reg.list(r.URL.Query().Get("status"), limit, r.URL.Query().Get("cursor"))
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "nextCursor": next})
}
func (s *Server) fileByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/files/")
	status := strings.HasSuffix(id, "/status")
	id = strings.TrimSuffix(id, "/status")
	u, ok := s.reg.get(id)
	if !ok {
		writeErr(w, http.StatusNotFound, "not_found", "upload not found", false)
		return
	}
	if status {
		writeJSON(w, http.StatusOK, progressOf(u))
		return
	}
	if r.Method == http.MethodGet {
		writeJSON(w, http.StatusOK, u)
		return
	}
	if r.Method == http.MethodDelete {
		if s.reg.cancel(id) {
			u.Status = StatusCancelled
		}
		if u.StoragePath != "" {
			_ = os.Remove(u.StoragePath)
		}
		u.Status = StatusCancelled
		u.UpdatedAt = time.Now()
		s.reg.save(u)
		writeJSON(w, http.StatusAccepted, map[string]string{"id": id, "status": string(StatusCancelled)})
		return
	}
	http.NotFound(w, r)
}

func progressOf(u *Upload) Progress {
	var pct *float64
	if u.Size > 0 && u.Status == StatusCompleted {
		v := 100.0
		pct = &v
	}
	return Progress{ID: u.ID, Status: u.Status, ReceivedBytes: u.Size, TotalBytes: nil, ProgressPercent: pct, Error: u.Error}
}
func writeErr(w http.ResponseWriter, status int, code, msg string, retry bool) {
	writeJSON(w, status, map[string]any{"error": UploadError{Code: code, Message: msg, Retryable: retry}})
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func envString(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
func envInt64(k string, d int64) int64 {
	if v := os.Getenv(k); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil && n > 0 {
			return n
		}
	}
	return d
}
