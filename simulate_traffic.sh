#!/bin/bash

# --- CONFIGURACIÓN DE ENDPOINTS ---
AUTH_URL="http://localhost:3002/auth/login"
GATEWAY="http://localhost:3000"

echo "==========================================================="
echo "🔑 1. Intentando iniciar sesión para obtener Bearer Token..."
echo "==========================================================="

# Realizar el login POST y extraer el token usando grep/sed (para evitar depender de jq)
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@empresa.com", "password": "password"}')

# Intentar extraer el token del JSON (busca el patrón "token":"TEXTO")
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

# Si tu API devuelve el campo como "accessToken", descomenta la línea de abajo:
# TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
    echo "⚠️ No se pudo extraer el token dinámicamente de la respuesta."
    echo "Respuesta del servidor: $LOGIN_RESPONSE"
    echo "Ingresa un Token manual para continuar o presiona Enter para usar modo sin token:"
    read -r TOKEN
else
    echo "✅ Token obtenido con éxito: ${TOKEN:0:15}...[TRUNCADO]"
fi

echo ""
echo "==========================================================="
echo "🚀 2. Iniciando simulación de tráfico inteligente"
echo "==========================================================="

COUNTER=0

while true; do
    COUNTER=$((COUNTER + 1))
    PROBABILITY=$(( (RANDOM % 100) + 1 ))
    
    # 80% Probabilidad de peticiones exitosas organizadas
    if [ $PROBABILITY -le 80 ]; then
        TYPE="🟢 SUCCESS"
        
        # Elegir una acción de éxito al azar (1 al 4)
        ACTION=$(( (RANDOM % 4) + 1 ))
        
        case $ACTION in
            1)
                # GET Departamentos (Con paginación y Token)
                URL="${GATEWAY}/departamentos?page=1&size=5"
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$URL")
                ;;
            2)
                # POST Crear Departamento
                URL="${GATEWAY}/departamentos"
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL" \
                  -H "Authorization: Bearer $TOKEN" \
                  -H "Content-Type: application/json" \
                  -d '{"id": "DEP002", "nombre": "TI", "descripcion": "Departamento de TI"}')
                ;;
            3)
                # GET Empleados
                URL="${GATEWAY}/empleado?page=1&size=5"
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$URL")
                ;;
            4)
                # POST Crear Empleado
                URL="${GATEWAY}/empleado"
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL" \
                  -H "Authorization: Bearer $TOKEN" \
                  -H "Content-Type: application/json" \
                  -d '{"nombre": "Camilo", "apellido": "Alabaran", "cargo": "TI", "email": "camilo@gsti.com", "departamento_id": "DEP002", "fechaIngreso": "2026-04-12"}')
                ;;
        esac
    else
        # 20% Probabilidad de forzar errores reales controlados (404 o 500)
        TYPE="🔴 ERROR  "
        ACTION=$(( (RANDOM % 2) + 1 ))
        
        case $ACTION in
            1)
                # Forzar un 404 real en el Gateway
                URL="${GATEWAY}/ruta/totalmente/inexistente"
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$URL")
                ;;
            2)
                # Forzar un 401 explícito pegándole sin Token a un endpoint protegido
                URL="${GATEWAY}/departamentos"
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
                ;;
        esac
    fi

    # Manejo de timeouts o caídas de contenedores
    if [ "$HTTP_CODE" == "000" ]; then HTTP_CODE="TIMEOUT/DOWN"; fi

    echo "[$COUNTER] $TYPE -> Enrutado a: $URL | HTTP Status: $HTTP_CODE"
    
    # Intervalo dinámico de simulación
    SLEEP_MS=$(( (RANDOM % 600) + 200 )) # Entre 0.2 y 0.8 segundos
    SLEEP_SEC=$(awk -v ms=$SLEEP_MS 'BEGIN { print ms / 1000 }')
    sleep $SLEEP_SEC
done