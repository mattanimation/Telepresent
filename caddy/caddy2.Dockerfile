FROM alpine:3.7

LABEL maintainer="Matt Murray <mattanimation@gmail.com>"

ARG VERSION="2.0.0"
ARG VER_TAG="beta12"

RUN apk update && apk upgrade \
  && apk add --no-cache openssh-client git \
  && apk add --no-cache --virtual .build-dependencies tar curl

RUN curl --silent --show-error --fail --location \
      "https://github.com/caddyserver/caddy/releases/download/v${VERSION}-${VER_TAG}/caddy2_${VER_TAG}_linux_amd64" \
      --output caddy2 \
    && cp "/caddy2" /usr/bin/caddy \
    && chmod 0755 /usr/bin/caddy \
    && caddy version \ 
    && caddy help

EXPOSE 80 443 2015
VOLUME /root/.caddy


# COPY Caddyfile /etc/Caddyfile

# RUN caddy adapt --config /etc/Caddyfile --pretty

#ENTRYPOINT ["/usr/bin/caddy"]
#CMD ["--conf", "/etc/Caddyfile", "--log", "stdout"]
