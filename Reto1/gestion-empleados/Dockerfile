FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appgroup && useradd -r -g appgroup miguel

COPY package*.json ./
RUN npm install

COPY . .

RUN chown -R miguel:appgroup /app
USER miguel

EXPOSE 8080

CMD ["node", "index.js"]