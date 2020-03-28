FROM nginx
COPY build /usr/share/nginx/html
RUN sed -i "s/listen[ ]*80/listen 8080/" /etc/nginx/conf.d/default.conf
