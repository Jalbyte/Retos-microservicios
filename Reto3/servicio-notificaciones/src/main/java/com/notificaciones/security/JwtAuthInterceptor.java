package com.notificaciones.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;

/**
 * Interceptor que valida el Bearer JWT en todos los endpoints (excepto /health y Swagger).
 * RBAC:
 *   - GET  → cualquier rol autenticado (USER o ADMIN)
 *   - PUT / POST / DELETE → solo ADMIN
 */
@Component
public class JwtAuthInterceptor implements HandlerInterceptor {

    @Value("${jwt.secret}")
    private String jwtSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        String path   = request.getRequestURI();
        String method = request.getMethod();

        if (isPublicPath(path)) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendError(response, 401, "Token de acceso requerido", path);
            return false;
        }

        Map<String, Object> claims;
        try {
            claims = validateJwt(authHeader.substring(7));
        } catch (Exception e) {
            sendError(response, 401, "Token inválido o expirado", path);
            return false;
        }

        if ("RESET_PASSWORD".equals(claims.get("type"))) {
            sendError(response, 401, "Token de tipo incorrecto", path);
            return false;
        }

        String role = (String) claims.get("role");

        if (isWriteMethod(method) && !"ADMIN".equals(role)) {
            sendError(response, 403, "Acceso denegado. Se requiere rol: ADMIN", path);
            return false;
        }

        request.setAttribute("userEmail", claims.get("sub"));
        request.setAttribute("userRole", role);
        return true;
    }

    private boolean isPublicPath(String path) {
        return path.equals("/health")
            || path.startsWith("/swagger-ui")
            || path.startsWith("/v3/api-docs")
            || path.startsWith("/api-docs");
    }

    private boolean isWriteMethod(String method) {
        return "POST".equalsIgnoreCase(method)
            || "PUT".equalsIgnoreCase(method)
            || "PATCH".equalsIgnoreCase(method)
            || "DELETE".equalsIgnoreCase(method);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> validateJwt(String token) throws Exception {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Estructura JWT inválida");
        }

        String signingInput = parts[0] + "." + parts[1];
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] expectedSig = mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
        byte[] actualSig   = Base64.getUrlDecoder().decode(padBase64(parts[2]));

        if (!MessageDigest.isEqual(expectedSig, actualSig)) {
            throw new SecurityException("Firma JWT inválida");
        }

        byte[] payloadBytes = Base64.getUrlDecoder().decode(padBase64(parts[1]));
        Map<String, Object> claims = objectMapper.readValue(payloadBytes, Map.class);

        Object exp = claims.get("exp");
        if (exp != null && System.currentTimeMillis() / 1000 > ((Number) exp).longValue()) {
            throw new SecurityException("Token JWT expirado");
        }

        return claims;
    }

    private static String padBase64(String s) {
        int mod = s.length() % 4;
        return mod == 0 ? s : s + "=".repeat(4 - mod);
    }

    private void sendError(HttpServletResponse response, int status, String message, String path) throws Exception {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        String errorText = status == 401 ? "Unauthorized" : "Forbidden";
        response.getWriter().write(String.format(
            "{\"status\":%d,\"error\":\"%s\",\"message\":\"%s\",\"timestamp\":\"%s\",\"path\":\"%s\"}",
            status, errorText, message, java.time.Instant.now(), path
        ));
    }
}
