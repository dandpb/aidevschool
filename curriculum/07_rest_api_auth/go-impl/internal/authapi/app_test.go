package authapi

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const strongPassword = "CorrectHorse1Battery"

func testApp() *App {
	return NewApp(DefaultConfig(), FixedClock{Value: time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
}
func request(app *App, method, path string, body interface{}, token string) *httptest.ResponseRecorder {
	var reader io.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		reader = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rr := httptest.NewRecorder()
	app.Router().ServeHTTP(rr, req)
	return rr
}
func registerAndLogin(t *testing.T) (*App, map[string]interface{}, map[string]interface{}) {
	t.Helper()
	app := testApp()
	reg := request(app, http.MethodPost, "/v1/auth/register", map[string]interface{}{"email": "Ada@Example.com", "password": strongPassword, "display_name": "Ada"}, "")
	if reg.Code != http.StatusCreated {
		t.Fatalf("register failed: %d %s", reg.Code, reg.Body.String())
	}
	login := request(app, http.MethodPost, "/v1/auth/login", map[string]interface{}{"email": "ada@example.com", "password": strongPassword}, "")
	if login.Code != http.StatusOK {
		t.Fatalf("login failed: %d %s", login.Code, login.Body.String())
	}
	var regBody, loginBody map[string]interface{}
	_ = json.Unmarshal(reg.Body.Bytes(), &regBody)
	_ = json.Unmarshal(login.Body.Bytes(), &loginBody)
	return app, regBody, loginBody
}

func TestRegisterValidationHashingAndAudit(t *testing.T) {
	app := testApp()
	res := request(app, http.MethodPost, "/v1/auth/register", map[string]interface{}{"email": "Learner@Example.com", "password": strongPassword, "display_name": "Learner"}, "")
	if res.Code != http.StatusCreated {
		t.Fatalf("got %d", res.Code)
	}
	if strings.Contains(res.Body.String(), strongPassword) {
		t.Fatal("response leaked password")
	}
	user := app.Store().FindUserByEmail("learner@example.com")
	if user == nil || user.PasswordHash == strongPassword {
		t.Fatal("password was not hashed")
	}
	if len(app.Store().Audits) != 1 || app.Store().Audits[0].Action != "user_registered" {
		t.Fatal("missing registration audit")
	}

	invalid := request(app, http.MethodPost, "/v1/auth/register", map[string]interface{}{"email": "bad", "password": "weak", "extra": true}, "")
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("expected validation failure")
	}
	dup := request(app, http.MethodPost, "/v1/auth/register", map[string]interface{}{"email": "LEARNER@example.com", "password": strongPassword}, "")
	if dup.Code != http.StatusConflict {
		t.Fatalf("expected duplicate conflict")
	}
}

func TestLoginJwtAndCredentialFailure(t *testing.T) {
	app, _, loginBody := registerAndLogin(t)
	data := loginBody["data"].(map[string]interface{})
	token := data["access_token"].(string)
	parsed, err := jwt.Parse(token, func(_ *jwt.Token) (interface{}, error) { return []byte(DefaultConfig().JWTSecret), nil }, jwt.WithIssuer(DefaultConfig().Issuer), jwt.WithAudience(DefaultConfig().Audience), jwt.WithTimeFunc(func() time.Time { return time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC) }))
	if err != nil || !parsed.Valid {
		t.Fatalf("jwt invalid: %v", err)
	}
	claims := parsed.Claims.(jwt.MapClaims)
	if claims["sub"] == "" || claims["jti"] == "" {
		t.Fatal("missing claims")
	}
	bad := request(app, http.MethodPost, "/v1/auth/login", map[string]interface{}{"email": "none@example.com", "password": "WrongPassword1"}, "")
	if bad.Code != http.StatusUnauthorized || !strings.Contains(bad.Body.String(), "INVALID_CREDENTIALS") {
		t.Fatalf("bad credential response: %d %s", bad.Code, bad.Body.String())
	}
}

func TestRBACAndOwnership(t *testing.T) {
	app, reg, login := registerAndLogin(t)
	user := reg["data"].(map[string]interface{})["user"].(map[string]interface{})
	userID := user["id"].(string)
	token := login["data"].(map[string]interface{})["access_token"].(string)
	if request(app, http.MethodGet, "/v1/users", nil, "").Code != http.StatusUnauthorized {
		t.Fatal("missing token should be 401")
	}
	if request(app, http.MethodGet, "/v1/users", nil, token).Code != http.StatusForbidden {
		t.Fatal("user list should require admin")
	}
	if request(app, http.MethodPut, "/v1/users/"+userID, map[string]interface{}{"display_name": "Ada L."}, token).Code != http.StatusOK {
		t.Fatal("self display update should pass")
	}
	if request(app, http.MethodPut, "/v1/users/"+userID, map[string]interface{}{"roles": []string{"admin"}}, token).Code != http.StatusForbidden {
		t.Fatal("self role update should fail")
	}
	stored := app.Store().GetUser(userID)
	stored.Roles = []Role{RoleAdmin}
	app.Store().SaveUser(stored)
	adminLogin := request(app, http.MethodPost, "/v1/auth/login", map[string]interface{}{"email": "ada@example.com", "password": strongPassword}, "")
	var body map[string]interface{}
	_ = json.Unmarshal(adminLogin.Body.Bytes(), &body)
	adminToken := body["data"].(map[string]interface{})["access_token"].(string)
	if request(app, http.MethodGet, "/v1/users?limit=10", nil, adminToken).Code != http.StatusOK {
		t.Fatal("admin list should pass")
	}
}

func TestRefreshRotationReplayHealthAndVersion(t *testing.T) {
	app, _, login := registerAndLogin(t)
	refresh := login["data"].(map[string]interface{})["refresh_token"].(string)
	first := request(app, http.MethodPost, "/v1/auth/refresh", map[string]interface{}{"refresh_token": refresh}, "")
	if first.Code != http.StatusOK {
		t.Fatalf("refresh failed: %d", first.Code)
	}
	replay := request(app, http.MethodPost, "/v1/auth/refresh", map[string]interface{}{"refresh_token": refresh}, "")
	if replay.Code != http.StatusUnauthorized || !strings.Contains(replay.Body.String(), "REFRESH_TOKEN_REPLAYED") {
		t.Fatalf("replay should be detected")
	}
	if request(app, http.MethodGet, "/healthz", nil, "").Code != http.StatusOK {
		t.Fatal("health failed")
	}
	if request(app, http.MethodGet, "/v2/users", nil, "").Code != http.StatusNotFound {
		t.Fatal("unsupported version should be 404")
	}
}
