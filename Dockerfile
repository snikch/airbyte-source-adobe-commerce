FROM node:16-alpine as builder

WORKDIR /opt/airbyte

COPY package.json package-lock.json ./

RUN npm install

COPY ./src ./src
RUN ls -la && npm run build


FROM node:16-alpine

WORKDIR /opt/airbyte

COPY --from=builder /opt/airbyte/lib ./lib
COPY --from=builder /opt/airbyte/node_modules ./node_modules
COPY ./bin ./bin
COPY ./resources ./resources

ENV AIRBYTE_ENTRYPOINT "/opt/airbyte/bin/main"
ENTRYPOINT ["/opt/airbyte/bin/main"]
