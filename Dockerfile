FROM node:12.16.1-alpine

RUN apk update \
&& apk add --no-cache unzip wget ca-certificates

RUN mkdir -p /usr/src/app

# COPY ./ /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/

RUN npm i -g npm@6.13.4
# RUN npm install pm2 -g
RUN npm install
# RUN npm run build
# RUN npm run export
# RUN pm2 start npm -- start

COPY . /usr/src/app

EXPOSE 8080

CMD node index.js