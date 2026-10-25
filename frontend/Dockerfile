# Build: docker build -t webappone-frontend ./frontend   (needs internet: the build inlines Google Fonts)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
# Where /api/ is forwarded. The nginx image writes the template into conf.d with this value at start.
ENV BACKEND_URL=http://backend:3000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
