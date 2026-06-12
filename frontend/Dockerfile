FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install --legacy-peer-deps || npm install

# Copiar código
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
