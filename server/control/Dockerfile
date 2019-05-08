# Dockerfile References: https://docs.docker.com/engine/reference/builder/
ARG GO_VERSION=1.8
# Start from 1.8
#-alpine AS builder
FROM golang:${GO_VERSION}
# Add Maintainer Info
LABEL maintainer="Matt Murray <mattanimation@gmail.com>"

# Build Args
ARG APP_NAME=control-server
ARG LOG_DIR=/${APP_NAME}/logs

# Create Log Directory
RUN mkdir -p ${LOG_DIR}

# Environment Variables
ENV LOG_FILE_LOCATION=${LOG_DIR}/app.log 

# Set the Current Working Directory inside the container
# Create a directory inside the container to store all our application and then make it the working directory.
RUN mkdir -p /go/src/app
WORKDIR /go/src/app

# COPY go.mod .
# COPY go.sum .
# RUN go mod download

# Copy everything from the current directory to the PWD(Present Working Directory) inside the container
ONBUILD COPY . /go/src/app

# use gin to load things
# for hot reloading
RUN go get github.com/codegangsta/gin
# Download all the dependencies
RUN go-wrapper download   # "go get -d -v ./..."
# Install the package
RUN go-wrapper install    # "go install -v ./..."

# This container exposes port 8080 to the outside world
EXPOSE 8080

# Declare volumes to mount
VOLUME ["/app/logs"]

# Run the app
# CMD ["app"]
# Now tell Docker what command to run when the container starts
# CMD ["go-wrapper", "run"]
CMD ["gin", "--all", "run"] 