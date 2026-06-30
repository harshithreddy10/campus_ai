FROM node:22 AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    libreoffice-impress \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

COPY --from=frontend-build /app/dist /usr/share/nginx/html

RUN { \
    echo 'server {'; \
    echo '    listen 8000;'; \
    echo '    location / {'; \
    echo '        root /usr/share/nginx/html;'; \
    echo '        index index.html;'; \
    echo '        try_files $uri $uri/ /index.html;'; \
    echo '    }'; \
    echo '    location ~ ^/(students|health|auth|materials|videos|syllabus|search|settings|status) {'; \
    echo '        proxy_pass http://127.0.0.1:8001;'; \
    echo '        proxy_set_header Host $host;'; \
    echo '        proxy_set_header X-Real-IP $remote_addr;'; \
    echo '    }'; \
    echo '}'; \
    } > /etc/nginx/sites-enabled/default

EXPOSE 8000

COPY docker-start.sh .
RUN chmod +x docker-start.sh
CMD ["./docker-start.sh"]
