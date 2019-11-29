# https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker
FROM node:10

# take a look at the incodming traffic
RUN apt-get update && apt-get install tcpdump -y
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

VOLUME ["/out"]

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install

COPY . .

COPY --chown=node:node . .

#USER node

EXPOSE 5000

CMD [ "node", "app.js" ]
