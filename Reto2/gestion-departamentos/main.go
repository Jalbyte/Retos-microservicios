package main

// @title API Gestión de Departamentos
// @version 1.0
// @description Microservicio para la gestión de departamentos
// @host localhost:8081
// @schemes http
// @BasePath /

import (
	"database/sql"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
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
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler,
		ginSwagger.URL("/swagger/doc.json"),
	))
	r.POST("/departamentos", CreateDepartamento)
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
