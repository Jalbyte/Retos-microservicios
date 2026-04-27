package main

// @title API Gestión de Departamentos
// @version 1.0
// @description Microservicio para la gestión de departamentos
// @host localhost:8081
// @schemes http
// @BasePath /
// @securityDefinitions.apikey BearerToken
// @in header
// @name Authorization
// @description Token JWT. Formato: 'Bearer {token}'

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "gestion-departamentos/docs"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

var db *sql.DB

type Departamento struct {
	ID          string `json:"id"`
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion"`
}

type ErrorDetail struct {
	Field         string      `json:"field"`
	Message       string      `json:"message"`
	RejectedValue interface{} `json:"rejectedValue"`
}

type Pagination struct {
	Page          int `json:"page"`
	Size          int `json:"size"`
	TotalElements int `json:"totalElements"`
	TotalPages    int `json:"totalPages"`
}

type PaginatedResponse struct {
	Data       []Departamento `json:"data"`
	Pagination Pagination     `json:"pagination"`
}

type ErrorResponse struct {
	Status    int           `json:"status"`
	Error     string        `json:"error"`
	Message   string        `json:"message"`
	Timestamp string        `json:"timestamp"`
	Path      string        `json:"path"`
	Errors    []ErrorDetail `json:"errors"`
}

var HTTPTexts = map[int]string{
	400: "Bad Request",
	404: "Not Found",
	409: "Conflict",
	500: "Internal Server Error",
}

// jwtClaims representa los claims estándar del payload JWT.
type jwtClaims struct {
	Sub  string `json:"sub"`
	Role string `json:"role"`
	Type string `json:"type"`
	Exp  int64  `json:"exp"`
	Iat  int64  `json:"iat"`
}

// parseJWT valida y decodifica un token JWT firmado con HMAC-SHA256 (HS256).
// usa únicamente la librería estándar de Go.
func parseJWT(tokenStr, secret string) (*jwtClaims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, http.ErrNoCookie // generic error reused
	}

	// Verificar firma
	signingInput := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	expectedSig := mac.Sum(nil)

	decodedSig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, err
	}
	if !hmac.Equal(expectedSig, decodedSig) {
		return nil, http.ErrNoCookie
	}

	// Decodificar payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}

	var claims jwtClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, err
	}

	// Verificar expiración
	if claims.Exp > 0 && time.Now().Unix() > claims.Exp {
		return nil, http.ErrNoCookie
	}

	return &claims, nil
}

// JWTMiddleware valida el Bearer token en el header Authorization.
func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		if path == "/health" ||
			strings.HasPrefix(path, "/swagger/") ||
			path == "/swagger" {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		log.Printf("DEBUG Authorization header: '%s'", authHeader)
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status":    401,
				"error":     "Unauthorized",
				"message":   "Token de acceso requerido",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"path":      c.Request.URL.Path,
			})
			return
		}

		// Eliminar todos los prefijos "Bearer " que pueda enviar Swagger
		tokenStr := authHeader
		for strings.HasPrefix(strings.ToLower(tokenStr), "bearer ") {
			tokenStr = strings.TrimSpace(tokenStr[7:])
		}

		secret := os.Getenv("JWT_SECRET")

		claims, err := parseJWT(tokenStr, secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status":    401,
				"error":     "Unauthorized",
				"message":   "Token inválido o expirado",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"path":      c.Request.URL.Path,
			})
			return
		}

		// Rechazar reset tokens usados como access tokens
		if claims.Type == "RESET_PASSWORD" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"status": 401, "error": "Unauthorized", "message": "Token de tipo incorrecto"})
			return
		}

		c.Set("userEmail", claims.Sub)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

// RequireRole verifica que el usuario tenga el rol indicado.
func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"status": 401, "error": "Unauthorized", "message": "No autenticado"})
			return
		}
		if userRole != role {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"status":    403,
				"error":     "Forbidden",
				"message":   "Acceso denegado. Se requiere rol: " + role,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"path":      c.Request.URL.Path,
			})
			return
		}
		c.Next()
	}
}

func errorResponse(c *gin.Context, status int, message string, errors []ErrorDetail) {
	c.JSON(status, ErrorResponse{
		Status:    status,
		Error:     HTTPTexts[status],
		Message:   message,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Path:      c.Request.URL.Path,
		Errors:    errors,
	})
}

func ensureDBConnection() error {
	if err := db.Ping(); err != nil {

		log.Println("Conexión perdida. Intentando reconectar...")

		dbURL := os.Getenv("DATABASE_URL")

		newDB, err := sql.Open("postgres", dbURL)
		if err != nil {
			return err
		}

		// Configurar pool nuevamente
		newDB.SetMaxOpenConns(25)
		newDB.SetMaxIdleConns(25)
		newDB.SetConnMaxLifetime(5 * time.Minute)

		// Probar conexión
		if err := newDB.Ping(); err != nil {
			return err
		}

		db = newDB
		log.Println("Reconexión exitosa a la base de datos")
	}

	return nil
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		panic("DATABASE_URL no está definida")
	}

	var err error
	db, err = sql.Open("postgres", dbURL)
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)
	if err != nil {
		panic(err)
	}

	// Esperar a que la base esté lista
	for i := 0; i < 10; i++ {
		err = db.Ping()
		if err == nil {
			break
		}

		log.Println("Esperando conexión a la base de datos...")
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		panic("No se pudo conectar a la base después de varios intentos")
	}

	defer db.Close()

	r := gin.Default()

	r.Use(DBMiddleware())
	r.Use(JWTMiddleware()) // Add JWT middleware
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler,
		ginSwagger.URL("/swagger/doc.json"),
		ginSwagger.PersistAuthorization(true),
	))
	r.POST("/departamentos", RequireRole("ADMIN"), CreateDepartamento)
	r.GET("/departamentos", GetDepartamentos)
	r.GET("/departamentos/:id", GetDepartamentoByID)
	r.Any("/health", health)
	r.Run(":" + port)
}

func health(c *gin.Context) {

	if err := db.Ping(); err != nil {
		c.JSON(503, gin.H{
			"status": "DOWN",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"status": "UP",
	})
}

func DBMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		// No aplicar middleware al health
		if c.Request.URL.Path == "/health" {
			c.Next()
			return
		}

		if err := ensureDBConnection(); err != nil {
			errorResponse(c, 503, "Base de datos no disponible", nil)
			c.Abort()
			return
		}
		c.Next()
	}
}

//
// ========================= HANDLERS =========================
//

// CreateDepartamento godoc
// @Summary Crear departamento
// @Description Registra un nuevo departamento
// @Tags Departamentos
// @Security BearerToken
// @Accept json
// @Produce json
// @Param departamento body Departamento true "Departamento"
// @Success 201 {object} Departamento
// @Failure 400 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /departamentos [post]
func CreateDepartamento(c *gin.Context) {
	var dept Departamento

	if err := c.ShouldBindJSON(&dept); err != nil {
		errorResponse(c, 400, "JSON inválido", nil)
		return
	}

	var errors []ErrorDetail

	if dept.ID == "" {
		errors = append(errors, ErrorDetail{"id", "El id es requerido", dept.ID})
	}
	if dept.Nombre == "" {
		errors = append(errors, ErrorDetail{"nombre", "El nombre es requerido", dept.Nombre})
	}
	if dept.Descripcion == "" {
		errors = append(errors, ErrorDetail{"descripcion", "La descripción es requerida", dept.Descripcion})
	}

	if len(errors) > 0 {
		errorResponse(c, 400, "Validation failed", errors)
		return
	}

	_, err := db.Exec(
		`INSERT INTO "Departamento" (id, nombre, descripcion) VALUES ($1, $2, $3)`,
		dept.ID, dept.Nombre, dept.Descripcion,
	)

	if err != nil {
		errorResponse(c, 409, "El departamento ya existe", []ErrorDetail{
			{"id", "El id ya está registrado", dept.ID},
		})
		return
	}

	c.JSON(http.StatusCreated, dept)
}

// GetDepartamentos godoc
// @Summary Listar departamentos
// @Description Obtiene todos los departamentos con paginación
// @Tags Departamentos
// @Security BearerToken
// @Produce json
// @Param page query int false "Número de página" default(1)
// @Param size query int false "Tamaño de página" default(5)
// @Success 200 {object} PaginatedResponse
// @Failure 500 {object} ErrorResponse
// @Router /departamentos [get]
func GetDepartamentos(c *gin.Context) {

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "5"))

	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 5
	}
	if size > 100 {
		size = 100
	}

	offset := (page - 1) * size

	var totalElements int
	err := db.QueryRow(`SELECT COUNT(*) FROM "Departamento"`).Scan(&totalElements)
	if err != nil {
		errorResponse(c, 500, "Error al contar departamentos", nil)
		return
	}

	rows, err := db.Query(
		`SELECT id, nombre, descripcion FROM "Departamento" LIMIT $1 OFFSET $2`,
		size, offset,
	)
	if err != nil {
		errorResponse(c, 500, "Error al consultar departamentos", nil)
		return
	}
	defer rows.Close()

	var departamentos []Departamento

	for rows.Next() {
		var dept Departamento
		rows.Scan(&dept.ID, &dept.Nombre, &dept.Descripcion)
		departamentos = append(departamentos, dept)
	}

	totalPages := int(math.Ceil(float64(totalElements) / float64(size)))

	response := PaginatedResponse{
		Data: departamentos,
		Pagination: Pagination{
			Page:          page,
			Size:          size,
			TotalElements: totalElements,
			TotalPages:    totalPages,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetDepartamentoByID godoc
// @Summary Obtener departamento por ID
// @Description Obtiene un departamento específico por su ID
// @Tags Departamentos
// @Security BearerToken
// @Produce json
// @Param id path string true "ID del departamento"
// @Success 200 {object} Departamento
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /departamentos/{id} [get]
func GetDepartamentoByID(c *gin.Context) {
	id := c.Param("id")

	var dept Departamento
	err := db.QueryRow(
		`SELECT id, nombre, descripcion FROM "Departamento" WHERE id=$1`,
		id,
	).Scan(&dept.ID, &dept.Nombre, &dept.Descripcion)

	if err == sql.ErrNoRows {
		errorResponse(c, 404, "Departamento no encontrado", []ErrorDetail{
			{"id", "No existe un departamento con este id", id},
		})
		return
	}

	if err != nil {
		errorResponse(c, 500, "Error interno", nil)
		return
	}

	c.JSON(http.StatusOK, dept)
}
