# project-root/mongo-init/Dockerfile
FROM mongo:latest

# Copy your BSON dumps into /dumps in the image
COPY dumps /dumps

# Copy the init script into Mongo’s init folder
COPY docker-entrypoint-initdb.d /docker-entrypoint-initdb.d/

# Make sure it’s executable
RUN chmod +x /docker-entrypoint-initdb.d/*.sh
