FROM node:10-alpine

RUN mkdir -p /usr/src/frontend
WORKDIR /usr/src/frontend

COPY ./src /usr/src/frontend

RUN yarn install

EXPOSE 80