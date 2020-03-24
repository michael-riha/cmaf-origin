# https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker
FROM node:12.16.1

# take a look at the incodming traffic
RUN apt-get update && apt-get install tcpdump -y
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

VOLUME ["/out"]

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install

# ignore local 'node_modules' ->  https://stackoverflow.com/questions/43747776/copy-with-docker-but-with-exclusion
COPY . .

COPY --chown=node:node . .

#USER node

EXPOSE 5000
EXPOSE 5001

CMD [ "node", "app.js" ]
