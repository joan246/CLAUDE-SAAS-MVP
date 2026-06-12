FROM node:20-slim

WORKDIR /app

# Instalar dependencias del sistema y librerías necesarias para Puppeteer/Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash curl procps \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copiar package files
COPY package*.json ./

# Instalar dependencias (npm install es más flexible que npm ci)
RUN npm install --legacy-peer-deps || npm install

# Copiar código
COPY . .

# Generar Prisma Client con la arquitectura correcta
RUN npx prisma generate

# Compilar TypeScript (ignore errors for now)
RUN npm run build || true

EXPOSE 3001

CMD ["npm", "run", "dev"]
