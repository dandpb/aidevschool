package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

func NewHTTPHandler(host *Host) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusOK, host.Health()) })
	mux.HandleFunc("/plugins", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			var manifest PluginManifest
			if err := json.NewDecoder(r.Body).Decode(&manifest); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
				return
			}
			plugin, err := host.Register(r.Context(), manifest, nil)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusCreated, plugin)
		case http.MethodGet:
			writeJSON(w, http.StatusOK, host.List())
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/plugins/", func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/plugins/"), "/")
		if len(parts) == 1 && r.Method == http.MethodGet {
			if p, ok := host.Get(parts[0]); ok {
				writeJSON(w, http.StatusOK, p)
				return
			}
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if len(parts) == 3 && parts[1] == "lifecycle" && r.Method == http.MethodPost {
			p, err := host.Transition(r.Context(), parts[0], LifecycleTransition(parts[2]))
			if err != nil {
				writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, p)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	})
	mux.HandleFunc("/hooks/", func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/hooks/"), "/")
		if len(parts) != 2 || parts[1] != "dispatch" || r.Method != http.MethodPost {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		var invocation HookInvocation
		if err := json.NewDecoder(r.Body).Decode(&invocation); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		invocation.HookName = parts[0]
		result, err := host.DispatchHook(r.Context(), invocation)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, result)
	})
	return mux
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
