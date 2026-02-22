package main

import (
	"database/sql"
	"math"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

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

func main() {

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		panic("DATABASE_URL no está definida")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	r := gin.Default()

	// POST /departamentos
	r.POST("/departamentos", func(c *gin.Context) {
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
	})

	// GET /departamentos con paginación
	r.GET("/departamentos", func(c *gin.Context) {

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

		c.JSON(http.StatusOK, gin.H{
			"data": departamentos,
			"pagination": gin.H{
				"page":          page,
				"size":          size,
				"totalElements": totalElements,
				"totalPages":    totalPages,
			},
		})
	})

	// GET /departamentos/:id
	r.GET("/departamentos/:id", func(c *gin.Context) {
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
	})

	r.Run(":8081")
}
