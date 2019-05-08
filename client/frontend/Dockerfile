# base image
FROM node:10.15.3


ADD yarn.lock /yarn.lock
ADD package.json /package.json

ENV NODE_PATH=/node_modules
ENV PATH=$PATH:/node_modules/.bin
RUN yarn

# set working directory
RUN mkdir /usr/src/control-ui
WORKDIR /usr/src/control-ui

# add `/usr/src/app/node_modules/.bin` to $PATH
ENV PATH /usr/src/app/node_modules/.bin:$PATH

# install and cache app dependencies
# COPY ./frontend/control-ui-app/package.json /usr/src/app/package.json
COPY ./control-ui /usr/src/control-ui
 # can add --silient if it gets messy, but could miss some errors
RUN yarn install
RUN yarn install react-scripts@2.1.8 -g

# do this for prod, too slow for dev
RUN yarn run build

EXPOSE 9300



