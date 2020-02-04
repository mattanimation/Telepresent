FROM node:10-alpine

RUN mkdir -p /usr/src/ss
WORKDIR /usr/src/ss

COPY ./src /usr/src/ss

RUN yarn install

EXPOSE 80