# https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker
FROM node:12.16.1

# take a look at the incodming traffic
RUN apt-get update && apt-get install tcpdump -y
RUN mkdir -p /home/node/app/node_modules \
&& chown -R node:node /home/node/app \ 
&& mkdir /out \
&& chmod 775 /out

VOLUME ["/out"]
WORKDIR /home/node/app
COPY package*.json ./

RUN npm install

# ignore local 'node_modules' ->  https://stackoverflow.com/questions/43747776/copy-with-docker-but-with-exclusion
COPY --chown=node:node . .

#USER node

# incoming <- http traffic on port 5000
EXPOSE 5000
# outgoing -> http traffic on port 5001
EXPOSE 5001

CMD [ "npm", "start" ]
