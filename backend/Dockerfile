# =================================================================
# Stage 1: Build the React Frontend
# =================================================================
FROM node:18-alpine AS frontend-builder

# Set a clear working directory for the frontend build
WORKDIR /app/frontend

# Copy the frontend's package files from the correct path relative to the build context
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend source code
COPY frontend/ .

# Run the production build
RUN npm run build


# =================================================================
# Stage 2: Build the Final Node.js Production Server
# =================================================================
FROM node:18-alpine

# Set the final working directory
WORKDIR /app

# Copy the backend's package files from the correct path
COPY backend/package*.json ./

# Install ONLY production dependencies for the backend
RUN npm install --only=production

# Copy the backend source code
COPY backend/ .

# Copy the built React app from the 'frontend-builder' stage
# into the 'public' directory of our Node.js server.
COPY --from=frontend-builder /app/frontend/build ./public


# Expose the port the Node.js app will run on
EXPOSE 8000

# The command to run your application
CMD [ "node", "src/app.js" ]