FROM node:20-slim

WORKDIR /app

# Instalar dependencias necesarias para Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root
RUN groupadd -r appgroup && useradd -r -g appgroup miguel

COPY package*.json ./

# Instalar solo dependencias necesarias para producción
RUN npm install --omit=dev

COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Cambiar propietario
RUN chown -R miguel:appgroup /app

USER miguel

EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]