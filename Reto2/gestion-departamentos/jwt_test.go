package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"
)

func createTestJWT(secret string, payload map[string]interface{}) string {
	header := map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	}

	headerBytes, _ := json.Marshal(header)
	payloadBytes, _ := json.Marshal(payload)

	headEnc := base64.RawURLEncoding.EncodeToString(headerBytes)
	payEnc := base64.RawURLEncoding.EncodeToString(payloadBytes)
	signingInput := headEnc + "." + payEnc

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return signingInput + "." + sig
}

func TestParseJWT_ValidToken(t *testing.T) {
	secret := "test-secret"
	token := createTestJWT(secret, map[string]interface{}{
		"sub":  "camilo@example.com",
		"role": "ADMIN",
		"exp":  time.Now().Add(5 * time.Minute).Unix(),
	})

	claims, err := parseJWT(token, secret)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if claims.Sub != "camilo@example.com" {
		t.Fatalf("unexpected sub: %s", claims.Sub)
	}
	if claims.Role != "ADMIN" {
		t.Fatalf("unexpected role: %s", claims.Role)
	}
}

func TestParseJWT_InvalidSignature(t *testing.T) {
	secret := "test-secret"
	token := createTestJWT("wrong-secret", map[string]interface{}{
		"sub": "camilo@example.com",
		"exp": time.Now().Add(5 * time.Minute).Unix(),
	})

	_, err := parseJWT(token, secret)
	if err == nil {
		t.Fatal("expected signature validation error")
	}
}
