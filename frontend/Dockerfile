FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose port 3000 for Vite
EXPOSE 3000

# Start Vite with host 0.0.0.0 so it is accessible from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
