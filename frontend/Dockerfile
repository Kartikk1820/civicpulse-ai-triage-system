# Stage 1: build the Angular app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Stage 2: copy the static build output into the shared volume nginx serves from
FROM alpine:3.20
COPY --from=build /app/dist/frontend/browser /dist
CMD ["sh", "-c", "rm -rf /dist_out/* && cp -r /dist/. /dist_out/"]
