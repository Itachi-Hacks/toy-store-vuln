FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY web-app.js .

EXPOSE 3000

CMD ["node", "web-app.js"]
