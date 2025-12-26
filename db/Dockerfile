FROM mysql:lts

COPY data.sql /docker-entrypoint-initdb.d/

ENV MYSQL_DATABASE=evoplan \
    MYSQL_USER=evoplan \
    MYSQL_PASSWORD=evoplan \
    MYSQL_ROOT_PASSWORD=evoplan

LABEL name="evoplan-db" \
      description="plan and manage events and invitations" \
      version="dev"

EXPOSE 3306

