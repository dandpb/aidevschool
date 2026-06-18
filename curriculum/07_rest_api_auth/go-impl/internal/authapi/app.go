package authapi

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Role string
type UserStatus string
type SessionStatus string
type AuditAction string
type Outcome string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"

	StatusActive   UserStatus = "active"
	StatusDisabled UserStatus = "disabled"

	SessionActive   SessionStatus = "active"
	SessionRotated  SessionStatus = "rotated"
	SessionExpired  SessionStatus = "expired"
	SessionReplayed SessionStatus = "replayed"
)

type Config struct {
	Issuer              string
	Audience            string
	JWTSecret           string
	AccessTokenSeconds  int
	RefreshTokenSeconds int
	PasswordIterations  int
}

func DefaultConfig() Config {
	return Config{Issuer: "ai-devschool-project-07", Audience: "project-07-learners", JWTSecret: "dev-project-07-secret-change-me", AccessTokenSeconds: 900, RefreshTokenSeconds: 604800, PasswordIterations: 12000}
}

type Clock interface{ Now() time.Time }
type RealClock struct{}

func (RealClock) Now() time.Time { return time.Now().UTC() }

type FixedClock struct{ Value time.Time }

func (f FixedClock) Now() time.Time { return f.Value.UTC() }

type User struct {
	ID, Email, PasswordHash, DisplayName string
	Roles                                []Role
	Status                               UserStatus
	CreatedAt, UpdatedAt                 time.Time
}
type Session struct {
	ID, UserID, RefreshTokenHash, AccessTokenJTI string
	Status                                       SessionStatus
	ParentSessionID                              *string
	CreatedAt, ExpiresAt                         time.Time
	RotatedAt, RevokedAt, LastUsedAt             *time.Time
}
type AuditEntry struct {
	ID, RequestID string
	Action        AuditAction
	ActorUserID   *string
	TargetUserID  *string
	SessionID     *string
	Outcome       Outcome
	Metadata      map[string]string
	CreatedAt     time.Time
}
type Principal struct {
	Sub, Email, JTI string
	Roles           []Role
}

type Store struct {
	mu       sync.Mutex
	Users    map[string]*User
	Sessions map[string]*Session
	Audits   []AuditEntry
}

func NewStore() *Store {
	return &Store{Users: map[string]*User{}, Sessions: map[string]*Session{}, Audits: []AuditEntry{}}
}
func (s *Store) FindUserByEmail(email string) *User {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, u := range s.Users {
		if u.Email == email {
			return cloneUser(u)
		}
	}
	return nil
}
func (s *Store) GetUser(id string) *User {
	s.mu.Lock()
	defer s.mu.Unlock()
	return cloneUser(s.Users[id])
}
func (s *Store) SaveUser(u *User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := cloneUser(u)
	s.Users[u.ID] = cp
}
func (s *Store) ListUsers(limit int) []*User {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*User, 0, len(s.Users))
	for _, u := range s.Users {
		out = append(out, cloneUser(u))
		if len(out) == limit {
			break
		}
	}
	return out
}
func (s *Store) FindSessionByHash(hash string) *Session {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, ses := range s.Sessions {
		if ses.RefreshTokenHash == hash {
			return cloneSession(ses)
		}
	}
	return nil
}
func (s *Store) SaveSession(session *Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Sessions[session.ID] = cloneSession(session)
}
func (s *Store) RecordAudit(entry AuditEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Audits = append(s.Audits, entry)
}
func cloneUser(u *User) *User {
	if u == nil {
		return nil
	}
	cp := *u
	cp.Roles = append([]Role{}, u.Roles...)
	return &cp
}
func cloneSession(s *Session) *Session {
	if s == nil {
		return nil
	}
	cp := *s
	return &cp
}

type apiError struct {
	status        int
	code, message string
	details       []map[string]string
}

func (e apiError) Error() string { return e.code }
func validation(details []map[string]string) apiError {
	return apiError{status: http.StatusBadRequest, code: "VALIDATION_FAILED", message: "Request validation failed.", details: details}
}

type PasswordHasher struct{ cfg Config }

func (h PasswordHasher) Hash(password string) string {
	salt := randomString(16)
	sum := pbkdf(password, salt, h.cfg.PasswordIterations)
	return fmt.Sprintf("pbkdf2$%d$%s$%s", h.cfg.PasswordIterations, salt, hex.EncodeToString(sum))
}
func (h PasswordHasher) Verify(password, stored string) bool {
	parts := strings.Split(stored, "$")
	if len(parts) != 4 || parts[0] != "pbkdf2" {
		return false
	}
	iterations, err := strconv.Atoi(parts[1])
	if err != nil {
		return false
	}
	sum := pbkdf(password, parts[2], iterations)
	expected, err := hex.DecodeString(parts[3])
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(sum, expected) == 1
}
func pbkdf(password, salt string, iterations int) []byte {
	mac := hmac.New(sha256.New, []byte(password))
	mac.Write([]byte(salt))
	block := mac.Sum(nil)
	out := append([]byte{}, block...)
	for i := 1; i < iterations; i++ {
		mac = hmac.New(sha256.New, []byte(password))
		mac.Write(block)
		block = mac.Sum(nil)
		for j := range out {
			out[j] ^= block[j]
		}
	}
	return out
}

type TokenService struct {
	cfg   Config
	clock Clock
}
type claims struct {
	Email string `json:"email"`
	Roles []Role `json:"roles"`
	jwt.RegisteredClaims
}

func (t TokenService) SignAccessToken(user *User) (string, string, error) {
	jti := newID("jti")
	now := t.clock.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{Email: user.Email, Roles: user.Roles, RegisteredClaims: jwt.RegisteredClaims{Subject: user.ID, Issuer: t.cfg.Issuer, Audience: jwt.ClaimStrings{t.cfg.Audience}, ID: jti, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(t.cfg.AccessTokenSeconds) * time.Second))}})
	signed, err := token.SignedString([]byte(t.cfg.JWTSecret))
	return signed, jti, err
}
func (t TokenService) VerifyAccessToken(raw string) (Principal, error) {
	parsed := claims{}
	token, err := jwt.ParseWithClaims(raw, &parsed, func(_ *jwt.Token) (interface{}, error) { return []byte(t.cfg.JWTSecret), nil }, jwt.WithIssuer(t.cfg.Issuer), jwt.WithAudience(t.cfg.Audience), jwt.WithTimeFunc(t.clock.Now))
	if err != nil || !token.Valid || parsed.Subject == "" || parsed.ID == "" {
		return Principal{}, errors.New("invalid token")
	}
	return Principal{Sub: parsed.Subject, Email: parsed.Email, Roles: parsed.Roles, JTI: parsed.ID}, nil
}
func (t TokenService) NewRefreshToken() string { return randomString(32) }
func (t TokenService) HashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

type AuditLogger struct {
	store *Store
	clock Clock
}

func (a AuditLogger) Record(action AuditAction, actor, target, session *string, requestID string, outcome Outcome, meta map[string]string) {
	a.store.RecordAudit(AuditEntry{ID: newID("aud"), Action: action, ActorUserID: actor, TargetUserID: target, SessionID: session, RequestID: requestID, Outcome: outcome, Metadata: meta, CreatedAt: a.clock.Now()})
}

type AuthService struct {
	store     *Store
	passwords PasswordHasher
	tokens    TokenService
	audit     AuditLogger
	clock     Clock
	cfg       Config
}

func (s AuthService) Register(body map[string]interface{}, requestID string) (*User, error) {
	in, err := validateRegister(body)
	if err != nil {
		return nil, err
	}
	email := normalize(in.email)
	if s.store.FindUserByEmail(email) != nil {
		return nil, apiError{status: http.StatusConflict, code: "EMAIL_ALREADY_REGISTERED", message: "Email is already registered."}
	}
	now := s.clock.Now()
	user := &User{ID: newID("usr"), Email: email, PasswordHash: s.passwords.Hash(in.password), DisplayName: in.displayName, Roles: []Role{RoleUser}, Status: StatusActive, CreatedAt: now, UpdatedAt: now}
	if user.DisplayName == "" {
		user.DisplayName = email
	}
	s.store.SaveUser(user)
	s.audit.Record("user_registered", &user.ID, &user.ID, nil, requestID, "success", map[string]string{"email": email})
	return user, nil
}
func (s AuthService) Login(body map[string]interface{}, requestID string) (string, string, *User, error) {
	in, err := validateLogin(body)
	if err != nil {
		return "", "", nil, err
	}
	user := s.store.FindUserByEmail(normalize(in.email))
	if user == nil || user.Status != StatusActive || !s.passwords.Verify(in.password, user.PasswordHash) {
		s.audit.Record("login_failed", nil, nil, nil, requestID, "failure", map[string]string{"reason": "invalid_credentials"})
		return "", "", nil, apiError{status: http.StatusUnauthorized, code: "INVALID_CREDENTIALS", message: "Invalid credentials."}
	}
	access, jti, err := s.tokens.SignAccessToken(user)
	if err != nil {
		return "", "", nil, err
	}
	refresh := s.tokens.NewRefreshToken()
	now := s.clock.Now()
	session := &Session{ID: newID("ses"), UserID: user.ID, RefreshTokenHash: s.tokens.HashRefreshToken(refresh), AccessTokenJTI: jti, Status: SessionActive, CreatedAt: now, ExpiresAt: now.Add(time.Duration(s.cfg.RefreshTokenSeconds) * time.Second), LastUsedAt: &now}
	s.store.SaveSession(session)
	s.audit.Record("login_succeeded", &user.ID, &user.ID, &session.ID, requestID, "success", map[string]string{})
	return access, refresh, user, nil
}
func (s AuthService) Refresh(body map[string]interface{}, requestID string) (string, string, error) {
	in, err := validateRefresh(body)
	if err != nil {
		return "", "", err
	}
	session := s.store.FindSessionByHash(s.tokens.HashRefreshToken(in.refresh))
	if session == nil {
		return "", "", apiError{status: http.StatusUnauthorized, code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token."}
	}
	if session.Status != SessionActive {
		session.Status = SessionReplayed
		s.store.SaveSession(session)
		s.audit.Record("refresh_replayed", &session.UserID, &session.UserID, &session.ID, requestID, "denied", map[string]string{})
		return "", "", apiError{status: http.StatusUnauthorized, code: "REFRESH_TOKEN_REPLAYED", message: "Refresh token was already used."}
	}
	if !session.ExpiresAt.After(s.clock.Now()) {
		session.Status = SessionExpired
		s.store.SaveSession(session)
		return "", "", apiError{status: http.StatusUnauthorized, code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token."}
	}
	user := s.store.GetUser(session.UserID)
	if user == nil {
		return "", "", apiError{status: http.StatusUnauthorized, code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token."}
	}
	access, jti, err := s.tokens.SignAccessToken(user)
	if err != nil {
		return "", "", err
	}
	refresh := s.tokens.NewRefreshToken()
	now := s.clock.Now()
	session.Status = SessionRotated
	session.RotatedAt = &now
	s.store.SaveSession(session)
	next := &Session{ID: newID("ses"), UserID: user.ID, RefreshTokenHash: s.tokens.HashRefreshToken(refresh), AccessTokenJTI: jti, Status: SessionActive, ParentSessionID: &session.ID, CreatedAt: now, ExpiresAt: now.Add(time.Duration(s.cfg.RefreshTokenSeconds) * time.Second), LastUsedAt: &now}
	s.store.SaveSession(next)
	s.audit.Record("token_refreshed", &user.ID, &user.ID, &next.ID, requestID, "success", map[string]string{"parent_session_id": session.ID})
	return access, refresh, nil
}

type UserService struct {
	store *Store
	audit AuditLogger
	clock Clock
}

func (s UserService) Update(id string, body map[string]interface{}, principal Principal, requestID string) (*User, error) {
	in, err := validateUpdate(body)
	if err != nil {
		return nil, err
	}
	target := s.store.GetUser(id)
	if target == nil {
		return nil, apiError{status: http.StatusNotFound, code: "USER_NOT_FOUND", message: "User was not found."}
	}
	admin := hasRole(principal.Roles, RoleAdmin)
	if !admin && (principal.Sub != id || in.roles != nil || in.status != nil) {
		s.audit.Record("authorization_forbidden", &principal.Sub, &id, nil, requestID, "denied", map[string]string{"policy": "user_update"})
		return nil, apiError{status: http.StatusForbidden, code: "FORBIDDEN", message: "Forbidden."}
	}
	if in.displayName != nil {
		target.DisplayName = *in.displayName
	}
	if admin && in.roles != nil {
		target.Roles = in.roles
	}
	if admin && in.status != nil {
		target.Status = *in.status
	}
	target.UpdatedAt = s.clock.Now()
	s.store.SaveUser(target)
	s.audit.Record("user_updated", &principal.Sub, &id, nil, requestID, "success", map[string]string{})
	return target, nil
}

type App struct {
	cfg    Config
	store  *Store
	tokens TokenService
	auth   AuthService
	users  UserService
	audit  AuditLogger
	logger *slog.Logger
}

func NewApp(cfg Config, clock Clock, logger *slog.Logger) *App {
	store := NewStore()
	audit := AuditLogger{store: store, clock: clock}
	tokens := TokenService{cfg: cfg, clock: clock}
	return &App{cfg: cfg, store: store, tokens: tokens, audit: audit, auth: AuthService{store: store, passwords: PasswordHasher{cfg: cfg}, tokens: tokens, audit: audit, clock: clock, cfg: cfg}, users: UserService{store: store, audit: audit, clock: clock}, logger: logger}
}
func (a *App) Store() *Store { return a.store }
func (a *App) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", a.method(http.MethodGet, a.handleHealth))
	mux.HandleFunc("/v1/auth/register", a.method(http.MethodPost, a.handleRegister))
	mux.HandleFunc("/v1/auth/login", a.method(http.MethodPost, a.handleLogin))
	mux.HandleFunc("/v1/auth/refresh", a.method(http.MethodPost, a.handleRefresh))
	mux.Handle("/v1/users", a.methodHandler(http.MethodGet, a.authenticate(a.requireAdmin(http.HandlerFunc(a.handleListUsers)))))
	mux.Handle("/v1/users/", a.methodHandler(http.MethodPut, a.authenticate(http.HandlerFunc(a.handleUpdateUser))))
	mux.HandleFunc("/v2/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, r, apiError{status: http.StatusNotFound, code: "UNSUPPORTED_API_VERSION", message: "Unsupported API version."})
	})
	return a.requestID(a.logging(mux))
}
func (a *App) method(method string, handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		handler(w, r)
	}
}
func (a *App) methodHandler(method string, handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		handler.ServeHTTP(w, r)
	})
}
func (a *App) requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = newID("req")
		}
		w.Header().Set("X-Request-ID", reqID)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey{}, reqID)))
	})
}
func (a *App) logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a.logger.Info("request", "method", r.Method, "path", r.URL.Path, "request_id", requestID(r))
		next.ServeHTTP(w, r)
	})
}
func (a *App) authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeError(w, r, apiError{status: http.StatusUnauthorized, code: "UNAUTHENTICATED", message: "Unauthenticated."})
			return
		}
		principal, err := a.tokens.VerifyAccessToken(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			a.audit.Record("token_verify_failed", nil, nil, nil, requestID(r), "failure", map[string]string{"reason": "invalid_token"})
			writeError(w, r, apiError{status: http.StatusUnauthorized, code: "UNAUTHENTICATED", message: "Unauthenticated."})
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), principalKey{}, principal)))
	})
}
func (a *App) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := principal(r)
		if !hasRole(p.Roles, RoleAdmin) {
			a.audit.Record("authorization_forbidden", &p.Sub, nil, nil, requestID(r), "denied", map[string]string{"policy": "admin_required"})
			writeError(w, r, apiError{status: http.StatusForbidden, code: "FORBIDDEN", message: "Forbidden."})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, envelope(r, map[string]string{"status": "ok"}))
}
func (a *App) handleRegister(w http.ResponseWriter, r *http.Request) {
	body, err := decodeBody(r)
	if err != nil {
		writeAnyError(w, r, err)
		return
	}
	user, err := a.auth.Register(body, requestID(r))
	if err != nil {
		writeAnyError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, envelope(r, map[string]interface{}{"user": publicUser(user)}))
}
func (a *App) handleLogin(w http.ResponseWriter, r *http.Request) {
	body, err := decodeBody(r)
	if err != nil {
		writeAnyError(w, r, err)
		return
	}
	access, refresh, user, err := a.auth.Login(body, requestID(r))
	if err != nil {
		writeAnyError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope(r, map[string]interface{}{"access_token": access, "token_type": "Bearer", "expires_in_seconds": a.cfg.AccessTokenSeconds, "refresh_token": refresh, "refresh_expires_in_seconds": a.cfg.RefreshTokenSeconds, "user": publicUser(user)}))
}
func (a *App) handleRefresh(w http.ResponseWriter, r *http.Request) {
	body, err := decodeBody(r)
	if err != nil {
		writeAnyError(w, r, err)
		return
	}
	access, refresh, err := a.auth.Refresh(body, requestID(r))
	if err != nil {
		writeAnyError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope(r, map[string]interface{}{"access_token": access, "token_type": "Bearer", "expires_in_seconds": a.cfg.AccessTokenSeconds, "refresh_token": refresh, "refresh_expires_in_seconds": a.cfg.RefreshTokenSeconds}))
}
func (a *App) handleListUsers(w http.ResponseWriter, r *http.Request) {
	limit := 25
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 100 {
			writeError(w, r, validation([]map[string]string{{"field": "limit", "reason": "must be 1..100"}}))
			return
		}
		limit = parsed
	}
	users := a.users.store.ListUsers(limit)
	out := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		out = append(out, publicUser(user))
	}
	writeJSON(w, http.StatusOK, envelope(r, map[string]interface{}{"users": out, "next_cursor": nil}))
}
func (a *App) handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/v1/users/")
	body, err := decodeBody(r)
	if err != nil {
		writeAnyError(w, r, err)
		return
	}
	user, err := a.users.Update(id, body, principal(r), requestID(r))
	if err != nil {
		writeAnyError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope(r, map[string]interface{}{"user": publicUser(user)}))
}

type requestIDKey struct{}
type principalKey struct{}

func requestID(r *http.Request) string { v, _ := r.Context().Value(requestIDKey{}).(string); return v }
func principal(r *http.Request) Principal {
	v, _ := r.Context().Value(principalKey{}).(Principal)
	return v
}
func decodeBody(r *http.Request) (map[string]interface{}, error) {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var body map[string]interface{}
	if err := dec.Decode(&body); err != nil || body == nil {
		return nil, validation(nil)
	}
	return body, nil
}
func writeAnyError(w http.ResponseWriter, r *http.Request, err error) {
	var ae apiError
	if errors.As(err, &ae) {
		writeError(w, r, ae)
		return
	}
	writeError(w, r, apiError{status: http.StatusInternalServerError, code: "INTERNAL_ERROR", message: "Internal error."})
}
func writeError(w http.ResponseWriter, r *http.Request, err apiError) {
	if err.status == 0 {
		return
	}
	writeJSON(w, err.status, map[string]interface{}{"error": map[string]interface{}{"code": err.code, "message": err.message, "details": err.details}, "request_id": requestID(r)})
}
func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
func envelope(r *http.Request, data interface{}) map[string]interface{} {
	return map[string]interface{}{"data": data, "request_id": requestID(r)}
}
func publicUser(u *User) map[string]interface{} {
	return map[string]interface{}{"id": u.ID, "email": u.Email, "display_name": u.DisplayName, "roles": u.Roles, "status": u.Status, "created_at": u.CreatedAt.Format(time.RFC3339), "updated_at": u.UpdatedAt.Format(time.RFC3339)}
}

var emailRe = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

type registerInput struct{ email, password, displayName string }
type loginInput struct{ email, password string }
type refreshInput struct{ refresh string }
type updateInput struct {
	displayName *string
	roles       []Role
	status      *UserStatus
}

func validateRegister(body map[string]interface{}) (registerInput, error) {
	allowed := map[string]bool{"email": true, "password": true, "display_name": true}
	if d := unknown(body, allowed); len(d) > 0 {
		return registerInput{}, validation(d)
	}
	email, eok := body["email"].(string)
	password, pok := body["password"].(string)
	display, _ := body["display_name"].(string)
	details := []map[string]string{}
	if !eok || !emailRe.MatchString(email) {
		details = append(details, map[string]string{"field": "email", "reason": "must be a valid email address"})
	}
	if !pok || !strong(password) {
		details = append(details, map[string]string{"field": "password", "reason": "must be at least 12 chars with upper, lower, and digit"})
	}
	if display != "" && len(display) > 100 {
		details = append(details, map[string]string{"field": "display_name", "reason": "must be 1..100 characters"})
	}
	if len(details) > 0 {
		return registerInput{}, validation(details)
	}
	return registerInput{email: email, password: password, displayName: display}, nil
}
func validateLogin(body map[string]interface{}) (loginInput, error) {
	allowed := map[string]bool{"email": true, "password": true}
	if d := unknown(body, allowed); len(d) > 0 {
		return loginInput{}, validation(d)
	}
	email, eok := body["email"].(string)
	password, pok := body["password"].(string)
	if !eok || !pok {
		return loginInput{}, validation(nil)
	}
	return loginInput{email: email, password: password}, nil
}
func validateRefresh(body map[string]interface{}) (refreshInput, error) {
	allowed := map[string]bool{"refresh_token": true}
	if d := unknown(body, allowed); len(d) > 0 {
		return refreshInput{}, validation(d)
	}
	refresh, ok := body["refresh_token"].(string)
	if !ok || len(refresh) < 16 {
		return refreshInput{}, validation(nil)
	}
	return refreshInput{refresh: refresh}, nil
}
func validateUpdate(body map[string]interface{}) (updateInput, error) {
	allowed := map[string]bool{"display_name": true, "roles": true, "status": true}
	if d := unknown(body, allowed); len(d) > 0 {
		return updateInput{}, validation(d)
	}
	out := updateInput{}
	if raw, ok := body["display_name"]; ok {
		value, ok := raw.(string)
		if !ok || value == "" || len(value) > 100 {
			return out, validation([]map[string]string{{"field": "display_name", "reason": "must be 1..100 characters"}})
		}
		out.displayName = &value
	}
	if raw, ok := body["roles"]; ok {
		arr, ok := raw.([]interface{})
		if !ok || len(arr) == 0 {
			return out, validation([]map[string]string{{"field": "roles", "reason": "must contain user/admin roles"}})
		}
		for _, item := range arr {
			role, ok := item.(string)
			if !ok || (role != "user" && role != "admin") {
				return out, validation([]map[string]string{{"field": "roles", "reason": "must contain user/admin roles"}})
			}
			out.roles = append(out.roles, Role(role))
		}
	}
	if raw, ok := body["status"]; ok {
		status, ok := raw.(string)
		if !ok || (status != "active" && status != "disabled") {
			return out, validation([]map[string]string{{"field": "status", "reason": "must be active or disabled"}})
		}
		typed := UserStatus(status)
		out.status = &typed
	}
	return out, nil
}
func unknown(body map[string]interface{}, allowed map[string]bool) []map[string]string {
	var details []map[string]string
	for key := range body {
		if !allowed[key] {
			details = append(details, map[string]string{"field": key, "reason": "unknown field"})
		}
	}
	return details
}
func strong(value string) bool {
	return len(value) >= 12 && regexp.MustCompile(`[a-z]`).MatchString(value) && regexp.MustCompile(`[A-Z]`).MatchString(value) && regexp.MustCompile(`\d`).MatchString(value)
}
func normalize(email string) string { return strings.ToLower(strings.TrimSpace(email)) }
func hasRole(roles []Role, wanted Role) bool {
	for _, role := range roles {
		if role == wanted {
			return true
		}
	}
	return false
}
func newID(prefix string) string { return prefix + "_" + randomString(16) }
func randomString(size int) string {
	b := make([]byte, size)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}
